import { db, ensureDatabaseReady } from '@/lib/db';
import { admins, roles, leads } from '@/lib/db/schema';
import { eq, and, inArray, gte, isNull, SQL } from 'drizzle-orm';

export {
  ALL_PERMISSIONS,
  PERMISSION_METADATA,
  BUILT_IN_ROLES,
  type PermissionKey,
  type LeadScopeConfig,
  type ResolvedPermissions,
} from './permissions-constants';

import {
  ALL_PERMISSIONS,
  PermissionKey,
  LeadScopeConfig,
  ResolvedPermissions,
} from './permissions-constants';

const permissionsCache = new Map<string, { perms: ResolvedPermissions | null; timestamp: number }>();
const PERM_CACHE_TTL_MS = 30000; // 30 seconds TTL

export function invalidatePermissionsCache(adminId?: string) {
  if (adminId) {
    permissionsCache.delete(adminId);
  } else {
    permissionsCache.clear();
  }
}

/**
 * Resolves full permissions and effective lead scope for an administrative user.
 */
export async function resolveAdminPermissions(adminId: string): Promise<ResolvedPermissions | null> {
  const cached = permissionsCache.get(adminId);
  const now = Date.now();
  if (cached && now - cached.timestamp < PERM_CACHE_TTL_MS) {
    return cached.perms;
  }

  await ensureDatabaseReady();

  const adminRows = await db
    .select()
    .from(admins)
    .where(and(eq(admins.id, adminId), isNull(admins.deletedAt)))
    .limit(1);

  if (adminRows.length === 0) return null;
  const admin = adminRows[0];

  const isSuperAdmin = admin.role === 'superadmin';

  // Fetch role details
  let rolePermissions: PermissionKey[] = [];
  let roleScope: LeadScopeConfig = {};
  let roleName = admin.role;

  const roleRows = await db
    .select()
    .from(roles)
    .where(eq(roles.id, admin.role))
    .limit(1);

  if (roleRows.length > 0) {
    const r = roleRows[0];
    roleName = r.name;
    try {
      rolePermissions = JSON.parse(r.permissions || '[]');
    } catch {
      rolePermissions = [];
    }
    try {
      roleScope = JSON.parse(r.defaultLeadScope || '{}');
    } catch {
      roleScope = {};
    }
  } else if (isSuperAdmin) {
    rolePermissions = [...ALL_PERMISSIONS];
    roleName = 'Super Admin';
  }

  // Parse custom overrides if present
  let customOverrides: PermissionKey[] = [];
  if (admin.customPermissions) {
    try {
      customOverrides = JSON.parse(admin.customPermissions);
    } catch {
      customOverrides = [];
    }
  }

  // Parse admin-specific lead scope override
  let adminScope: LeadScopeConfig = {};
  if (admin.leadScope) {
    try {
      adminScope = JSON.parse(admin.leadScope);
    } catch {
      adminScope = {};
    }
  }

  const effectivePermissions = new Set<PermissionKey>();
  if (isSuperAdmin) {
    ALL_PERMISSIONS.forEach((p) => effectivePermissions.add(p));
  } else {
    rolePermissions.forEach((p) => {
      // Non-superadmins can NEVER have users:manage
      if (p !== 'users:manage') effectivePermissions.add(p);
    });
    customOverrides.forEach((entry) => {
      if (typeof entry !== 'string') return;
      if (entry.startsWith('-')) {
        const key = entry.slice(1) as PermissionKey;
        effectivePermissions.delete(key);
      } else {
        const key = (entry.startsWith('+') ? entry.slice(1) : entry) as PermissionKey;
        if (key !== 'users:manage') effectivePermissions.add(key);
      }
    });
  }

  const effectiveScope: LeadScopeConfig = {
    ...roleScope,
    ...adminScope,
  };

  const result: ResolvedPermissions = {
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
    roleId: admin.role,
    roleName,
    isSuperAdmin,
    permissions: effectivePermissions,
    leadScope: effectiveScope,
    status: admin.status,
    expiresAt: admin.expiresAt,
    mustChangePassword: Boolean(admin.mustChangePassword),
    mustSetup2Fa: Boolean(admin.mustSetup2Fa),
  };

  permissionsCache.set(adminId, { perms: result, timestamp: now });
  return result;
}

/**
 * Checks whether resolved permissions include a specified action.
 */
export function hasPermission(resolved: ResolvedPermissions | null | undefined, permission: PermissionKey): boolean {
  if (!resolved) return false;
  if (resolved.isSuperAdmin) return true;
  return resolved.permissions.has(permission);
}

/**
 * Constructs Drizzle SQL where conditions enforcing the user's granular lead scope at the database query layer.
 * Guarantees that out-of-scope records are never returned in search, list, counts, or direct ID lookups.
 */
export function buildLeadScopeConditions(
  scope: LeadScopeConfig | undefined,
  currentAdminId: string,
  leadsTable: typeof leads
): SQL[] {
  const conditions: SQL[] = [];

  if (!scope) return conditions;

  // 1. Status filter restriction
  if (scope.statuses && scope.statuses.length > 0) {
    conditions.push(inArray(leadsTable.status, scope.statuses));
  }

  // 2. Assigned-to-me restriction
  if (scope.assignedToMe) {
    conditions.push(eq(leadsTable.assignedTo, currentAdminId));
  }

  // 3. Category / Source restriction
  if (scope.sources && scope.sources.length > 0) {
    conditions.push(inArray(leadsTable.category, scope.sources));
  }

  // 4. Max age days restriction (e.g. only leads from last 30 days)
  if (scope.maxAgeDays && scope.maxAgeDays > 0) {
    const minTimestamp = Date.now() - scope.maxAgeDays * 24 * 60 * 60 * 1000;
    conditions.push(gte(leadsTable.createdAt, minTimestamp));
  }

  return conditions;
}

/**
 * Masks an email address for unprivileged viewers.
 * Example: "john.doe@example.com" -> "j***e@e*****e.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.com';
  const [local, domain] = email.split('@');
  const [domainName, ...domainExtParts] = domain.split('.');
  const domainExt = domainExtParts.join('.');

  const maskedLocal =
    local.length <= 2
      ? local[0] + '***'
      : local[0] + '*'.repeat(Math.min(local.length - 2, 4)) + local[local.length - 1];

  const maskedDomain =
    domainName.length <= 2
      ? domainName[0] + '***'
      : domainName[0] + '*'.repeat(Math.min(domainName.length - 2, 4)) + domainName[domainName.length - 1];

  return `${maskedLocal}@${maskedDomain}${domainExt ? '.' + domainExt : ''}`;
}

/**
 * Masks a message body for roles lacking unmasked contact details permission.
 */
export function maskMessage(message: string): string {
  if (!message) return '[No content]';
  return 'Inquiry content protected: contact details masked due to role permissions [Restricted]';
}

/**
 * Enforces that a target Super Admin cannot be deleted, demoted, or disabled if they are the last active Super Admin.
 */
export async function ensureNotLastSuperAdmin(targetAdminId: string): Promise<void> {
  await ensureDatabaseReady();

  // Find all active, non-deleted Super Admins
  const activeSuperAdmins = await db
    .select({ id: admins.id })
    .from(admins)
    .where(
      and(
        eq(admins.role, 'superadmin'),
        eq(admins.status, 'active'),
        isNull(admins.deletedAt)
      )
    );

  if (activeSuperAdmins.length <= 1 && activeSuperAdmins.some((a) => a.id === targetAdminId)) {
    throw new Error('System protection violation: Cannot disable, demote, or delete the last remaining active Super Admin.');
  }
}
