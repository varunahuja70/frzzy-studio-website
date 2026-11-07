import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminInvite, consumeAdminInvite } from '@/lib/auth/invites';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, validatePasswordPolicy, recordPasswordHistory } from '@/lib/auth/password';
import { verifyTotpToken } from '@/lib/auth/totp';
import { createAdminSession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/auth/audit';

const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12).max(256),
  totpSecret: z.string().min(16),
  totpCode: z.string().min(6).max(8),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = AcceptInviteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid registration payload' }, { status: 400 });
    }

    const { token, password, totpSecret, totpCode } = parsed.data;

    // 1. Verify invite token
    const inviteRes = await verifyAdminInvite(token);
    if (!inviteRes.valid || !inviteRes.admin) {
      return NextResponse.json({ error: 'Invite link is invalid or has expired' }, { status: 400 });
    }

    // 2. Validate password strength
    const policy = await validatePasswordPolicy(password);
    if (!policy.valid) {
      return NextResponse.json({ error: policy.errors[0] || 'Password does not meet strength requirements' }, { status: 400 });
    }

    // 3. Verify TOTP setup code
    const isTotpValid = verifyTotpToken(totpCode, totpSecret);
    if (!isTotpValid) {
      return NextResponse.json({ error: 'Invalid 6-digit Authenticator code. Check your authenticator app.' }, { status: 400 });
    }

    await ensureDatabaseReady();

    // 4. Hash password with Argon2id
    const { hash, salt } = await hashPassword(password);
    const now = Date.now();

    // 5. Update admin record
    await db
      .update(admins)
      .set({
        passwordHash: hash,
        salt,
        twoFactorSecret: totpSecret,
        twoFactorEnabled: true,
        mustChangePassword: false,
        mustSetup2Fa: false,
        updatedAt: now,
      })
      .where(eq(admins.id, inviteRes.admin.id));

    // Record in password history
    await recordPasswordHistory(inviteRes.admin.id, hash, salt);

    // 6. Consume invite single-use token
    await consumeAdminInvite(token);

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 7. Create authenticated session
    const { token: sessionToken, csrfToken } = await createAdminSession({
      adminId: inviteRes.admin.id,
      ipAddress: ip,
      userAgent,
      twoFactorVerified: true,
    });

    await logAuditEvent({
      adminId: inviteRes.admin.id,
      action: 'INVITE_ACCEPTED',
      resource: inviteRes.admin.email,
      details: { twoFactorEnabled: true },
      ipAddress: ip,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account initialized successfully. Welcome to FRXCX Studio.',
    });

    // Set authenticated session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    response.cookies.set({
      name: 'admin_csrf',
      value: csrfToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (err) {
    console.error('Accept invite error:', err);
    return NextResponse.json({ error: 'Failed to process invite' }, { status: 500 });
  }
}
