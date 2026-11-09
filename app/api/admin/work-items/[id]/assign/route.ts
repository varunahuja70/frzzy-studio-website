import { isHiddenPersonalItem } from '@/lib/work-items/access';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { workItems, workItemAssignments, workItemTimeline, notifications, admins, roles } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';

const AssignSchema = z.object({
  assignedTo: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueDate: z.number().int().positive().optional(),
  instructions: z.string().trim().max(5000).optional(),
  sharedFields: z.array(z.string()).default([]),
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
    if (!perms || (!perms.isSuperAdmin && !perms.permissions.has('work_items:assign') && !perms.permissions.has('work_items:reassign'))) {
      return NextResponse.json({ error: 'Permission denied: work_items:assign required' }, { status: 403 });
    }

    const json = await req.json();
    const result = AssignSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid assignment payload', details: result.error.flatten() }, { status: 400 });
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

    // Verify target assignee exists and is active
    const [targetAdmin] = await db
      .select()
      .from(admins)
      .where(and(eq(admins.id, data.assignedTo), isNull(admins.deletedAt)))
      .limit(1);

    if (!targetAdmin || targetAdmin.status !== 'active') {
      return NextResponse.json({ error: 'Assignee not found or inactive' }, { status: 400 });
    }

    const now = Date.now();

    // Fetch assigner's role name
    const assignerRoleName = perms.roleName || (perms.isSuperAdmin ? 'Super Admin' : 'Manager');

    // 1. Save immutable assignment snapshot to work_item_assignments
    await db.insert(workItemAssignments).values({
      id: crypto.randomUUID(),
      workItemId: id,
      assignedTo: data.assignedTo,
      assignedBy: perms.adminId,
      assignedByName: perms.name || perms.email,
      assignedByRole: assignerRoleName,
      sharedFields: JSON.stringify(data.sharedFields),
      instructions: data.instructions || null,
      priority: data.priority,
      dueDate: data.dueDate || null,
      createdAt: now,
    });

    // 2. Update workItems record
    await db
      .update(workItems)
      .set({
        assignedTo: data.assignedTo,
        assignedBy: perms.adminId,
        assignedByName: perms.name || perms.email,
        assignedByRole: assignerRoleName,
        assignedAt: now,
        sharedFields: JSON.stringify(data.sharedFields),
        assignmentInstructions: data.instructions || null,
        priority: data.priority,
        dueDate: data.dueDate || item.dueDate,
        status: item.status === 'assigned' || !item.assignedTo ? 'assigned' : item.status,
        version: item.version + 1,
        updatedAt: now,
      })
      .where(eq(workItems.id, id));

    // 3. Log timeline activity
    await db.insert(workItemTimeline).values({
      id: crypto.randomUUID(),
      workItemId: id,
      actorId: perms.adminId,
      actorName: perms.name || perms.email,
      actorRole: assignerRoleName,
      action: 'assigned',
      details: JSON.stringify({
        assignedTo: targetAdmin.name || targetAdmin.email,
        priority: data.priority,
        sharedFieldsCount: data.sharedFields.length,
      }),
      createdAt: now,
    });

    // 4. Send in-app notification to assignee
    if (data.assignedTo !== perms.adminId) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        recipientId: data.assignedTo,
        actorId: perms.adminId,
        actorName: perms.name || perms.email,
        type: 'assignment',
        title: `New Task Assigned: ${item.itemNumber}`,
        message: `${perms.name || perms.email} assigned you "${item.title}". Priority: ${data.priority.toUpperCase()}.`,
        resourceType: 'work_item',
        resourceId: id,
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Work item successfully assigned to ${targetAdmin.name || targetAdmin.email}.`,
    });
  } catch (err) {
    console.error('Assign work item error:', err);
    return NextResponse.json({ error: 'Failed to assign work item' }, { status: 500 });
  }
}
