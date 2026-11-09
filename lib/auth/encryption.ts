import crypto from 'crypto';

import { getSecret } from './secrets';

// 32-byte AES-256-GCM key from the master key
const encryptionKey = (raw: string) => crypto.createHash('sha256').update(raw).digest();

// Separate 32-byte key for the blind index HMAC
const blindIndexKey = () =>
  crypto.createHmac('sha256', getSecret('LEADS_ENCRYPTION_KEY')).update('frxcx-studio-blind-index-salt').digest();

/** Keys to try when reading. During a rotation, data written under the old key stays readable. */
function decryptionKeys(): Buffer[] {
  const keys = [encryptionKey(getSecret('LEADS_ENCRYPTION_KEY'))];
  if (process.env.PREVIOUS_LEADS_ENCRYPTION_KEY) keys.push(encryptionKey(process.env.PREVIOUS_LEADS_ENCRYPTION_KEY));
  return keys;
}

/**
 * Encrypts sensitive text using AES-256-GCM with authentication tag and random 12-byte IV.
 * Output format: "iv:authTag:ciphertext" (hex encoded)
 */
export function encryptPii(plainText: string): string {
  if (!plainText) return '';

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(getSecret('LEADS_ENCRYPTION_KEY')), iv);

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

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  for (const key of decryptionKeys()) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      // wrong key, or corrupted or tampered data: try the next key
    }
  }
  return '[Decryption Error: Integrity Check Failed]';
}

/**
 * Generates a deterministic, irreversible blind index hash for indexed database lookups.
 */
export function createBlindIndex(value: string): string {
  return crypto
    .createHmac('sha256', blindIndexKey())
    .update(value.toLowerCase().trim())
    .digest('hex');
}
