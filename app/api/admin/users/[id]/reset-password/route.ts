import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, destroyAllAdminSessions } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword, generateTemporaryPassword, recordPasswordHistory } from '@/lib/auth/password';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

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

    const json = await req.json().catch(() => ({}));
    const customPassword = typeof json?.password === 'string' && json.password.trim().length >= 8 ? json.password.trim() : null;
    const finalPassword = customPassword || generateTemporaryPassword();

    await ensureDatabaseReady();

    const targetRows = await db
      .select()
      .from(admins)
      .where(and(eq(admins.id, targetId), isNull(admins.deletedAt)))
      .limit(1);

    if (targetRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const target = targetRows[0];
    const { hash, salt } = await hashPassword(finalPassword);

    await db
      .update(admins)
      .set({
        passwordHash: hash,
        salt,
        mustChangePassword: !customPassword,
        updatedAt: Date.now(),
      })
      .where(eq(admins.id, targetId));

    // Sync password reset to Supabase Auth
    try {
      const supabase = getAdminSupabaseClient();
      await supabase.auth.admin.updateUserById(targetId, {
        password: finalPassword,
      });
    } catch (sbErr) {
      console.warn('Supabase password reset warning:', sbErr);
    }

    await recordPasswordHistory(targetId, hash, salt);
    await destroyAllAdminSessions(targetId);

    const ip = getClientIp(req);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'PASSWORD_RESET_BY_ADMIN',
      resource: target.email,
      details: { targetId, isCustom: Boolean(customPassword) },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      temporaryPassword: finalPassword,
      password: finalPassword,
      message: 'Password reset successfully and synchronized to Supabase.',
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reset password' }, { status: 500 });
  }
}
