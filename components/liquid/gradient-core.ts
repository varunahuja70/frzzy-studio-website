import * as THREE from 'three';
import { GLSL_COMMON, contrastSafeRange, luminance, mixRgb, scaleRgb, type FxPalette, type Rgb } from './liquid-env';

/**
 * The liquid gradient: a slowly flowing, lit 3D "silk" sheet in the palette's colours, with film
 * grain. Inspired by shadergradient (ruucm/shadergradient), written from scratch on three.js.
 * Used on its own by liquid-gradient.tsx (page heroes, CTA bands) and as the backdrop that the
 * glass bolts refract in liquid-hero.tsx (home hero).
 *
 * Text stays readable on every palette: the shader clamps the sheet's luminance so text over it
 * keeps WCAG contrast. Text blocks are measured from the DOM ("zones"); inside them the clamp is
 * strict (4.5:1 for normal text, 3:1 for titles), everywhere else the preset's free range applies.
 *
 *   preset "hero" → behind the page title on Work / Services / About / Contact / Book / case pages
 *   preset "cta"  → the accent "Got a brief?" band (clamped everywhere against --on-volt)
 *   preset "home" → the home hero: glow gathered behind the wordmark, ripples when zapped
 *   preset "ambient" → the faint glow in content sections (ambient-engine.ts): dimmed as a whole so
 *                   every text colour in a section (body, muted, accent labels) keeps 4.5:1
 */

export type GradientPreset = 'hero' | 'cta' | 'home' | 'ambient';

export interface PresetDef {
  density: number;
  strength: number;
  speed: number;
  segments: number;
  rotation: [number, number, number];
  grain: number;
  /** Time used for the still frame shown to reduced-motion visitors. */
  stillTime: number;
}

export const PRESETS: Record<GradientPreset, PresetDef> = {
  hero: { density: 0.42, strength: 0.62, speed: 0.07, segments: 160, rotation: [-0.5, 0.08, 0.38], grain: 0.045, stillTime: 9.3 },
  cta: { density: 0.62, strength: 0.48, speed: 0.12, segments: 128, rotation: [-0.28, 0, -0.3], grain: 0.05, stillTime: 4.1 },
  home: { density: 0.36, strength: 0.82, speed: 0.08, segments: 176, rotation: [-0.6, 0.02, 0.24], grain: 0.05, stillTime: 6.8 },
  ambient: { density: 0.4, strength: 0.7, speed: 0.05, segments: 96, rotation: [-0.45, 0.1, 0.5], grain: 0, stillTime: 12.5 },
};

export const MAX_ZONES = 10;
/** Zone kinds: 1 normal text (4.5:1), 2 large title (3:1), 3 wordmark (3:1 to text, 2:1 to its accent slice). */
export type ZoneKind = 1 | 2 | 3;
/** A text block over the gradient, in CSS px relative to the canvas. */
export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ZoneKind;
}

export const GRADIENT_VERT = /* glsl */ `
${GLSL_COMMON}
uniform float uTime;
uniform float uDensity;
uniform float uStrength;
uniform vec2 uPointer;
uniform vec4 uZap; // xy: centre on the sheet, z: strength (fades out), w: seconds since the zap
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;

float ripple(vec2 p) {
  if (uZap.z < 0.001) return 0.0;
  float r = length(p - uZap.xy);
  float d = r - uZap.w * 3.2;       // a soft ring rolls outwards at 3.2 units/s
  return uZap.z * exp(-d * d * 0.7) * sin(d * 3.0) * 0.45;
}

float field(vec2 p, float t) {
  float n = fxNoise(vec3(p * uDensity, t));
  n += 0.45 * fxNoise(vec3(p * uDensity * 2.1 + 5.2, t * 1.4));
  n += 0.4 * sin(p.x * 0.75 + p.y * 0.4 + t * 2.2);
  return n + ripple(p);
}

void main() {
  vUv = uv;
  vec3 pos = position;
  vec2 p = pos.xy + uPointer * 0.8;
  float d = field(p, uTime);
  pos.z += d * uStrength;
  float e = 0.03;
  float dx = (field(p + vec2(e, 0.0), uTime) - d) / e;
  float dy = (field(p + vec2(0.0, e), uTime) - d) / e;
  vNormal = normalize(normalMatrix * normalize(vec3(-dx * uStrength, -dy * uStrength, 1.0)));
  vDisp = d;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const GRADIENT_FRAG = /* glsl */ `
${GLSL_COMMON}
uniform float uTime;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uHi;
uniform vec2 uShade;
uniform float uLight;
uniform float uGrain;
uniform float uDpr;
uniform vec2 uCanvasPx;
uniform vec2 uRangeFree;
uniform vec2 uRangeSmall;
uniform vec2 uRangeLarge;
uniform vec2 uRangeMark;
uniform vec3 uFocus;
uniform vec4 uRadial;
uniform vec4 uZones[${MAX_ZONES}];
uniform float uZoneKind[${MAX_ZONES}];
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  vec3 l = normalize(vec3(-0.45, 0.75, 0.55));
  float diff = clamp(dot(n, l), 0.0, 1.0);
  float spec = pow(clamp(dot(n, normalize(l + v)), 0.0, 1.0), 42.0);
  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);

  float k = clamp(vUv.x * 0.7 + vUv.y * 0.3 + vDisp * 0.2, 0.0, 1.0);
  vec3 col = mix(uC0, uC1, smoothstep(0.12, 0.6, k));
  col = mix(col, uC2, smoothstep(0.5, 0.95, k + vDisp * 0.12));
  col *= uShade.x + uShade.y * diff;
  col += uHi * (spec * 0.8 + fres * 0.3) * uLight;

  // Composition. Diagonal (uFocus = start, end, how much of the sheet remains in the dark part):
  // gathers towards the top right, away from left-aligned text. Radial (uRadial = centre, radius,
  // weight): gathers around a point, e.g. behind the home wordmark.
  vec2 sc = gl_FragCoord.xy / uCanvasPx;
  float focus = smoothstep(uFocus.x, uFocus.y, sc.x + (sc.y - 0.5) * 0.4);
  if (uRadial.w > 0.0) {
    vec2 rd = (sc - uRadial.xy) * vec2(uCanvasPx.x / uCanvasPx.y, 1.0);
    focus = mix(focus, 1.0 - smoothstep(0.0, uRadial.z, length(rd)), uRadial.w);
  }
  col = mix(uC0, col, mix(uFocus.z, 1.0, focus));

  // Contrast guard: clamp luminance to what keeps the text over this pixel readable.
  vec2 fc = vec2(gl_FragCoord.x, uCanvasPx.y - gl_FragCoord.y) / uDpr;
  vec2 range = uRangeFree;
  for (int i = 0; i < ${MAX_ZONES}; i++) {
    if (uZoneKind[i] < 0.5) continue;
    vec4 z = uZones[i];
    vec2 outside = max(z.xy - fc, fc - (z.xy + z.zw));
    float f = 1.0 - smoothstep(0.0, 96.0, length(max(outside, 0.0)));
    vec2 r = uZoneKind[i] > 2.5 ? uRangeMark : uZoneKind[i] > 1.5 ? uRangeLarge : uRangeSmall;
    range = vec2(mix(range.x, max(range.x, r.x), f), mix(range.y, min(range.y, r.y), f));
  }
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col *= clamp(lum, range.x, range.y) / max(lum, 1e-4);
  if (range.x > 0.0 && lum < 1e-4) col = vec3(range.x);

  vec3 srgb = fxToSrgb(col);
  srgb += (fxHash(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(srgb, 0.0, 1.0), 1.0);
}
`;

const WHITE: Rgb = [1, 1, 1];
type Range = [number, number];
const intersect = (a: Range, b: Range): Range => [Math.max(a[0], b[0]), Math.min(a[1], b[1])];

export function colourSetup(preset: GradientPreset, p: FxPalette) {
  const dark = p.mode === 'dark';
  if (preset === 'cta') {
    const onDark = luminance(p.onAccent) < luminance(p.accent);
    // Only the accent's own shades, kept inside the band's text contrast (4.5:1 for the small button labels).
    const range = contrastSafeRange(luminance(p.onAccent), 4.5, onDark);
    return {
      c0: scaleRgb(p.accent, 0.62),
      c1: p.accent,
      c2: mixRgb(p.accent, WHITE, 0.4),
      hi: mixRgb(p.accent, WHITE, 0.75),
      shade: [0.72, 0.42] as Range,
      light: 0.75,
      focus: [0, 1, 1] as [number, number, number],
      radial: [0.5, 0.5, 1, 0] as [number, number, number, number],
      free: range,
      small: range,
      large: range,
      mark: range,
    };
  }
  const textDark = !dark;
  if (preset === 'ambient') return ambientSetup(p, textDark);
  const small = contrastSafeRange(luminance(p.muted), 4.5, textDark);
  const large = contrastSafeRange(luminance(p.text), 3, textDark);
  // The wordmark's accent slice should stay distinguishable from the silk behind it as well.
  const accentIsDarker = luminance(p.accent) < luminance(p.bg);
  const mark = intersect(large, contrastSafeRange(luminance(p.accent), 2, accentIsDarker));
  if (preset === 'home') {
    // Darker and moodier than the page heroes: deep troughs, light only on the crests, gathered
    // behind the wordmark so the glass bolts have light and dark folds to bend.
    return {
      c0: p.bg,
      c1: mixRgb(p.surface, p.accent, dark ? 0.1 : 0.12),
      c2: mixRgb(p.bg, p.accent, dark ? 0.6 : 0.62),
      hi: dark ? mixRgb(p.text, p.accent, 0.35) : WHITE,
      shade: (dark ? [0.28, 1.05] : [0.76, 0.34]) as Range,
      light: dark ? 1.1 : 0.6,
      focus: [0, 1, dark ? 0.06 : 0.3] as [number, number, number],
      radial: [0.5, 0.6, 0.72, 1] as [number, number, number, number],
      free: (dark ? [0, 0.24] : [0.22, 1]) as Range,
      small,
      large,
      mark,
    };
  }
  return {
    c0: p.bg,
    c1: dark ? mixRgb(p.surface, p.accent, 0.14) : p.surface,
    c2: mixRgb(p.bg, p.accent, 0.5),
    hi: dark ? mixRgb(p.text, p.accent, 0.5) : WHITE,
    shade: (dark ? [0.5, 0.72] : [0.86, 0.2]) as Range,
    light: dark ? 0.9 : 0.6,
    focus: (dark ? [0.2, 1.05, 0.12] : [0.15, 1.0, 0.3]) as [number, number, number],
    radial: [0.5, 0.5, 1, 0] as [number, number, number, number],
    free: (dark ? [0, 0.3] : [0.22, 1]) as Range,
    small,
    large,
    mark,
  };
}

/**
 * Content-section ambience. There are no measured text zones here, so the whole sheet stays in the
 * range where body text, muted text and accent-coloured labels all keep 4.5:1. Rather than clipping
 * bright folds flat, the colours are scaled down so the brightest fold lands just under that limit.
 */
function ambientSetup(p: FxPalette, textDark: boolean) {
  const accentIsDarker = luminance(p.accent) < luminance(p.bg);
  const safe = intersect(
    intersect(contrastSafeRange(luminance(p.muted), 4.5, textDark), contrastSafeRange(luminance(p.text), 4.5, textDark)),
    contrastSafeRange(luminance(p.accent), 4.5, accentIsDarker)
  );
  // Evenly lit (gentle folds, no deep troughs), so every section's crop of the shared frame glows.
  const shade: Range = textDark ? [0.9, 0.12] : [0.55, 0.6];
  const light = textDark ? 0.4 : 0.8;
  let c1 = textDark ? mixRgb(p.bg, p.accent, 0.05) : mixRgb(p.surface, p.accent, 0.38);
  let c2 = textDark ? mixRgb(p.bg, p.accent, 0.1) : mixRgb(p.bg, p.accent, 0.72);
  let hi = textDark ? WHITE : mixRgb(p.text, p.accent, 0.35);
  if (!textDark) {
    // brightest the shader can make: the lit accent fold plus a full highlight
    const peak = luminance(c2) * (shade[0] + shade[1]) + luminance(hi) * 1.1 * light;
    const k = Math.min(1, (safe[1] * 0.85) / Math.max(peak, 1e-6));
    c1 = scaleRgb(c1, k);
    c2 = scaleRgb(c2, k);
    hi = scaleRgb(hi, k);
  }
  return {
    c0: p.bg,
    c1,
    c2,
    hi,
    shade,
    light,
    focus: [0, 1, 1] as [number, number, number],
    radial: [0.5, 0.5, 1, 0] as [number, number, number, number],
    free: safe,
    small: safe,
    large: safe,
    mark: safe,
  };
}

export function makeUniforms(def: PresetDef) {
  return {
    uTime: { value: def.stillTime },
    uDensity: { value: def.density },
    uStrength: { value: def.strength },
    uPointer: { value: new THREE.Vector2() },
    uZap: { value: new THREE.Vector4() },
    uC0: { value: new THREE.Vector3() },
    uC1: { value: new THREE.Vector3() },
    uC2: { value: new THREE.Vector3() },
    uHi: { value: new THREE.Vector3() },
    uShade: { value: new THREE.Vector2(0.5, 0.7) },
    uLight: { value: 1 },
    uGrain: { value: def.grain },
    uDpr: { value: 1 },
    uCanvasPx: { value: new THREE.Vector2(1, 1) },
    uRangeFree: { value: new THREE.Vector2(0, 1) },
    uRangeSmall: { value: new THREE.Vector2(0, 1) },
    uRangeLarge: { value: new THREE.Vector2(0, 1) },
    uRangeMark: { value: new THREE.Vector2(0, 1) },
    uFocus: { value: new THREE.Vector3(0, 1, 1) },
    uRadial: { value: new THREE.Vector4(0.5, 0.5, 1, 0) },
    uZones: { value: Array.from({ length: MAX_ZONES }, () => new THREE.Vector4()) },
    uZoneKind: { value: new Array(MAX_ZONES).fill(0) as number[] },
  };
}

export function createSheet(preset: GradientPreset, wide: boolean) {
  const def = PRESETS[preset];
  const segments = wide ? def.segments : Math.round(def.segments / 2);
  const geometry = new THREE.PlaneGeometry(16, 16, segments, segments);
  const material = new THREE.ShaderMaterial({ vertexShader: GRADIENT_VERT, fragmentShader: GRADIENT_FRAG, uniforms: makeUniforms(def) });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(...def.rotation);
  return { mesh, material, geometry, def };
}

// Uniform updates live outside React components: they mutate three.js material state, not React state.
export function applyColours(m: THREE.ShaderMaterial | null, c: ReturnType<typeof colourSetup>) {
  if (!m) return;
  const u = m.uniforms;
  u.uC0.value.set(...c.c0);
  u.uC1.value.set(...c.c1);
  u.uC2.value.set(...c.c2);
  u.uHi.value.set(...c.hi);
  u.uShade.value.set(...c.shade);
  u.uLight.value = c.light;
  u.uRangeFree.value.set(...c.free);
  u.uRangeSmall.value.set(...c.small);
  u.uRangeLarge.value.set(...c.large);
  u.uRangeMark.value.set(...c.mark);
  u.uFocus.value.set(...c.focus);
  u.uRadial.value.set(...c.radial);
}

/** Writes `zones` into zone slots [from, to) (unused slots are cleared). */
export function applyZones(m: THREE.ShaderMaterial | null, zones: Zone[], from = 0, to = MAX_ZONES) {
  if (!m) return;
  const u = m.uniforms;
  for (let i = from; i < to; i++) {
    const z = zones[i - from];
    u.uZones.value[i].set(z?.x ?? 0, z?.y ?? 0, z?.w ?? 0, z?.h ?? 0);
    u.uZoneKind.value[i] = z?.kind ?? 0;
  }
}

export function applyCanvasSize(m: THREE.ShaderMaterial | null, w: number, h: number, dpr: number) {
  if (!m) return;
  m.uniforms.uDpr.value = dpr;
  m.uniforms.uCanvasPx.value.set(w * dpr, h * dpr);
}

/** Advances the flow (`flowDt` already scaled by the preset speed) and any zap ripple (`dt` real time). */
export function tick(m: THREE.ShaderMaterial | null, flowDt: number, dt: number, pointer: THREE.Vector2 | null) {
  if (!m) return;
  const u = m.uniforms;
  u.uTime.value += flowDt;
  if (pointer) u.uPointer.value.lerp(pointer, 0.025);
  const zap = u.uZap.value as THREE.Vector4;
  if (zap.z > 0.001) {
    zap.w += dt;
    zap.z *= Math.pow(0.3, dt); // the ripple fades over ~2 s
  } else zap.z = 0;
}

/** Starts a ripple at a point on the sheet (local plane coordinates). */
export function startRipple(m: THREE.ShaderMaterial | null, x: number, y: number) {
  if (!m) return;
  const p = m.uniforms.uPointer.value as THREE.Vector2;
  (m.uniforms.uZap.value as THREE.Vector4).set(x + p.x * 0.8, y + p.y * 0.8, 1, 0);
}

/**
 * Slots for the site header's logo and links. Gradients that reach up behind the glass header
 * (home hero, page heroes) treat them as text zones; the header stays put while the page scrolls
 * under it, so these are re-measured every frame. Slots 0–7 are the gradient's own text zones.
 */
export const HEADER_SLOT = 8;

/**
 * The header's logo and links (or, on phones, its menu button) over the gradient, relative to `wrap`;
 * skipped when hidden or off it, so there are never more than the two header slots.
 */
export function headerZones(wrap: HTMLElement): Zone[] {
  const base = wrap.getBoundingClientRect();
  const zones: Zone[] = [];
  for (const el of document.querySelectorAll('header.site .brand, header.site .nav-links, header.site .menu-btn')) {
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom < base.top || r.top > base.bottom) continue;
    const pad = 8;
    zones.push({ x: r.left - base.left - pad, y: r.top - base.top - pad, w: r.width + pad * 2, h: r.height + pad * 2, kind: 1 });
  }
  return zones;
}

/** Tight boxes (CSS px, relative to `wrapper`) around the given text elements. */
export function measureZones(wrapper: HTMLElement, targets: [Element, ZoneKind][]): Zone[] {
  const base = wrapper.getBoundingClientRect();
  const range = document.createRange();
  const zones: Zone[] = [];
  for (const [el, kind] of targets) {
    if (zones.length >= MAX_ZONES) break;
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const pad = 10;
    zones.push({ x: r.left - base.left - pad, y: r.top - base.top - pad, w: r.width + pad * 2, h: r.height + pad * 2, kind });
  }
  return zones;
}
