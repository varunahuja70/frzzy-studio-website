import { createServerSupabaseClient } from '../server';
import { getAdminSupabaseClient } from '../admin';
import type { AdminReview, PublicReview } from '@/lib/reviews-shared';

export const SITE_REVIEWS_KEY = 'site_reviews';

interface ReviewStore {
  version: 1;
  reviews: AdminReview[];
}

/**
 * Public query for published client reviews.
 * Reads the public setting `site_reviews` allowed by RLS policy.
 */
export async function getPublicReviews(): Promise<PublicReview[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('settings')
    .select('value')
    .eq('key', SITE_REVIEWS_KEY)
    .single();

  if (error || !data) {
    return [];
  }

  const store = data.value as unknown as ReviewStore;
  if (!store || !Array.isArray(store.reviews)) {
    return [];
  }

  return store.reviews
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
      photoUrl: r.photo ? `/api/reviews/${r.id}/photo` : null,
    }));
}

/**
 * Admin query for all client reviews (published and drafts).
 */
export async function getAdminReviews(): Promise<AdminReview[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('settings')
    .select('value')
    .eq('key', SITE_REVIEWS_KEY)
    .single();

  if (error || !data) {
    return [];
  }

  const store = data.value as unknown as ReviewStore;
  return store?.reviews || [];
}

/**
 * Admin update for reviews store.
 */
export async function saveAdminReviews(reviews: AdminReview[]): Promise<void> {
  const adminClient = getAdminSupabaseClient();
  const store: ReviewStore = {
    version: 1,
    reviews,
  };

  const { error } = await (adminClient as any)
    .from('settings')
    .upsert({
      key: SITE_REVIEWS_KEY,
      value: store,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to update reviews: ${error.message}`);
  }
}
