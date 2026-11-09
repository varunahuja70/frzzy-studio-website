import crypto from 'crypto';
import { argon2id } from 'hash-wasm';
import zxcvbn from 'zxcvbn';

const PEPPER = (
  process.env.ADMIN_PASSWORD_PEPPER || process.env.ADMIN_PEPPER ||
  'frxcx-studio-argon2id-server-pepper-secret-production-hardened-2026'
).trim();

const PREVIOUS_PEPPER = process.env.PREVIOUS_ADMIN_PASSWORD_PEPPER || null;

/**
 * Checks if a password has been breached in public dumps using the HaveIBeenPwned k-anonymity API.
 * Only the first 5 characters of the SHA-1 hash are ever sent to the network.
 */
export async function checkBreachedPassword(password: string): Promise<number> {
  try {
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'FRXCX-Studio-Security-Audit' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return 0;

    const text = await res.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(':');
      if (hashSuffix === suffix) {
        return parseInt(countStr, 10) || 1;
      }
    }

    return 0;
  } catch {
    // If external HIBP API is unreachable, fail open gracefully
    return 0;
  }
}

export interface PasswordPolicyResult {
  valid: boolean;
  score: number;
  breachedCount: number;
  errors: string[];
}

/**
 * Validates password strength:
 * - Minimum 12 characters
 * - zxcvbn score >= 3
 * - Not found in HIBP breach lists
 */
export async function validatePasswordPolicy(password: string): Promise<PasswordPolicyResult> {
  const errors: string[] = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  const result = zxcvbn(password, ['frxcx', 'studio', 'admin', 'weichie']);
  if (result.score < 3) {
    errors.push(result.feedback.warning || 'Password is too predictable or weak');
  }

  const breachedCount = await checkBreachedPassword(password);
  if (breachedCount > 0) {
    errors.push(
      `This password has been exposed ${breachedCount.toLocaleString()} times in data breaches. Please choose a different password.`
    );
  }

  return {
    valid: errors.length === 0,
    score: result.score,
    breachedCount,
    errors,
  };
}

/**
 * Hashes password using Argon2id with 64MB memory, 3 iterations, and server-side pepper.
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString('hex');
  const pepperedPassword = `${password}${PEPPER}`;

  const hash = await argon2id({
    password: pepperedPassword,
    salt,
    parallelism: 4,
    iterations: 3,
    memorySize: 65536, // 64 MB
    hashLength: 32,
    outputType: 'encoded',
  });

  return { hash, salt };
}

/**
 * Verifies password against stored Argon2id hash using constant-time comparison.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const tryWithPepper = async (pepperVal: string): Promise<boolean> => {
    try {
      const pepperedPassword = `${password}${pepperVal}`;
      const computedHash = await argon2id({
        password: pepperedPassword,
        salt,
        parallelism: 4,
        iterations: 3,
        memorySize: 65536,
        hashLength: 32,
        outputType: 'encoded',
      });

      const computedBuffer = Buffer.from(computedHash);
      const storedBuffer = Buffer.from(storedHash);

      if (computedBuffer.length !== storedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(computedBuffer, storedBuffer);
    } catch {
      return false;
    }
  };

  const matchesCurrent = await tryWithPepper(PEPPER);
  if (matchesCurrent) return true;

  if (PREVIOUS_PEPPER) {
    const matchesPrev = await tryWithPepper(PREVIOUS_PEPPER);
    if (matchesPrev) return true;
  }

  const FALLBACK_PEPPER = 'frxcx-studio-argon2id-server-pepper-secret-production-hardened-2026';
  if (PEPPER !== FALLBACK_PEPPER && await tryWithPepper(FALLBACK_PEPPER)) {
    return true;
  }

  return false;
}

/**
 * Generates an 18-character cryptographically secure temporary password
 * guaranteed to have uppercase, lowercase, numbers, and symbols.
 */
export function generateTemporaryPassword(length: number = 18): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()_+~=';
  const all = upper + lower + digits + symbols;

  // Guarantee at least 2 of each class
  const bytes = crypto.randomBytes(24);
  const chars: string[] = [
    upper[bytes[0] % upper.length],
    upper[bytes[1] % upper.length],
    lower[bytes[2] % lower.length],
    lower[bytes[3] % lower.length],
    digits[bytes[4] % digits.length],
    digits[bytes[5] % digits.length],
    symbols[bytes[6] % symbols.length],
    symbols[bytes[7] % symbols.length],
  ];

  for (let i = 8; i < 18; i++) {
    chars.push(all[bytes[i] % all.length]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i + 4] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Checks if the proposed password matches any of the user's last 5 passwords.
 * Returns true if the password was previously used (forbidden).
 */
export async function checkPasswordHistory(adminId: string, candidatePassword: string): Promise<boolean> {
  const { db, ensureDatabaseReady } = await import('@/lib/db');
  const { passwordHistory } = await import('@/lib/db/schema');
  const { eq, desc } = await import('drizzle-orm');

  await ensureDatabaseReady();

  const historyEntries = await db
    .select()
    .from(passwordHistory)
    .where(eq(passwordHistory.adminId, adminId))
    .orderBy(desc(passwordHistory.createdAt))
    .limit(5);

  for (const entry of historyEntries) {
    const matches = await verifyPassword(candidatePassword, entry.passwordHash, entry.salt);
    if (matches) {
      return true; // Match found: cannot reuse
    }
  }

  return false;
}

/**
 * Records a new password into the password history for the admin.
 * Maintains only the most recent 5 records.
 */
export async function recordPasswordHistory(adminId: string, hash: string, salt: string): Promise<void> {
  const { db, ensureDatabaseReady } = await import('@/lib/db');
  const { passwordHistory } = await import('@/lib/db/schema');
  const { eq, desc } = await import('drizzle-orm');

  await ensureDatabaseReady();

  // Insert current
  await db.insert(passwordHistory).values({
    id: crypto.randomUUID(),
    adminId,
    passwordHash: hash,
    salt,
    createdAt: Date.now(),
  });

  // Prune entries beyond the latest 5
  const allEntries = await db
    .select({ id: passwordHistory.id })
    .from(passwordHistory)
    .where(eq(passwordHistory.adminId, adminId))
    .orderBy(desc(passwordHistory.createdAt));

  if (allEntries.length > 5) {
    const toDelete = allEntries.slice(5).map((e) => e.id);
    for (const oldId of toDelete) {
      await db.delete(passwordHistory).where(eq(passwordHistory.id, oldId));
    }
  }
}

