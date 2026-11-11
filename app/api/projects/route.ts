import { NextRequest, NextResponse } from 'next/server';
import { listAllProjects, listHomeProjects, getProjectBySlug } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const home = searchParams.get('home');

    if (slug) {
      const project = await getProjectBySlug(slug);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, project });
    }

    if (home === 'true' || home === '1') {
      const projects = await listHomeProjects();
      return NextResponse.json({ success: true, projects });
    }

    const projects = await listAllProjects();
    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    console.error('[Public Projects API] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
