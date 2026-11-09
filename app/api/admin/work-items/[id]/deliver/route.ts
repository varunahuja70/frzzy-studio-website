import { isHiddenPersonalItem } from '@/lib/work-items/access';
import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { workItems, workItemTimeline, notifications } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';
import { generateSequentialReferenceNumber } from '@/lib/work-items/reference-number';
import { logAuditEvent } from '@/lib/auth/audit';

const DeliverWorkItemSchema = z.object({
  deliveryDate: z.number().int().positive(),
  finalPrice: z.number().int().positive('Final price is mandatory and must be greater than 0'),
  currency: z.string().default('INR'),
  paymentStatus: z.enum(['unpaid', 'partially_paid', 'paid']),
  amountReceived: z.number().int().min(0).default(0),
  discount: z.number().int().min(0).optional().default(0),
  taxPercent: z.number().int().min(0).max(100).optional().default(18), // Standard 18% GST default
  paymentMethod: z.string().trim().max(80).optional(),
  deliveryNotes: z.string().trim().max(5000).optional(),
  invoiceDetails: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!perms || (!perms.isSuperAdmin && !perms.permissions.has('work_items:deliver'))) {
      return NextResponse.json(
        { error: 'Permission denied: "work_items:deliver" required to mark items as delivered.' },
        { status: 403 }
      );
    }

    const json = await req.json();
    const result = DeliverWorkItemSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid delivery details: Final price and delivery date are required.', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;
    await ensureDatabaseReady();

    const [item] = await db
      .select()
      .from(workItems)
      .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
      .limit(1);

    if (!item || isHiddenPersonalItem(item, perms)) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 });
    }

    // If item was already delivered, check work_items:edit_delivered
    if (item.status === 'delivered') {
      if (!perms.isSuperAdmin && !perms.permissions.has('work_items:edit_delivered')) {
        return NextResponse.json(
          { error: 'Delivered items are permanently locked. Requires "work_items:edit_delivered" permission.' },
          { status: 403 }
        );
      }
    }

    const now = Date.now();
    const balanceDue = Math.max(0, data.finalPrice - data.amountReceived);
    const invoiceReference = item.invoiceReference || (await generateSequentialReferenceNumber('INV'));

    await db
      .update(workItems)
      .set({
        status: 'delivered',
        progressPercent: 100,
        finalPrice: data.finalPrice,
        currency: data.currency,
        paymentStatus: data.paymentStatus,
        amountReceived: data.amountReceived,
        balanceDue,
        discount: data.discount,
        taxPercent: data.taxPercent,
        paymentMethod: data.paymentMethod || null,
        deliveryNotes: data.deliveryNotes || null,
        deliveredAt: data.deliveryDate,
        deliveredBy: perms.adminId,
        invoiceReference,
        invoiceDetails: data.invoiceDetails ? JSON.stringify(data.invoiceDetails) : null,
        version: item.version + 1,
        updatedAt: now,
      })
      .where(eq(workItems.id, id));

    // Audit log financial event
    await logAuditEvent({
      adminId: perms.adminId,
      action: 'LEAD_STATUS_CHANGED',
      resource: item.itemNumber,
      details: {
        action: 'DELIVERY_COMPLETED',
        finalPrice: data.finalPrice,
        currency: data.currency,
        paymentStatus: data.paymentStatus,
        invoiceReference,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get('user-agent') || 'Admin Vault',
    });

    // Record timeline entry
    await db.insert(workItemTimeline).values({
      id: crypto.randomUUID(),
      workItemId: id,
      actorId: perms.adminId,
      actorName: perms.name || perms.email,
      actorRole: perms.roleName,
      action: 'delivered',
      details: JSON.stringify({
        invoiceReference,
        finalPrice: data.finalPrice,
        currency: data.currency,
        paymentStatus: data.paymentStatus,
      }),
      createdAt: now,
    });

    // Notify assignee if assigned
    if (item.assignedTo && item.assignedTo !== perms.adminId) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        recipientId: item.assignedTo,
        actorId: perms.adminId,
        actorName: perms.name || perms.email,
        type: 'delivered',
        title: `Work Item Delivered: ${item.itemNumber}`,
        message: `Project "${item.title}" was approved and delivered to the client.`,
        resourceType: 'work_item',
        resourceId: id,
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      invoiceReference,
      message: 'Work item successfully marked as Delivered and locked.',
    });
  } catch (err) {
    console.error('Deliver work item error:', err);
    return NextResponse.json({ error: 'Failed to deliver work item' }, { status: 500 });
  }
}
