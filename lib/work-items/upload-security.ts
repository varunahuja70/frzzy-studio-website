import { getSecret } from '@/lib/auth/secrets';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'application/zip',
]);

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70],
  ],
  'application/zip': [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
  ],
};

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const signingSecret = () => getSecret('MEDIA_SIGNING_SECRET');

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMimeType?: string;
}

/**
 * Validates file buffer against magic-byte signatures to block MIME-spoofing and malware uploads.
 */
export function validateFileMagicBytes(buffer: Buffer, declaredMimeType: string): FileValidationResult {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File exceeds maximum 50MB size limit.' };
  }

  const normalizedDeclared = declaredMimeType.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.has(normalizedDeclared)) {
    return { valid: false, error: `File type "${normalizedDeclared}" is not permitted.` };
  }

  const signatures = MAGIC_BYTES[normalizedDeclared];
  if (!signatures) {
    // For types like video/quicktime without fixed 4-byte header, check length & declared
    return { valid: true, detectedMimeType: normalizedDeclared };
  }

  const matchesSignature = signatures.some((sig) => {
    if (buffer.length < sig.length) return false;
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) return false;
    }
    return true;
  });

  if (!matchesSignature) {
    return {
      valid: false,
      error: `File signature mismatch. The file content does not match declared MIME type "${declaredMimeType}".`,
    };
  }

  return { valid: true, detectedMimeType: normalizedDeclared };
}

/**
 * Saves uploaded file into private storage with a random non-guessable name outside public directory.
 */
export async function savePrivateAttachment(
  buffer: Buffer,
  originalFilename: string
): Promise<{ storagePath: string; fileName: string }> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const privateDir = isServerless ? path.resolve(require('os').tmpdir(), 'frzzy-attachments') : path.resolve(process.cwd(), 'data', 'attachments');
  if (!fs.existsSync(privateDir)) {
    fs.mkdirSync(privateDir, { recursive: true });
  }

  // Prevent path traversal
  const sanitizedOriginal = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = path.extname(sanitizedOriginal).slice(0, 8);
  const randomId = crypto.randomBytes(24).toString('hex');
  const privateFilename = `${randomId}${ext}`;
  const fullPath = path.join(privateDir, privateFilename);

  await fs.promises.writeFile(fullPath, buffer);

  return {
    storagePath: fullPath,
    fileName: sanitizedOriginal,
  };
}

/**
 * Generates a signed short-lived download token (15 minutes).
 */
export function generateSignedDownloadToken(params: {
  attachmentId: string;
  adminId: string;
  expiresInSeconds?: number;
}): string {
  const { attachmentId, adminId, expiresInSeconds = 900 } = params;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${attachmentId}:${adminId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');

  const tokenData = JSON.stringify({ attachmentId, adminId, expiresAt, hmac });
  return Buffer.from(tokenData).toString('base64url');
}

/**
 * Verifies a signed download token.
 */
export function verifySignedDownloadToken(
  tokenStr: string,
  requestingAdminId: string
): { valid: boolean; attachmentId?: string; error?: string } {
  try {
    const raw = Buffer.from(tokenStr, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);

    if (parsed.adminId !== requestingAdminId) {
      return { valid: false, error: 'Token issued to different user.' };
    }

    const currentEpoch = Math.floor(Date.now() / 1000);
    if (currentEpoch > parsed.expiresAt) {
      return { valid: false, error: 'Download token expired.' };
    }

    const payload = `${parsed.attachmentId}:${parsed.adminId}:${parsed.expiresAt}`;
    const expectedHmac = crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');

    const expectedBuffer = Buffer.from(expectedHmac);
    const providedBuffer = Buffer.from(parsed.hmac);

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return { valid: false, error: 'Invalid token signature.' };
    }

    return { valid: true, attachmentId: parsed.attachmentId };
  } catch {
    return { valid: false, error: 'Malformed token.' };
  }
}
