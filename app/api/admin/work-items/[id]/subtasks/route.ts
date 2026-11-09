import { canViewWorkItem, canWorkOnWorkItem } from '@/lib/work-items/access';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { workItems, workItemSubtasks } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';

const CreateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(250),
});

const UpdateSubtaskSchema = z.object({
  subtaskId: z.string().min(1),
  completed: z.boolean().optional(),
  title: z.string().trim().min(1).max(250).optional(),
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

    const subtasks = await db
      .select()
      .from(workItemSubtasks)
      .where(eq(workItemSubtasks.workItemId, id))
      .orderBy(workItemSubtasks.position);

    return NextResponse.json({ subtasks });
  } catch (err) {
    console.error('Fetch subtasks error:', err);
    return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
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
    const result = CreateSubtaskSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid subtask title' }, { status: 400 });
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
    if (!canWorkOnWorkItem(item, perms)) {
      return NextResponse.json({ error: 'Access denied: not assigned or authorized' }, { status: 403 });
    }

    const existing = await db
      .select()
      .from(workItemSubtasks)
      .where(eq(workItemSubtasks.workItemId, id));

    const now = Date.now();
    const newSubtask = {
      id: crypto.randomUUID(),
      workItemId: id,
      title: result.data.title,
      completed: false,
      position: existing.length,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(workItemSubtasks).values(newSubtask);

    return NextResponse.json({ success: true, subtask: newSubtask });
  } catch (err) {
    console.error('Create subtask error:', err);
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
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
    const result = UpdateSubtaskSchema.safeParse(json);
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
    if (!canWorkOnWorkItem(item, perms)) {
      return NextResponse.json({ error: 'Access denied: not assigned or authorized' }, { status: 403 });
    }

    const { subtaskId, completed, title } = result.data;
    const now = Date.now();

    const updates: Partial<typeof workItemSubtasks.$inferInsert> = {
      updatedAt: now,
    };

    if (completed !== undefined) {
      updates.completed = completed;
    }

    if (title !== undefined) {
      updates.title = title;
    }

    await db
      .update(workItemSubtasks)
      .set(updates)
      .where(and(eq(workItemSubtasks.id, subtaskId), eq(workItemSubtasks.workItemId, id)));

    // Recalculate progress if checklist items exist
    const allSubtasks = await db
      .select()
      .from(workItemSubtasks)
      .where(eq(workItemSubtasks.workItemId, id));

    let autoProgress: number | null = null;
    if (allSubtasks.length > 0) {
      const completedCount = allSubtasks.filter((s) => s.completed).length;
      autoProgress = Math.round((completedCount / allSubtasks.length) * 100);

      await db
        .update(workItems)
        .set({
          progressPercent: autoProgress,
          updatedAt: now,
        })
        .where(eq(workItems.id, id));
    }

    return NextResponse.json({
      success: true,
      progressPercent: autoProgress,
      subtasks: allSubtasks,
    });
  } catch (err) {
    console.error('Update subtask error:', err);
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 });
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

    const { searchParams } = new URL(req.url);
    const subtaskId = searchParams.get('subtaskId');
    if (!subtaskId) {
      return NextResponse.json({ error: 'subtaskId is required' }, { status: 400 });
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
    if (!canWorkOnWorkItem(item, perms)) {
      return NextResponse.json({ error: 'Access denied: not assigned or authorized' }, { status: 403 });
    }

    await db
      .delete(workItemSubtasks)
      .where(and(eq(workItemSubtasks.id, subtaskId), eq(workItemSubtasks.workItemId, id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete subtask error:', err);
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}
