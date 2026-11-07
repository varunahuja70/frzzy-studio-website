import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { logAuditEvent } from '@/lib/auth/audit';
import { DEFAULT_APPEARANCE, LOOKS, normalizeAppearance, PALETTES, SCROLLS, STRANDS } from '@/lib/palette';
import { getSiteAppearance, saveSiteAppearance } from '@/lib/site-appearance';

/**
 * Public site appearance (palette, look, scroll mode, hero strands).
 *   GET  → current settings + all options      (needs settings:view)
 *   PUT  → save new settings, audit-logged      (needs settings:edit)
 */

const ids = <T extends { id: string }>(list: readonly T[]) => list.map((x) => x.id) as [string, ...string[]];

const AppearanceSchema = z
  .object({
    palette: z.enum(ids(PALETTES)),
    look: z.enum(ids(LOOKS)),
    scroll: z.enum(ids(SCROLLS)),
    strands: z.enum(ids(STRANDS)),
  })
  .strict();

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';
}

/** Defence in depth on top of SameSite=Strict cookies: writes must come from this site. */
function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'settings:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { value, updatedAt } = await getSiteAppearance();
    return NextResponse.json({
      appearance: value,
      updatedAt,
      defaults: DEFAULT_APPEARANCE,
      canEdit: hasPermission(perms, 'settings:edit'),
      options: { palettes: PALETTES, looks: LOOKS, scrolls: SCROLLS, strands: STRANDS },
    });
  } catch (err) {
    console.error('Fetch appearance error:', err);
    return NextResponse.json({ error: 'Failed to load appearance settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'settings:edit')) {
      return NextResponse.json({ error: 'Forbidden: settings:edit permission required' }, { status: 403 });
    }

    const parsed = AppearanceSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid appearance settings' }, { status: 400 });
    }

    const before = (await getSiteAppearance()).value;
    const saved = await saveSiteAppearance(normalizeAppearance(parsed.data));

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'SETTINGS_UPDATED',
      resource: 'site_appearance',
      details: { before, after: saved.value },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, appearance: saved.value, updatedAt: saved.updatedAt });
  } catch (err) {
    console.error('Save appearance error:', err);
    return NextResponse.json({ error: 'Failed to save appearance settings' }, { status: 500 });
  }
}
