import { createServerSupabaseClient } from '../server';
import { getAdminSupabaseClient } from '../admin';

export const SITE_APPEARANCE_KEY = 'site_appearance';

export type LookMode = 'mac' | 'minimal' | 'borderless';
export type EffectMode = 'liquid' | 'classic';

export interface SiteAppearanceConfig {
  palette: string;
  look: LookMode;
  effects: EffectMode;
  liquidMetal: boolean;
}

const DEFAULT_CONFIG: SiteAppearanceConfig = {
  palette: 'volt',
  look: 'mac',
  effects: 'liquid',
  liquidMetal: false,
};

/**
 * Fetch appearance configuration from Supabase with safe fallback.
 */
export async function getAppearanceConfig(): Promise<SiteAppearanceConfig> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('settings')
    .select('value')
    .eq('key', SITE_APPEARANCE_KEY)
    .single();

  if (error || !data) {
    return DEFAULT_CONFIG;
  }

  const val = data.value as unknown as Partial<SiteAppearanceConfig>;
  return {
    palette: val?.palette || DEFAULT_CONFIG.palette,
    look: val?.look || DEFAULT_CONFIG.look,
    effects: val?.effects || DEFAULT_CONFIG.effects,
    liquidMetal: typeof val?.liquidMetal === 'boolean' ? val.liquidMetal : DEFAULT_CONFIG.liquidMetal,
  };
}

/**
 * Update appearance configuration (Admin only).
 */
export async function saveAppearanceConfig(config: Partial<SiteAppearanceConfig>): Promise<SiteAppearanceConfig> {
  const current = await getAppearanceConfig();
  const updated: SiteAppearanceConfig = { ...current, ...config };

  const adminClient = getAdminSupabaseClient();
  const { error } = await (adminClient as any)
    .from('settings')
    .upsert({
      key: SITE_APPEARANCE_KEY,
      value: updated,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to save appearance: ${error.message}`);
  }

  return updated;
}
