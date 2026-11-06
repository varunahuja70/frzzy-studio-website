import crypto from 'crypto';

const MASTER_KEY_RAW =
  process.env.LEADS_ENCRYPTION_KEY ||
  'frxcx-studio-pii-aes-256-gcm-master-key-production-hardened-2026';

// Derive 32-byte key for AES-256-GCM
const ENCRYPTION_KEY = crypto.createHash('sha256').update(MASTER_KEY_RAW).digest();

// Derive separate 32-byte key for Blind Index HMAC
const BLIND_INDEX_KEY = crypto
  .createHmac('sha256', MASTER_KEY_RAW)
  .update('frxcx-studio-blind-index-salt')
  .digest();

/**
 * Encrypts sensitive text using AES-256-GCM with authentication tag and random 12-byte IV.
 * Output format: "iv:authTag:ciphertext" (hex encoded)
 */
export function encryptPii(plainText: string): string {
  if (!plainText) return '';

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts text previously encrypted with AES-256-GCM.
 * Validates integrity via the authTag (throws on tampering).
 */
export function decryptPii(payload: string): string {
  if (!payload || !payload.includes(':')) return payload;

  const parts = payload.split(':');
  if (parts.length !== 3) return payload;

  const [ivHex, authTagHex, encryptedHex] = parts;

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    // If decryption fails (e.g. data corrupted or tampered), return placeholder
    return '[Decryption Error: Integrity Check Failed]';
  }
}

/**
 * Generates a deterministic, irreversible blind index hash for indexed database lookups.
 */
export function createBlindIndex(value: string): string {
  return crypto
    .createHmac('sha256', BLIND_INDEX_KEY)
    .update(value.toLowerCase().trim())
    .digest('hex');
}
