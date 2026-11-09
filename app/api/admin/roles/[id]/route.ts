import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission, ALL_PERMISSIONS } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { roles, admins } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';

const UpdateRoleSchema = z.object({
  name: z.string().trim().min(2).max(64).optional(),
  description: z.string().trim().max(256).optional().nullable(),
  permissions: z.array(z.string()).min(1).optional(),
  defaultLeadScope: z.object({
    statuses: z.array(z.enum(['new', 'contacted', 'in_progress', 'won', 'lost', 'spam'])).optional(),
    assignedToMe: z.boolean().optional(),
    sources: z.array(z.string()).optional(),
    maxAgeDays: z.number().int().positive().optional(),
  }).optional().nullable(),
  ipAllowlist: z.string().optional().nullable(),
  sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
});

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await props.params;

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

    const json = await req.json();
    const parsed = UpdateRoleSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid role parameters' }, { status: 400 });
    }

    await ensureDatabaseReady();

    const existingRows = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const currentRole = existingRows[0];
    if (currentRole.isBuiltIn) {
      return NextResponse.json(
        { error: 'Built-in system roles cannot be modified. Create a custom role instead.' },
        { status: 403 }
      );
    }

    const updateData = parsed.data;
    const setPayload: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (updateData.name !== undefined) setPayload.name = updateData.name;
    if (updateData.description !== undefined) setPayload.description = updateData.description;
    if (updateData.permissions !== undefined) {
      // Privilege escalation filter
      const sanitized = updateData.permissions.filter(
        (p) => ALL_PERMISSIONS.includes(p as any) && p !== 'users:manage'
      );
      setPayload.permissions = JSON.stringify(sanitized);
    }
    if (updateData.defaultLeadScope !== undefined) {
      setPayload.defaultLeadScope = updateData.defaultLeadScope ? JSON.stringify(updateData.defaultLeadScope) : null;
    }
    if (updateData.ipAllowlist !== undefined) setPayload.ipAllowlist = updateData.ipAllowlist;
    if (updateData.sessionTimeoutMinutes !== undefined) setPayload.sessionTimeoutMinutes = updateData.sessionTimeoutMinutes;

    await db.update(roles).set(setPayload).where(eq(roles.id, roleId));

    const ip = getClientIp(req);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'ROLE_UPDATED',
      resource: currentRole.name,
      details: { roleId, updateData },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, message: 'Custom role updated successfully' });
  } catch (err: any) {
    console.error('Update role error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await props.params;

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

    const existingRows = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const roleToDelete = existingRows[0];
    if (roleToDelete.isBuiltIn) {
      return NextResponse.json(
        { error: 'System violation: Built-in roles cannot be deleted.' },
        { status: 403 }
      );
    }

    // Check if any active users have this role
    const assignedUsers = await db
      .select({ id: admins.id })
      .from(admins)
      .where(and(eq(admins.role, roleId), isNull(admins.deletedAt)))
      .limit(1);

    if (assignedUsers.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete this role: users are currently assigned to it. Reassign users first.' },
        { status: 400 }
      );
    }

    await db.delete(roles).where(eq(roles.id, roleId));

    const ip = getClientIp(req);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'ROLE_DELETED',
      resource: roleToDelete.name,
      details: { roleId },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, message: 'Role deleted successfully' });
  } catch (err: any) {
    console.error('Delete role error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete role' }, { status: 500 });
  }
}
