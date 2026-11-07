export interface ValidatedLink {
  id: string;
  label: string;
  url: string;
  domain: string;
  addedAt: number;
}

const FORBIDDEN_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:', 'blob:'];

/**
 * Validates and sanitizes client/intake URLs to defend against SSRF and stored XSS.
 * Only http: and https: protocols are permitted. External links are NEVER fetched server-side.
 */
export function sanitizeExternalLink(urlStr: string, labelStr?: string): ValidatedLink | null {
  if (!urlStr || typeof urlStr !== 'string') return null;

  const trimmed = urlStr.trim();
  const lower = trimmed.toLowerCase();

  // Explicit check for dangerous protocol injections
  for (const forbidden of FORBIDDEN_PROTOCOLS) {
    if (lower.startsWith(forbidden)) {
      return null;
    }
  }

  try {
    const parsed = new URL(trimmed);

    // Strict protocol allowlist
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    const domain = parsed.hostname.toLowerCase();
    const cleanLabel = (labelStr || domain).trim().slice(0, 80);

    return {
      id: crypto.randomUUID(),
      label: cleanLabel,
      url: parsed.href,
      domain,
      addedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Filters and sanitizes an array of link objects, discarding any that fail validation.
 */
export function sanitizeLinksArray(
  links: Array<{ url: string; label?: string }>
): ValidatedLink[] {
  if (!Array.isArray(links)) return [];
  const results: ValidatedLink[] = [];
  for (const item of links) {
    const validated = sanitizeExternalLink(item.url, item.label);
    if (validated) results.push(validated);
  }
  return results;
}
