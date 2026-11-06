import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { db, ensureDatabaseReady } from '@/lib/db';
import { leads, leadNotes } from '@/lib/db/schema';
import { eq, desc, and, or, like, inArray } from 'drizzle-orm';
import { decryptPii, createBlindIndex } from '@/lib/auth/encryption';
import { logAuditEvent } from '@/lib/auth/audit';

const PatchLeadSchema = z.object({
  id: z.string(),
  status: z.enum(['new', 'contacted', 'in_progress', 'won', 'lost', 'spam']).optional(),
  note: z.string().trim().max(1000).optional(),
});

function verifyReauthGrant(grantCookie?: string, adminId?: string): boolean {
  if (!grantCookie || !adminId) return false;
  const parts = grantCookie.split(':');
  if (parts.length !== 4) return false;

  const [grantAdminId, expStr, nonce, signature] = parts;
  if (grantAdminId !== adminId) return false;

  const exp = parseInt(expStr, 10);
  if (Date.now() > exp) return false;

  const secret = process.env.ADMIN_PASSWORD_PEPPER || 'reauth-pepper';
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${grantAdminId}:${expStr}:${nonce}`)
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDatabaseReady();

    const searchParams = req.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').trim();
    const statusFilter = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (statusFilter !== 'all') {
      conditions.push(eq(leads.status, statusFilter));
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

    // Decrypt sensitive PII for authorized view
    const formattedLeads = rows.map((lead) => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: decryptPii(lead.emailEncrypted),
      category: lead.category,
      message: decryptPii(lead.messageEncrypted),
      status: lead.status,
      sourcePage: lead.sourcePage,
      deviceType: lead.deviceType,
      browser: lead.browser,
      os: lead.os,
      country: lead.country,
      ipMasked: lead.ipMasked,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      notes: notesMap[lead.id] || [],
    }));

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

export async function PATCH(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const result = PatchLeadSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }

    const { id, status, note } = result.data;
    await ensureDatabaseReady();

    const existing = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const now = Date.now();

    if (status) {
      await db
        .update(leads)
        .set({ status, updatedAt: now })
        .where(eq(leads.id, id));

      await logAuditEvent({
        adminId: sessionRes.admin.id,
        action: 'LEAD_STATUS_CHANGED',
        resource: id,
        details: { oldStatus: existing[0].status, newStatus: status },
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });
    }

    if (note) {
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
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });
    }

    return NextResponse.json({ success: true, message: 'Lead updated successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    await db.delete(leads).where(eq(leads.id, id));

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'LEAD_DELETED',
      resource: id,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, message: 'Lead deleted' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
