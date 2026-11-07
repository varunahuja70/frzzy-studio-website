import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '@/lib/db';
import { workItems, workItemAttachments, workItemTimeline, notifications } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions } from '@/lib/auth/permissions';
import {
  validateFileMagicBytes,
  savePrivateAttachment,
  generateSignedDownloadToken,
} from '@/lib/work-items/upload-security';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDatabaseReady();

    const attachments = await db
      .select()
      .from(workItemAttachments)
      .where(eq(workItemAttachments.workItemId, id))
      .orderBy(workItemAttachments.createdAt);

    // Provide signed download URLs
    const withSignedUrls = attachments.map((att) => ({
      ...att,
      downloadUrl: `/api/admin/work-items/download/${generateSignedDownloadToken({
        attachmentId: att.id,
        adminId: sessionRes.admin!.id,
      })}`,
    }));

    return NextResponse.json({ attachments: withSignedUrls });
  } catch (err) {
    console.error('Fetch attachments error:', err);
    return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!perms) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ensureDatabaseReady();

    const [item] = await db
      .select()
      .from(workItems)
      .where(and(eq(workItems.id, id), isNull(workItems.deletedAt)))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const isDeliverable = formData.get('isDeliverable') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Magic-byte signature verification
    const validation = validateFileMagicBytes(buffer, file.type || 'application/octet-stream');
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid file type' }, { status: 400 });
    }

    // Save into non-public private storage
    const { storagePath, fileName } = await savePrivateAttachment(buffer, file.name);

    const attachmentId = crypto.randomUUID();
    const now = Date.now();

    // Check revision number if it is a deliverable
    let revision = 1;
    if (isDeliverable) {
      const existingDeliverables = await db
        .select()
        .from(workItemAttachments)
        .where(
          and(
            eq(workItemAttachments.workItemId, id),
            eq(workItemAttachments.isDeliverable, true)
          )
        );
      revision = existingDeliverables.length + 1;
    }

    await db.insert(workItemAttachments).values({
      id: attachmentId,
      workItemId: id,
      uploaderId: perms.adminId,
      fileName,
      storagePath,
      fileSizeBytes: buffer.length,
      mimeType: validation.detectedMimeType || file.type,
      isDeliverable,
      revision,
      approvalStatus: isDeliverable ? 'pending' : 'approved',
      createdAt: now,
    });

    // Record activity timeline
    await db.insert(workItemTimeline).values({
      id: crypto.randomUUID(),
      workItemId: id,
      actorId: perms.adminId,
      actorName: perms.name || perms.email,
      actorRole: perms.roleName,
      action: isDeliverable ? 'deliverable_uploaded' : 'file_uploaded',
      details: JSON.stringify({ fileName, revision, isDeliverable }),
      createdAt: now,
    });

    // If deliverable uploaded by assignee, notify assigner
    if (isDeliverable && item.assignedBy && item.assignedBy !== perms.adminId) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        recipientId: item.assignedBy,
        actorId: perms.adminId,
        actorName: perms.name || perms.email,
        type: 'deliverable_review',
        title: `Deliverable Ready for Review (Rev ${revision})`,
        message: `${perms.name || perms.email} uploaded a new deliverable on ${item.itemNumber}: "${fileName}".`,
        resourceType: 'work_item',
        resourceId: id,
        createdAt: now,
      });
    }

    const downloadToken = generateSignedDownloadToken({
      attachmentId,
      adminId: perms.adminId,
    });

    return NextResponse.json({
      success: true,
      attachmentId,
      fileName,
      downloadUrl: `/api/admin/work-items/download/${downloadToken}`,
      message: 'File securely uploaded and verified.',
    });
  } catch (err) {
    console.error('Upload attachment error:', err);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}
