import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, clientIp } from '@/lib/admin-request';
import { logAuditEvent } from '@/lib/auth/audit';
import { ProjectInputSchema } from '@/lib/projects-shared';
import { updateProject, deleteProject } from '@/lib/site-projects';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = ProjectInputSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid project data' },
        { status: 400 }
      );
    }

    const updated = await updateProject(id, parsed.data);

    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_projects',
      details: {
        action: 'project_updated',
        projectId: id,
        title: updated.title,
        showOnHome: updated.showOnHome,
      },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (err: any) {
    console.error('[Admin Project Update] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update project' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;

  try {
    const { id } = await params;
    const deleted = await deleteProject(id);

    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_projects',
      details: { action: 'project_deleted', projectId: id, title: deleted.title },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, project: deleted });
  } catch (err: any) {
    console.error('[Admin Project Delete] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete project' }, { status: 400 });
  }
}
