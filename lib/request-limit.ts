/**
 * Fixed-window request limiter, in memory. Each server process counts on its own, so with several
 * instances the real limit is the limit times the instance count. Failed logins are tracked in the
 * database instead (lib/auth/rate-limit.ts), which holds across instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_TRACKED_KEYS = 20_000;

function makeRoom(now: number) {
  for (const [id, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(id);
  }
  // Still full (a flood of distinct keys): drop the oldest rather than growing without limit.
  for (const id of buckets.keys()) {
    if (buckets.size < MAX_TRACKED_KEYS) break;
    buckets.delete(id);
  }
}

/** Counts one hit and returns true once `key` has gone over `max` hits in this window. */
export function isOverLimit(scope: string, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const id = `${scope}:${key}`;
  const entry = buckets.get(id);
  if (!entry || now > entry.resetAt) {
    if (buckets.size >= MAX_TRACKED_KEYS) makeRoom(now);
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
