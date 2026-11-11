import { NextResponse, type NextRequest } from 'next/server';

/**
 * Runs before every page and API request:
 *  - blocks API writes sent from other websites (backing up the SameSite=Strict session cookie)
 *  - rejects oversized API bodies before they are read into memory
 *  - sets the Content-Security-Policy with a fresh nonce, so in production only scripts this
 *    server put on the page can run. Next.js reads the nonce from the request's CSP header.
 */
const MAX_API_BODY_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_BODY_BYTES = 105 * 1024 * 1024; // supports up to 100 MB video/image uploads
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CALENDLY = 'https://calendly.com https://*.calendly.com';
const SUPABASE_DOMAINS = 'https://*.supabase.co';

function contentSecurityPolicy(nonce: string | null): string {
  const production = nonce !== null;
  return [
    "default-src 'self'",
    production ? `script-src 'self' 'nonce-${nonce}'` : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${SUPABASE_DOMAINS}`,
    "font-src 'self' data:",
    `media-src 'self' blob: data: ${SUPABASE_DOMAINS}`,
    production ? `connect-src 'self' ${SUPABASE_DOMAINS}` : `connect-src 'self' ws: wss: ${SUPABASE_DOMAINS}`,
    `frame-src 'self' ${CALENDLY}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

function isForeignOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false; // browsers always send Origin on these; server tools carry no session
  const host = req.headers.get('x-forwarded-host')?.split(',')[0].trim() || req.headers.get('host');
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/') && WRITE_METHODS.has(req.method)) {
    if (isForeignOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const isUpload =
      pathname.endsWith('/attachments') ||
      pathname.includes('/upload') ||
      pathname.includes('/showreel');
    const limit = isUpload ? MAX_UPLOAD_BODY_BYTES : MAX_API_BODY_BYTES;
    if (Number(req.headers.get('content-length') ?? 0) > limit) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }
  }

  const nonce = process.env.NODE_ENV === 'production' ? btoa(crypto.randomUUID()) : null;
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('content-security-policy', csp);
  if (nonce) requestHeaders.set('x-nonce', nonce);
  else requestHeaders.delete('x-nonce');

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};
