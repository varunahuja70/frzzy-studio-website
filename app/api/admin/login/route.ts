import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/password';
import { checkLoginLockout, recordLoginAttempt } from '@/lib/auth/rate-limit';
import { createAdminSession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/auth/audit';

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(256),
  // Anti-bot honeypot
  studioToken: z.string().max(0).optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Equalize timing helper to mitigate timing side-channel attacks
  const ensureMinResponseTime = async () => {
    const elapsed = Date.now() - startTime;
    const targetMs = 450; // Constant response time window
    if (elapsed < targetMs) {
      await new Promise((resolve) => setTimeout(resolve, targetMs - elapsed));
    }
  };

  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const json = await req.json();
    const result = LoginSchema.safeParse(json);

    if (!result.success) {
      await ensureMinResponseTime();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    const { email, password, studioToken } = result.data;

    // Honeypot check
    if (studioToken && studioToken.length > 0) {
      await ensureMinResponseTime();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // Check progressive brute-force lockout
    const lockout = await checkLoginLockout(email, ip);
    if (lockout.isLocked) {
      await logAuditEvent({
        action: 'LOGIN_LOCKOUT',
        resource: email,
        details: { remainingSeconds: lockout.remainingSeconds },
        ipAddress: ip,
        userAgent,
      });
      await ensureMinResponseTime();
      return NextResponse.json(
        {
          error: `Account temporarily locked due to repeated failures. Try again in ${lockout.remainingSeconds} seconds.`,
          locked: true,
          remainingSeconds: lockout.remainingSeconds,
        },
        { status: 429 }
      );
    }

    await ensureDatabaseReady();

    const existingAdmins = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingAdmins.length === 0) {
      // Simulate dummy password verification to neutralize timing discovery
      await verifyPassword(
        password,
        '$argon2id$v=19$m=65536,t=3,p=4$dummySalt12345678$dummyHashDummyHashDummyHashDummyHashDummyH',
        'dummySalt12345678'
      );
      await recordLoginAttempt(email, ip, false, 'unknown_user');
      await ensureMinResponseTime();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const admin = existingAdmins[0];

    if (admin.status !== 'active') {
      await recordLoginAttempt(email, ip, false, 'account_disabled');
      await ensureMinResponseTime();
      return NextResponse.json({ error: 'Account disabled. Contact engineering.' }, { status: 403 });
    }

    const passwordValid = await verifyPassword(password, admin.passwordHash, admin.salt);

    if (!passwordValid) {
      await recordLoginAttempt(email, ip, false, 'invalid_password');
      await logAuditEvent({
        adminId: admin.id,
        action: 'LOGIN_FAILED',
        resource: email,
        ipAddress: ip,
        userAgent,
      });
      await ensureMinResponseTime();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session (twoFactorVerified = false until Step 2 is completed)
    const { token, csrfToken } = await createAdminSession({
      adminId: admin.id,
      ipAddress: ip,
      userAgent,
      twoFactorVerified: false,
    });

    await ensureMinResponseTime();

    const response = NextResponse.json({
      requires2Fa: true,
      email: admin.email,
      message: 'Password verified. Enter your two-factor authenticator code.',
    });

    // Set temporary step-1 session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 15, // 15 mins to complete 2FA
    });

    response.cookies.set({
      name: 'admin_csrf',
      value: csrfToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 15,
    });

    return response;
  } catch (err) {
    console.error('Admin login error:', err);
    await ensureMinResponseTime();
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
  }
}
