import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db, ensureDatabaseReady } from '@/lib/db';
import { workItemAttachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { verifySignedDownloadToken } from '@/lib/work-items/upload-security';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verification = verifySignedDownloadToken(token, sessionRes.admin.id);
    if (!verification.valid || !verification.attachmentId) {
      return NextResponse.json({ error: verification.error || 'Invalid or expired download token' }, { status: 403 });
    }

    await ensureDatabaseReady();

    const [att] = await db
      .select()
      .from(workItemAttachments)
      .where(eq(workItemAttachments.id, verification.attachmentId))
      .limit(1);

    if (!att || !fs.existsSync(att.storagePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(att.storagePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': att.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(att.fileName)}"`,
        'Content-Length': String(fileBuffer.length),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('Download attachment error:', err);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
