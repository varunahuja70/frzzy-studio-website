import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAdminSession, destroyAllAdminSessions } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission, ensureNotLastSuperAdmin } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';

const UpdateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.string().min(1).optional(),
  customPermissions: z.array(z.string()).optional(),
  leadScope: z.object({
    statuses: z.array(z.enum(['new', 'contacted', 'in_progress', 'won', 'lost', 'spam'])).optional(),
    assignedToMe: z.boolean().optional(),
    sources: z.array(z.string()).optional(),
    maxAgeDays: z.number().int().positive().optional(),
  }).optional().nullable(),
  status: z.enum(['active', 'disabled']).optional(),
  expiresAt: z.number().nullable().optional(),
});

export async function PATCH(
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

    // Enforce Reauth Grant
    const grantCookie = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grantCookie, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    const json = await req.json();
    const parsed = UpdateUserSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid update parameters' }, { status: 400 });
    }

    await ensureDatabaseReady();

    const targetRows = await db
      .select()
      .from(admins)
      .where(and(eq(admins.id, targetId), isNull(admins.deletedAt)))
      .limit(1);

    if (targetRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const current = targetRows[0];
    const updateData = parsed.data;

    // Last Super Admin protection check
    if (
      current.role === 'superadmin' &&
      ((updateData.role && updateData.role !== 'superadmin') ||
        (updateData.status && updateData.status !== 'active'))
    ) {
      await ensureNotLastSuperAdmin(targetId);
    }

    const now = Date.now();
    const setPayload: Record<string, any> = {
      updatedAt: now,
    };

    if (updateData.name !== undefined) setPayload.name = updateData.name;
    if (updateData.role !== undefined) setPayload.role = updateData.role;
    if (updateData.status !== undefined) setPayload.status = updateData.status;
    if (updateData.customPermissions !== undefined) {
      setPayload.customPermissions = JSON.stringify(updateData.customPermissions);
    }
    if (updateData.leadScope !== undefined) {
      setPayload.leadScope = updateData.leadScope ? JSON.stringify(updateData.leadScope) : null;
    }
    if (updateData.expiresAt !== undefined) setPayload.expiresAt = updateData.expiresAt;

    await db.update(admins).set(setPayload).where(eq(admins.id, targetId));

    // If disabled or role changed, invalidate target user's active sessions immediately
    if (
      (updateData.status && updateData.status === 'disabled') ||
      (updateData.role && updateData.role !== current.role)
    ) {
      await destroyAllAdminSessions(targetId);
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'USER_UPDATED',
      resource: current.email,
      details: {
        targetId,
        before: { role: current.role, status: current.status },
        after: { role: updateData.role ?? current.role, status: updateData.status ?? current.status },
      },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (err: any) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user' }, { status: 400 });
  }
}

export async function DELETE(
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

    // Enforce Reauth Grant
    const grantCookie = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grantCookie, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

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

    // Protect last active Super Admin
    if (target.role === 'superadmin') {
      await ensureNotLastSuperAdmin(targetId);
    }

    // Soft-delete with timestamp
    const now = Date.now();
    await db
      .update(admins)
      .set({
        deletedAt: now,
        status: 'disabled',
        updatedAt: now,
      })
      .where(eq(admins.id, targetId));

    // Immediately kill all active sessions
    await destroyAllAdminSessions(targetId);

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'USER_DELETED',
      resource: target.email,
      details: { targetId, softDeleted: true },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, message: 'User soft-deleted and all sessions revoked' });
  } catch (err: any) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete user' }, { status: 400 });
  }
}
