import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { notifications, admins } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';

const CreateNotificationSchema = z.object({
  recipientId: z.string().min(1),
  type: z.enum(['assignment', 'status_change', 'progress_update', 'delivered', 'mention', 'due_soon', 'overdue', 'system']).default('assignment'),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  resourceType: z.string().default('work_item'),
  resourceId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    await ensureDatabaseReady();

    const { searchParams } = new URL(req.url);
    const viewAll = searchParams.get('all') === 'true' && perms?.isSuperAdmin;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);

    let query;
    if (viewAll) {
      // Super admin viewing entire vault notification stream
      query = db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    } else {
      // Specific notifications assigned/directed to this admin
      query = db
        .select()
        .from(notifications)
        .where(eq(notifications.recipientId, sessionRes.admin.id))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    }

    const items = await query;

    const unreadCount = items.filter((n) => !n.isRead).length;

    return NextResponse.json({
      notifications: items,
      unreadCount,
      adminId: sessionRes.admin.id,
      adminEmail: sessionRes.admin.email,
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const result = CreateNotificationSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid notification data', details: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;
    await ensureDatabaseReady();

    const now = Date.now();
    const newNotif = {
      id: crypto.randomUUID(),
      recipientId: data.recipientId,
      actorId: sessionRes.admin.id,
      actorName: sessionRes.admin.name || sessionRes.admin.email,
      type: data.type,
      title: data.title,
      message: data.message,
      resourceType: data.resourceType,
      resourceId: data.resourceId || null,
      isRead: false,
      createdAt: now,
    };

    await db.insert(notifications).values(newNotif);

    return NextResponse.json({
      success: true,
      notification: newNotif,
    });
  } catch (err) {
    console.error('Create notification error:', err);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    await ensureDatabaseReady();

    if (json.all) {
      // Mark all read for this admin
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.recipientId, sessionRes.admin.id));

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (json.id) {
      // Mark single notification as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, json.id),
            eq(notifications.recipientId, sessionRes.admin.id)
          )
        );

      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'Missing id or all flag' }, { status: 400 });
  } catch (err) {
    console.error('Update notification error:', err);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const notifId = searchParams.get('id');
    const clearAll = searchParams.get('all') === 'true';

    await ensureDatabaseReady();

    if (clearAll) {
      // Clean/Delete all notifications for current recipient
      await db
        .delete(notifications)
        .where(eq(notifications.recipientId, sessionRes.admin.id));

      return NextResponse.json({ success: true, message: 'All notifications cleared successfully' });
    }

    if (notifId) {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, notifId),
            eq(notifications.recipientId, sessionRes.admin.id)
          )
        );

      return NextResponse.json({ success: true, message: 'Notification deleted successfully' });
    }

    return NextResponse.json({ error: 'Missing id or all query parameter' }, { status: 400 });
  } catch (err) {
    console.error('Delete notification error:', err);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
