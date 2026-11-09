import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { analyticsEvents } from '@/lib/db/schema';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { CONSENT_COOKIE, VISITOR_COOKIE, isValidVisitorId, parseConsent } from '@/lib/analytics/consent';

// Strict schema for inbound event batch
const EventItemSchema = z.object({
  eventType: z.enum(['pageview', 'click', 'scroll', 'time']),
  target: z.string().max(100).optional(),
  path: z.string().max(255).default('/'),
  referrer: z.string().max(500).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  browser: z.string().max(50).optional(),
  os: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.number().optional(),
});

const BatchSchema = z.object({
  sessionId: z.string().max(64),
  events: z.array(EventItemSchema).min(1).max(25), // Limit batch size to prevent abuse
});

// Daily rotating salt for the cookie-free visitor hash (used for everyone, with or without cookie consent)
function getDailySalt(): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const secret = process.env.ANALYTICS_SALT || 'frxcx-studio-analytics-salt-2026';
  return crypto.createHmac('sha256', secret).update(dateStr).digest('hex');
}

// In-memory sliding rate-limiter: max 120 analytics requests per IP per minute
const ipRateCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateCounts.set(ip, { count: 1, resetAt: now + 60000 });
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
      return new NextResponse(null, { status: 429 });
    }

    // Exclude admin sessions from contaminating public stats
    const cookiesHeader = req.headers.get('cookie') || '';
    if (cookiesHeader.includes(`${SESSION_COOKIE_NAME}=`)) {
      return NextResponse.json({ ignored: true, reason: 'admin_session' }, { status: 200 });
    }

    // Origin verification
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }

    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Filter out common automated bots/crawlers
    const botPattern = /bot|spider|crawl|slurp|facebookexternalhit|bingbot|googlebot/i;
    if (botPattern.test(userAgent)) {
      return NextResponse.json({ ignored: true, reason: 'bot_filtered' }, { status: 200 });
    }

    // Generate privacy-friendly daily visitor hash (Raw IP is NEVER stored)
    const dailySalt = getDailySalt();
    const visitorHash = crypto
      .createHmac('sha256', dailySalt)
      .update(`${ip}-${userAgent}`)
      .digest('hex')
      .slice(0, 32);

    const country =
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('cf-ipcountry') ||
      'Unknown';

    const json = await req.json();
    const parsed = BatchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid batch format' }, { status: 400 });
    }

    // Visitors who accepted cookies also carry a stable first-party ID (lib/analytics/consent.ts).
    // Consent is re-checked here rather than trusting whichever cookies happen to arrive.
    const consented = parseConsent(req.cookies.get(CONSENT_COOKIE)?.value) === 'granted';
    const rawVisitorId = req.cookies.get(VISITOR_COOKIE)?.value;
    const visitorId = consented && isValidVisitorId(rawVisitorId) ? rawVisitorId : null;

    await ensureDatabaseReady();

    const rowsToInsert = parsed.data.events.map((evt) => ({
      id: crypto.randomUUID(),
      visitorHash,
      visitorId,
      sessionId: parsed.data.sessionId,
      eventType: evt.eventType,
      target: evt.target || null,
      path: evt.path || '/',
      referrer: evt.referrer || null,
      utmSource: evt.utmSource || null,
      utmMedium: evt.utmMedium || null,
      deviceType: evt.deviceType || 'desktop',
      browser: evt.browser || 'Unknown',
      os: evt.os || 'Unknown',
      country,
      metadata: evt.metadata ? JSON.stringify(evt.metadata) : null,
      createdAt: evt.timestamp || Date.now(),
    }));

    await db.insert(analyticsEvents).values(rowsToInsert);

    const res = NextResponse.json({ success: true, count: rowsToInsert.length });
    // A visitor ID left behind without consent (e.g. the consent cookie expired) is dropped.
    if (rawVisitorId && !visitorId) res.cookies.delete(VISITOR_COOKIE);
    return res;
  } catch {
    return NextResponse.json({ error: 'Collection failed' }, { status: 500 });
  }
}
