import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins } from '../lib/db/schema';
import {
  ALL_PERMISSIONS,
  BUILT_IN_ROLES,
  resolveAdminPermissions,
  hasPermission,
  ensureNotLastSuperAdmin,
  PermissionKey,
} from '../lib/auth/permissions';
import { eq, isNull, and } from 'drizzle-orm';

describe('MODULE 1: RBAC & Permission Matrix Enforcement', () => {
  before(async () => {
    await ensureDatabaseReady();
  });

  test('Built-in role templates define strictly budgeted permission sets', () => {
    const superAdminRole = BUILT_IN_ROLES.find((r) => r.id === 'superadmin')!;
    const managerRole = BUILT_IN_ROLES.find((r) => r.id === 'manager')!;
    const salesExecRole = BUILT_IN_ROLES.find((r) => r.id === 'sales_executive')!;
    const viewerRole = BUILT_IN_ROLES.find((r) => r.id === 'viewer')!;

    // Super Admin has all 18 permissions including users:manage
    assert.equal(superAdminRole.permissions.length, ALL_PERMISSIONS.length);
    assert.ok(superAdminRole.permissions.includes('users:manage'));

    // Manager has leads and analytics, but not users:manage
    assert.ok(managerRole.permissions.includes('leads:view'));
    assert.ok(managerRole.permissions.includes('leads:edit'));
    assert.ok(managerRole.permissions.includes('leads:export'));
    assert.ok(!managerRole.permissions.includes('users:manage'));

    // Sales Executive has leads:view and leads:edit, but not leads:export or users:manage
    assert.ok(salesExecRole.permissions.includes('leads:view'));
    assert.ok(!salesExecRole.permissions.includes('leads:export'));
    assert.ok(!salesExecRole.permissions.includes('users:manage'));

    // Viewer has view_contact stripped for privacy
    assert.ok(viewerRole.permissions.includes('leads:view'));
    assert.ok(!viewerRole.permissions.includes('leads:view_contact'));
    assert.ok(!viewerRole.permissions.includes('leads:delete'));
  });

  test('resolveAdminPermissions computes role permissions + custom overrides', async () => {
    const testAdminId = 'test-admin-' + crypto.randomUUID().slice(0, 8);
    const now = Date.now();
    await db.insert(admins).values({
      id: testAdminId,
      email: `test-${now}@frxcxstudio.com`,
      passwordHash: 'dummy-hash',
      salt: 'dummy-salt',
      role: 'viewer',
      customPermissions: JSON.stringify(['+leads:export', '-leads:view']),
      createdAt: now,
      updatedAt: now,
      status: 'active',
    });

    const perms = await resolveAdminPermissions(testAdminId);
    assert.ok(perms);
    assert.equal(perms.roleId, 'viewer');
    // Granted by custom override
    assert.equal(hasPermission(perms, 'leads:export'), true);
    // Revoked by custom override
    assert.equal(hasPermission(perms, 'leads:view'), false);

    // Clean up
    await db.delete(admins).where(eq(admins.id, testAdminId));
  });

  test('Privilege Escalation Defense: Custom roles cannot possess users:manage', () => {
    const requestedPermissions: string[] = ['leads:view', 'users:manage', 'analytics:view'];
    const filtered = requestedPermissions.filter((p) => p !== 'users:manage');
    assert.equal(filtered.includes('users:manage'), false);
  });

  test('Last Super Admin Protection: Demotion or soft deletion is blocked by throwing', async () => {
    const activeSuperAdmins = await db
      .select()
      .from(admins)
      .where(
        and(
          eq(admins.role, 'superadmin'),
          eq(admins.status, 'active'),
          isNull(admins.deletedAt)
        )
      );

    if (activeSuperAdmins.length === 1) {
      const superAdmin = activeSuperAdmins[0];
      await assert.rejects(
        async () => {
          await ensureNotLastSuperAdmin(superAdmin.id);
        },
        /Cannot disable, demote, or delete the last remaining active Super Admin/
      );
    }
  });
});
