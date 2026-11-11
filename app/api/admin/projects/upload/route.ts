import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, clientIp } from '@/lib/admin-request';
import { logAuditEvent } from '@/lib/auth/audit';
import { uploadProjectMedia } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = (formData.get('projectId') as string) || 'temp';

    if (!file) {
      return NextResponse.json({ error: 'No media file provided' }, { status: 400 });
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      return NextResponse.json({ error: 'File must be a video or image' }, { status: 400 });
    }

    // Size limit: 100MB for video, 20MB for image
    const maxSize = isVideo ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large (max ${isVideo ? '100MB for videos' : '20MB for images'})` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadProjectMedia(projectId, buffer, file.name, file.type);

    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_projects_media',
      details: { action: 'media_uploaded', fileName: result.fileName, isVideo: result.isVideo, url: result.publicUrl },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Admin Project Media Upload] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload media' }, { status: 500 });
  }
}
