/**
 * Non-obvious, configurable admin route path (defaults to 'studio-vault').
 * Can be overridden in production via ADMIN_PATH environment variable.
 */
export const ADMIN_PATH = process.env.ADMIN_PATH || process.env.ADMIN_VAULT_PATH || 'studio-vault';

export function getAdminUrl(subpath = ''): string {
  const cleanSub = subpath.startsWith('/') ? subpath : `/${subpath}`;
  return `/${ADMIN_PATH}${cleanSub === '/' ? '' : cleanSub}`;
}
