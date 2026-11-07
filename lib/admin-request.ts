/**
 * Shared guard for vault content APIs (reviews): session + permission, and for writes a
 * same-origin check on top of the SameSite=Strict session cookie.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth/session';
import { hasPermission, resolveAdminPermissions } from '@/lib/auth/permissions';
import type { PermissionKey } from '@/lib/auth/permissions-constants';

export function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';
}

function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

type Guard =
  | { ok: true; adminId: string; can: (p: PermissionKey) => boolean }
  | { ok: false; response: NextResponse };

export async function guardAdmin(req: NextRequest, permission: PermissionKey, opts: { write?: boolean } = {}): Promise<Guard> {
  if (opts.write && !isSameOrigin(req)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const session = await validateAdminSession();
  if (!session.valid || !session.admin) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const perms = await resolveAdminPermissions(session.admin.id);
  if (!hasPermission(perms, permission)) {
    return { ok: false, response: NextResponse.json({ error: `Forbidden: ${permission} permission required` }, { status: 403 }) };
  }
  return { ok: true, adminId: session.admin.id, can: (p) => hasPermission(perms, p) };
}
