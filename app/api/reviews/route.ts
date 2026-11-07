import { NextResponse } from 'next/server';
import { listPublicReviews } from '@/lib/site-reviews';

/** Public: published client reviews for the home page (managed in Studio Vault → Reviews). */
export async function GET() {
  const reviews = await listPublicReviews();
  return NextResponse.json(
    { reviews },
    { headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=60' } }
  );
}
