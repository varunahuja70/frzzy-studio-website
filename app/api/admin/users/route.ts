import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAdminSession, destroyAllAdminSessions } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins, roles, sessions } from '@/lib/db/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { generateTemporaryPassword } from '@/lib/auth/password';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { initiateUserCreationOtp } from '@/lib/auth/otp-service';
import { purgeLocalAdmin } from '@/lib/auth/user-cleanup';

const PRIMARY_OWNER_EMAIL = 'vk679028@gmail.com';

const CreateUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().toLowerCase(),
  role: z.string().min(1),
  passwordType: z.enum(['random', 'custom']).default('random'),
  customPassword: z.string().min(8).max(128).optional(),
  customPermissions: z.array(z.string()).optional(),
  leadScope: z.object({
    statuses: z.array(z.enum(['new', 'contacted', 'in_progress', 'won', 'lost', 'spam'])).optional(),
    assignedToMe: z.boolean().optional(),
    sources: z.array(z.string()).optional(),
    maxAgeDays: z.number().int().positive().optional(),
  }).optional(),
  status: z.enum(['active', 'disabled']).default('active'),
  expiresAt: z.number().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'users:manage')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin privilege required' }, { status: 403 });
    }

    await ensureDatabaseReady();

    // 1. TRUE BIDIRECTIONAL SYNC WITH SUPABASE PROFILES
    try {
      const supabase = getAdminSupabaseClient();
      const { data: sbProfiles } = await (supabase.from('profiles') as any).select('*');

      if (sbProfiles && Array.isArray(sbProfiles)) {
        const sbActiveMap = new Map<string, any>();

        for (const p of (sbProfiles as any[]) || []) {
          // If deleted_at is set or disabled, treat as inactive
          if (p.deleted_at || p.status === 'disabled') continue;
          const emailLower = (p.email || '').toLowerCase().trim();
          if (!emailLower) continue;

          sbActiveMap.set(emailLower, p);

          const exists = await db
            .select()
            .from(admins)
            .where(eq(admins.email, emailLower))
            .limit(1);

          const now = Date.now();
          if (exists.length === 0) {
            // New user created in Supabase backend -> sync into local database
            await db.insert(admins).values({
              id: p.id,
              name: p.name || null,
              email: emailLower,
              passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$synced$synced',
              salt: 'synced_from_supabase',
              role: p.role || 'viewer',
              status: p.status || 'active',
              twoFactorEnabled: Boolean(p.two_factor_enabled),
              mustChangePassword: Boolean(p.must_change_password),
              mustSetup2Fa: Boolean(p.must_setup_2fa),
              createdAt: p.created_at ? new Date(p.created_at).getTime() : now,
              updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : now,
            });
          } else {
            // Existing user -> sync any edits from Supabase backend (name, role, status)
            const local = exists[0];
            const pName = p.name || local.name;
            const pRole = p.role || local.role;
            const pStatus = p.status || local.status;

            if (local.name !== pName || local.role !== pRole || local.status !== pStatus) {
              await db
                .update(admins)
                .set({
                  name: pName,
                  role: pRole,
                  status: pStatus,
                  updatedAt: now,
                })
                .where(eq(admins.id, local.id));
            }
          }
        }

        // PURGE LOCAL USERS THAT HAVE BEEN DELETED FROM SUPABASE BACKEND
        const allLocal = await db.select({ id: admins.id, email: admins.email }).from(admins);
        for (const localAdmin of allLocal) {
          const lEmail = localAdmin.email.toLowerCase();
          // Never purge primary owner
          if (lEmail === PRIMARY_OWNER_EMAIL.toLowerCase()) continue;

          if (!sbActiveMap.has(lEmail)) {
            // Deleted in Supabase backend -> prune from local database immediately
            await purgeLocalAdmin(localAdmin.id);
          }
        }
      }
    } catch (e) {
      console.warn('[Users Sync] Supabase bidirectional sync warning in GET:', e);
    }

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
      isPrimaryOwner: a.email.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase(),
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
    const sessionRes = await validateAdminSession(req);
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

    // Validate custom password length if chosen
    if (data.passwordType === 'custom') {
      if (!data.customPassword || data.customPassword.trim().length < 8) {
        return NextResponse.json(
          { error: 'Custom password must be at least 8 characters long' },
          { status: 400 }
        );
      }
    }

    await ensureDatabaseReady();

    // Check if email already registered locally
    const existing = await db
      .select({ id: admins.id })
      .from(admins)
      .where(and(eq(admins.email, data.email), isNull(admins.deletedAt)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 409 });
    }

    // Check if user already exists in Supabase Auth
    try {
      const supabase = getAdminSupabaseClient();
      const { data: userList } = await supabase.auth.admin.listUsers();
      const sbExists = userList?.users?.some(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase()
      );
      if (sbExists) {
        return NextResponse.json({ error: 'A user with this email already exists in Supabase Auth' }, { status: 409 });
      }
    } catch (e) {}

    // Determine final password to stage
    const finalPassword =
      data.passwordType === 'custom' && data.customPassword
        ? data.customPassword.trim()
        : generateTemporaryPassword();

    // ULTRA-SECURE: INITIATE OTP VERIFICATION BEFORE PROVISIONING
    const otpResult = await initiateUserCreationOtp({
      name: data.name,
      email: data.email,
      role: data.role,
      passwordType: data.passwordType,
      password: finalPassword,
      customPermissions: data.customPermissions,
      leadScope: data.leadScope,
      status: data.status,
    });

    return NextResponse.json({
      success: true,
      requiresOtp: true,
      verificationId: otpResult.verificationId,
      email: otpResult.email,
      expiresInMinutes: otpResult.expiresInMinutes,
      sentToEmail: otpResult.sentToEmail,
      debugOtp: process.env.NODE_ENV === 'test' ? otpResult.debugOtp : undefined,
      temporaryPassword: finalPassword,
    });
  } catch (err: any) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: err.message || 'Failed to initiate user creation' }, { status: 500 });
  }
}
