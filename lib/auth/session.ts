import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '../db';
import { sessions, admins } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const SESSION_COOKIE_NAME = 'admin_session';
export const CSRF_COOKIE_NAME = 'admin_csrf';

export const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours of inactivity
export const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days persistent session

interface CachedSessionValidation {
  result: SessionValidationResult;
  timestamp: number;
}
const sessionValidationCache = new Map<string, CachedSessionValidation>();
const SESSION_CACHE_TTL_MS = 4000; // 4-second short-lived cache to deduplicate concurrent requests

export function invalidateSessionValidationCache(tokenHash?: string) {
  if (tokenHash) {
    sessionValidationCache.delete(tokenHash);
  } else {
    sessionValidationCache.clear();
  }
}

export interface SessionValidationResult {
  valid: boolean;
  reason?: 'missing' | 'expired_idle' | 'expired_absolute' | 'invalid' | 'requires_2fa' | 'deleted' | 'account_expired';
  admin?: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    twoFactorEnabled: boolean;
    mustChangePassword: boolean;
    mustSetup2Fa: boolean;
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

  const now = Date.now();
  const sessionId = crypto.randomUUID();
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || 'frzzy-admin-session-secret-vault-2026';
  const expiresAt = now + ABSOLUTE_TIMEOUT_MS;

  const payloadB64 = Buffer.from(
    JSON.stringify({
      sessionId,
      adminId: params.adminId,
      expiresAt,
      twoFactorVerified: params.twoFactorVerified ?? false,
      nonce: crypto.randomBytes(16).toString('hex'),
    })
  ).toString('base64url');

  const sig = crypto.createHmac('sha256', sessionSecret).update(payloadB64).digest('hex');
  const token = `${payloadB64}.${sig}`;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const csrfToken = crypto.randomBytes(24).toString('hex');

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
  rawTokenOrReq?: string | NextRequest
): Promise<SessionValidationResult> {
  await ensureDatabaseReady();

  let token: string | undefined;
  if (typeof rawTokenOrReq === 'string') {
    token = rawTokenOrReq;
  } else if (rawTokenOrReq && typeof rawTokenOrReq === 'object' && 'cookies' in rawTokenOrReq) {
    token = rawTokenOrReq.cookies.get(SESSION_COOKIE_NAME)?.value;
  }

  if (!token) {
    try {
      const cookieJar = await cookies();
      token = cookieJar.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      return { valid: false, reason: 'missing' };
    }
  }

  if (!token) {
    return { valid: false, reason: 'missing' };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const now = Date.now();

  const cached = sessionValidationCache.get(tokenHash);
  if (cached && now - cached.timestamp < SESSION_CACHE_TTL_MS) {
    return cached.result;
  }

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
    // Cross-container serverless fallback: verify HMAC signature of token
    try {
      if (token.includes('.')) {
        const [payloadB64, sig] = token.split('.');
        const sessionSecret = process.env.ADMIN_SESSION_SECRET || 'frzzy-admin-session-secret-vault-2026';
        const expectedSig = crypto.createHmac('sha256', sessionSecret).update(payloadB64).digest('hex');
        if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          if (payload && payload.adminId && payload.expiresAt && now < payload.expiresAt) {
            let adminRows = await db.select().from(admins).where(eq(admins.id, payload.adminId)).limit(1);
            if (adminRows.length === 0) {
              try {
                const { getAdminSupabaseClient } = await import('@/lib/supabase/admin');
                const supabase = getAdminSupabaseClient();
                const { data: profile } = await (supabase.from('profiles') as any).select('*').eq('id', payload.adminId).single();
                const p = profile as any;
                if (p && p.status === 'active') {
                  const syncNow = Date.now();
                  await db.insert(admins).values({
                    id: p.id,
                    name: p.name || null,
                    email: p.email.toLowerCase(),
                    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy',
                    salt: 'synced_from_supabase',
                    role: p.role || 'viewer',
                    status: 'active',
                    twoFactorEnabled: false,
                    mustChangePassword: false,
                    mustSetup2Fa: false,
                    createdAt: syncNow,
                    updatedAt: syncNow,
                  }).onConflictDoNothing();
                  adminRows = await db.select().from(admins).where(eq(admins.id, payload.adminId)).limit(1);
                }
              } catch {}
            }
            if (adminRows.length > 0) {
              const fallbackAdmin = adminRows[0];
              if (fallbackAdmin.status === 'active' && !fallbackAdmin.deletedAt && (!fallbackAdmin.expiresAt || now <= fallbackAdmin.expiresAt)) {
                try {
                  await db.insert(sessions).values({
                    id: payload.sessionId || crypto.randomUUID(),
                    adminId: fallbackAdmin.id,
                    tokenHash,
                    ipAddress: '127.0.0.1',
                    userAgent: 'Serverless Worker',
                    expiresAt: payload.expiresAt,
                    lastActiveAt: now,
                    twoFactorVerified: Boolean(payload.twoFactorVerified),
                    createdAt: now,
                  });
                } catch {}

                const result: SessionValidationResult = {
                  valid: true,
                  admin: {
                    id: fallbackAdmin.id,
                    email: fallbackAdmin.email,
                    name: fallbackAdmin.name,
                    role: fallbackAdmin.role,
                    twoFactorEnabled: Boolean(fallbackAdmin.twoFactorEnabled),
                    mustChangePassword: Boolean(fallbackAdmin.mustChangePassword),
                    mustSetup2Fa: Boolean(fallbackAdmin.mustSetup2Fa),
                  },
                  session: {
                    id: payload.sessionId || 'serverless-session',
                    expiresAt: payload.expiresAt,
                    lastActiveAt: now,
                    twoFactorVerified: Boolean(payload.twoFactorVerified),
                  },
                };
                sessionValidationCache.set(tokenHash, { result, timestamp: now });
                return result;
              }
            }
          }
        }
      }
    } catch {}

    return { valid: false, reason: 'invalid' };
  }

  const { session, admin } = rows[0];

  if (admin.status !== 'active') {
    return { valid: false, reason: 'invalid' };
  }

  if (admin.deletedAt) {
    return { valid: false, reason: 'deleted' };
  }

  if (admin.expiresAt && now > admin.expiresAt) {
    return { valid: false, reason: 'account_expired' };
  }

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
        name: admin.name,
        role: admin.role,
        twoFactorEnabled: admin.twoFactorEnabled,
        mustChangePassword: Boolean(admin.mustChangePassword),
        mustSetup2Fa: Boolean(admin.mustSetup2Fa),
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        lastActiveAt: session.lastActiveAt,
        twoFactorVerified: false,
      },
    };
  }

  // Touch session's lastActiveAt asynchronously only once every 60 seconds
  if (now - session.lastActiveAt > 60 * 1000) {
    db.update(sessions)
      .set({ lastActiveAt: now })
      .where(eq(sessions.id, session.id))
      .catch(() => {});
  }

  const result: SessionValidationResult = {
    valid: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      twoFactorEnabled: admin.twoFactorEnabled,
      mustChangePassword: Boolean(admin.mustChangePassword),
      mustSetup2Fa: Boolean(admin.mustSetup2Fa),
    },
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
      lastActiveAt: now,
      twoFactorVerified: true,
    },
  };

  sessionValidationCache.set(tokenHash, { result, timestamp: now });
  return result;
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
