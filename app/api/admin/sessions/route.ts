import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateAdminSession, SESSION_COOKIE_NAME, destroySession, destroyAllAdminSessions } from '@/lib/auth/session';
import { db, ensureDatabaseReady } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq, and, ne, desc } from 'drizzle-orm';
import { logAuditEvent } from '@/lib/auth/audit';

function maskIp(ip: string): string {
  if (ip.includes('.')) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts[0]}:${parts[1]}:****:****`;
  }
  return '***.***.***.***';
}

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin || !sessionRes.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDatabaseReady();

    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.adminId, sessionRes.admin.id))
      .orderBy(desc(sessions.lastActiveAt));

    const currentSessionId = sessionRes.session.id;

    const formatted = allSessions.map((s) => ({
      id: s.id,
      ipMasked: maskIp(s.ipAddress),
      userAgent: s.userAgent,
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === currentSessionId,
    }));

    return NextResponse.json({ sessions: formatted });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin || !sessionRes.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetSessionId = searchParams.get('id');
    const action = searchParams.get('action'); // 'revoke_other'

    await ensureDatabaseReady();

    if (action === 'revoke_other') {
      await db
        .delete(sessions)
        .where(
          and(
            eq(sessions.adminId, sessionRes.admin.id),
            ne(sessions.id, sessionRes.session.id)
          )
        );

      await logAuditEvent({
        adminId: sessionRes.admin.id,
        action: 'LOGOUT_ALL',
        details: { action: 'revoked_all_other_sessions' },
        ipAddress: getClientIp(req),
      });

      return NextResponse.json({ success: true, message: 'All other sessions revoked.' });
    }

    if (targetSessionId) {
      await db
        .delete(sessions)
        .where(
          and(
            eq(sessions.adminId, sessionRes.admin.id),
            eq(sessions.id, targetSessionId)
          )
        );

      return NextResponse.json({ success: true, message: 'Session revoked.' });
    }

    return NextResponse.json({ error: 'Session ID or action required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    await db
      .update(sessions)
      .set({ lastActiveAt: now })
      .where(eq(sessions.id, sessionRes.session.id));

    return NextResponse.json({ success: true, lastActiveAt: now });
  } catch {
    return NextResponse.json({ error: 'Failed to update session activity' }, { status: 500 });
  }
}
