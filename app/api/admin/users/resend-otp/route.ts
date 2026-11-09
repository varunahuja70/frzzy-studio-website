import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { otpVerifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendOtpVerificationEmail } from '@/lib/email/sender';

const ResendSchema = z.object({
  verificationId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'users:manage')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin privilege required' }, { status: 403 });
    }

    const json = await req.json();
    const parsed = ResendSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid verification session' }, { status: 400 });
    }

    await ensureDatabaseReady();

    const rows = await db
      .select()
      .from(otpVerifications)
      .where(eq(otpVerifications.id, parsed.data.verificationId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Verification session expired or not found' }, { status: 404 });
    }

    const session = rows[0];
    if (session.verified) {
      return NextResponse.json({ error: 'This verification has already been completed' }, { status: 400 });
    }

    // Generate new OTP
    const randomNum = crypto.randomInt(100000, 999999);
    const newOtp = randomNum.toString();
    const newOtpHash = crypto.createHash('sha256').update(newOtp).digest('hex');
    const now = Date.now();
    const newExpiresAt = now + 10 * 60 * 1000;

    await db
      .update(otpVerifications)
      .set({
        otpHash: newOtpHash,
        attempts: 0,
        expiresAt: newExpiresAt,
      })
      .where(eq(otpVerifications.id, session.id));

    const payload = JSON.parse(session.payload);

    const emailRes = await sendOtpVerificationEmail({
      email: session.email,
      name: payload.name || 'Admin',
      otp: newOtp,
      role: payload.role || 'viewer',
      expiresInMinutes: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'A new verification code has been dispatched.',
      sentToEmail: emailRes.sentToEmail,
      debugOtp: process.env.NODE_ENV !== 'production' ? emailRes.debugOtp : undefined,
    });
  } catch (err: any) {
    console.error('Resend OTP error:', err);
    return NextResponse.json({ error: 'Failed to resend code' }, { status: 500 });
  }
}
