import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '../db';
import { sessions, admins } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const SESSION_COOKIE_NAME = 'admin_session';
export const CSRF_COOKIE_NAME = 'admin_csrf';

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
export const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface SessionValidationResult {
  valid: boolean;
  reason?: 'missing' | 'expired_idle' | 'expired_absolute' | 'invalid' | 'requires_2fa';
  admin?: {
    id: string;
    email: string;
    role: string;
    twoFactorEnabled: boolean;
  };
  session?: {
    id: string;
    expiresAt: number;
    lastActiveAt: number;
    twoFactorVerified: boolean;
  };
}

/**
 * Creates a server-side session, hashes token for storage, and returns cookie options.
 */
export async function createAdminSession(params: {
  adminId: string;
  ipAddress: string;
  userAgent: string;
  twoFactorVerified?: boolean;
}): Promise<{ token: string; csrfToken: string; sessionId: string }> {
  await ensureDatabaseReady();

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const sessionId = crypto.randomUUID();

  const now = Date.now();

  await db.insert(sessions).values({
    id: sessionId,
    adminId: params.adminId,
    tokenHash,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    expiresAt: now + ABSOLUTE_TIMEOUT_MS,
    lastActiveAt: now,
    twoFactorVerified: params.twoFactorVerified ?? false,
    createdAt: now,
  });

  return { token, csrfToken, sessionId };
}

/**
 * Validates a session from the cookie jar or passed token string.
 */
export async function validateAdminSession(
  rawToken?: string
): Promise<SessionValidationResult> {
  await ensureDatabaseReady();

  let token = rawToken;
  if (!token) {
    try {
      const cookieJar = await cookies();
      token = cookieJar.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // If outside React request context
      return { valid: false, reason: 'missing' };
    }
  }

  if (!token) {
    return { valid: false, reason: 'missing' };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Query session joined with admin
  const rows = await db
    .select({
      session: sessions,
      admin: admins,
    })
    .from(sessions)
    .innerJoin(admins, eq(sessions.adminId, admins.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (rows.length === 0) {
    return { valid: false, reason: 'invalid' };
  }

  const { session, admin } = rows[0];

  if (admin.status !== 'active') {
    return { valid: false, reason: 'invalid' };
  }

  const now = Date.now();

  // Check absolute timeout (8 hours)
  if (now > session.expiresAt) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return { valid: false, reason: 'expired_absolute' };
  }

  // Check idle timeout (15 minutes)
  if (now - session.lastActiveAt > IDLE_TIMEOUT_MS) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return { valid: false, reason: 'expired_idle' };
  }

  // Check 2FA requirement
  if (!session.twoFactorVerified) {
    return {
      valid: false,
      reason: 'requires_2fa',
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        twoFactorEnabled: admin.twoFactorEnabled,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        lastActiveAt: session.lastActiveAt,
        twoFactorVerified: false,
      },
    };
  }

  // Touch session's lastActiveAt
  await db
    .update(sessions)
    .set({ lastActiveAt: now })
    .where(eq(sessions.id, session.id));

  return {
    valid: true,
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      twoFactorEnabled: admin.twoFactorEnabled,
    },
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
      lastActiveAt: now,
      twoFactorVerified: true,
    },
  };
}

/**
 * Destroys a session server-side.
 */
export async function destroySession(token: string): Promise<void> {
  await ensureDatabaseReady();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Destroys all sessions for an admin (e.g. on password reset or "Log out everywhere").
 */
export async function destroyAllAdminSessions(adminId: string): Promise<void> {
  await ensureDatabaseReady();
  await db.delete(sessions).where(eq(sessions.adminId, adminId));
}

/**
 * Marks a session's 2FA as verified.
 */
export async function markSession2FaVerified(sessionId: string): Promise<void> {
  await ensureDatabaseReady();
  await db
    .update(sessions)
    .set({ twoFactorVerified: true, lastActiveAt: Date.now() })
    .where(eq(sessions.id, sessionId));
}
