import { getSecret } from './secrets';
import crypto from 'crypto';

/**
 * Validates a short-lived administrative re-authentication grant cookie.
 * Requires HMAC-SHA256 signature match and non-expired timestamp.
 */
export function verifyReauthGrant(grantCookie?: string, adminId?: string): boolean {
  if (!grantCookie || !adminId) return false;
  const parts = grantCookie.split(':');
  if (parts.length !== 4) return false;

  const [grantAdminId, expStr, nonce, signature] = parts;
  if (grantAdminId !== adminId) return false;

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Date.now() > exp) return false;

  const secret = getSecret('ADMIN_PASSWORD_PEPPER');
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${grantAdminId}:${expStr}:${nonce}`)
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Creates a signed re-authentication grant string valid for 5 minutes.
 */
export function createReauthGrant(adminId: string, ttlMs = 5 * 60 * 1000): string {
  const nonce = crypto.randomBytes(24).toString('hex');
  const exp = Date.now() + ttlMs;
  const secret = getSecret('ADMIN_PASSWORD_PEPPER');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${adminId}:${exp}:${nonce}`)
    .digest('hex');

  return `${adminId}:${exp}:${nonce}:${signature}`;
}
