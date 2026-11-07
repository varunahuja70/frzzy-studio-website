import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/auth/audit';
import { clientIp, guardAdmin } from '@/lib/admin-request';
import { ReviewInput } from '@/lib/reviews-shared';
import { deleteReview, PhotoSchema, ReviewError, ReviewInputSchema, updateReview } from '@/lib/site-reviews';

/**
 * One client review (Studio Vault → Reviews).
 *   PATCH  → edit fields and/or photo (photo: data URL to replace, null to remove, omit to keep)
 *   DELETE → remove the review
 * Both need settings:edit and are audit-logged.
 */

const UpdateSchema = z.object({ review: ReviewInputSchema.partial(), photo: PhotoSchema }).strict();
const idSchema = z.string().uuid();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  try {
    const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid review' }, { status: 400 });
    }
    const review = await updateReview(id, parsed.data.review as Partial<ReviewInput>, parsed.data.photo);
    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_reviews',
      details: {
        action: 'review_updated',
        reviewId: id,
        name: review.name,
        fields: Object.keys(parsed.data.review),
        photo: parsed.data.photo === undefined ? 'kept' : parsed.data.photo === null ? 'removed' : 'replaced',
      },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ success: true, review });
  } catch (err) {
    if (err instanceof ReviewError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Update review error:', err);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  try {
    const removed = await deleteReview(id);
    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_reviews',
      details: { action: 'review_deleted', reviewId: id, name: removed.name },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ReviewError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Delete review error:', err);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
