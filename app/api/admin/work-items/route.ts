import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { workItems, workItemTimeline, clients, leads } from '@/lib/db/schema';
import { eq, and, desc, isNull, or, like, sql } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';
import { projectWorkItem } from '@/lib/work-items/field-projection';
import { generateSequentialReferenceNumber } from '@/lib/work-items/reference-number';
import { sanitizeExternalLink } from '@/lib/work-items/link-sanitizer';
import { syncWorkItemToSupabase } from '@/lib/supabase/sync';

const CreateWorkItemSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(5).max(10000),
  category: z.string().trim().min(2).max(80),
  source: z.string().trim().default('Website'),
  clientName: z.string().trim().min(2).max(120),
  clientEmail: z.string().trim().email().optional().or(z.literal('')),
  clientPhone: z.string().trim().max(40).optional().or(z.literal('')),
  clientCompany: z.string().trim().max(120).optional().or(z.literal('')),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueDate: z.number().int().positive().optional(),
  quotedPrice: z.number().int().min(0).optional().default(0),
  currency: z.string().default('INR'),
  tags: z.array(z.string().trim().max(30)).optional(),
  links: z.array(z.object({ url: z.string(), label: z.string().optional() })).optional(),
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  isPersonal: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!perms) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ensureDatabaseReady();
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'all'; // 'all' | 'assigned_to_me' | 'created_by_me'
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const search = url.searchParams.get('search')?.trim().toLowerCase();

    // Base conditions: exclude soft-deleted items
    const conditions = [isNull(workItems.deletedAt)];

    // Role-based visibility scoping
    if (scope === 'assigned_to_me' || (!perms.isSuperAdmin && !perms.permissions.has('work_items:view_all'))) {
      if (!perms.permissions.has('work_items:view_all')) {
        conditions.push(
          or(
            eq(workItems.assignedTo, perms.adminId),
            eq(workItems.createdBy, perms.adminId)
          )!
        );
      } else if (scope === 'assigned_to_me') {
        conditions.push(eq(workItems.assignedTo, perms.adminId));
      }
    } else if (scope === 'created_by_me') {
      conditions.push(eq(workItems.createdBy, perms.adminId));
    }

    // Personal items isolation: personal items visible ONLY to creator and Super Admin
    if (!perms.isSuperAdmin) {
      conditions.push(
        or(
          eq(workItems.isPersonal, false),
          eq(workItems.createdBy, perms.adminId)
        )!
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(workItems.status, status));
    }

    if (priority && priority !== 'all') {
      conditions.push(eq(workItems.priority, priority));
    }

    if (search) {
      conditions.push(
        or(
          like(workItems.title, `%${search}%`),
          like(workItems.itemNumber, `%${search}%`),
          like(workItems.clientName, `%${search}%`)
        )!
      );
    }

    const rows = await db
      .select()
      .from(workItems)
      .where(and(...conditions))
      .orderBy(desc(workItems.createdAt))
      .limit(200);

    // Apply strict server-side field-projection and financial isolation
    const projectedItems = rows.map((item) =>
      projectWorkItem(item, {
        adminId: perms.adminId,
        isSuperAdmin: perms.isSuperAdmin,
        permissions: perms.permissions,
      })
    );

    return NextResponse.json({
      workItems: projectedItems,
      total: projectedItems.length,
    });
  } catch (err) {
    console.error('Fetch work items error:', err);
    return NextResponse.json({ error: 'Failed to fetch work items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!perms || (!perms.isSuperAdmin && !perms.permissions.has('work_items:create') && !perms.permissions.has('intake:create'))) {
      return NextResponse.json({ error: 'Permission denied: work_items:create required' }, { status: 403 });
    }

    const json = await req.json();
    const result = CreateWorkItemSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid work item data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    await ensureDatabaseReady();

    // Sanitize any external drive/storage links
    const sanitizedLinks = (data.links || [])
      .map((l) => sanitizeExternalLink(l.url, l.label))
      .filter(Boolean);

    const itemNumber = await generateSequentialReferenceNumber('AEV');
    const itemId = crypto.randomUUID();
    const now = Date.now();

    // If client does not exist, create client record
    let clientId = data.clientId;
    if (!clientId && data.clientName) {
      clientId = crypto.randomUUID();
      await db.insert(clients).values({
        id: clientId,
        name: data.clientName,
        email: data.clientEmail || null,
        phone: data.clientPhone || null,
        company: data.clientCompany || null,
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.insert(workItems).values({
      id: itemId,
      itemNumber,
      leadId: data.leadId || null,
      clientId: clientId || null,
      clientName: data.clientName,
      clientEmail: data.clientEmail || null,
      clientPhone: data.clientPhone || null,
      clientCompany: data.clientCompany || null,
      title: data.title,
      description: data.description,
      category: data.category,
      source: data.source,
      isPersonal: data.isPersonal,
      priority: data.priority,
      status: 'assigned',
      progressPercent: 0,
      dueDate: data.dueDate || null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      links: sanitizedLinks.length > 0 ? JSON.stringify(sanitizedLinks) : null,
      quotedPrice: perms.isSuperAdmin || perms.permissions.has('financials:edit') ? data.quotedPrice || 0 : 0,
      currency: data.currency || 'INR',
      createdBy: perms.adminId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });


    await syncWorkItemToSupabase({
      id: itemId,
      itemNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      source: data.source,
      clientName: data.clientName,
      clientEmail: data.clientEmail || null,
      clientPhone: data.clientPhone || null,
      clientCompany: data.clientCompany || null,
      priority: data.priority,
      status: 'assigned',
      progressPercent: 0,
      quotedPrice: perms.isSuperAdmin || perms.permissions.has('financials:edit') ? data.quotedPrice || 0 : 0,
      currency: data.currency || 'INR',
      dueDate: data.dueDate || null,
      tags: data.tags || [],
      links: sanitizedLinks,
      createdAt: now,
      updatedAt: now,
    });
    // Record activity timeline entry
    await db.insert(workItemTimeline).values({
      id: crypto.randomUUID(),
      workItemId: itemId,
      actorId: perms.adminId,
      actorName: perms.name || perms.email,
      actorRole: perms.roleName,
      action: 'created',
      details: JSON.stringify({ itemNumber, title: data.title, source: data.source }),
      createdAt: now,
    });

    // If converted from a lead, update lead status
    if (data.leadId) {
      await db
        .update(leads)
        .set({ status: 'in_progress', updatedAt: now })
        .where(eq(leads.id, data.leadId));
    }

    return NextResponse.json({
      id: itemId,
      itemNumber,
      message: 'Work item created successfully.',
    });
  } catch (err) {
    console.error('Create work item error:', err);
    return NextResponse.json({ error: 'Failed to create work item' }, { status: 500 });
  }
}
