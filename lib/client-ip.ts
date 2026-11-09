/**
 * The visitor's IP for rate limiting and audit logs. Anyone can send their own X-Forwarded-For,
 * and proxies append to the end of it, so the left-most value can be faked. This counts back from
 * the right by the number of proxies you control: TRUSTED_PROXY_COUNT, default 1 (one reverse
 * proxy or a host like Vercel). Use 2 for Cloudflare in front of your own proxy.
 */
export function getClientIp(req: { headers: Headers }): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_COUNT) || 1);
  const chain = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return chain[Math.max(0, chain.length - hops)] || req.headers.get('x-real-ip') || '127.0.0.1';
}

/** True if a full URL (Origin or Referer header) points at exactly this host. */
export function isSameHost(url: string, host: string | null): boolean {
  if (!host) return false;
  try {
    return new URL(url).host === host;
  } catch {
    return false;
  }
}
