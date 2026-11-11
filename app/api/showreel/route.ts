import { NextResponse } from 'next/server';
import { getActiveShowreel } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const showreel = await getActiveShowreel();
    return NextResponse.json({ success: true, showreel });
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
      { status: 200 }
    );
  }
}
