import { NextRequest, NextResponse } from 'next/server';
import { listAllProjects, listHomeProjects, getProjectBySlug } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const home = searchParams.get('home');

    if (slug) {
      const project = await getProjectBySlug(slug);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, project }, { headers: NO_CACHE_HEADERS });
    }

    if (home === 'true' || home === '1') {
      const projects = await listHomeProjects();
      return NextResponse.json({ success: true, projects }, { headers: NO_CACHE_HEADERS });
    }

    const projects = await listAllProjects();
    return NextResponse.json({ success: true, projects }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('[Public Projects API] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
