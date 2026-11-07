import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/auth/audit';
import { clientIp, guardAdmin } from '@/lib/admin-request';
import { REVIEW_LIMITS, REVIEW_PLATFORMS, ReviewInput } from '@/lib/reviews-shared';
import { createReview, listAdminReviews, PhotoSchema, reorderReviews, ReviewError, ReviewInputSchema } from '@/lib/site-reviews';

/**
 * Client reviews shown on the public site (Studio Vault → Reviews).
 *   GET  → all reviews incl. hidden ones        (settings:view)
 *   POST → create a review (+ optional photo)   (settings:edit, audit-logged)
 *   PUT  → reorder: { order: [ids…] }           (settings:edit, audit-logged)
 */

export async function GET(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:view');
  if (!g.ok) return g.response;
  try {
    return NextResponse.json({
      reviews: await listAdminReviews(),
      canEdit: g.can('settings:edit'),
      platforms: REVIEW_PLATFORMS,
      limits: REVIEW_LIMITS,
    });
  } catch (err) {
    console.error('List reviews error:', err);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}

const CreateSchema = z.object({ review: ReviewInputSchema, photo: PhotoSchema }).strict();

export async function POST(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;
  try {
    const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid review' }, { status: 400 });
    }
    const review = await createReview(parsed.data.review as ReviewInput, parsed.data.photo);
    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_reviews',
      details: { action: 'review_created', reviewId: review.id, name: review.name, published: review.published },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (err) {
    if (err instanceof ReviewError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Create review error:', err);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

const ReorderSchema = z.object({ order: z.array(z.string().uuid()).max(REVIEW_LIMITS.maxReviews) }).strict();

export async function PUT(req: NextRequest) {
  const g = await guardAdmin(req, 'settings:edit', { write: true });
  if (!g.ok) return g.response;
  try {
    const parsed = ReorderSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
    await reorderReviews(parsed.data.order);
    await logAuditEvent({
      adminId: g.adminId,
      action: 'SETTINGS_UPDATED',
      resource: 'site_reviews',
      details: { action: 'reviews_reordered', count: parsed.data.order.length },
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ success: true, reviews: await listAdminReviews() });
  } catch (err) {
    if (err instanceof ReviewError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Reorder reviews error:', err);
    return NextResponse.json({ error: 'Failed to reorder reviews' }, { status: 500 });
  }
}
