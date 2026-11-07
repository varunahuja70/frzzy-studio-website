/**
 * Client reviews: shared types and limits (safe for browser and server).
 * Managed in Studio Vault → Reviews; stored by lib/site-reviews.ts.
 */

export const REVIEW_PLATFORMS = [
  { id: 'none', name: 'No icon' },
  { id: 'x', name: 'X (Twitter)' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'website', name: 'Website' },
] as const;
export type ReviewPlatform = (typeof REVIEW_PLATFORMS)[number]['id'];

export const REVIEW_LIMITS = {
  name: 80,
  role: 80,
  company: 80,
  quoteMin: 10,
  quoteMax: 800,
  url: 400,
  /** decoded photo size (the vault resizes uploads to 320×320 WebP, ~20–40 KB) */
  photoBytes: 300 * 1024,
  /** photo edge length the vault resizes to */
  photoSize: 320,
  maxReviews: 30,
} as const;

/** Editable fields of a review (what the vault form sends). */
export interface ReviewInput {
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number; // 1–5
  platform: ReviewPlatform;
  url: string; // '' = no link
  published: boolean;
}

/** A review as the vault sees it (photo as a data URL). */
export interface AdminReview extends ReviewInput {
  id: string;
  photo: string | null;
  createdAt: number;
  updatedAt: number;
}

/** A review as the public site sees it (published only, photo by URL). */
export interface PublicReview {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  platform: ReviewPlatform;
  url: string;
  photoUrl: string | null;
}
