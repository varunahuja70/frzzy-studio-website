import { sanitizeLinksArray } from '@/lib/work-items/link-sanitizer';
import { canUpdateWorkItem, isHiddenPersonalItem, withoutStoragePath } from '@/lib/work-items/access';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import {
  workItems,
  workItemTimeline,
  workItemSubtasks,
  workItemAttachments,
  workItemComments,
  workItemAssignments,
  admins,
  notifications,
} from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';
import { projectWorkItem } from '@/lib/work-items/field-projection';
import { validateStatusTransition, WorkItemStatus } from '@/lib/work-items/state-machine';

const UpdateWorkItemSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().min(1).max(10000).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  source: z.string().trim().max(80).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  dueDate: z.number().int().positive().nullable().optional(),
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
  clientName: z.string().trim().max(120).optional(),
  clientEmail: z.string().trim().email().optional().or(z.literal('')).nullable().optional(),
  clientPhone: z.string().trim().max(40).optional().or(z.literal('')).nullable().optional(),
  clientCompany: z.string().trim().max(120).optional().or(z.literal('')).nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  sharedFields: z.array(z.string()).optional(),
  assignmentInstructions: z.string().trim().max(5000).nullable().optional(),
  quotedPrice: z.number().int().min(0).optional(),
  finalPrice: z.number().int().min(0).optional(),
  discount: z.number().int().min(0).optional(),
  taxPercent: z.number().int().min(0).max(100).optional(),
  currency: z.string().optional(),
  paymentStatus: z.string().optional(),
  tags: z.array(z.string()).optional(),
  links: z.array(z.object({ url: z.string(), label: z.string().optional(), id: z.string().optional() })).optional(),
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
      attachments: attachments.map(withoutStoragePath),
      comments: visibleComments,
      timeline,
      canEdit: perms.isSuperAdmin || perms.permissions.has('work_items:edit') || isOwner,
      isSuperAdmin: perms.isSuperAdmin,
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
      return NextResponse.json({ error: 'Invalid update payload', details: result.error.flatten() }, { status: 400 });
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

    if (!canUpdateWorkItem(item, perms)) {
      return NextResponse.json({ error: 'Access denied: not assigned or authorized' }, { status: 403 });
    }

    const isAssignee = item.assignedTo === perms.adminId;
    const isOwner = item.createdBy === perms.adminId;
    const canEdit = perms.isSuperAdmin || perms.permissions.has('work_items:edit') || isOwner;

    // Optimistic concurrency control check (if provided and different)
    if (result.data.version !== undefined && result.data.version !== item.version) {
      return NextResponse.json(
        {
          error: 'Concurrency conflict: this item was modified by another user. Please reload.',
          currentVersion: item.version,
        },
        { status: 409 }
      );
    }

    const now = Date.now();
    const updates: Partial<typeof workItems.$inferInsert> = {
      updatedAt: now,
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
        updates.completedAt = now;
      }

      // Record timeline entry
      await db.insert(workItemTimeline).values({
        id: crypto.randomUUID(),
        workItemId: id,
        actorId: perms.adminId,
        actorName: perms.name || perms.email,
        actorRole: perms.roleName || (perms.isSuperAdmin ? 'Super Admin' : 'Admin'),
        action: 'status_changed',
        details: JSON.stringify({ from: item.status, to: result.data.status }),
        createdAt: now,
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
          createdAt: now,
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

    // 3. Priority and Due Date updates
    if (result.data.priority !== undefined && (canEdit || perms.permissions.has('work_items:assign'))) {
      updates.priority = result.data.priority;
    }
    if (result.data.dueDate !== undefined && (canEdit || perms.permissions.has('work_items:assign'))) {
      updates.dueDate = result.data.dueDate;
    }

    // 4. Super Admin & Edit Authority updates
    if (canEdit) {
      if (result.data.title !== undefined) updates.title = result.data.title;
      if (result.data.description !== undefined) updates.description = result.data.description;
      if (result.data.category !== undefined) updates.category = result.data.category;
      if (result.data.source !== undefined) updates.source = result.data.source;
      if (result.data.clientName !== undefined) updates.clientName = result.data.clientName;
      if (result.data.clientEmail !== undefined) updates.clientEmail = result.data.clientEmail || null;
      if (result.data.clientPhone !== undefined) updates.clientPhone = result.data.clientPhone || null;
      if (result.data.clientCompany !== undefined) updates.clientCompany = result.data.clientCompany || null;
      if (result.data.assignmentInstructions !== undefined) {
        updates.assignmentInstructions = result.data.assignmentInstructions || null;
      }

      // Shared fields tick list
      if (result.data.sharedFields !== undefined) {
        updates.sharedFields = JSON.stringify(result.data.sharedFields);
      }

      // Tags & Links
      if (result.data.tags !== undefined) {
        updates.tags = JSON.stringify(result.data.tags);
      }
      if (result.data.links !== undefined) {
        updates.links = JSON.stringify(sanitizeLinksArray(result.data.links));
      }

      // Financial fields (Super Admin or Financials manager)
      if (perms.isSuperAdmin || perms.permissions.has('financials:view_quote')) {
        if (result.data.quotedPrice !== undefined) updates.quotedPrice = result.data.quotedPrice;
        if (result.data.currency !== undefined) updates.currency = result.data.currency;
      }
      if (perms.isSuperAdmin || perms.permissions.has('financials:view_delivered')) {
        if (result.data.finalPrice !== undefined) updates.finalPrice = result.data.finalPrice;
        if (result.data.discount !== undefined) updates.discount = result.data.discount;
        if (result.data.taxPercent !== undefined) updates.taxPercent = result.data.taxPercent;
        if (result.data.paymentStatus !== undefined) updates.paymentStatus = result.data.paymentStatus;
      }

      // Assignee modification / Reassignment / Unassignment
      if (result.data.assignedTo !== undefined && result.data.assignedTo !== item.assignedTo) {
        if (result.data.assignedTo && result.data.assignedTo.trim() !== '') {
          const [targetAdmin] = await db
            .select()
            .from(admins)
            .where(and(eq(admins.id, result.data.assignedTo), isNull(admins.deletedAt)))
            .limit(1);

          if (!targetAdmin || targetAdmin.status !== 'active') {
            return NextResponse.json({ error: 'Target assignee not found or inactive' }, { status: 400 });
          }

          const assignerRoleName = perms.roleName || (perms.isSuperAdmin ? 'Super Admin' : 'Admin');
          updates.assignedTo = targetAdmin.id;
          updates.assignedByName = perms.name || perms.email;
          updates.assignedByRole = assignerRoleName;
          updates.assignedAt = now;

          // Record in assignment history
          await db.insert(workItemAssignments).values({
            id: crypto.randomUUID(),
            workItemId: id,
            assignedTo: targetAdmin.id,
            assignedBy: perms.adminId,
            assignedByName: perms.name || perms.email,
            assignedByRole: assignerRoleName,
            sharedFields: updates.sharedFields || item.sharedFields || '[]',
            instructions: updates.assignmentInstructions || item.assignmentInstructions || null,
            priority: updates.priority || item.priority,
            dueDate: updates.dueDate || item.dueDate,
            createdAt: now,
          });

          // Timeline entry
          await db.insert(workItemTimeline).values({
            id: crypto.randomUUID(),
            workItemId: id,
            actorId: perms.adminId,
            actorName: perms.name || perms.email,
            actorRole: assignerRoleName,
            action: 'reassigned',
            details: JSON.stringify({ assignedTo: targetAdmin.name || targetAdmin.email }),
            createdAt: now,
          });

          // Notification
          if (targetAdmin.id !== perms.adminId) {
            await db.insert(notifications).values({
              id: crypto.randomUUID(),
              recipientId: targetAdmin.id,
              actorId: perms.adminId,
              actorName: perms.name || perms.email,
              type: 'assignment',
              title: `Task Assigned: ${item.itemNumber}`,
              message: `${perms.name || perms.email} assigned you "${updates.title || item.title}".`,
              resourceType: 'work_item',
              resourceId: id,
              createdAt: now,
            });
          }
        } else {
          // Unassign
          updates.assignedTo = null;
          updates.assignedByName = null;
          updates.assignedByRole = null;
          updates.assignedAt = null;

          await db.insert(workItemTimeline).values({
            id: crypto.randomUUID(),
            workItemId: id,
            actorId: perms.adminId,
            actorName: perms.name || perms.email,
            actorRole: perms.roleName || (perms.isSuperAdmin ? 'Super Admin' : 'Admin'),
            action: 'unassigned',
            details: JSON.stringify({ unassignedBy: perms.name || perms.email }),
            createdAt: now,
          });
        }
      }
    }

    // Save updates
    await db.update(workItems).set(updates).where(eq(workItems.id, id));

    // Fetch updated row
    const [updatedRow] = await db
      .select()
      .from(workItems)
      .where(eq(workItems.id, id))
      .limit(1);

    const projected = projectWorkItem(updatedRow, {
      adminId: perms.adminId,
      isSuperAdmin: perms.isSuperAdmin,
      permissions: perms.permissions,
    });

    return NextResponse.json({
      success: true,
      version: updates.version,
      workItem: projected,
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

    const [item] = await db
      .select()
      .from(workItems)
      .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
      .limit(1);

    if (!item || isHiddenPersonalItem(item, perms)) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 });
    }

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
