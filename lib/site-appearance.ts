/**
 * Server-side storage for the public site's appearance (palette, look, scroll mode, strands).
 * Stored as JSON in Supabase `settings` table and local SQLite `settings` table under SITE_APPEARANCE_KEY;
 * edited in Studio Vault → Site Appearance (app/api/admin/appearance). Server-only: imports the DB.
 */
import { eq } from 'drizzle-orm';
import { db, ensureDatabaseReady } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { DEFAULT_APPEARANCE, normalizeAppearance, SiteAppearance } from '@/lib/palette';
import { syncAppearanceToSupabase, fetchAppearanceFromSupabase } from '@/lib/supabase/sync';

export const SITE_APPEARANCE_KEY = 'site_appearance';

// Short in-memory cache: the public layout reads this on every request.
const CACHE_MS = 10_000;
let cache: { value: SiteAppearance; updatedAt: number | null; at: number } | null = null;

export async function getSiteAppearance(): Promise<{ value: SiteAppearance; updatedAt: number | null }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return { value: cache.value, updatedAt: cache.updatedAt };

  // 1. Try reading from Supabase settings first
  try {
    const sbData = await fetchAppearanceFromSupabase();
    if (sbData && sbData.value) {
      const val = typeof sbData.value === 'string' ? JSON.parse(sbData.value) : sbData.value;
      const value = normalizeAppearance(val);
      const updatedAt = sbData.updated_at ? new Date(sbData.updated_at).getTime() : Date.now();
      cache = { value, updatedAt, at: Date.now() };
      return { value, updatedAt };
    }
  } catch {}

  // 2. Fallback to local SQLite settings
  try {
    await ensureDatabaseReady();
    const rows = await db.select().from(settings).where(eq(settings.key, SITE_APPEARANCE_KEY)).limit(1);
    const value = rows.length ? normalizeAppearance(JSON.parse(rows[0].value)) : DEFAULT_APPEARANCE;
    const updatedAt = rows.length ? rows[0].updatedAt : null;
    cache = { value, updatedAt, at: Date.now() };
    return { value, updatedAt };
  } catch (err) {
    // Never break the public site over this: fall back to the built-in defaults.
    console.error('[site-appearance] could not read settings, using defaults:', err);
    return { value: DEFAULT_APPEARANCE, updatedAt: null };
  }
}

export async function saveSiteAppearance(input: SiteAppearance): Promise<{ value: SiteAppearance; updatedAt: number }> {
  const value = normalizeAppearance(input);
  const now = Date.now();

  // 1. Save directly into Supabase settings table
  await syncAppearanceToSupabase(value);

  // 2. Also save into local SQLite settings table
  try {
    await ensureDatabaseReady();
    await db
      .insert(settings)
      .values({ key: SITE_APPEARANCE_KEY, value: JSON.stringify(value), updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value), updatedAt: now } });
  } catch {}

  cache = { value, updatedAt: now, at: Date.now() };
  return { value, updatedAt: now };
}
