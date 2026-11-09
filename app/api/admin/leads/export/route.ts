import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import {
  resolveAdminPermissions,
  hasPermission,
  buildLeadScopeConditions,
  maskEmail,
  maskMessage,
} from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { leads, exportsHistory, admins } from '@/lib/db/schema';
import { and, eq, inArray, gte, lte, desc, sql } from 'drizzle-orm';
import { decryptPii } from '@/lib/auth/encryption';
import { generateLeadExcelWorkbook, LeadExportRow } from '@/lib/export/excel-generator';
import { generateLeadCsv } from '@/lib/export/csv-generator';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';

const ExportRequestSchema = z.object({
  format: z.enum(['xlsx', 'csv', 'pdf']).default('xlsx'),
  statuses: z.array(z.string()).optional(),
  datePreset: z.enum(['all', 'today', 'yesterday', '7d', '30d', 'this_month', 'custom', 'multi_days']).optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  specificDates: z.array(z.string()).optional(), // Array of YYYY-MM-DD
  source: z.string().optional(),
  assignedTo: z.string().optional(),
  columns: z.array(z.string()).optional(),
  quickDate: z.string().optional(), // 'today' | 'yesterday' | 'YYYY-MM-DD'
});

const exportsDir = path.resolve(process.cwd(), 'data', 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:export')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to export leads' }, { status: 403 });
    }

    // Enforce Reauth Grant for sensitive export
    const grantCookie = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grantCookie, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = ExportRequestSchema.safeParse(json);
    const data = parsed.success ? parsed.data : { format: 'xlsx' as const };

    await ensureDatabaseReady();

    const conditions = [];

    // Enforce user's lead scope in SQL
    const scopeConditions = buildLeadScopeConditions(perms?.leadScope, sessionRes.admin.id, leads);
    if (scopeConditions.length > 0) {
      conditions.push(...scopeConditions);
    }

    // Quick Date shortcut
    const now = new Date();
    let dateRangeLabel = 'All Time';

    if (data.quickDate === 'today' || data.datePreset === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      conditions.push(gte(leads.createdAt, todayStart));
      dateRangeLabel = `Today (${now.toISOString().slice(0, 10)})`;
    } else if (data.quickDate === 'yesterday' || data.datePreset === 'yesterday') {
      const yDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterdayStart = yDate.getTime();
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      conditions.push(and(gte(leads.createdAt, yesterdayStart), lte(leads.createdAt, yesterdayEnd)));
      dateRangeLabel = `Yesterday (${yDate.toISOString().slice(0, 10)})`;
    } else if (data.quickDate && /^\d{4}-\d{2}-\d{2}$/.test(data.quickDate)) {
      const targetDate = new Date(data.quickDate);
      const startMs = targetDate.getTime();
      const endMs = startMs + 24 * 60 * 60 * 1000;
      conditions.push(and(gte(leads.createdAt, startMs), lte(leads.createdAt, endMs)));
      dateRangeLabel = `Date: ${data.quickDate}`;
    } else if (data.datePreset === '7d') {
      conditions.push(gte(leads.createdAt, Date.now() - 7 * 24 * 60 * 60 * 1000));
      dateRangeLabel = 'Last 7 Days';
    } else if (data.datePreset === '30d') {
      conditions.push(gte(leads.createdAt, Date.now() - 30 * 24 * 60 * 60 * 1000));
      dateRangeLabel = 'Last 30 Days';
    } else if (data.datePreset === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      conditions.push(gte(leads.createdAt, monthStart));
      dateRangeLabel = 'This Month';
    } else if (data.datePreset === 'custom' && data.startDate) {
      conditions.push(gte(leads.createdAt, data.startDate));
      if (data.endDate) {
        conditions.push(lte(leads.createdAt, data.endDate));
      }
      dateRangeLabel = `${new Date(data.startDate).toLocaleDateString()} – ${data.endDate ? new Date(data.endDate).toLocaleDateString() : 'Now'}`;
    }

    // Filter: Statuses
    if (data.statuses && data.statuses.length > 0 && !data.statuses.includes('all')) {
      conditions.push(inArray(leads.status, data.statuses));
    }

    // Filter: Source category
    if (data.source && data.source !== 'all') {
      conditions.push(eq(leads.category, data.source));
    }

    // Filter: Assigned user
    if (data.assignedTo && data.assignedTo !== 'all') {
      if (data.assignedTo === 'unassigned') {
        conditions.push(sql`${leads.assignedTo} IS NULL`);
      } else {
        conditions.push(eq(leads.assignedTo, data.assignedTo));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch leads strictly filtered by scope
    let matchingLeads = await db
      .select()
      .from(leads)
      .where(whereClause)
      .orderBy(desc(leads.createdAt))
      .limit(10000);

    // Apply specific dates filter if multi_days was selected
    if (data.specificDates && data.specificDates.length > 0) {
      const dateSet = new Set(data.specificDates);
      matchingLeads = matchingLeads.filter((l) => {
        const dStr = new Date(l.createdAt).toISOString().split('T')[0];
        return dateSet.has(dStr);
      });
      dateRangeLabel = `${data.specificDates.length} selected days (${data.specificDates.slice(0, 3).join(', ')}${data.specificDates.length > 3 ? '...' : ''})`;
    }

    // Fetch assignees names
    const assignees = await db.select({ id: admins.id, name: admins.name, email: admins.email }).from(admins);
    const assigneeMap = new Map<string, string>();
    assignees.forEach((a) => assigneeMap.set(a.id, a.name || a.email));

    const canViewContact = hasPermission(perms, 'leads:view_contact');

    // Decrypt and sanitize/mask fields
    const exportRows: LeadExportRow[] = matchingLeads.map((lead) => {
      const rawEmail = decryptPii(lead.emailEncrypted);
      const rawMessage = decryptPii(lead.messageEncrypted);

      return {
        id: lead.id,
        createdAt: lead.createdAt,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: canViewContact ? rawEmail : maskEmail(rawEmail),
        category: lead.category,
        status: lead.status,
        assignedToName: lead.assignedTo ? assigneeMap.get(lead.assignedTo) || 'Assigned' : 'Unassigned',
        message: canViewContact ? rawMessage : maskMessage(rawMessage),
        sourcePage: lead.sourcePage,
        country: lead.country,
        deviceType: lead.deviceType,
        browser: lead.browser,
        os: lead.os,
      };
    });

    const statusSuffix = data.statuses && data.statuses.length === 1 ? `_${data.statuses[0]}` : '';
    const dateStr = now.toISOString().slice(0, 10);
    const fileId = crypto.randomUUID();

    let fileBuffer: Buffer;
    let fileName: string;
    let contentType: string;

    if (data.format === 'csv') {
      fileBuffer = generateLeadCsv(exportRows, { columns: data.columns });
      fileName = `Leads_${dateStr}${statusSuffix}.csv`;
      contentType = 'text/csv; charset=utf-8';
    } else {
      fileBuffer = await generateLeadExcelWorkbook(exportRows, {
        title: 'FRXCX Studio — Executive Lead Report',
        generatedBy: sessionRes.admin.name || sessionRes.admin.email,
        dateRangeLabel,
        filtersLabel: `Statuses: ${data.statuses?.join(', ') || 'All'} | Source: ${data.source || 'All'}`,
        columns: data.columns,
      });
      fileName = `Leads_${dateStr}${statusSuffix}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    // Save copy to local disk for history re-download
    const savedPath = path.join(exportsDir, `${fileId}_${fileName}`);
    await fs.promises.writeFile(savedPath, fileBuffer);

    // Save record to exports_history table
    await db.insert(exportsHistory).values({
      id: fileId,
      adminId: sessionRes.admin.id,
      adminEmail: sessionRes.admin.email,
      format: data.format,
      filters: JSON.stringify(data),
      columns: JSON.stringify(data.columns || []),
      rowCount: exportRows.length,
      filePath: savedPath,
      fileName,
      fileSizeBytes: fileBuffer.length,
      createdAt: Date.now(),
    });

    const ip = getClientIp(req);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'LEADS_EXPORTED',
      resource: fileName,
      details: {
        rowCount: exportRows.length,
        format: data.format,
        fileSizeBytes: fileBuffer.length,
        isMasked: !canViewContact,
      },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    // Return downloadable file stream
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    console.error('Lead export error:', err);
    return NextResponse.json({ error: 'Failed to generate lead export' }, { status: 500 });
  }
}

// Preserve backwards-compatible GET with quick export support
export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:export')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to export leads' }, { status: 403 });
    }

    const grantCookie = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grantCookie, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'xlsx';
    const quickDate = searchParams.get('quickDate') || searchParams.get('date') || undefined;

    // Delegate to POST logic
    const dummyReq = new NextRequest(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({
        format,
        quickDate,
      }),
    });

    return POST(dummyReq);
  } catch (err) {
    console.error('Lead export GET error:', err);
    return NextResponse.json({ error: 'Failed to process export' }, { status: 500 });
  }
}
