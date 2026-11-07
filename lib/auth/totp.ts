import crypto from 'crypto';
import { generateSecret, generateURI, verifySync, generateSync } from 'otplib';
import QRCode from 'qrcode';

export interface TotpSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

/**
 * Generates a new TOTP secret and QR Code for authenticator apps.
 */
export async function generateTotpSetup(email: string): Promise<TotpSetupResult> {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    secret,
    label: email,
    issuer: 'FRXCX Studio',
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 280,
    margin: 2,
    color: {
      dark: '#12110b',
      light: '#ffffff',
    },
  });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

/**
 * Verifies a 6-digit TOTP token against the user's secret.
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const cleaned = token.replace(/\s+/g, '');
  try {
    const res = verifySync({ token: cleaned, secret });
    return res.valid;
  } catch {
    return false;
  }
}

/**
 * Generates current 6-digit TOTP token for testing or programmatic verification.
 */
export function generateTotpToken(secret: string): string {
  return generateSync({ secret });
}

/**
 * Generates 10 secure single-use recovery codes formatted as 'XXXX-XXXX-XXXX'.
 */
export function generateRecoveryCodes(count = 10): { plaintextCodes: string[]; hashedCodes: string[] } {
  const plaintextCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 hex chars
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    plaintextCodes.push(formatted);

    const hash = crypto.createHash('sha256').update(formatted).digest('hex');
    hashedCodes.push(hash);
  }

  return { plaintextCodes, hashedCodes };
}

/**
 * Hashes a recovery code using SHA-256 for secure storage at rest.
 */
export function hashRecoveryCode(code: string): string {
  const cleaned = code.trim().toUpperCase().replace(/[^A-F0-9-]/g, '');
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

/**
 * Verifies an entered recovery code against a stored SHA-256 hash.
 */
export function verifyRecoveryCode(enteredCode: string, storedHash: string): boolean {
  const cleaned = enteredCode.trim().toUpperCase().replace(/[^A-F0-9-]/g, '');
  const computedHash = crypto.createHash('sha256').update(cleaned).digest('hex');

  const computedBuffer = Buffer.from(computedHash);
  const storedBuffer = Buffer.from(storedHash);

  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}
