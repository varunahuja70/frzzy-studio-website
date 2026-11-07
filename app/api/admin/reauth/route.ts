import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/auth/audit';
import { createReauthGrant } from '@/lib/auth/reauth';

const ReauthSchema = z.object({
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const parsed = ReauthSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const adminRows = await db
      .select()
      .from(admins)
      .where(eq(admins.id, sessionRes.admin.id))
      .limit(1);

    if (adminRows.length === 0) {
      return NextResponse.json({ error: 'Admin record not found' }, { status: 404 });
    }

    const admin = adminRows[0];
    const passwordValid = await verifyPassword(parsed.data.password, admin.passwordHash, admin.salt);

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (!passwordValid) {
      await logAuditEvent({
        adminId: admin.id,
        action: 'LOGIN_FAILED',
        details: { context: 'REAUTH_ATTEMPT_FAILED' },
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || undefined,
      });
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Generate short-lived reauth token valid for 5 minutes (300s)
    const signedGrant = createReauthGrant(sessionRes.admin.id, 300000);

    const response = NextResponse.json({
      success: true,
      message: 'Re-authentication verified.',
    });

    response.cookies.set({
      name: 'admin_reauth_grant',
      value: signedGrant,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 300, // 5 minutes
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Re-auth processing error' }, { status: 500 });
  }
}
