import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins, recoveryCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkLoginLockout, recordLoginAttempt } from '@/lib/auth/rate-limit';
import { createAdminSession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { generateTotpSetup, generateRecoveryCodes } from '@/lib/auth/totp';
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

    let admin = existingAdmins[0];
    let passwordValid = false;

    if (admin) {
      if (admin.status !== 'active') {
        await recordLoginAttempt(email, ip, false, 'account_disabled');
        await ensureMinResponseTime();
        return NextResponse.json({ error: 'Account disabled. Contact engineering.' }, { status: 403 });
      }
      passwordValid = await verifyPassword(password, admin.passwordHash, admin.salt);
    }

    // Supabase Auth verification fallback
    if (!passwordValid) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnonKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const sbClient = createClient(supabaseUrl, supabaseAnonKey);
          const { data: sbData, error: sbError } = await sbClient.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password,
          });

          if (!sbError && sbData?.user) {
            passwordValid = true;
            const sbUser = sbData.user;
            let userRole = 'viewer';
            let userName = (sbUser.user_metadata?.name as string) || null;
            let userStatus = 'active';

            try {
              const adminSb = getAdminSupabaseClient();
              const { data: profile } = await (adminSb.from('profiles') as any)
                .select('*')
                .eq('id', sbUser.id)
                .single();
              if (profile) {
                const p = profile as any;
                userRole = p.role || userRole;
                userName = p.name || userName;
                userStatus = p.status || userStatus;
              }
            } catch {}

            if (userStatus !== 'active') {
              await recordLoginAttempt(email, ip, false, 'account_disabled');
              await ensureMinResponseTime();
              return NextResponse.json({ error: 'Account disabled. Contact engineering.' }, { status: 403 });
            }

            const { hash, salt } = await hashPassword(password);
            const now = Date.now();

            if (!admin) {
              await db.insert(admins).values({
                id: sbUser.id,
                name: userName,
                email: email.toLowerCase().trim(),
                passwordHash: hash,
                salt,
                role: userRole,
                status: 'active',
                mustChangePassword: false,
                mustSetup2Fa: false,
                twoFactorEnabled: false,
                createdAt: now,
                updatedAt: now,
              }).onConflictDoUpdate({
                target: admins.id,
                set: {
                  passwordHash: hash,
                  salt,
                  role: userRole,
                  status: 'active',
                  updatedAt: now,
                }
              });

              admin = {
                id: sbUser.id,
                name: userName,
                email: email.toLowerCase().trim(),
                passwordHash: hash,
                salt,
                role: userRole,
                status: 'active',
                mustChangePassword: false,
                mustSetup2Fa: false,
                twoFactorEnabled: false,
                twoFactorSecret: null,
                customPermissions: null,
                leadScope: null,
                expiresAt: null,
                deletedAt: null,
                lastLoginAt: now,
                createdAt: now,
                updatedAt: now,
              } as any;
            } else {
              await db
                .update(admins)
                .set({ passwordHash: hash, salt, role: userRole, updatedAt: now })
                .where(eq(admins.id, admin.id));
            }
          }
        }
      } catch (sbErr) {
        console.error('[login] Supabase auth fallback error:', sbErr);
      }
    }

    if (!passwordValid || !admin) {
      await recordLoginAttempt(email, ip, false, 'invalid_password');
      await logAuditEvent({
        adminId: admin?.id,
        action: 'LOGIN_FAILED',
        resource: email,
        ipAddress: ip,
        userAgent,
      });
      await ensureMinResponseTime();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const has2FaConfigured = Boolean(admin.twoFactorEnabled && admin.twoFactorSecret);

    if (has2FaConfigured) {
      // 2FA is active: create step-1 temporary session (twoFactorVerified: false)
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
        message: 'Password verified. Enter your 6-digit authenticator code.',
      });

      // Set temporary step-1 session cookie (10 minutes)
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 10,
      });

      response.cookies.set({
        name: 'admin_csrf',
        value: csrfToken,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 10,
      });

      return response;
    } else {
      // 2FA not yet configured: Log in directly to allow configuration in Security Settings
      const { token, csrfToken } = await createAdminSession({
        adminId: admin.id,
        ipAddress: ip,
        userAgent,
        twoFactorVerified: true,
      });

      await recordLoginAttempt(email, ip, true, 'password_only');
      await logAuditEvent({
        adminId: admin.id,
        action: 'LOGIN_SUCCESS',
        resource: email,
        ipAddress: ip,
        userAgent,
      });

      await ensureMinResponseTime();

      const response = NextResponse.json({
        success: true,
        requires2Fa: false,
        email: admin.email,
        message: 'Login successful.',
      });

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      response.cookies.set({
        name: 'admin_csrf',
        value: csrfToken,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return response;
    }
  } catch (err) {
    console.error('Admin login error:', err);
    await ensureMinResponseTime();
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
  }
}
