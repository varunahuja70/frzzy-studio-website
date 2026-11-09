import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission, LeadScopeConfig } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins, roles, sessions, passwordHistory } from '@/lib/db/schema';
import { eq, and, isNull, desc, like, or, sql } from 'drizzle-orm';
import { hashPassword, generateTemporaryPassword, recordPasswordHistory } from '@/lib/auth/password';
import { createAdminInvite } from '@/lib/auth/invites';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';

const CreateUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().toLowerCase(),
  role: z.string().min(1),
  customPermissions: z.array(z.string()).optional(),
  leadScope: z.object({
    statuses: z.array(z.enum(['new', 'contacted', 'in_progress', 'won', 'lost', 'spam'])).optional(),
    assignedToMe: z.boolean().optional(),
    sources: z.array(z.string()).optional(),
    maxAgeDays: z.number().int().positive().optional(),
  }).optional(),
  status: z.enum(['active', 'disabled']).default('active'),
  expiresAt: z.number().nullable().optional(),
  createInvite: z.boolean().default(false),
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');

    let query = db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        role: admins.role,
        status: admins.status,
        twoFactorEnabled: admins.twoFactorEnabled,
        mustChangePassword: admins.mustChangePassword,
        mustSetup2Fa: admins.mustSetup2Fa,
        customPermissions: admins.customPermissions,
        leadScope: admins.leadScope,
        expiresAt: admins.expiresAt,
        lastLoginAt: admins.lastLoginAt,
        createdAt: admins.createdAt,
        updatedAt: admins.updatedAt,
      })
      .from(admins)
      .where(isNull(admins.deletedAt))
      .orderBy(desc(admins.createdAt));

    const allAdmins = await query;
    const now = Date.now();

    // Query active sessions count per admin
    const activeSessions = await db
      .select({
        adminId: sessions.adminId,
        count: sql<number>`count(*)`,
      })
      .from(sessions)
      .where(sql`${sessions.expiresAt} > ${now}`)
      .groupBy(sessions.adminId);

    const sessionCountMap = new Map<string, number>();
    activeSessions.forEach((s) => sessionCountMap.set(s.adminId, Number(s.count)));

    // Fetch all role names for easy display
    const allRoles = await db.select({ id: roles.id, name: roles.name }).from(roles);
    const roleNameMap = new Map<string, string>();
    allRoles.forEach((r) => roleNameMap.set(r.id, r.name));

    let filtered = allAdmins.map((a) => ({
      ...a,
      roleName: roleNameMap.get(a.role) || a.role,
      activeSessionsCount: sessionCountMap.get(a.id) || 0,
      customPermissions: a.customPermissions ? JSON.parse(a.customPermissions) : [],
      leadScope: a.leadScope ? JSON.parse(a.leadScope) : null,
    }));

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          (u.name && u.name.toLowerCase().includes(search))
      );
    }

    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    return NextResponse.json({ users: filtered });
  } catch (err) {
    console.error('Fetch users error:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
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

    // Enforce Reauth Grant for user creation
    const grantCookie = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grantCookie, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    const json = await req.json();
    const parsed = CreateUserSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid user data' }, { status: 400 });
    }

    const data = parsed.data;
    await ensureDatabaseReady();

    // Check if email already registered
    const existing = await db
      .select({ id: admins.id })
      .from(admins)
      .where(and(eq(admins.email, data.email), isNull(admins.deletedAt)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 409 });
    }

    // Generate secure temporary password
    const temporaryPassword = generateTemporaryPassword();
    const { hash, salt } = await hashPassword(temporaryPassword);

    const newAdminId = crypto.randomUUID();
    const now = Date.now();

    await db.insert(admins).values({
      id: newAdminId,
      name: data.name,
      email: data.email,
      passwordHash: hash,
      salt,
      role: data.role,
      status: data.status,
      mustChangePassword: true, // Forced password change on first login
      mustSetup2Fa: true, // Mandatory 2FA enrollment on first login
      twoFactorEnabled: false,
      customPermissions: data.customPermissions ? JSON.stringify(data.customPermissions) : null,
      leadScope: data.leadScope ? JSON.stringify(data.leadScope) : null,
      expiresAt: data.expiresAt || null,
      createdAt: now,
      updatedAt: now,
    });

    // Record into password history
    await recordPasswordHistory(newAdminId, hash, salt);

    // Create 1-time invite link if requested
    let inviteUrl: string | undefined;
    if (data.createInvite) {
      const origin = req.headers.get('origin') || undefined;
      const inviteRes = await createAdminInvite(newAdminId, origin);
      inviteUrl = inviteRes.inviteUrl;
    }

    const ip = getClientIp(req);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'USER_CREATED',
      resource: data.email,
      details: {
        newUserId: newAdminId,
        role: data.role,
        status: data.status,
        hasLeadScope: Boolean(data.leadScope),
      },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newAdminId,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
      },
      temporaryPassword,
      inviteUrl,
    });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
