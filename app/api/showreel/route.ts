import { NextResponse } from 'next/server';
import { getActiveShowreel } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET() {
  try {
    const showreel = await getActiveShowreel(true);
    return NextResponse.json({ success: true, showreel }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('[API Showreel] Error:', err);
    return NextResponse.json(
      {
        success: false,
        showreel: {
          videoUrl: '/assets/videos/works/work-1.mp4',
          source: 'default',
        },
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }
}
