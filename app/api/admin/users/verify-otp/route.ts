import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { verifyUserCreationOtp } from '@/lib/auth/otp-service';
import { logAuditEvent } from '@/lib/auth/audit';
import { getClientIp } from '@/lib/client-ip';

const VerifyOtpSchema = z.object({
  verificationId: z.string().uuid(),
  otp: z.string().trim().length(6, 'Verification code must be exactly 6 digits'),
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
    const parsed = VerifyOtpSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid verification data' }, { status: 400 });
    }

    const { verificationId, otp } = parsed.data;

    const result = await verifyUserCreationOtp(verificationId, otp);

    if (!result.success || !result.user) {
      return NextResponse.json({ error: result.error || 'Verification failed' }, { status: 400 });
    }

    const ip = getClientIp(req);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'USER_CREATED',
      resource: result.user.email,
      details: {
        userId: result.user.id,
        role: result.user.role,
        verifiedViaOtp: true,
      },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Account successfully verified and created across Supabase and Vault.',
      user: result.user,
    });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ error: err.message || 'Verification service error' }, { status: 500 });
  }
}
