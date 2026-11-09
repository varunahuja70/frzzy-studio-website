import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission, LeadScopeConfig } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins, roles, sessions, passwordHistory } from '@/lib/db/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { hashPassword, generateTemporaryPassword, recordPasswordHistory } from '@/lib/auth/password';
import { createAdminInvite } from '@/lib/auth/invites';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

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

    // Sync any existing profiles from Supabase into local admins if not already present
    try {
      const supabase = getAdminSupabaseClient();
      const { data: sbProfiles } = await (supabase.from('profiles') as any).select('*');
      if (sbProfiles && sbProfiles.length > 0) {
        for (const p of (sbProfiles as any[]) || []) {
          const exists = await db
            .select({ id: admins.id })
            .from(admins)
            .where(eq(admins.email, p.email.toLowerCase()))
            .limit(1);

          if (exists.length === 0) {
            const now = Date.now();
            await db.insert(admins).values({
              id: p.id,
              name: p.name || null,
              email: p.email.toLowerCase(),
              passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy',
              salt: 'synced_from_supabase',
              role: p.role || 'viewer',
              status: p.status || 'active',
              twoFactorEnabled: Boolean(p.two_factor_enabled),
              mustChangePassword: Boolean(p.must_change_password),
              mustSetup2Fa: Boolean(p.must_setup_2fa),
              createdAt: p.created_at ? new Date(p.created_at).getTime() : now,
              updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : now,
            });
          }
        }
      }
    } catch (e) {
      // Non-blocking sync check
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

    // Determine password to use
    const finalPassword =
      data.passwordType === 'custom' && data.customPassword
        ? data.customPassword.trim()
        : generateTemporaryPassword();

    // 1. SUPABASE AUTH & SUPABASE PROFILES SYNCHRONIZATION
    let supabaseUserId: string | null = null;
    try {
      const supabase = getAdminSupabaseClient();

      // Check if user already exists in Supabase Auth
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingSbUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase()
      );

      if (existingSbUser) {
        supabaseUserId = existingSbUser.id;
        // Update their password and metadata
        await supabase.auth.admin.updateUserById(supabaseUserId, {
          password: finalPassword,
          user_metadata: {
            name: data.name,
            role: data.role,
          },
        });
      } else {
        // Create brand new user in Supabase Auth
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: data.email,
          password: finalPassword,
          email_confirm: true,
          user_metadata: {
            name: data.name,
            role: data.role,
          },
        });

        if (createError) {
          console.warn('Supabase auth createUser warning:', createError.message);
        } else if (createData?.user) {
          supabaseUserId = createData.user.id;
        }
      }

      // Upsert into Supabase public.profiles table
      if (supabaseUserId) {
        await (supabase.from('profiles') as any).upsert(
          {
            id: supabaseUserId,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            custom_permissions: data.customPermissions || [],
            lead_scope: data.leadScope || {},
            two_factor_enabled: false,
            must_change_password: data.passwordType === 'random',
            must_setup_2fa: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
    } catch (sbErr) {
      console.error('Supabase user creation sync error:', sbErr);
      // We still proceed so the Vault admin record is created
    }

    // 2. VAULT DATABASE INSERTION
    const { hash, salt } = await hashPassword(finalPassword);
    const newAdminId = supabaseUserId || crypto.randomUUID();
    const now = Date.now();

    await db.insert(admins).values({
      id: newAdminId,
      name: data.name,
      email: data.email,
      passwordHash: hash,
      salt,
      role: data.role,
      status: data.status,
      mustChangePassword: data.passwordType === 'random', // Force change on random pw
      mustSetup2Fa: false,
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

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'USER_CREATED',
      resource: data.email,
      details: {
        newUserId: newAdminId,
        role: data.role,
        status: data.status,
        passwordType: data.passwordType,
        supabaseSynced: Boolean(supabaseUserId),
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
      temporaryPassword: finalPassword,
      password: finalPassword,
      passwordType: data.passwordType,
      inviteUrl,
      supabaseSynced: Boolean(supabaseUserId),
    });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
