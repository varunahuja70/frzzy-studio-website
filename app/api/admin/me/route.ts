import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized', reason: sessionRes.reason }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!perms) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    return NextResponse.json({
      adminId: perms.adminId,
      email: perms.email,
      name: perms.name,
      roleId: perms.roleId,
      roleName: perms.roleName,
      isSuperAdmin: perms.isSuperAdmin,
      permissions: Array.from(perms.permissions),
      leadScope: perms.leadScope,
      mustChangePassword: perms.mustChangePassword,
      mustSetup2Fa: perms.mustSetup2Fa,
    });
  } catch (err) {
    console.error('Fetch me error:', err);
    return NextResponse.json({ error: 'Failed to fetch current user context' }, { status: 500 });
  }
}
