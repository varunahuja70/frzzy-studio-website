import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { workItems, admins } from '@/lib/db/schema';
import { and, eq, inArray, gte, lte, desc, isNull, sql } from 'drizzle-orm';
import { generateWorkItemsExcelWorkbook, WorkItemExportRow } from '@/lib/export/work-items-excel';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';

const ExportRequestSchema = z.object({
  format: z.enum(['xlsx', 'csv']).default('xlsx'),
  exportType: z.enum(['work_items', 'financial_ledger', 'team_performance']).default('work_items'),
  datePreset: z.enum(['all', 'today', 'yesterday', '7d', '30d', 'this_month', 'custom', 'multi_days']).optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  specificDates: z.array(z.string()).optional(), // Array of YYYY-MM-DD
  statuses: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
});

const exportsDir = path.resolve(process.cwd(), 'data', 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!perms || (!perms.isSuperAdmin && !perms.permissions.has('work_items:view') && !perms.permissions.has('leads:export'))) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to export work items' }, { status: 403 });
    }

    // Check re-auth grant
    const grantCookie = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grantCookie, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = ExportRequestSchema.safeParse(json);
    const data = parsed.success ? parsed.data : { format: 'xlsx' as const, exportType: 'work_items' as const };

    await ensureDatabaseReady();

    // Financial isolation permission check
    const canExportFinancials = !!(perms.isSuperAdmin || perms.permissions.has('financials:export'));

    // Build conditions
    const conditions = [isNull(workItems.deletedAt)];

    if (data.statuses && data.statuses.length > 0) {
      conditions.push(inArray(workItems.status, data.statuses));
    }

    if (data.assignedTo) {
      conditions.push(eq(workItems.assignedTo, data.assignedTo));
    }

    // Role-based scoping: non-super-admins without work_items:view_all only export their assigned items
    if (!perms.isSuperAdmin && !perms.permissions.has('work_items:view_all')) {
      conditions.push(eq(workItems.assignedTo, sessionRes.admin.id));
    }

    let rows = await db
      .select({
        item: workItems,
        assigneeName: admins.name,
      })
      .from(workItems)
      .leftJoin(admins, eq(workItems.assignedTo, admins.id))
      .where(and(...conditions))
      .orderBy(desc(workItems.createdAt))
      .limit(1000);

    // Apply specific date filter if multi_days was selected
    if (data.specificDates && data.specificDates.length > 0) {
      const dateSet = new Set(data.specificDates);
      rows = rows.filter((r) => {
        const itemDate = new Date(r.item.createdAt).toISOString().split('T')[0];
        return dateSet.has(itemDate);
      });
    } else if (data.startDate || data.endDate) {
      if (data.startDate) {
        rows = rows.filter((r) => r.item.createdAt >= data.startDate!);
      }
      if (data.endDate) {
        rows = rows.filter((r) => r.item.createdAt <= data.endDate!);
      }
    }

    // Map to export rows with financial projection
    const exportRows: WorkItemExportRow[] = rows.map(({ item, assigneeName }) => ({
      id: item.id,
      itemNumber: item.itemNumber,
      title: item.title,
      description: item.description,
      status: item.status,
      progressPercent: item.progressPercent,
      priority: item.priority,
      dueDate: item.dueDate,
      category: item.category,
      source: item.source,
      clientName: item.clientName,
      assignedToName: assigneeName || 'Unassigned',
      assignedByName: item.assignedByName,
      quotedPrice: canExportFinancials ? item.quotedPrice : null,
      finalPrice: canExportFinancials ? item.finalPrice : null,
      currency: canExportFinancials ? item.currency : null,
      paymentStatus: canExportFinancials ? item.paymentStatus : null,
      amountReceived: canExportFinancials ? item.amountReceived : null,
      balanceDue: canExportFinancials ? item.balanceDue : null,
      invoiceReference: canExportFinancials ? item.invoiceReference : null,
      deliveredAt: item.deliveredAt,
      createdAt: item.createdAt,
    }));

    // If team performance workbook requested, gather team stats
    let teamPerformanceData = undefined;
    if (canExportFinancials && data.exportType === 'team_performance') {
      const allAdmins = await db.select().from(admins).where(isNull(admins.deletedAt));
      teamPerformanceData = await Promise.all(
        allAdmins.map(async (adm) => {
          const admTasks = await db
            .select()
            .from(workItems)
            .where(and(eq(workItems.assignedTo, adm.id), isNull(workItems.deletedAt)));
          const completed = admTasks.filter((t) => t.status === 'completed' || t.status === 'delivered').length;
          const active = admTasks.filter((t) => t.status !== 'completed' && t.status !== 'delivered').length;
          return {
            name: adm.name || adm.email,
            email: adm.email,
            role: adm.role,
            activeTasks: active,
            completedTasks: completed,
            onTimeRate: completed > 0 ? 100 : 0,
          };
        })
      );
    }

    const buffer = await generateWorkItemsExcelWorkbook(exportRows, {
      generatedBy: sessionRes.admin.name || sessionRes.admin.email,
      dateRangeLabel: data.specificDates?.length ? `${data.specificDates.length} selected days` : 'Full Range',
      canExportFinancials,
      teamPerformanceData,
    });

    const filename = `FRXCX_WorkItems_${Date.now()}.xlsx`;

    // Audit logging
    logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'EXPORT_WORK_ITEMS',
      resource: filename,
      details: {
        rowCount: exportRows.length,
        canExportFinancials,
        exportType: data.exportType,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Work items export error:', err);
    return NextResponse.json({ error: 'Failed to export work items' }, { status: 500 });
  }
}
