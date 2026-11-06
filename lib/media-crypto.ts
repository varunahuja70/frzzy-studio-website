import crypto from 'crypto';

const SIGNING_SECRET =
  process.env.MEDIA_SIGNING_SECRET ||
  'frxcx-studio-media-signing-vault-key-production-hardened-2026';

export interface MediaTokenPayload {
  slot: string;
  exp: number; // Unix timestamp in milliseconds
  nonce: string;
}

/**
 * Creates an HMAC-SHA256 signed, time-limited token for a media slot.
 * @param slot Unique media slot identifier (e.g. 'hero-card-1', 'work-3')
 * @param ttlSeconds Token lifetime in seconds (default: 600s = 10 min)
 */
export function signMediaToken(slot: string, ttlSeconds = 600): string {
  const payload: MediaTokenPayload = {
    slot,
    exp: Date.now() + ttlSeconds * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies the validity, expiry, and signature of a media token.
 * Returns payload if valid, or null if tampered, malformed, or expired.
 */
export function verifyMediaToken(token: string): MediaTokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSignature] = parts;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', SIGNING_SECRET)
      .update(encodedPayload)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return null;
    }

    const json = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as MediaTokenPayload;

    if (!payload.slot || typeof payload.exp !== 'number') {
      return null;
    }

    // Check expiration
    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
