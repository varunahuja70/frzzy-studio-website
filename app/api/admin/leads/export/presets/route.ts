import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { exportPresets } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const PresetSchema = z.object({
  name: z.string().trim().min(2).max(64),
  columns: z.array(z.string()).min(1),
  filters: z.record(z.string(), z.any()),
  isDefault: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:export')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ensureDatabaseReady();

    const presets = await db
      .select()
      .from(exportPresets)
      .where(eq(exportPresets.adminId, sessionRes.admin.id))
      .orderBy(desc(exportPresets.createdAt));

    const formatted = presets.map((p) => ({
      id: p.id,
      name: p.name,
      columns: JSON.parse(p.columns || '[]'),
      filters: JSON.parse(p.filters || '{}'),
      isDefault: Boolean(p.isDefault),
      createdAt: p.createdAt,
    }));

    return NextResponse.json({ presets: formatted });
  } catch (err) {
    console.error('Fetch presets error:', err);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:export')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json = await req.json();
    const parsed = PresetSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid preset data' }, { status: 400 });
    }

    const data = parsed.data;
    await ensureDatabaseReady();

    const presetId = crypto.randomUUID();

    // If setting as default, clear other defaults
    if (data.isDefault) {
      await db
        .update(exportPresets)
        .set({ isDefault: false })
        .where(eq(exportPresets.adminId, sessionRes.admin.id));
    }

    await db.insert(exportPresets).values({
      id: presetId,
      name: data.name,
      adminId: sessionRes.admin.id,
      columns: JSON.stringify(data.columns),
      filters: JSON.stringify(data.filters),
      isDefault: data.isDefault,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      preset: {
        id: presetId,
        name: data.name,
        columns: data.columns,
        filters: data.filters,
        isDefault: data.isDefault,
      },
    });
  } catch (err) {
    console.error('Save preset error:', err);
    return NextResponse.json({ error: 'Failed to save preset' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Preset ID required' }, { status: 400 });
    }

    await ensureDatabaseReady();

    await db
      .delete(exportPresets)
      .where(and(eq(exportPresets.id, id), eq(exportPresets.adminId, sessionRes.admin.id)));

    return NextResponse.json({ success: true, message: 'Preset deleted' });
  } catch (err) {
    console.error('Delete preset error:', err);
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}
