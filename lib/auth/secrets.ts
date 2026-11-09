/**
 * Server-side secrets. Set these in the environment (see .env.example).
 *
 * The values below were once hardcoded in this public repository, so anyone can read them. Local
 * development still falls back to them so existing dev data keeps working; production refuses
 * them, and refuses to run without a real value (see startup-guard.ts). Secrets are read when
 * they are used, not at import, so `next build` doesn't need them.
 */
export type SecretName =
  | 'ADMIN_PASSWORD_PEPPER'
  | 'LEADS_ENCRYPTION_KEY'
  | 'MEDIA_SIGNING_SECRET'
  | 'ANALYTICS_SALT';

const DEV_ONLY_VALUES: Record<SecretName, string> = {
  ADMIN_PASSWORD_PEPPER: 'frxcx-studio-argon2id-server-pepper-secret-production-hardened-2026',
  LEADS_ENCRYPTION_KEY: 'frxcx-studio-pii-aes-256-gcm-master-key-production-hardened-2026',
  MEDIA_SIGNING_SECRET: 'frxcx-studio-media-signing-vault-key-production-hardened-2026',
  ANALYTICS_SALT: 'frxcx-studio-analytics-salt-2026',
};

const PUBLICLY_KNOWN = new Set([
  ...Object.values(DEV_ONLY_VALUES),
  'frxcx-uploads-hmac-secret-hardened-2026',
  'reauth-pepper',
]);

export const REQUIRED_SECRETS = Object.keys(DEV_ONLY_VALUES) as SecretName[];
export const MIN_SECRET_LENGTH = 32;

/** Why this secret can't be used in production, or null if it is fine. */
export function secretProblem(name: SecretName): string | null {
  const value = process.env[name];
  if (!value || value.length < MIN_SECRET_LENGTH) {
    return `${name} is missing or shorter than ${MIN_SECRET_LENGTH} characters.`;
  }
  if (PUBLICLY_KNOWN.has(value)) return `${name} is a publicly known value from the repository.`;
  return null;
}

export function getSecret(name: SecretName): string {
  if (process.env.NODE_ENV === 'production') {
    const problem = secretProblem(name);
    if (problem) throw new Error(`Refusing to run in production: ${problem}`);
    return process.env[name] as string;
  }
  return process.env[name] || DEV_ONLY_VALUES[name];
}
