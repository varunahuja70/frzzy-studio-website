import { NextRequest, NextResponse } from 'next/server';
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
import { eq, and, desc } from 'drizzle-orm';
import { decryptPii } from '@/lib/auth/encryption';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view leads' }, { status: 403 });
    }

    await ensureDatabaseReady();

    // Enforce database-level scope filtering (prevents IDOR)
    const scopeConditions = buildLeadScopeConditions(perms?.leadScope, sessionRes.admin.id, leads);
    const rows = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), ...scopeConditions))
      .limit(1);

    if (rows.length === 0) {
      // 404 to avoid leaking existence of out-of-scope lead IDs
      return NextResponse.json({ error: 'Lead not found or access restricted' }, { status: 404 });
    }

    const lead = rows[0];

    // Notes
    const notes = await db
      .select({
        id: leadNotes.id,
        content: leadNotes.content,
        createdAt: leadNotes.createdAt,
        adminId: leadNotes.adminId,
      })
      .from(leadNotes)
      .where(eq(leadNotes.leadId, id))
      .orderBy(desc(leadNotes.createdAt));

    const canViewContact = hasPermission(perms, 'leads:view_contact');
    const rawEmail = decryptPii(lead.emailEncrypted);
    const rawMessage = decryptPii(lead.messageEncrypted);

    // Get assignee name if assigned
    let assigneeName = null;
    if (lead.assignedTo) {
      const u = await db.select({ name: admins.name, email: admins.email }).from(admins).where(eq(admins.id, lead.assignedTo)).limit(1);
      if (u.length > 0) assigneeName = u[0].name || u[0].email;
    }

    return NextResponse.json({
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: canViewContact ? rawEmail : maskEmail(rawEmail),
        category: lead.category,
        message: canViewContact ? rawMessage : maskMessage(rawMessage),
        status: lead.status,
        assignedTo: lead.assignedTo,
        assigneeName,
        sourcePage: lead.sourcePage,
        deviceType: lead.deviceType,
        browser: lead.browser,
        os: lead.os,
        country: lead.country,
        ipMasked: lead.ipMasked,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        notes,
        isMasked: !canViewContact,
      },
    });
  } catch (err) {
    console.error('Fetch lead by id error:', err);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}
