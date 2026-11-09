import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission } from '@/lib/auth/permissions';
import { db, ensureDatabaseReady } from '@/lib/db';
import { exportsHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyReauthGrant } from '@/lib/auth/reauth';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'leads:export')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to download export' }, { status: 403 });
    }

    const grantCookie = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grantCookie, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    await ensureDatabaseReady();

    const record = await db
      .select()
      .from(exportsHistory)
      .where(eq(exportsHistory.id, id))
      .limit(1);

    // An export holds whatever its creator could see, which may be more than this user can
    if (record.length === 0 || !record[0].filePath || (record[0].adminId !== sessionRes.admin.id && !perms?.isSuperAdmin)) {
      return NextResponse.json({ error: 'Export record not found' }, { status: 404 });
    }

    const item = record[0];
    if (!item.filePath || !fs.existsSync(item.filePath)) {
      return NextResponse.json({ error: 'Exported file has expired from retention storage' }, { status: 410 });
    }

    const fileBuffer = await fs.promises.readFile(item.filePath);
    const contentType =
      item.format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${item.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    console.error('Re-download export error:', err);
    return NextResponse.json({ error: 'Failed to download export file' }, { status: 500 });
  }
}
