'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStage } from './stage';
import {
  GLSL_COMMON,
  mixRgb,
  scaleRgb,
  useFxPalette,
  useOnScreen,
  useReducedMotion,
  type FxPalette,
  type Rgb,
} from './liquid-env';

/**
 * Liquid-metal ZZ: the two Zs of a FRZZY wordmark rendered as flowing chrome with chromatic
 * fringes. Inspired by paper-design/liquid-logo, written from scratch: the Zs are redrawn from the
 * site's own <symbol id="z">, turned into a distance field (exact Euclidean distance transform),
 * and shaded as a chrome tube reflecting a banded studio environment.
 *
 * Place it inside a `.wm` element that contains two `svg.z`: it lays a canvas exactly over them
 * and, once the first frame is drawn, hides the flat SVG Zs (the SVGs stay as the fallback).
 * Tilts with the cursor; clicking the surrounding section sends a ripple through the metal.
 */

/** The Z polyline of <symbol id="z" viewBox="0 0 34 44"> (components/frzzy/svg-symbols.tsx). */
const Z_POINTS: [number, number][] = [
  [4, 5],
  [30, 5],
  [14, 22],
  [22, 22],
  [5, 39],
  [30, 39],
];
const Z_VIEWBOX: [number, number] = [34, 44];
const Z_STROKE = 6;

export type MetalVariant = 'footer' | 'inline';

interface Mask {
  data: Uint8Array;
  w: number;
  h: number;
  /** Half the stroke width, in canvas pixels. */
  halfWidth: number;
}

const INF = 1e20;

/** Felzenszwalb & Huttenlocher squared distance transform, one row/column. */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Distance (px) from every pixel to the nearest pixel where `isFeature` is true. */
function distanceField(w: number, h: number, isFeature: (i: number) => boolean): Float64Array {
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = isFeature(i) ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x]);
  }
  return grid;
}

/** In-place separable box blur (three passes ≈ Gaussian) of a w×h float field. */
function blur(field: Float32Array, w: number, h: number, r: number) {
  if (r < 1) return;
  const tmp = new Float32Array(field.length);
  const win = 2 * r + 1;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += field[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[y * w + x] = acc / win;
        acc += field[y * w + Math.min(w - 1, x + r + 1)] - field[y * w + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        field[y * w + x] = acc / win;
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
  }
}

/**
 * Draws both Zs (red = first, green = second) and packs per pixel:
 *   R: signed distance to the stroke edge, 0.5 = edge, 1 = centre line, 0 = one half-width outside
 *   G: closeness for the outer glow (1 at the edge, 0 three half-widths away)
 *   B: which Z (0 = first, 1 = second)
 *   A: smoothed bevel height (a rounded tube, blurred so the ridge and corners have no creases)
 */
function buildMask(w: number, h: number, zs: { x: number; y: number; w: number; h: number }[]): Mask {
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas unavailable');
  let scale = 1;
  zs.forEach((r, i) => {
    scale = Math.min(r.w / Z_VIEWBOX[0], r.h / Z_VIEWBOX[1]);
    const ox = r.x + (r.w - Z_VIEWBOX[0] * scale) / 2;
    const oy = r.y + (r.h - Z_VIEWBOX[1] * scale) / 2;
    ctx.strokeStyle = i === 0 ? '#ff0000' : '#00ff00';
    ctx.lineWidth = Z_STROKE * scale;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 4; // SVG's default
    ctx.lineCap = 'square';
    ctx.beginPath();
    Z_POINTS.forEach(([x, y], k) => (k ? ctx.lineTo(ox + x * scale, oy + y * scale) : ctx.moveTo(ox + x * scale, oy + y * scale)));
    ctx.stroke();
  });
  const px = ctx.getImageData(0, 0, w, h).data;
  const inside = (i: number) => Math.max(px[i * 4], px[i * 4 + 1]) > 127;
  const dIn = distanceField(w, h, (i) => !inside(i)); // inside pixels: distance to the outside
  const dOut = distanceField(w, h, inside); // outside pixels: distance to the stroke
  const hw = (Z_STROKE * scale) / 2;
  const midX = zs.length > 1 ? (zs[0].x + zs[0].w + zs[1].x) / 2 : w;
  const height = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!inside(i)) continue;
    const t = Math.min(1, (dIn[i] - 0.5) / hw);
    height[i] = Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
  }
  blur(height, w, h, Math.max(1, Math.round(hw * 0.45)));
  let peak = 0;
  for (let i = 0; i < w * h; i++) peak = Math.max(peak, height[i]);
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const isIn = inside(i);
    const sd = isIn ? dIn[i] - 0.5 : -(dOut[i] - 0.5);
    const o = i * 4;
    data[o] = Math.round(Math.min(1, Math.max(0, 0.5 + sd / (2 * hw))) * 255);
    data[o + 1] = isIn ? 255 : Math.round(Math.max(0, 1 - dOut[i] / (hw * 3)) * 255);
    data[o + 2] = (isIn ? px[i * 4 + 1] > px[i * 4] : i % w > midX) ? 255 : 0;
    data[o + 3] = Math.round((height[i] / (peak || 1)) * 255);
  }
  return { data, w, h, halfWidth: hw };
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uSdf;
uniform vec2 uTexel;
uniform float uHalfW;
uniform float uTime;
uniform vec2 uTilt;
uniform float uZap;
uniform vec3 uHi0;
uniform vec3 uLo0;
uniform vec3 uHi1;
uniform vec3 uLo1;
uniform vec3 uGlow;
uniform float uGlowAmt;
varying vec2 vUv;

// A studio environment seen in a chrome surface: bright sky, hard horizon, dark floor, a thin light strip.
float envBands(float ph) {
  ph = fract(ph);
  float c = mix(0.96, 0.6, smoothstep(0.0, 0.34, ph));
  c = mix(c, 0.04, smoothstep(0.34, 0.37, ph));
  c = mix(c, 0.24, smoothstep(0.4, 0.62, ph));
  c = mix(c, 0.92, smoothstep(0.62, 0.64, ph) * (1.0 - smoothstep(0.66, 0.7, ph)));
  c = mix(c, 0.1, smoothstep(0.7, 0.74, ph));
  c = mix(c, 0.96, smoothstep(0.86, 1.0, ph));
  return c;
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec4 t = texture2D(uSdf, uv);
  float s = (t.r - 0.5) * 2.0;
  float alpha = smoothstep(-0.8, 0.8, s * uHalfW);
  float which = step(0.5, t.b);
  float halo = t.g * t.g * uGlowAmt * (1.0 - alpha);
  if (alpha < 0.002 && halo < 0.002) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Smoothed tube height across the stroke (alpha channel) and its surface normal.
  float dome = t.a;
  float edge = 1.0 - clamp(s, 0.0, 1.0);
  vec2 o = uTexel * 1.5;
  vec2 gh = vec2(
    texture2D(uSdf, uv + vec2(o.x, 0.0)).a - texture2D(uSdf, uv - vec2(o.x, 0.0)).a,
    texture2D(uSdf, uv - vec2(0.0, o.y)).a - texture2D(uSdf, uv + vec2(0.0, o.y)).a
  ) / 3.0;
  vec3 n = normalize(vec3(-gh * uHalfW * 1.7, 1.0));

  // Liquid: the surface wobbles slowly; a click sends a ripple through it.
  vec2 p = uv * vec2(uTexel.y / uTexel.x, 1.0) * 2.6;
  float tt = uTime * 0.32;
  vec2 wob = vec2(fxNoise(vec3(p, tt)), fxNoise(vec3(p + 7.3, tt * 1.13)));
  n = normalize(n + vec3(wob * (0.18 + 0.3 * (1.0 - dome)), 0.0));
  n = normalize(n + vec3(uZap * 0.55 * sin(uv.x * 22.0 - uTime * 9.0), uZap * 0.35 * cos(uv.y * 18.0 - uTime * 7.0), 0.0));

  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float ph = r.y * 0.9 + r.x * 0.32 + uv.x * 0.22 - uv.y * 0.55 + uTilt.y * 0.28 + uTilt.x * 0.16 - uTime * 0.04;
  ph += 0.16 * fxNoise(vec3(uv * 1.4, uTime * 0.12));
  float disp = 0.01 + 0.03 * edge * edge + uZap * 0.04;
  vec3 bands = vec3(envBands(ph + disp), envBands(ph), envBands(ph - disp * 1.35));

  vec3 hi = mix(uHi0, uHi1, which);
  vec3 lo = mix(uLo0, uLo1, which);
  vec3 col = mix(lo, hi, bands);
  col += hi * pow(edge, 4.0) * 0.18;

  vec3 metal = fxToSrgb(col);
  vec3 glow = fxToSrgb(uGlow);
  gl_FragColor = vec4(metal * alpha + glow * halo, alpha + halo);
}
`;

const WHITE: Rgb = [1, 1, 1];
const INK: Rgb = [0.006, 0.006, 0.008];

function metalColours(p: FxPalette, variant: MetalVariant) {
  // The footer sits on a dark image: light themes use white there, like --image-accent.
  const accent = variant === 'footer' && p.mode === 'light' ? WHITE : p.accent;
  return {
    hi0: mixRgb(WHITE, variant === 'footer' ? WHITE : p.text, 0.22),
    lo0: mixRgb(INK, p.accent, 0.05),
    hi1: mixRgb(accent, WHITE, 0.5),
    lo1: scaleRgb(accent, 0.1),
    glow: accent,
    glowAmt: p.mode === 'dark' || variant === 'footer' ? 0.32 : 0.12,
  };
}

// Uniform updates live outside the components: they mutate three.js material state, not React state.
function applyColours(m: THREE.ShaderMaterial | null, c: ReturnType<typeof metalColours>) {
  if (!m) return;
  const u = m.uniforms;
  u.uHi0.value.set(...c.hi0);
  u.uLo0.value.set(...c.lo0);
  u.uHi1.value.set(...c.hi1);
  u.uLo1.value.set(...c.lo1);
  u.uGlow.value.set(...c.glow);
  u.uGlowAmt.value = c.glowAmt;
}
function tick(m: THREE.ShaderMaterial | null, dt: number, tilt: THREE.Vector2 | null, zap: { current: number }) {
  if (!m) return;
  const u = m.uniforms;
  u.uTime.value += dt;
  if (tilt) u.uTilt.value.lerp(tilt, 0.06);
  zap.current = zap.current > 0.001 ? zap.current * Math.pow(0.12, dt) : 0; // a ripple fades out over ~1.5 s
  u.uZap.value = zap.current;
}

function makeUniforms() {
  return {
    uSdf: { value: null as THREE.Texture | null },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uHalfW: { value: 1 },
    uTime: { value: 3.7 },
    uTilt: { value: new THREE.Vector2() },
    uZap: { value: 0 },
    uHi0: { value: new THREE.Vector3() },
    uLo0: { value: new THREE.Vector3() },
    uHi1: { value: new THREE.Vector3() },
    uLo1: { value: new THREE.Vector3() },
    uGlow: { value: new THREE.Vector3() },
    uGlowAmt: { value: 0.3 },
  };
}

/** Uploads a new distance field; returns the texture (the caller disposes the previous one). */
function applyMask(m: THREE.ShaderMaterial | null, mask: Mask): THREE.DataTexture | null {
  if (!m) return null;
  const t = new THREE.DataTexture(mask.data, mask.w, mask.h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  m.uniforms.uSdf.value = t;
  m.uniforms.uTexel.value.set(1 / mask.w, 1 / mask.h);
  m.uniforms.uHalfW.value = mask.halfWidth;
  return t;
}

interface Layout {
  left: number;
  top: number;
  width: number;
  height: number;
  dpr: number;
  mask: Mask;
}

export default function LiquidMetalZZ({ variant }: { variant: MetalVariant }) {
  const layerRef = useRef<HTMLSpanElement>(null);
  const tiltRef = useRef(new THREE.Vector2());
  const zapRef = useRef(0);
  const onScreen = useOnScreen(layerRef, '60px');
  const reduced = useReducedMotion();
  const pal = useFxPalette();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [ready, setReady] = useState(false);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const stageRef = useStage(layerRef, {
    animate: onScreen && !reduced,
    dpr: layout?.dpr ?? 1,
    setup: ({ scene }) => {
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: makeUniforms(),
        blending: THREE.NoBlending,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.visible = false; // until the distance field exists
      scene.add(mesh);
      matRef.current = material;
      meshRef.current = mesh;
      return () => {
        matRef.current = null;
        meshRef.current = null;
        (material.uniforms.uSdf.value as THREE.Texture | null)?.dispose();
        geometry.dispose();
        material.dispose();
      };
    },
    onFrame: (dt) => tick(matRef.current, dt, tiltRef.current, zapRef),
    onReady: () => setReady(true),
  });

  useEffect(() => {
    if (!layout) return;
    const texture = applyMask(matRef.current, layout.mask);
    if (meshRef.current) meshRef.current.visible = !!texture;
    stageRef.current?.invalidate();
    return () => texture?.dispose();
  }, [layout, stageRef]);

  useEffect(() => {
    applyColours(matRef.current, metalColours(pal, variant));
    stageRef.current?.invalidate();
  }, [pal, variant, stageRef]);

  // Measure the two SVG Zs and build the distance field at canvas resolution.
  useEffect(() => {
    const wm = layerRef.current?.parentElement;
    if (!wm) return;
    let raf = 0;
    let lastKey = '';
    const measure = () => {
      const zs = Array.from(wm.querySelectorAll(':scope > svg.z'));
      if (zs.length < 2 || !wm.offsetWidth) return;
      const base = wm.getBoundingClientRect();
      const k = base.width / wm.offsetWidth || 1; // undo any CSS scale (stack scroll, reveal)
      const rects = zs.map((z) => {
        const r = z.getBoundingClientRect();
        return { x: (r.left - base.left) / k, y: (r.top - base.top) / k, w: r.width / k, h: r.height / k };
      });
      const pad = rects[0].h * 0.32;
      const left = Math.min(...rects.map((r) => r.x)) - pad;
      const top = Math.min(...rects.map((r) => r.y)) - pad;
      const width = Math.max(...rects.map((r) => r.x + r.w)) + pad - left;
      const height = Math.max(...rects.map((r) => r.y + r.h)) + pad - top;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.max(2, Math.round(width * dpr));
      const ch = Math.max(2, Math.round(height * dpr));
      const key = [left, top, cw, ch].map((n) => Math.round(n)).join(',');
      if (key === lastKey) return;
      lastKey = key;
      const scaled = rects.map((r) => ({ x: (r.x - left) * dpr, y: (r.y - top) * dpr, w: r.w * dpr, h: r.h * dpr }));
      setLayout({ left, top, width: cw / dpr, height: ch / dpr, dpr, mask: buildMask(cw, ch, scaled) });
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(wm);
    document.fonts?.ready.then(schedule);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Hide the flat SVG Zs only once the metal is on screen; restore them when unmounted.
  useEffect(() => {
    const wm = layerRef.current?.parentElement;
    if (!wm || !ready) return;
    wm.setAttribute('data-lz', 'on');
    return () => wm.removeAttribute('data-lz');
  }, [ready]);

  // Cursor tilt, and a ripple when the surrounding block is clicked.
  useEffect(() => {
    const layer = layerRef.current;
    const host = layer?.closest('.foot-band, .mean-row') ?? layer?.parentElement;
    const onMove = (e: PointerEvent) => {
      const r = layer?.getBoundingClientRect();
      if (!r) return;
      tiltRef.current.set(
        Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / window.innerWidth) * 2),
        Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / window.innerHeight) * 2)
      );
    };
    const onDown = () => {
      zapRef.current = 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    host?.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      host?.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return (
    <span
      ref={layerRef}
      className={`lz-layer${ready ? ' is-ready' : ''}`}
      aria-hidden="true"
      style={layout ? { left: layout.left, top: layout.top, width: layout.width, height: layout.height } : undefined}
    />
  );
}
