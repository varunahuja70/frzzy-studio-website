import { canViewWorkItem } from '@/lib/work-items/access';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { workItems, workItemComments, workItemTimeline, notifications } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';

const CreateCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  isInternalOnly: z.boolean().default(false),
  mentions: z.array(z.string()).optional(),
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
    if (!canViewWorkItem(item, perms)) {
      return NextResponse.json({ error: 'Access denied: not assigned or authorized' }, { status: 403 });
    }

    const isAssignee = item.assignedTo === perms.adminId && !perms.isSuperAdmin;

    const comments = await db
      .select()
      .from(workItemComments)
      .where(eq(workItemComments.workItemId, id))
      .orderBy(workItemComments.createdAt);

    // Filter out internal studio notes for assignees
    const filtered = comments.filter((c) => {
      if (perms.isSuperAdmin || perms.permissions.has('work_items:view_all')) return true;
      if (isAssignee && c.isInternalOnly) return false;
      return true;
    });

    return NextResponse.json({ comments: filtered });
  } catch (err) {
    console.error('Fetch comments error:', err);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

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
    if (!perms) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json = await req.json();
    const result = CreateCommentSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid comment content' }, { status: 400 });
    }

    const data = result.data;
    await ensureDatabaseReady();

    const [item] = await db
      .select()
      .from(workItems)
      .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 });
    }
    if (!canViewWorkItem(item, perms)) {
      return NextResponse.json({ error: 'Access denied: not assigned or authorized' }, { status: 403 });
    }

    const isAssignee = item.assignedTo === perms.adminId;
    // Assignees cannot post internal-only studio comments
    const isInternalOnly = isAssignee && !perms.isSuperAdmin ? false : data.isInternalOnly;

    const commentId = crypto.randomUUID();
    const now = Date.now();

    await db.insert(workItemComments).values({
      id: commentId,
      workItemId: id,
      adminId: perms.adminId,
      adminName: perms.name || perms.email,
      adminRole: perms.roleName,
      content: data.content,
      isInternalOnly,
      mentions: data.mentions ? JSON.stringify(data.mentions) : null,
      createdAt: now,
    });

    // Notify other party (assigner <-> assignee) if visible
    if (!isInternalOnly) {
      const targetUser = isAssignee ? item.assignedBy : item.assignedTo;
      if (targetUser && targetUser !== perms.adminId) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          recipientId: targetUser,
          actorId: perms.adminId,
          actorName: perms.name || perms.email,
          type: 'mention',
          title: `New Comment on ${item.itemNumber}`,
          message: `${perms.name || perms.email}: "${data.content.slice(0, 100)}..."`,
          resourceType: 'work_item',
          resourceId: id,
          createdAt: now,
        });
      }
    }

    return NextResponse.json({
      success: true,
      commentId,
      message: 'Comment added successfully.',
    });
  } catch (err) {
    console.error('Create comment error:', err);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
