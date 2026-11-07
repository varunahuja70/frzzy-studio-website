import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import {
  workItems,
  workItemTimeline,
  workItemSubtasks,
  workItemAttachments,
  workItemComments,
  notifications,
} from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';
import { projectWorkItem } from '@/lib/work-items/field-projection';
import { validateStatusTransition, WorkItemStatus } from '@/lib/work-items/state-machine';

const UpdateWorkItemSchema = z.object({
  status: z.enum([
    'assigned',
    'accepted',
    'in_progress',
    'in_review',
    'completed',
    'delivered',
    'on_hold',
    'cancelled',
  ]).optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  dueDate: z.number().int().positive().nullable().optional(),
  version: z.number().int().optional(),
});

export async function GET(
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
    if (!perms) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ensureDatabaseReady();

    const [item] = await db
      .select()
      .from(workItems)
      .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 });
    }

    // IDOR and Visibility check
    const isOwner = item.createdBy === perms.adminId;
    const isAssignee = item.assignedTo === perms.adminId;
    const canViewAll = perms.isSuperAdmin || perms.permissions.has('work_items:view_all');

    if (!isOwner && !isAssignee && !canViewAll) {
      return NextResponse.json({ error: 'Access denied: not assigned or authorized' }, { status: 403 });
    }

    // Personal items isolation
    if (item.isPersonal && !isOwner && !perms.isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied: personal item' }, { status: 403 });
    }

    // Fetch related subtasks, attachments, and timeline
    const subtasks = await db
      .select()
      .from(workItemSubtasks)
      .where(eq(workItemSubtasks.workItemId, id))
      .orderBy(workItemSubtasks.position);

    const attachments = await db
      .select()
      .from(workItemAttachments)
      .where(eq(workItemAttachments.workItemId, id));

    const timeline = await db
      .select()
      .from(workItemTimeline)
      .where(eq(workItemTimeline.workItemId, id))
      .orderBy(workItemTimeline.createdAt);

    // Filter comments: Assignees cannot see isInternalOnly: true!
    const allComments = await db
      .select()
      .from(workItemComments)
      .where(eq(workItemComments.workItemId, id))
      .orderBy(workItemComments.createdAt);

    const visibleComments = allComments.filter((c) => {
      if (perms.isSuperAdmin || perms.permissions.has('work_items:view_all')) return true;
      if (isAssignee && c.isInternalOnly) return false;
      return true;
    });

    const projected = projectWorkItem(item, {
      adminId: perms.adminId,
      isSuperAdmin: perms.isSuperAdmin,
      permissions: perms.permissions,
    });

    return NextResponse.json({
      workItem: projected,
      subtasks,
      attachments,
      comments: visibleComments,
      timeline,
    });
  } catch (err) {
    console.error('Get work item error:', err);
    return NextResponse.json({ error: 'Failed to fetch work item' }, { status: 500 });
  }
}

export async function PATCH(
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
    if (!perms) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json = await req.json();
    const result = UpdateWorkItemSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }

    await ensureDatabaseReady();

    const [item] = await db
      .select()
      .from(workItems)
      .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 });
    }

    const isAssignee = item.assignedTo === perms.adminId;
    const isOwner = item.createdBy === perms.adminId;
    const canEdit = perms.isSuperAdmin || perms.permissions.has('work_items:edit') || isOwner;

    // Optimistic concurrency control check
    if (result.data.version !== undefined && result.data.version !== item.version) {
      return NextResponse.json(
        {
          error: 'Concurrency conflict: this item was modified by another user. Please reload.',
          currentVersion: item.version,
        },
        { status: 409 }
      );
    }

    const updates: Partial<typeof workItems.$inferInsert> = {
      updatedAt: Date.now(),
      version: item.version + 1,
    };

    // 1. Status Transition Validation
    if (result.data.status && result.data.status !== item.status) {
      const transition = validateStatusTransition({
        fromStatus: item.status as WorkItemStatus,
        toStatus: result.data.status as WorkItemStatus,
        isAssignee,
        isSuperAdmin: perms.isSuperAdmin,
        permissions: perms.permissions,
        isDeliveredLocked: item.status === 'delivered',
      });

      if (!transition.allowed) {
        return NextResponse.json({ error: transition.reason || 'Invalid status transition' }, { status: 400 });
      }

      updates.status = result.data.status;
      if (transition.forcedProgressPercent !== undefined) {
        updates.progressPercent = transition.forcedProgressPercent;
      }
      if (result.data.status === 'completed') {
        updates.completedAt = Date.now();
      }

      // Record timeline entry
      await db.insert(workItemTimeline).values({
        id: crypto.randomUUID(),
        workItemId: id,
        actorId: perms.adminId,
        actorName: perms.name || perms.email,
        actorRole: perms.roleName,
        action: 'status_changed',
        details: JSON.stringify({ from: item.status, to: result.data.status }),
        createdAt: Date.now(),
      });

      // Notify assigner or assignee
      const notifyTarget = isAssignee ? item.assignedBy : item.assignedTo;
      if (notifyTarget && notifyTarget !== perms.adminId) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          recipientId: notifyTarget,
          actorId: perms.adminId,
          actorName: perms.name || perms.email,
          type: 'status_change',
          title: `Status updated on ${item.itemNumber}`,
          message: `${perms.name || perms.email} changed status to "${result.data.status}".`,
          resourceType: 'work_item',
          resourceId: item.id,
          createdAt: Date.now(),
        });
      }
    }

    // 2. Progress percentage update
    if (result.data.progressPercent !== undefined) {
      if (!isAssignee && !canEdit && !perms.permissions.has('work_items:update_progress')) {
        return NextResponse.json({ error: 'Permission denied: cannot update progress' }, { status: 403 });
      }
      updates.progressPercent = result.data.progressPercent;
    }

    // 3. Priority and Due Date updates (Assigner / Manager only)
    if (result.data.priority !== undefined && (canEdit || perms.permissions.has('work_items:assign'))) {
      updates.priority = result.data.priority;
    }
    if (result.data.dueDate !== undefined && (canEdit || perms.permissions.has('work_items:assign'))) {
      updates.dueDate = result.data.dueDate;
    }

    await db.update(workItems).set(updates).where(eq(workItems.id, id));

    return NextResponse.json({
      success: true,
      version: updates.version,
      message: 'Work item updated successfully.',
    });
  } catch (err) {
    console.error('Update work item error:', err);
    return NextResponse.json({ error: 'Failed to update work item' }, { status: 500 });
  }
}

export async function DELETE(
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
    if (!perms || (!perms.isSuperAdmin && !perms.permissions.has('work_items:delete'))) {
      return NextResponse.json({ error: 'Permission denied: work_items:delete required' }, { status: 403 });
    }

    await ensureDatabaseReady();

    // Soft delete to Trash
    await db
      .update(workItems)
      .set({
        deletedAt: Date.now(),
        deletedBy: perms.adminId,
        updatedAt: Date.now(),
      })
      .where(eq(workItems.id, id));

    return NextResponse.json({ success: true, message: 'Work item moved to Trash.' });
  } catch (err) {
    console.error('Delete work item error:', err);
    return NextResponse.json({ error: 'Failed to delete work item' }, { status: 500 });
  }
}
