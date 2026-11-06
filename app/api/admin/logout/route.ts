import { NextRequest, NextResponse } from 'next/server';
import { destroySession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/auth/audit';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (token) {
      await destroySession(token);
      await logAuditEvent({
        action: 'LOGOUT',
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || undefined,
      });
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete('admin_csrf');

    return response;
  } catch {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
