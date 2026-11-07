import { NextResponse } from 'next/server';
import { getPublicPhoto } from '@/lib/site-reviews';

/**
 * Public: photo of a published review. The URL carries ?v=<updatedAt>, so the image can be
 * cached for a long time and still refreshes as soon as the review changes.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = /^[0-9a-f-]{36}$/i.test(id) ? await getPublicPhoto(id) : null;
  if (!photo) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      'Content-Type': photo.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
