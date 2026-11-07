/**
 * Server-side storage for client reviews shown on the public site.
 * Stored as JSON in the `settings` table (key SITE_REVIEWS_KEY); managed in Studio Vault → Reviews
 * via /api/admin/reviews. Published reviews are served publicly by /api/reviews. Server-only.
 */
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { AdminReview, PublicReview, REVIEW_LIMITS, REVIEW_PLATFORMS, ReviewInput } from '@/lib/reviews-shared';

export const SITE_REVIEWS_KEY = 'site_reviews';

const PHOTO_RE = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/;

const httpUrl = z
  .string()
  .trim()
  .max(REVIEW_LIMITS.url)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Link must be a full http(s):// address');

export const ReviewInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(REVIEW_LIMITS.name),
    role: z.string().trim().max(REVIEW_LIMITS.role).default(''),
    company: z.string().trim().max(REVIEW_LIMITS.company).default(''),
    quote: z
      .string()
      .trim()
      .min(REVIEW_LIMITS.quoteMin, `Review text needs at least ${REVIEW_LIMITS.quoteMin} characters`)
      .max(REVIEW_LIMITS.quoteMax),
    rating: z.number().int().min(1).max(5),
    platform: z.enum(REVIEW_PLATFORMS.map((p) => p.id) as [string, ...string[]]).default('none'),
    url: httpUrl.default(''),
    published: z.boolean().default(true),
  })
  .strict();

/** photo: data URL to set, null to remove, undefined to keep */
export const PhotoSchema = z
  .string()
  .regex(PHOTO_RE, 'Photo must be a PNG, JPEG or WebP image')
  .refine((v) => Buffer.byteLength(v.split(',')[1] ?? '', 'base64') <= REVIEW_LIMITS.photoBytes, 'Photo is too large')
  .nullable()
  .optional();

interface Store {
  version: 1;
  reviews: AdminReview[];
}

let cache: { store: Store; at: number } | null = null;
const CACHE_MS = 10_000;

async function readStore(fresh = false): Promise<Store> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.store;
  await ensureDatabaseReady();
  const rows = await db.select().from(settings).where(eq(settings.key, SITE_REVIEWS_KEY)).limit(1);
  let store: Store = { version: 1, reviews: [] };
  if (rows.length) {
    try {
      const parsed = JSON.parse(rows[0].value);
      if (parsed && Array.isArray(parsed.reviews)) store = { version: 1, reviews: parsed.reviews };
    } catch {
      /* corrupt value: start empty rather than break the site */
    }
  }
  cache = { store, at: Date.now() };
  return store;
}

async function writeStore(store: Store) {
  const now = Date.now();
  const value = JSON.stringify(store);
  await db
    .insert(settings)
    .values({ key: SITE_REVIEWS_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
  cache = { store, at: Date.now() };
}

// Serialise writes in this process so concurrent saves can't overwrite each other.
let writeChain: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const run = writeChain.then(async () => {
    const store = await readStore(true);
    const result = await fn(store);
    await writeStore(store);
    return result;
  });
  writeChain = run.catch(() => {});
  return run;
}

export class ReviewError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function listAdminReviews(): Promise<AdminReview[]> {
  return (await readStore(true)).reviews;
}

export async function listPublicReviews(): Promise<PublicReview[]> {
  try {
    const { reviews } = await readStore();
    return reviews
      .filter((r) => r.published)
      .map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        company: r.company,
        quote: r.quote,
        rating: r.rating,
        platform: r.platform,
        url: r.url,
        photoUrl: r.photo ? `/api/reviews/${r.id}/photo?v=${r.updatedAt}` : null,
      }));
  } catch (err) {
    console.error('[site-reviews] could not read reviews:', err);
    return [];
  }
}

/** Decoded photo of a PUBLISHED review (for /api/reviews/[id]/photo). */
export async function getPublicPhoto(id: string): Promise<{ type: string; data: Buffer } | null> {
  const { reviews } = await readStore();
  const r = reviews.find((x) => x.id === id && x.published);
  const m = r?.photo?.match(PHOTO_RE);
  if (!m) return null;
  return { type: `image/${m[1]}`, data: Buffer.from(m[2], 'base64') };
}

export function createReview(input: ReviewInput, photo: string | null | undefined): Promise<AdminReview> {
  return mutate((store) => {
    if (store.reviews.length >= REVIEW_LIMITS.maxReviews) {
      throw new ReviewError(`You can have up to ${REVIEW_LIMITS.maxReviews} reviews. Delete one first.`);
    }
    const now = Date.now();
    const review: AdminReview = { ...input, id: crypto.randomUUID(), photo: photo ?? null, createdAt: now, updatedAt: now };
    store.reviews.push(review);
    return review;
  });
}

export function updateReview(id: string, input: Partial<ReviewInput>, photo: string | null | undefined): Promise<AdminReview> {
  return mutate((store) => {
    const r = store.reviews.find((x) => x.id === id);
    if (!r) throw new ReviewError('Review not found', 404);
    Object.assign(r, input);
    if (photo !== undefined) r.photo = photo;
    r.updatedAt = Date.now();
    return { ...r };
  });
}

export function deleteReview(id: string): Promise<AdminReview> {
  return mutate((store) => {
    const i = store.reviews.findIndex((x) => x.id === id);
    if (i === -1) throw new ReviewError('Review not found', 404);
    const [removed] = store.reviews.splice(i, 1);
    return removed;
  });
}

export function reorderReviews(ids: string[]): Promise<void> {
  return mutate((store) => {
    const current = new Set(store.reviews.map((r) => r.id));
    if (ids.length !== current.size || !ids.every((id) => current.has(id))) {
      throw new ReviewError('Order must list every review exactly once');
    }
    const byId = new Map(store.reviews.map((r) => [r.id, r]));
    store.reviews = ids.map((id) => byId.get(id)!);
  });
}
