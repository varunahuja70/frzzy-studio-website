/**
 * Site colour themes: the single source of truth.
 *
 * ✏️ The live palette (and look, scroll mode, strands) is chosen in Studio Vault → Site Appearance.
 * ✏️ Add a palette: copy an entry in PALETTES and change the colours. The CSS, the vault picker and
 *    the canvas/3D effects all pick it up automatically. Every palette passes WCAG contrast checks
 *    (text ≥ 7:1, secondary text / accent ≥ 4.5:1, button borders ≥ 3:1); keep that when editing.
 * Preview without saving: ?palette=<id>&look=<id>&scroll=<id>&strands=<id> in any URL.
 *
 * Token meaning (CSS names kept from the original brand so no styles had to be renamed):
 *   bg → --black (page background)        surface → --charcoal (cards, panels)
 *   text → --ivory (main text)            muted → --muted (secondary text)
 *   stone → --stone (button borders)      line → --line (hairlines)
 *   accent → --volt (brand colour)        onAccent → --on-volt (text on the accent)
 */

export type PaletteMode = 'dark' | 'light';

export interface Palette {
  id: string;
  name: string;
  mode: PaletteMode;
  note: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  stone: string;
  line: string;
  accent: string;
  onAccent: string;
}

export const PALETTES: Palette[] = [
  // ---------- Dark ----------
  { id: 'cobalt', name: 'Cobalt', mode: 'dark', note: 'Cool ink, electric blue',
    bg: '#07090D', surface: '#141922', text: '#EEF1F6', muted: '#A2ABB9', stone: '#6E7887', line: '#222936', accent: '#5B8CFF', onAccent: '#07090D' },
  { id: 'volt', name: 'Volt', mode: 'dark', note: 'The original FRZZY',
    bg: '#080808', surface: '#1A1A1A', text: '#F3EFE7', muted: '#A9A9A3', stone: '#7A7A7A', line: '#262626', accent: '#C6FF00', onAccent: '#080808' },
  { id: 'noir', name: 'Noir', mode: 'dark', note: 'Pure black and white',
    bg: '#000000', surface: '#121212', text: '#E6E6E6', muted: '#9A9A9A', stone: '#6A6A6A', line: '#222222', accent: '#FFFFFF', onAccent: '#000000' },
  { id: 'space-gray', name: 'Space Gray', mode: 'dark', note: 'macOS dark: graphite, system blue',
    bg: '#1C1C1E', surface: '#2C2C2E', text: '#F5F5F7', muted: '#A1A1A6', stone: '#7C7C80', line: '#38383A', accent: '#64A8FF', onAccent: '#1C1C1E' },
  { id: 'harbour', name: 'Harbour', mode: 'dark', note: 'Deep navy, sky blue (after Epic)',
    bg: '#0D2640', surface: '#133152', text: '#E9F5FF', muted: '#A3C4DC', stone: '#6D93B3', line: '#1E4166', accent: '#7ED7FF', onAccent: '#0D2640' },
  { id: 'steel', name: 'Steel', mode: 'dark', note: 'Cool steel, silver light (after Tendril)',
    bg: '#15171C', surface: '#21252C', text: '#E8EBF0', muted: '#A3A9B5', stone: '#737A87', line: '#2D323A', accent: '#B9C6DD', onAccent: '#15171C' },
  { id: 'marigold', name: 'Marigold', mode: 'dark', note: 'Warm black, sun yellow (after Buck)',
    bg: '#141311', surface: '#221F1B', text: '#F7F3EA', muted: '#B3AC9F', stone: '#827B6F', line: '#2E2A24', accent: '#F4C054', onAccent: '#141311' },
  // Custom: Deep Charcoal / Slate Blue-Grey / Mist Grey / Soft White / Electric Lime
  { id: 'lime-slate', name: 'Lime Slate', mode: 'dark', note: 'Deep charcoal, slate, electric lime',
    bg: '#17191D', surface: '#252A31', text: '#F2F1ED', muted: '#D5D9DC', stone: '#687582', line: '#2D323A', accent: '#C7F464', onAccent: '#17191D' },
  // ---------- Light ----------
  { id: 'silver', name: 'Silver', mode: 'light', note: 'macOS light: silver, Apple blue',
    bg: '#F5F5F7', surface: '#FFFFFF', text: '#1D1D1F', muted: '#6E6E73', stone: '#86868B', line: '#D2D2D7', accent: '#0066CC', onAccent: '#FFFFFF' },
  { id: 'lavender', name: 'Lavender Lab', mode: 'light', note: 'Lavender white, ultramarine (after Lusion)',
    bg: '#F0F1FA', surface: '#E3E5F3', text: '#0E1016', muted: '#50546A', stone: '#7F84A0', line: '#D5D8EA', accent: '#1A2FFB', onAccent: '#FFFFFF' },
  { id: 'blush', name: 'Blush', mode: 'light', note: 'Soft blush, charcoal (after Unseen)',
    bg: '#EFDED9', surface: '#F7EDEA', text: '#212121', muted: '#5A4C48', stone: '#86746F', line: '#DECAC4', accent: '#212121', onAccent: '#F7EDEA' },
  { id: 'studio-white', name: 'Studio White', mode: 'light', note: 'White, black, pink panels (after Uncommon)',
    bg: '#FFFFFF', surface: '#FFE3E3', text: '#0A0A0A', muted: '#595959', stone: '#858585', line: '#EAEAEA', accent: '#0A0A0A', onAccent: '#FFFFFF' },
];

/** Fallback palette when no admin choice is stored yet. The live choice is made in
 *  Studio Vault → Site Appearance (stored in the `settings` table, see lib/site-appearance.ts). */
export const DEFAULT_PALETTE = 'volt';

/** Fired on window when appearance attributes change; canvas/3D effects recolour on it. */
export const PALETTE_EVENT = 'frzzy:palette';

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

function tokens(p: Palette): string {
  return [
    `color-scheme:${p.mode}`,
    `--black:${p.bg}`, `--charcoal:${p.surface}`, `--ivory:${p.text}`, `--muted:${p.muted}`,
    `--stone:${p.stone}`, `--line:${p.line}`, `--volt:${p.accent}`, `--on-volt:${p.onAccent}`,
    `--black-rgb:${rgb(p.bg)}`, `--ivory-rgb:${rgb(p.text)}`, `--volt-rgb:${rgb(p.accent)}`, `--on-volt-rgb:${rgb(p.onAccent)}`,
    // Accent used on top of the (always dark) image bands: light themes' accents are too dark there.
    `--image-accent:${p.mode === 'dark' ? p.accent : '#FFFFFF'}`,
  ].join(';');
}

/** CSS custom properties for every palette (rendered into <head> by app/layout.tsx).
 *  `activeId` is also used for plain :root, so the page is right even before any script runs. */
export function paletteCss(activeId: string = DEFAULT_PALETTE): string {
  const def = PALETTES.find((p) => p.id === activeId) ?? PALETTES.find((p) => p.id === DEFAULT_PALETTE) ?? PALETTES[0];
  return [`:root{${tokens(def)}}`, ...PALETTES.map((p) => `:root[data-palette="${p.id}"]{${tokens(p)}}`)].join('\n');
}

/**
 * Looks: the overall styling on top of the colours.
 *   mac    → rounded corners, frosted glass, soft depth, macOS window frames, SF-style type
 *   studio → the original FRZZY style: hard edges, heavy type
 */
export const LOOKS = [
  { id: 'mac', name: 'Mac', note: 'Rounded, glassy, soft depth' },
  { id: 'studio', name: 'Studio', note: 'Original FRZZY: hard edges, heavy type' },
] as const;
export type LookId = (typeof LOOKS)[number]['id'];
export const DEFAULT_LOOK: LookId = 'mac';

/**
 * Scroll modes.
 *   stack  → "page by page": each section slides up over the previous one, which pins,
 *            shrinks back slightly and dims (tall sections finish scrolling before they pin)
 *   normal → regular scrolling
 */
export const SCROLLS = [
  { id: 'stack', name: 'Stack', note: 'Sections slide over each other, page by page' },
  { id: 'normal', name: 'Normal', note: 'Regular scrolling' },
] as const;
export type ScrollId = (typeof SCROLLS)[number]['id'];
export const DEFAULT_SCROLL: ScrollId = 'stack';

/**
 * Hero strands (the hanging lines at the top of the home hero).
 * With strands off, clicking the hero still zaps (wordmark glitch + 3D bolts spin).
 */
export const STRANDS = [
  { id: 'off', name: 'Off', note: 'Clean hero with the 3D bolts' },
  { id: 'on', name: 'On', note: 'Hanging strands you can brush through' },
] as const;
export type StrandsId = (typeof STRANDS)[number]['id'];
export const DEFAULT_STRANDS: StrandsId = 'off';

/** The whole site appearance, as chosen by an admin in Studio Vault → Site Appearance. */
export interface SiteAppearance {
  palette: string;
  look: LookId;
  scroll: ScrollId;
  strands: StrandsId;
}

export const DEFAULT_APPEARANCE: SiteAppearance = {
  palette: DEFAULT_PALETTE,
  look: DEFAULT_LOOK,
  scroll: DEFAULT_SCROLL,
  strands: DEFAULT_STRANDS,
};

const pickId = <T extends string>(value: unknown, ids: readonly T[], fallback: T): T =>
  typeof value === 'string' && (ids as readonly string[]).includes(value) ? (value as T) : fallback;

/** Validates stored/submitted data: unknown values fall back to the defaults. */
export function normalizeAppearance(raw: unknown): SiteAppearance {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    palette: pickId(r.palette, PALETTES.map((p) => p.id), DEFAULT_PALETTE),
    look: pickId(r.look, LOOKS.map((l) => l.id), DEFAULT_LOOK),
    scroll: pickId(r.scroll, SCROLLS.map((m) => m.id), DEFAULT_SCROLL),
    strands: pickId(r.strands, STRANDS.map((m) => m.id), DEFAULT_STRANDS),
  };
}

/**
 * Inline <head> script. The admin's choice is server-rendered onto <html> by app/layout.tsx;
 * this only applies one-off PREVIEW overrides from the URL (?palette=&look=&scroll=&strands=,
 * used by the vault's live preview; nothing is saved), and clears per-browser choices left
 * behind by the old on-page switcher so they can never override the admin's settings.
 */
export const appearanceBootScript = `(function(){try{
var q=new URLSearchParams(location.search),r=document.documentElement;
var m={palette:${JSON.stringify(PALETTES.map((p) => p.id))},look:${JSON.stringify(LOOKS.map((l) => l.id))},scroll:${JSON.stringify(SCROLLS.map((x) => x.id))},strands:${JSON.stringify(STRANDS.map((x) => x.id))}};
for(var k in m){var v=q.get(k);if(v&&m[k].indexOf(v)>-1)r.setAttribute('data-'+k,v);}
['frzzy-palette','frzzy-look','frzzy-scroll','frzzy-strands'].forEach(function(x){localStorage.removeItem(x);});
}catch(e){}})();`;

export interface LivePalette {
  /** "r, g, b" strings, ready for `rgba(${x}, alpha)` */
  accentRgb: string;
  ivoryRgb: string;
  blackRgb: string;
  /** Hex numbers for three.js, e.g. 0xff4f31 */
  accentHex: number;
  ivoryHex: number;
  blackHex: number;
}

const toHex = (rgbStr: string, fallback: number) => {
  const p = rgbStr.split(',').map((n) => parseInt(n, 10));
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return fallback;
  return (p[0] << 16) | (p[1] << 8) | p[2];
};

/** Reads the active palette from CSS (client only). Canvas/WebGL effects call this on init. */
export function readLivePalette(): LivePalette {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const accentRgb = get('--volt-rgb', '198, 255, 0');
  const ivoryRgb = get('--ivory-rgb', '243, 239, 231');
  const blackRgb = get('--black-rgb', '8, 8, 8');
  return {
    accentRgb,
    ivoryRgb,
    blackRgb,
    accentHex: toHex(accentRgb, 0xc6ff00),
    ivoryHex: toHex(ivoryRgb, 0xf3efe7),
    blackHex: toHex(blackRgb, 0x080808),
  };
}
