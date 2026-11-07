import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, destroyAllAdminSessions } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await props.params;

    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'users:manage')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin privilege required' }, { status: 403 });
    }

    const grantCookie = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grantCookie, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    await ensureDatabaseReady();

    const targetRows = await db
      .select({ email: admins.email })
      .from(admins)
      .where(and(eq(admins.id, targetId), isNull(admins.deletedAt)))
      .limit(1);

    if (targetRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await destroyAllAdminSessions(targetId);

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'SESSIONS_REVOKED_BY_ADMIN',
      resource: targetRows[0].email,
      details: { targetId },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'All active sessions for this user have been terminated.',
    });
  } catch (err: any) {
    console.error('Revoke sessions error:', err);
    return NextResponse.json({ error: err.message || 'Failed to revoke sessions' }, { status: 500 });
  }
}
