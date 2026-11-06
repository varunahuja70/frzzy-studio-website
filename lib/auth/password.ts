import crypto from 'crypto';
import { argon2id } from 'hash-wasm';
import zxcvbn from 'zxcvbn';

const PEPPER =
  process.env.ADMIN_PASSWORD_PEPPER ||
  'frxcx-studio-argon2id-server-pepper-secret-production-hardened-2026';

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
  try {
    const pepperedPassword = `${password}${PEPPER}`;

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
}
