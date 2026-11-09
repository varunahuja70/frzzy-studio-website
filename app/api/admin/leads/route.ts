import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
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
import { leads, leadNotes, admins } from '@/lib/db/schema';
import { eq, desc, and, or, like, inArray, sql } from 'drizzle-orm';
import { decryptPii, encryptPii, createBlindIndex } from '@/lib/auth/encryption';
import { verifyReauthGrant } from '@/lib/auth/reauth';
import { logAuditEvent } from '@/lib/auth/audit';
import { syncLeadToSupabase, updateLeadInSupabase, deleteLeadFromSupabase } from '@/lib/supabase/sync';

const PatchLeadSchema = z.object({
  id: z.string(),
  status: z.enum(['new', 'contacted', 'in_progress', 'won', 'lost', 'spam']).optional(),
  assignedTo: z.string().nullable().optional(),
  note: z.string().trim().max(1000).optional(),
});

const CreateLeadSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  category: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(3000),
  status: z.enum(['new', 'contacted', 'in_progress', 'won', 'lost', 'spam']).default('new'),
  assignedTo: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view leads' }, { status: 403 });
    }

    await ensureDatabaseReady();

    const searchParams = req.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').trim();
    const statusFilter = searchParams.get('status') || 'all';
    const assignedFilter = searchParams.get('assigned');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    // Enforce database-level granular lead scoping
    const scopeConditions = buildLeadScopeConditions(perms?.leadScope, sessionRes.admin.id, leads);
    if (scopeConditions.length > 0) {
      conditions.push(...scopeConditions);
    }

    if (statusFilter !== 'all') {
      conditions.push(eq(leads.status, statusFilter));
    }

    if (assignedFilter && assignedFilter !== 'all') {
      if (assignedFilter === 'unassigned') {
        conditions.push(sql`${leads.assignedTo} IS NULL`);
      } else {
        conditions.push(eq(leads.assignedTo, assignedFilter));
      }
    }

    if (query) {
      const emailBlind = createBlindIndex(query);
      conditions.push(
        or(
          like(leads.firstName, `%${query}%`),
          like(leads.lastName, `%${query}%`),
          like(leads.category, `%${query}%`),
          eq(leads.emailBlindIndex, emailBlind)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(leads)
      .where(whereClause)
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch notes for the returned leads
    const leadIds = rows.map((r) => r.id);
    const notesMap: Record<string, Array<{ id: string; content: string; createdAt: number }>> = {};

    if (leadIds.length > 0) {
      const notes = await db
        .select()
        .from(leadNotes)
        .where(inArray(leadNotes.leadId, leadIds))
        .orderBy(desc(leadNotes.createdAt));

      notes.forEach((n) => {
        if (!notesMap[n.leadId]) notesMap[n.leadId] = [];
        notesMap[n.leadId].push({
          id: n.id,
          content: n.content,
          createdAt: n.createdAt,
        });
      });
    }

    // Check if user has permission to view unmasked contact details
    const canViewContact = hasPermission(perms, 'leads:view_contact');

    // Fetch assignees names
    const assignees = await db.select({ id: admins.id, name: admins.name, email: admins.email }).from(admins);
    const assigneeMap = new Map<string, string>();
    assignees.forEach((a) => assigneeMap.set(a.id, a.name || a.email));

    // Format leads applying field-level masking if contact view is forbidden
    const formattedLeads = rows.map((lead) => {
      const rawEmail = decryptPii(lead.emailEncrypted);
      const rawMessage = decryptPii(lead.messageEncrypted);

      return {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: canViewContact ? rawEmail : maskEmail(rawEmail),
        category: lead.category,
        message: canViewContact ? rawMessage : maskMessage(rawMessage),
        status: lead.status,
        assignedTo: lead.assignedTo,
        assigneeName: lead.assignedTo ? assigneeMap.get(lead.assignedTo) || 'Assigned' : null,
        sourcePage: lead.sourcePage,
        deviceType: lead.deviceType,
        browser: lead.browser,
        os: lead.os,
        country: lead.country,
        ipMasked: lead.ipMasked,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        notes: notesMap[lead.id] || [],
        isMasked: !canViewContact,
      };
    });

    return NextResponse.json({
      leads: formattedLeads,
      page,
      limit,
    });
  } catch (err) {
    console.error('Leads fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:create')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create leads' }, { status: 403 });
    }

    const json = await req.json();
    const parsed = CreateLeadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid lead data' }, { status: 400 });
    }

    const data = parsed.data;
    await ensureDatabaseReady();

    const id = crypto.randomUUID();
    const now = Date.now();

    await db.insert(leads).values({
      id,
      firstName: data.firstName,
      lastName: data.lastName,
      emailEncrypted: encryptPii(data.email),
      emailBlindIndex: createBlindIndex(data.email),
      category: data.category,
      messageEncrypted: encryptPii(data.message),
      status: data.status,
      assignedTo: data.assignedTo || null,
      sourcePage: '/admin-manual',
      country: 'Studio Direct',
      createdAt: now,
      updatedAt: now,
    });

    await syncLeadToSupabase({
      id,
      firstName: data.firstName,
      lastName: data.lastName,
      emailEncrypted: encryptPii(data.email),
      emailBlindIndex: createBlindIndex(data.email),
      category: data.category,
      messageEncrypted: encryptPii(data.message),
      status: data.status,
      assignedTo: data.assignedTo || null,
      sourcePage: '/admin-manual',
      country: 'Studio Direct',
      createdAt: now,
      updatedAt: now,
    });

    const ip = getClientIp(req);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'LEAD_CREATED_MANUAL',
      resource: id,
      details: { category: data.category, status: data.status },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, id, message: 'Lead created successfully' });
  } catch (err) {
    console.error('Create lead error:', err);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);

    const json = await req.json();
    const result = PatchLeadSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }

    const { id, status, assignedTo, note } = result.data;
    await ensureDatabaseReady();

    // Verify scope: query lead with user's scope conditions
    const scopeConditions = buildLeadScopeConditions(perms?.leadScope, sessionRes.admin.id, leads);
    const existing = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), ...scopeConditions))
      .limit(1);

    if (existing.length === 0) {
      // Return 404 to prevent IDOR disclosure
      return NextResponse.json({ error: 'Lead not found or access restricted by scope' }, { status: 404 });
    }

    const currentLead = existing[0];
    const now = Date.now();
    const setPayload: Record<string, any> = { updatedAt: now };

    if (status) {
      if (!hasPermission(perms, 'leads:change_status')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions to change lead status' }, { status: 403 });
      }
      setPayload.status = status;
    }

    if (assignedTo !== undefined) {
      if (!hasPermission(perms, 'leads:assign')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions to assign leads' }, { status: 403 });
      }
      setPayload.assignedTo = assignedTo;
    }

    if (Object.keys(setPayload).length > 1) {
      await db.update(leads).set(setPayload).where(eq(leads.id, id));
      await updateLeadInSupabase(id, setPayload);

      await logAuditEvent({
        adminId: sessionRes.admin.id,
        action: 'LEAD_UPDATED',
        resource: id,
        details: { oldStatus: currentLead.status, newStatus: status, assignedTo },
        ipAddress: getClientIp(req),
      });
    }

    if (note) {
      if (!hasPermission(perms, 'leads:add_notes')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions to add lead notes' }, { status: 403 });
      }

      await db.insert(leadNotes).values({
        id: crypto.randomUUID(),
        leadId: id,
        adminId: sessionRes.admin.id,
        content: note.replace(/[<>]/g, ''),
        createdAt: now,
      });

      await logAuditEvent({
        adminId: sessionRes.admin.id,
        action: 'LEAD_NOTE_ADDED',
        resource: id,
        details: { noteLength: note.length },
        ipAddress: getClientIp(req),
      });
    }

    return NextResponse.json({ success: true, message: 'Lead updated successfully' });
  } catch (err) {
    console.error('Lead update error:', err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:delete')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete leads' }, { status: 403 });
    }

    // Require sensitive action re-authentication grant!
    const grant = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grant, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    await ensureDatabaseReady();

    // Check scope before deleting
    const scopeConditions = buildLeadScopeConditions(perms?.leadScope, sessionRes.admin.id, leads);
    const target = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, id), ...scopeConditions))
      .limit(1);

    if (target.length === 0) {
      return NextResponse.json({ error: 'Lead not found or access restricted' }, { status: 404 });
    }

    await db.delete(leads).where(eq(leads.id, id));
    await deleteLeadFromSupabase(id);

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'LEAD_DELETED',
      resource: id,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    console.error('Lead delete error:', err);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
