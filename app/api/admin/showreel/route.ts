import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, clientIp } from '@/lib/admin-request';
import { logAuditEvent } from '@/lib/auth/audit';
import { getActiveShowreel, uploadShowreelVideo, deleteShowreelVideo } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:view');
  if (!g.ok) return g.response;

  try {
    const showreel = await getActiveShowreel(true);
    return NextResponse.json({ success: true, showreel, canEdit: g.can('settings:edit') });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch showreel' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a valid video (e.g. mp4, webm)' }, { status: 400 });
    }

    // Limit video size (e.g. 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Video file too large (maximum 100MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const config = await uploadShowreelVideo(buffer, file.name, file.type);

    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_showreel',
      details: { action: 'showreel_uploaded', fileName: config.fileName, videoUrl: config.videoUrl },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, showreel: config });
  } catch (err: any) {
    console.error('[Admin Showreel Upload] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload video' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;

  try {
    const config = await deleteShowreelVideo();

    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_showreel',
      details: { action: 'showreel_deleted', resetToDefault: true },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, showreel: config });
  } catch (err: any) {
    console.error('[Admin Showreel Delete] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete video' }, { status: 500 });
  }
}
