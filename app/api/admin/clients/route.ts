import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { clients, workItems } from '@/lib/db/schema';
import { desc, like, or, eq, sql } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';

const ClientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  billingAddress: z.string().trim().max(500).optional().or(z.literal('')),
  gstin: z.string().trim().max(30).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!perms || (!perms.isSuperAdmin && !perms.permissions.has('clients:view'))) {
      return NextResponse.json({ error: 'Permission denied: clients:view required' }, { status: 403 });
    }

    await ensureDatabaseReady();
    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim().toLowerCase();

    let query = db.select().from(clients).$dynamic();
    if (search) {
      query = query.where(
        or(
          like(clients.name, `%${search}%`),
          like(clients.email, `%${search}%`),
          like(clients.company, `%${search}%`)
        )
      );
    }

    const clientRows = await query.orderBy(desc(clients.createdAt)).limit(100);

    return NextResponse.json({ clients: clientRows });
  } catch (err) {
    console.error('Fetch clients error:', err);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!perms || (!perms.isSuperAdmin && !perms.permissions.has('clients:manage'))) {
      return NextResponse.json({ error: 'Permission denied: clients:manage required' }, { status: 403 });
    }

    const json = await req.json();
    const result = ClientSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid client data', details: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;
    await ensureDatabaseReady();
    const clientId = crypto.randomUUID();
    const now = Date.now();

    await db.insert(clients).values({
      id: clientId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      billingAddress: data.billingAddress || null,
      gstin: data.gstin || null,
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      clientId,
      message: 'Client profile created successfully.',
    });
  } catch (err) {
    console.error('Create client error:', err);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
