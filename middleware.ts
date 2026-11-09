import { NextResponse, type NextRequest } from 'next/server';

/**
 * Runs before every page and API request:
 *  - blocks API writes sent from other websites (backing up the SameSite=Strict session cookie)
 *  - rejects oversized API bodies before they are read into memory
 *  - sets the Content-Security-Policy with a fresh nonce, so in production only scripts this
 *    server put on the page can run. Next.js reads the nonce from the request's CSP header.
 */
const MAX_API_BODY_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_BODY_BYTES = 55 * 1024 * 1024; // upload-security.ts allows 50 MB files
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CALENDLY = 'https://calendly.com https://*.calendly.com';

function contentSecurityPolicy(nonce: string | null): string {
  const production = nonce !== null;
  return [
    "default-src 'self'",
    production ? `script-src 'self' 'nonce-${nonce}'` : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob: data:",
    production ? "connect-src 'self'" : "connect-src 'self' ws: wss:",
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
    const limit = pathname.endsWith('/attachments') ? MAX_UPLOAD_BODY_BYTES : MAX_API_BODY_BYTES;
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
