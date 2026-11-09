import { isOverLimit } from '@/lib/request-limit';
import { getClientIp, isSameHost } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signMediaToken } from '@/lib/media-crypto';
import { getMediaEntry } from '@/lib/media-manifest';

const TokenRequestSchema = z.object({
  slot: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    if (isOverLimit('media-token', ip, 120, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Origin / Referer validation against hotlinking
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');
    if (referer && !isSameHost(referer, host)) {
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
