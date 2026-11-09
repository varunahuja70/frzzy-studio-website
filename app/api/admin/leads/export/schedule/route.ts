import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { scheduledExports } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';

const ScheduleExportSchema = z.object({
  name: z.string().trim().min(2).max(64),
  scheduleCron: z.string().default('0 8 * * *'), // 8:00 AM daily
  timezone: z.string().default('Asia/Kolkata'),
  format: z.enum(['xlsx', 'csv']).default('xlsx'),
  recipients: z.array(z.string().email()).min(1),
  filters: z.record(z.string(), z.any()).optional(),
  columns: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
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

    const schedules = await db.select().from(scheduledExports).orderBy(desc(scheduledExports.createdAt));

    const formatted = schedules.map((s) => ({
      id: s.id,
      name: s.name,
      scheduleCron: s.scheduleCron,
      timezone: s.timezone,
      format: s.format,
      recipients: JSON.parse(s.recipients || '[]'),
      filters: s.filters ? JSON.parse(s.filters) : {},
      columns: s.columns ? JSON.parse(s.columns) : [],
      enabled: Boolean(s.enabled),
      lastRunAt: s.lastRunAt,
      nextRunAt: s.nextRunAt,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ schedules: formatted });
  } catch (err) {
    console.error('Fetch schedules error:', err);
    return NextResponse.json({ error: 'Failed to fetch scheduled exports' }, { status: 500 });
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
      return NextResponse.json({ error: 'Forbidden: Super Admin privilege required to manage schedules' }, { status: 403 });
    }

    const grantCookie = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grantCookie, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    const json = await req.json();
    const parsed = ScheduleExportSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid schedule data' }, { status: 400 });
    }

    const data = parsed.data;
    await ensureDatabaseReady();

    const scheduleId = crypto.randomUUID();
    const now = Date.now();

    await db.insert(scheduledExports).values({
      id: scheduleId,
      name: data.name,
      scheduleCron: data.scheduleCron,
      timezone: data.timezone,
      format: data.format,
      recipients: JSON.stringify(data.recipients),
      filters: data.filters ? JSON.stringify(data.filters) : null,
      columns: data.columns ? JSON.stringify(data.columns) : null,
      enabled: data.enabled,
      createdAt: now,
      updatedAt: now,
    });

    const ip = getClientIp(req);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'SCHEDULED_EXPORT_CONFIGURED',
      resource: data.name,
      details: { scheduleId, timezone: data.timezone, format: data.format },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      schedule: {
        id: scheduleId,
        name: data.name,
        timezone: data.timezone,
        recipients: data.recipients,
      },
    });
  } catch (err) {
    console.error('Create schedule error:', err);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
