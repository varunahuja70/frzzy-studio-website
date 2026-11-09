'use client';

import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';
import { PALETTE_EVENT } from '@/lib/palette';

/**
 * Shared plumbing for the liquid effects (components/liquid/*):
 *  - whether effects are on (<html data-fx="liquid">, set in Studio Vault → Site Appearance) and
 *    whether the liquid-metal ZZ is on (<html data-metal="on">),
 *  - the live palette as linear-light colours for shaders, kept in sync with palette switches,
 *  - reduced motion, and whether an effect is actually on screen (so it can stop rendering).
 */

export type Rgb = [number, number, number];

export interface FxPalette {
  /** Linear-light colours (what shaders blend in). */
  bg: Rgb;
  surface: Rgb;
  text: Rgb;
  muted: Rgb;
  accent: Rgb;
  onAccent: Rgb;
  mode: 'dark' | 'light';
  /** Changes whenever any colour changes; handy as a dependency. */
  key: string;
}

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function parseColor(raw: string, fallback: Rgb): Rgb {
  const v = raw.trim();
  let rgb: number[] | null = null;
  if (/^#[0-9a-f]{6}$/i.test(v)) {
    const n = parseInt(v.slice(1), 16);
    rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } else if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(v)) {
    rgb = v.split(',').map((x) => parseInt(x, 10));
  }
  if (!rgb) return fallback;
  return rgb.map((c) => srgbToLinear(c / 255)) as Rgb;
}

/** WCAG relative luminance of a linear-light colour. */
export const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Luminance range a background may take while keeping `ratio` contrast with text of luminance `lt`. */
export function contrastSafeRange(lt: number, ratio: number, textIsDark: boolean): [number, number] {
  return textIsDark ? [Math.min(1, ratio * (lt + 0.05) - 0.05), 1] : [0, Math.max(0, (lt + 0.05) / ratio - 0.05)];
}

export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const scaleRgb = (a: Rgb, k: number): Rgb => [a[0] * k, a[1] * k, a[2] * k];

const DEFAULT_PAL: FxPalette = {
  bg: parseColor('#080808', [0, 0, 0]),
  surface: parseColor('#1A1A1A', [0, 0, 0]),
  text: parseColor('#F3EFE7', [1, 1, 1]),
  muted: parseColor('#A9A9A3', [0.5, 0.5, 0.5]),
  accent: parseColor('#C6FF00', [0.5, 1, 0]),
  onAccent: parseColor('#080808', [0, 0, 0]),
  mode: 'dark',
  key: 'default',
};

let cachedPal: FxPalette = DEFAULT_PAL;

function readFxPalette(): FxPalette {
  const cs = getComputedStyle(document.documentElement);
  const raw = ['--black', '--charcoal', '--ivory', '--muted', '--volt', '--on-volt'].map((n) => cs.getPropertyValue(n).trim());
  const key = raw.join('|');
  if (key === cachedPal.key) return cachedPal;
  const bg = parseColor(raw[0], DEFAULT_PAL.bg);
  cachedPal = {
    bg,
    surface: parseColor(raw[1], DEFAULT_PAL.surface),
    text: parseColor(raw[2], DEFAULT_PAL.text),
    muted: parseColor(raw[3], DEFAULT_PAL.muted),
    accent: parseColor(raw[4], DEFAULT_PAL.accent),
    onAccent: parseColor(raw[5], DEFAULT_PAL.onAccent),
    mode: luminance(bg) > 0.4 ? 'light' : 'dark',
    key,
  };
  return cachedPal;
}

/** Anything that can change the palette or the effects setting. */
function subscribeAppearance(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'data-fx', 'data-look', 'data-metal'] });
  window.addEventListener(PALETTE_EVENT, onChange);
  return () => {
    mo.disconnect();
    window.removeEventListener(PALETTE_EVENT, onChange);
  };
}

/** The active palette, re-read whenever it is switched (vault preview, ?palette=…, healing). */
export function useFxPalette(): FxPalette {
  return useSyncExternalStore(subscribeAppearance, readFxPalette, () => DEFAULT_PAL);
}

/** true when <html data-fx="liquid"> (the default). Always false while server-rendering. */
export function useLiquidFx(): boolean {
  return useSyncExternalStore(
    subscribeAppearance,
    () => document.documentElement.getAttribute('data-fx') !== 'classic',
    () => false
  );
}

/** 'pending' while server-rendering and hydrating (render nothing yet), then 'liquid' or 'classic'. */
export function useFxMode(): 'pending' | 'liquid' | 'classic' {
  return useSyncExternalStore(
    subscribeAppearance,
    () => (document.documentElement.getAttribute('data-fx') === 'classic' ? 'classic' : 'liquid'),
    () => 'pending'
  );
}

/** true when the liquid-metal ZZ is switched on (<html data-metal="on">; off by default). */
export function useMetalOn(): boolean {
  return useSyncExternalStore(
    subscribeAppearance,
    () => document.documentElement.getAttribute('data-metal') === 'on',
    () => false
  );
}

/** The active look ('mac' | 'studio'); undefined while server-rendering. */
export function useLook(): string | undefined {
  return useSyncExternalStore(
    subscribeAppearance,
    () => document.documentElement.getAttribute('data-look') ?? 'mac',
    () => undefined
  );
}

const subscribeMotion = (onChange: () => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
}

/**
 * true while the element is near the viewport, the tab is visible and the stack scroll hasn't
 * fully covered its section. Effects render continuously only while this is true.
 */
export function useOnScreen(ref: RefObject<Element | null>, rootMargin = '120px'): boolean {
  const [inView, setInView] = useState(false);
  const [covered, setCovered] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    io.observe(el);

    const sheet = el.closest('.stack-item, .view > *');
    const readCovered = () => setCovered(!!(sheet instanceof HTMLElement && sheet.dataset.covered));
    const mo = sheet ? new MutationObserver(readCovered) : null;
    if (sheet) mo!.observe(sheet, { attributes: true, attributeFilter: ['data-covered'] });

    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      mo?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ref, rootMargin]);

  return inView && !covered && !hidden;
}

/**
 * Effects skip software-rendered WebGL (too slow to be worth it). Screenshot/test runs on a
 * software GPU can opt in by setting window.__FRZZY_FX_SOFTWARE_GL = true before the page loads.
 */
export function allowSoftwareGl(): boolean {
  return typeof window !== 'undefined' && (window as Window & { __FRZZY_FX_SOFTWARE_GL?: boolean }).__FRZZY_FX_SOFTWARE_GL === true;
}

let webglOk: boolean | null = null;
/** Hardware-accelerated WebGL available? Checked once per page. */
export function canUseWebGL(): boolean {
  if (webglOk !== null) return webglOk;
  try {
    const c = document.createElement('canvas');
    const attrs = { failIfMajorPerformanceCaveat: !allowSoftwareGl() };
    const gl = (c.getContext('webgl2', attrs) || c.getContext('webgl', attrs)) as WebGLRenderingContext | null;
    webglOk = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglOk = false;
  }
  return webglOk;
}

/** sRGB conversion + small helpers shared by the shaders. */
export const GLSL_COMMON = /* glsl */ `
vec3 fxToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float fxHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 fxHash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
}
// Gradient noise in 3D (quintic fade), roughly -1..1.
float fxNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(fxHash3(i), f);
  float n100 = dot(fxHash3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0));
  float n010 = dot(fxHash3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0));
  float n110 = dot(fxHash3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0));
  float n001 = dot(fxHash3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1));
  float n101 = dot(fxHash3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1));
  float n011 = dot(fxHash3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1));
  float n111 = dot(fxHash3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1));
  return 1.6 * mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
`;
