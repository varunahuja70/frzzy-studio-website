import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, clientIp } from '@/lib/admin-request';
import { logAuditEvent } from '@/lib/auth/audit';
import { ProjectInputSchema } from '@/lib/projects-shared';
import { listAllProjects, createProject, reorderProjects } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:view');
  if (!g.ok) return g.response;

  try {
    const projects = await listAllProjects();
    return NextResponse.json({
      success: true,
      projects,
      canEdit: g.can('settings:edit'),
    });
  } catch (err: any) {
    console.error('[Admin Projects GET] Error:', err);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;

  try {
    const body = await req.json().catch(() => null);
    const parsed = ProjectInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid project data' },
        { status: 400 }
      );
    }

    const project = await createProject(parsed.data);

    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_projects',
      details: {
        action: 'project_created',
        projectId: project.id,
        title: project.title,
        slug: project.slug,
        showOnHome: project.showOnHome,
      },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (err: any) {
    console.error('[Admin Project Create] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create project' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.order)) {
      return NextResponse.json({ error: 'Invalid reorder payload' }, { status: 400 });
    }

    const reordered = await reorderProjects(body.order);

    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_projects',
      details: { action: 'projects_reordered', count: body.order.length },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, projects: reordered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reorder projects' }, { status: 500 });
  }
}
