import { NextRequest, NextResponse } from 'next/server';
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
import { leads } from '@/lib/db/schema';
import { and, eq, inArray, gte, lte, desc, sql } from 'drizzle-orm';
import { decryptPii } from '@/lib/auth/encryption';

const PreviewSchema = z.object({
  statuses: z.array(z.string()).optional(),
  datePreset: z.enum(['all', 'today', 'yesterday', '7d', '30d', 'this_month', 'custom']).optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  source: z.string().optional(),
  assignedTo: z.string().optional(),
});

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

    const json = await req.json().catch(() => ({}));
    const parsed = PreviewSchema.safeParse(json);
    const data = parsed.success ? parsed.data : {};

    await ensureDatabaseReady();

    const conditions = [];

    // Enforce user's lead scope in SQL
    const scopeConditions = buildLeadScopeConditions(perms?.leadScope, sessionRes.admin.id, leads);
    if (scopeConditions.length > 0) {
      conditions.push(...scopeConditions);
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

    // Filter: Date range
    const now = new Date();
    if (data.datePreset === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      conditions.push(gte(leads.createdAt, todayStart));
    } else if (data.datePreset === 'yesterday') {
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      conditions.push(and(gte(leads.createdAt, yesterdayStart), lte(leads.createdAt, yesterdayEnd)));
    } else if (data.datePreset === '7d') {
      conditions.push(gte(leads.createdAt, Date.now() - 7 * 24 * 60 * 60 * 1000));
    } else if (data.datePreset === '30d') {
      conditions.push(gte(leads.createdAt, Date.now() - 30 * 24 * 60 * 60 * 1000));
    } else if (data.datePreset === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      conditions.push(gte(leads.createdAt, monthStart));
    } else if (data.datePreset === 'custom' && data.startDate) {
      conditions.push(gte(leads.createdAt, data.startDate));
      if (data.endDate) {
        conditions.push(lte(leads.createdAt, data.endDate));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count matching leads
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(whereClause);

    const totalMatching = Number(countResult[0]?.count || 0);

    // Fetch top 5 preview rows
    const previewRows = await db
      .select()
      .from(leads)
      .where(whereClause)
      .orderBy(desc(leads.createdAt))
      .limit(5);

    const canViewContact = hasPermission(perms, 'leads:view_contact');

    const formattedPreview = previewRows.map((lead) => {
      const rawEmail = decryptPii(lead.emailEncrypted);
      const rawMessage = decryptPii(lead.messageEncrypted);

      return {
        id: lead.id,
        createdAt: lead.createdAt,
        name: `${lead.firstName} ${lead.lastName}`,
        email: canViewContact ? rawEmail : maskEmail(rawEmail),
        category: lead.category,
        status: lead.status,
        message: canViewContact ? rawMessage : maskMessage(rawMessage),
      };
    });

    return NextResponse.json({
      totalCount: totalMatching,
      previewRows: formattedPreview,
      isMasked: !canViewContact,
    });
  } catch (err) {
    console.error('Export preview error:', err);
    return NextResponse.json({ error: 'Failed to generate export preview' }, { status: 500 });
  }
}
