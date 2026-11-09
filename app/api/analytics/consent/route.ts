import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_S,
  SESSION_COOKIE,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE_S,
  encodeConsent,
  isValidVisitorId,
} from '@/lib/analytics/consent';

/**
 * Stores the cookie-banner choice (components/cookie-consent.tsx). Cookies are set here, from the
 * server, because Safari caps cookies written by page JavaScript at 7 days, which would make every
 * visitor "new" again within a week. See lib/analytics/consent.ts for what each cookie is.
 */
const BodySchema = z.object({ choice: z.enum(['granted', 'denied']) });

function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin fetches from older browsers may omit it
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
  }
  const { choice } = parsed.data;
  const secure = process.env.NODE_ENV === 'production';

  const res = NextResponse.json({ choice });
  res.headers.set('Cache-Control', 'no-store');
  res.cookies.set({
    name: CONSENT_COOKIE,
    value: encodeConsent(choice),
    httpOnly: false, // the banner and tracker read it
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: CONSENT_MAX_AGE_S,
  });

  if (choice === 'granted') {
    // Keep an existing ID (re-accepting after the consent cookie expired): its 13 months run from
    // the first "Accept" and are never extended.
    if (!isValidVisitorId(req.cookies.get(VISITOR_COOKIE)?.value)) {
      res.cookies.set({
        name: VISITOR_COOKIE,
        value: crypto.randomUUID(),
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: VISITOR_MAX_AGE_S,
      });
    }
  } else {
    res.cookies.delete(VISITOR_COOKIE);
    res.cookies.delete(SESSION_COOKIE);
  }

  return res;
}
