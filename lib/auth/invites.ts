import crypto from 'crypto';
import { db, ensureDatabaseReady } from '@/lib/db';
import { invites, admins } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ADMIN_PATH } from '@/lib/auth/config';

export interface InviteCreationResult {
  token: string;
  inviteUrl: string;
  expiresAt: number;
}

/**
 * Creates a cryptographically secure, 24-hour single-use invite token for an admin.
 */
export async function createAdminInvite(adminId: string, baseUrl?: string): Promise<InviteCreationResult> {
  await ensureDatabaseReady();

  // Invalidate any previous unused invites for this admin
  await db
    .delete(invites)
    .where(and(eq(invites.adminId, adminId), eq(invites.used, false)));

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

  await db.insert(invites).values({
    id: crypto.randomUUID(),
    adminId,
    tokenHash,
    expiresAt,
    used: false,
    createdAt: now,
  });

  const domain = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const inviteUrl = `${domain}/${ADMIN_PATH}/invite?token=${token}`;

  return {
    token,
    inviteUrl,
    expiresAt,
  };
}

/**
 * Verifies an invite token and returns the corresponding admin if valid.
 */
export async function verifyAdminInvite(token: string): Promise<{
  valid: boolean;
  admin?: { id: string; email: string; name: string | null };
  reason?: string;
}> {
  if (!token) return { valid: false, reason: 'missing_token' };

  await ensureDatabaseReady();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const rows = await db
    .select({
      invite: invites,
      admin: admins,
    })
    .from(invites)
    .innerJoin(admins, eq(invites.adminId, admins.id))
    .where(eq(invites.tokenHash, tokenHash))
    .limit(1);

  if (rows.length === 0) {
    return { valid: false, reason: 'invalid_token' };
  }

  const { invite, admin } = rows[0];

  if (invite.used) {
    return { valid: false, reason: 'already_used' };
  }

  if (Date.now() > invite.expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  if (admin.status !== 'active') {
    return { valid: false, reason: 'admin_disabled' };
  }

  return {
    valid: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  };
}

/**
 * Consumes an invite token upon successful password setup.
 */
export async function consumeAdminInvite(token: string): Promise<boolean> {
  await ensureDatabaseReady();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const res = await db
    .update(invites)
    .set({
      used: true,
      usedAt: Date.now(),
    })
    .where(and(eq(invites.tokenHash, tokenHash), eq(invites.used, false)));

  return res.rowsAffected > 0;
}
