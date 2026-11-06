import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins, recoveryCodes, sessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyTotpToken, verifyRecoveryCode } from '@/lib/auth/totp';
import { createAdminSession, SESSION_COOKIE_NAME, ABSOLUTE_TIMEOUT_MS } from '@/lib/auth/session';
import { recordLoginAttempt } from '@/lib/auth/rate-limit';
import { logAuditEvent } from '@/lib/auth/audit';

const TwoFactorSchema = z.object({
  code: z.string().trim().min(6).max(20),
  isRecoveryCode: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const currentToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!currentToken) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
    }

    const json = await req.json();
    const result = TwoFactorSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid verification code format' }, { status: 400 });
    }

    const { code, isRecoveryCode } = result.data;
    await ensureDatabaseReady();

    const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');

    // Fetch session and admin
    const sessionRows = await db
      .select({
        session: sessions,
        admin: admins,
      })
      .from(sessions)
      .innerJoin(admins, eq(sessions.adminId, admins.id))
      .where(eq(sessions.tokenHash, currentTokenHash))
      .limit(1);

    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Session invalid or expired' }, { status: 401 });
    }

    const { session, admin } = sessionRows[0];

    let verified = false;
    let usedRecoveryCodeId: string | null = null;

    if (isRecoveryCode) {
      // Check recovery codes
      const codes = await db
        .select()
        .from(recoveryCodes)
        .where(and(eq(recoveryCodes.adminId, admin.id), eq(recoveryCodes.used, false)));

      for (const rc of codes) {
        if (verifyRecoveryCode(code, rc.codeHash)) {
          verified = true;
          usedRecoveryCodeId = rc.id;
          break;
        }
      }
    } else {
      // Verify TOTP token
      if (admin.twoFactorSecret) {
        verified = verifyTotpToken(code, admin.twoFactorSecret);
      }
    }

    if (!verified) {
      await recordLoginAttempt(admin.email, ip, false, isRecoveryCode ? 'bad_recovery_code' : 'bad_totp');
      await logAuditEvent({
        adminId: admin.id,
        action: 'TWO_FACTOR_FAILED',
        resource: admin.email,
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json(
        { error: isRecoveryCode ? 'Invalid or already used recovery code' : 'Invalid 2FA code. Check your authenticator app.' },
        { status: 401 }
      );
    }

    // If recovery code was used, mark it as consumed
    if (usedRecoveryCodeId) {
      await db
        .update(recoveryCodes)
        .set({ used: true, usedAt: Date.now() })
        .where(eq(recoveryCodes.id, usedRecoveryCodeId));

      await logAuditEvent({
        adminId: admin.id,
        action: 'RECOVERY_CODE_USED',
        resource: admin.email,
        ipAddress: ip,
        userAgent,
      });
    }

    // Rotate session to prevent session fixation attack!
    await db.delete(sessions).where(eq(sessions.id, session.id));

    const { token: newSessionToken, csrfToken: newCsrfToken } = await createAdminSession({
      adminId: admin.id,
      ipAddress: ip,
      userAgent,
      twoFactorVerified: true,
    });

    await recordLoginAttempt(admin.email, ip, true, 'success');
    await logAuditEvent({
      adminId: admin.id,
      action: 'LOGIN_SUCCESS',
      resource: admin.email,
      ipAddress: ip,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });

    // Set full 8-hour session cookie with strict security flags
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: newSessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: Math.floor(ABSOLUTE_TIMEOUT_MS / 1000),
    });

    response.cookies.set({
      name: 'admin_csrf',
      value: newCsrfToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: Math.floor(ABSOLUTE_TIMEOUT_MS / 1000),
    });

    return response;
  } catch (err) {
    console.error('2FA verification error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
