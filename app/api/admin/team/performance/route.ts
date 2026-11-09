import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins, workItems, roles } from '@/lib/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';

const TEAM_LIST_PERMISSIONS = [
  'performance:view_team',
  'performance:view_all',
  'work_items:assign',
  'work_items:reassign',
  'work_items:edit',
  'work_items:create',
  'intake:create',
] as const;

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    // Lists every team member's email: only for people who assign or review work
    const allowed = perms && (perms.isSuperAdmin || TEAM_LIST_PERMISSIONS.some((p) => perms.permissions.has(p)));
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ensureDatabaseReady();

    // Fetch all active admins
    const activeAdmins = await db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        role: admins.role,
      })
      .from(admins)
      .where(and(eq(admins.status, 'active'), isNull(admins.deletedAt)));

    // Fetch all non-deleted work items
    const allItems = await db
      .select({
        id: workItems.id,
        assignedTo: workItems.assignedTo,
        status: workItems.status,
        dueDate: workItems.dueDate,
        completedAt: workItems.completedAt,
        deliveredAt: workItems.deliveredAt,
        createdAt: workItems.createdAt,
      })
      .from(workItems)
      .where(isNull(workItems.deletedAt));

    const stats = activeAdmins.map((admin) => {
      const adminItems = allItems.filter((i) => i.assignedTo === admin.id);
      const totalAssigned = adminItems.length;
      const activeCount = adminItems.filter(
        (i) => i.status === 'assigned' || i.status === 'accepted' || i.status === 'in_progress' || i.status === 'in_review'
      ).length;
      const completedCount = adminItems.filter(
        (i) => i.status === 'completed' || i.status === 'delivered'
      ).length;

      // On-time rate calculation
      let onTimeCount = 0;
      let evaluatedCount = 0;
      let totalCompletionTimeMs = 0;

      adminItems.forEach((i) => {
        const finishTime = i.deliveredAt || i.completedAt;
        if (finishTime) {
          evaluatedCount++;
          totalCompletionTimeMs += Math.max(0, finishTime - i.createdAt);
          if (!i.dueDate || finishTime <= i.dueDate) {
            onTimeCount++;
          }
        }
      });

      const onTimePercent = evaluatedCount > 0 ? Math.round((onTimeCount / evaluatedCount) * 100) : 100;
      const avgCompletionDays =
        evaluatedCount > 0 ? Math.round((totalCompletionTimeMs / evaluatedCount) / (1000 * 60 * 60 * 24)) : 0;

      return {
        id: admin.id,
        name: admin.name || admin.email,
        email: admin.email,
        role: admin.role,
        totalAssigned,
        activeCount,
        completedCount,
        onTimePercent,
        avgCompletionDays,
      };
    });

    return NextResponse.json({ performance: stats });
  } catch (err) {
    console.error('Fetch team performance error:', err);
    return NextResponse.json({ error: 'Failed to fetch performance stats' }, { status: 500 });
  }
}
