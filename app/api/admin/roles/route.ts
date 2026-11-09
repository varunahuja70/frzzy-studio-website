import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission, ALL_PERMISSIONS } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { roles, admins } from '@/lib/db/schema';
import { eq, sql, desc, isNull, and } from 'drizzle-orm';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';

const CreateRoleSchema = z.object({
  name: z.string().trim().min(2).max(64),
  description: z.string().trim().max(256).optional(),
  permissions: z.array(z.string()).min(1),
  defaultLeadScope: z.object({
    statuses: z.array(z.enum(['new', 'contacted', 'in_progress', 'won', 'lost', 'spam'])).optional(),
    assignedToMe: z.boolean().optional(),
    sources: z.array(z.string()).optional(),
    maxAgeDays: z.number().int().positive().optional(),
  }).optional(),
  ipAllowlist: z.string().optional(),
  sessionTimeoutMinutes: z.number().int().min(5).max(1440).default(60),
});

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'users:manage')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin privilege required' }, { status: 403 });
    }

    await ensureDatabaseReady();

    const allRoles = await db.select().from(roles).orderBy(desc(roles.isBuiltIn), roles.name);

    // Count users assigned to each role
    const userCounts = await db
      .select({
        roleId: admins.role,
        count: sql<number>`count(*)`,
      })
      .from(admins)
      .where(isNull(admins.deletedAt))
      .groupBy(admins.role);

    const countMap = new Map<string, number>();
    userCounts.forEach((u) => countMap.set(u.roleId, Number(u.count)));

    const result = allRoles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isBuiltIn: Boolean(r.isBuiltIn),
      permissions: JSON.parse(r.permissions || '[]'),
      defaultLeadScope: r.defaultLeadScope ? JSON.parse(r.defaultLeadScope) : null,
      ipAllowlist: r.ipAllowlist,
      sessionTimeoutMinutes: r.sessionTimeoutMinutes,
      assignedUsersCount: countMap.get(r.id) || 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({ roles: result, availablePermissions: ALL_PERMISSIONS });
  } catch (err) {
    console.error('Fetch roles error:', err);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    const parsed = CreateRoleSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid role data' }, { status: 400 });
    }

    const data = parsed.data;

    // Privilege escalation prevention: users:manage CANNOT be assigned to any custom role
    const sanitizedPermissions = data.permissions.filter(
      (p) => ALL_PERMISSIONS.includes(p as any) && p !== 'users:manage'
    );

    if (sanitizedPermissions.length === 0) {
      return NextResponse.json({ error: 'At least one valid permission must be selected' }, { status: 400 });
    }

    await ensureDatabaseReady();

    // Check unique role name
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, data.name))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: `A role named "${data.name}" already exists` }, { status: 409 });
    }

    const roleId = crypto.randomUUID();
    const now = Date.now();

    await db.insert(roles).values({
      id: roleId,
      name: data.name,
      description: data.description || null,
      isBuiltIn: false,
      permissions: JSON.stringify(sanitizedPermissions),
      defaultLeadScope: data.defaultLeadScope ? JSON.stringify(data.defaultLeadScope) : null,
      ipAllowlist: data.ipAllowlist || null,
      sessionTimeoutMinutes: data.sessionTimeoutMinutes,
      createdAt: now,
      updatedAt: now,
    });

    const ip = getClientIp(req);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'ROLE_CREATED',
      resource: data.name,
      details: { roleId, permissionsCount: sanitizedPermissions.length },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      role: {
        id: roleId,
        name: data.name,
        permissions: sanitizedPermissions,
      },
    });
  } catch (err) {
    console.error('Create role error:', err);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
