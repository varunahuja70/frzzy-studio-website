import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth/session';
import { db, ensureDatabaseReady } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDatabaseReady();

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
