import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signMediaToken } from '@/lib/media-crypto';
import { getMediaEntry } from '@/lib/media-manifest';

const TokenRequestSchema = z.object({
  slot: z.string().min(1).max(64),
});

// Simple in-memory sliding rate-limiter per client IP (max 120 token requests per min)
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 120;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Origin / Referer validation against hotlinking
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');
    if (referer && host && !referer.includes(host)) {
      return NextResponse.json({ error: 'Unauthorized request' }, { status: 403 });
    }

    const body = await req.json();
    const result = TokenRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const { slot } = result.data;
    const media = getMediaEntry(slot);
    if (!media || !media.active) {
      return NextResponse.json(
        { error: 'Media slot not found or inactive' },
        { status: 404 }
      );
    }

    // Signed token valid for 15 minutes (900 seconds)
    const token = signMediaToken(slot, 900);

    return NextResponse.json({
      slot,
      token,
      streamUrl: `/api/media/${token}`,
      mediaType: media.mediaType,
      aspectRatio: media.aspectRatio,
      title: media.title,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal processing error' },
      { status: 500 }
    );
  }
}
