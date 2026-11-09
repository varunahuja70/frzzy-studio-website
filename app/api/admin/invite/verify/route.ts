import { getClientIp } from '@/lib/client-ip';
import { isOverLimit } from '@/lib/request-limit';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminInvite } from '@/lib/auth/invites';
import { generateTotpSetup } from '@/lib/auth/totp';

export async function GET(req: NextRequest) {
  try {
    if (isOverLimit('invite-verify', getClientIp(req), 30, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    const res = await verifyAdminInvite(token);
    if (!res.valid || !res.admin) {
      return NextResponse.json({ error: 'This invite link is invalid or has expired' }, { status: 400 });
    }

    const totp = await generateTotpSetup(res.admin.email);

    return NextResponse.json({
      valid: true,
      admin: res.admin,
      totp: {
        secret: totp.secret,
        qrCodeDataUrl: totp.qrCodeDataUrl,
      },
    });
  } catch (err) {
    console.error('Verify invite error:', err);
    return NextResponse.json({ error: 'Failed to verify invite link' }, { status: 500 });
  }
}
