/**
 * Site colour themes: the single source of truth.
 *
 * ✏️ Choose the live palette: change DEFAULT_PALETTE.
 * ✏️ Add a palette: copy an entry in PALETTES and change the colours. The CSS, the switcher and
 *    the canvas/3D effects all pick it up automatically. Every palette passes WCAG contrast checks
 *    (text ≥ 7:1, secondary text / accent ≥ 4.5:1, button borders ≥ 3:1); keep that when editing.
 * Preview: the palette switcher (bottom-right, `npm run dev` only), or ?palette=<id> in any URL.
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

export const DEFAULT_PALETTE = 'cobalt';

export const PALETTE_STORAGE_KEY = 'frzzy-palette';
/** Fired on window after a live palette change; canvas/3D effects re-initialise on it. */
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

/** CSS custom properties for every palette (rendered into <head> by app/layout.tsx). */
export function paletteCss(): string {
  const def = PALETTES.find((p) => p.id === DEFAULT_PALETTE) ?? PALETTES[0];
  return [`:root{${tokens(def)}}`, ...PALETTES.map((p) => `:root[data-palette="${p.id}"]{${tokens(p)}}`)].join('\n');
}

/**
 * Looks: the overall styling on top of the colours.
 *   mac    → rounded corners, frosted glass, soft depth, macOS window frames, SF-style type
 *   studio → the original FRZZY style: hard edges, heavy type
 * ✏️ Choose the live look: change DEFAULT_LOOK. Preview with the switcher or ?look=studio|mac.
 */
export const LOOKS = [
  { id: 'mac', name: 'Mac', note: 'Rounded, glassy, soft depth' },
  { id: 'studio', name: 'Studio', note: 'Original FRZZY: hard edges, heavy type' },
] as const;
export type LookId = (typeof LOOKS)[number]['id'];
export const DEFAULT_LOOK: LookId = 'mac';
export const LOOK_STORAGE_KEY = 'frzzy-look';

/**
 * Scroll modes.
 *   stack  → "page by page": each section slides up over the previous one, which pins,
 *            shrinks back slightly and dims (tall sections finish scrolling before they pin)
 *   normal → regular scrolling
 * ✏️ Choose the live mode: change DEFAULT_SCROLL. Preview with the switcher or ?scroll=normal|stack.
 */
export const SCROLLS = [
  { id: 'stack', name: 'Stack', note: 'Sections slide over each other, page by page' },
  { id: 'normal', name: 'Normal', note: 'Regular scrolling' },
] as const;
export type ScrollId = (typeof SCROLLS)[number]['id'];
export const DEFAULT_SCROLL: ScrollId = 'stack';
export const SCROLL_STORAGE_KEY = 'frzzy-scroll';

/**
 * Runs inline in <head> before first paint, so the page never flashes the wrong colours/look.
 * Order for each: ?palette= / ?look= in the URL, then a saved preview choice, then the default.
 */
export const paletteBootScript = `(function(){
function pick(attr,ids,d,k,param){try{
var q=new URLSearchParams(location.search).get(param);
if(q&&ids.indexOf(q)>-1){localStorage.setItem(k,q);}
var s=localStorage.getItem(k);
document.documentElement.setAttribute(attr,ids.indexOf(s)>-1?s:d);
}catch(e){document.documentElement.setAttribute(attr,d);}}
pick('data-palette',${JSON.stringify(PALETTES.map((p) => p.id))},${JSON.stringify(DEFAULT_PALETTE)},${JSON.stringify(PALETTE_STORAGE_KEY)},'palette');
pick('data-look',${JSON.stringify(LOOKS.map((l) => l.id))},${JSON.stringify(DEFAULT_LOOK)},${JSON.stringify(LOOK_STORAGE_KEY)},'look');
pick('data-scroll',${JSON.stringify(SCROLLS.map((m) => m.id))},${JSON.stringify(DEFAULT_SCROLL)},${JSON.stringify(SCROLL_STORAGE_KEY)},'scroll');
})();`;

/** Switch look live (client only). Fires a resize so canvases re-measure their (re-styled) frames. */
export function applyLook(id: string) {
  if (!LOOKS.some((l) => l.id === id)) return;
  document.documentElement.setAttribute('data-look', id);
  try {
    localStorage.setItem(LOOK_STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has('look')) {
    url.searchParams.set('look', id);
    window.history.replaceState(window.history.state, '', url.toString());
  }
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: id }));
  window.dispatchEvent(new Event('resize'));
}

/** Switch scroll mode live (client only). */
export function applyScroll(id: string) {
  if (!SCROLLS.some((m) => m.id === id)) return;
  document.documentElement.setAttribute('data-scroll', id);
  try {
    localStorage.setItem(SCROLL_STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has('scroll')) {
    url.searchParams.set('scroll', id);
    window.history.replaceState(window.history.state, '', url.toString());
  }
  window.dispatchEvent(new Event('resize'));
}

/** Switch palette live (client only): updates <html>, remembers it, and notifies the effects. */
export function applyPalette(id: string) {
  if (!PALETTES.some((p) => p.id === id)) return;
  document.documentElement.setAttribute('data-palette', id);
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has('palette')) {
    url.searchParams.set('palette', id);
    window.history.replaceState(window.history.state, '', url.toString());
  }
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: id }));
}

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
