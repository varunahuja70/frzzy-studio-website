import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { exportsHistory } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:export')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view export history' }, { status: 403 });
    }

    await ensureDatabaseReady();

    const history = await db
      .select({
        id: exportsHistory.id,
        adminId: exportsHistory.adminId,
        adminEmail: exportsHistory.adminEmail,
        format: exportsHistory.format,
        filters: exportsHistory.filters,
        columns: exportsHistory.columns,
        rowCount: exportsHistory.rowCount,
        fileName: exportsHistory.fileName,
        fileSizeBytes: exportsHistory.fileSizeBytes,
        createdAt: exportsHistory.createdAt,
      })
      .from(exportsHistory)
      .orderBy(desc(exportsHistory.createdAt))
      .limit(50);

    const formatted = history.map((item) => ({
      ...item,
      filters: item.filters ? JSON.parse(item.filters) : {},
      columns: item.columns ? JSON.parse(item.columns) : [],
    }));

    return NextResponse.json({ history: formatted });
  } catch (err) {
    console.error('Fetch export history error:', err);
    return NextResponse.json({ error: 'Failed to fetch export history' }, { status: 500 });
  }
}
