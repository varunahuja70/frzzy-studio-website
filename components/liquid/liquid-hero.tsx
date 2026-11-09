'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BOLTS, zGeometry } from '@/components/frzzy/z-bolts';
import { useStage } from './stage';
import { GLSL_COMMON, mixRgb, useFxPalette, useOnScreen, useReducedMotion, type FxPalette, type Rgb } from './liquid-env';
import {
  applyCanvasSize,
  applyColours,
  applyZones,
  colourSetup,
  createSheet,
  measureZones,
  startRipple,
  tick,
  type Zone,
  type ZoneKind,
} from './gradient-core';

/**
 * The liquid home hero: the flowing gradient (gradient-core, preset "home") with the FRZZY bolts
 * as refractive glass floating in front of it.
 *
 * Each frame: (1) the gradient is rendered into an offscreen buffer, (2) that buffer is drawn as the
 * background, (3) the glass bolts sample the same buffer through their surface normals: refraction
 * with a little chromatic dispersion and frost, specular glints, a lit rim, and distant bolts
 * melting into the gradient. Tilts with the cursor; a click ("zap") spins the bolts and sends a
 * ripple through the gradient from the clicked point. Replaces the classic Hero3DBackdrop when
 * Effects is Liquid (components/liquid/index.tsx falls back to it on any error).
 */

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
// The buffer is grain-free (so the glass bends a clean image); film grain is added on screen.
const QUAD_FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uBg;
uniform float uGrain;
uniform float uSeed;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uBg, vUv).rgb;
  c += (fxHash(gl_FragCoord.xy + uSeed * 113.0) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

const GLASS_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vPos;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPos = mv.xyz;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;
// Colours here are sRGB, like the gradient buffer the glass looks through.
const GLASS_FRAG = /* glsl */ `
${GLSL_COMMON}
uniform sampler2D uBg;
uniform float uGrain;
uniform float uSeed;
uniform vec2 uRes;
uniform vec3 uTint;
uniform float uTintAmt;
uniform float uRefract;
uniform float uDisp;
uniform vec3 uEdge;
uniform float uEdgeAmt;
uniform vec3 uRefl;
uniform float uThick;
uniform float uBody;
uniform vec2 uFog;
varying vec3 vN;
varying vec3 vPos;

vec3 bg(vec2 uv) {
  return texture2D(uBg, clamp(uv, vec2(0.001), vec2(0.999))).rgb;
}
// Studio lights seen in the glass: thin strips that sweep across the faces as a bolt turns.
float studio(vec3 r) {
  float a = smoothstep(0.5, 0.56, r.y) * (1.0 - smoothstep(0.62, 0.7, r.y));
  float b = smoothstep(0.78, 0.84, r.y) * (1.0 - smoothstep(0.88, 0.95, r.y)) * 0.7;
  float c = smoothstep(-0.42, -0.36, r.y) * (1.0 - smoothstep(-0.3, -0.22, r.y)) * 0.3;
  return (a + b + c) * (0.7 + 0.3 * sin(r.x * 3.0)) + smoothstep(0.2, 1.0, r.y) * 0.12;
}
vec3 blurred(vec2 uv, float radius) {
  vec2 o = radius / uRes;
  return (bg(uv + vec2(o.x, o.y)) + bg(uv + vec2(-o.x, o.y)) + bg(uv + vec2(o.x, -o.y)) + bg(uv - o)) * 0.25;
}

void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(-vPos);
  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);
  vec2 uv = gl_FragCoord.xy / uRes;

  // Refraction: look through the surface, bending more towards the edges; split the channels.
  // Like a lens, the glass sharpens the folds it bends (local contrast), so there's detail inside.
  vec2 off = n.xy * uRefract * (0.35 + 1.1 * fres);
  vec3 sharp = vec3(bg(uv + off * (1.0 + uDisp)).r, bg(uv + off).g, bg(uv + off * (1.0 - uDisp)).b);
  vec3 soft = blurred(uv + off, 10.0);
  vec3 c = max(soft + (sharp - soft) * 2.4, 0.0);
  // Luminous glass: what it bends comes through tinted and a little lifted (darkened on light palettes)...
  c = mix(c, c * uTint * 1.5, uTintAmt) * uBody + uEdge * 0.035;
  // ...grazing edges darken, where light travels through the most glass...
  c *= mix(1.0, uThick, smoothstep(0.45, 0.95, fres));
  // ...the bevels carry a band of light, and the faces reflect the studio (Fresnel-weighted)...
  float bevel = smoothstep(0.18, 0.4, fres) * (1.0 - smoothstep(0.5, 0.8, fres));
  c += uRefl * (bevel * 0.4 + studio(reflect(-v, n)) * mix(0.14, 0.9, fres));

  // ...and catches the light: a sharp key glint, a softer coloured fill, a crisp rim on the very edge.
  vec3 l1 = normalize(vec3(-0.5, 0.8, 0.6));
  vec3 l2 = normalize(vec3(0.75, -0.25, 0.45));
  float s1 = pow(clamp(dot(reflect(-l1, n), v), 0.0, 1.0), 80.0);
  float s2 = pow(clamp(dot(reflect(-l2, n), v), 0.0, 1.0), 22.0);
  c += vec3(s1) * 1.1 + uRefl * s2 * 0.4;
  c = mix(c, uEdge, clamp(pow(fres, 3.5) * uEdgeAmt * 1.8, 0.0, 1.0));

  // Distance: far bolts melt into the gradient behind them.
  c = mix(c, bg(uv), smoothstep(uFog.x, uFog.y, -vPos.z) * 0.8);
  c += (fxHash(gl_FragCoord.xy + uSeed * 113.0) - 0.5) * uGrain * 0.6;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

const WHITE: Rgb = [1, 1, 1];
const toSrgb = (c: Rgb): Rgb => c.map((v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)) as Rgb;

function glassColours(p: FxPalette) {
  const dark = p.mode === 'dark';
  const accent = toSrgb(p.accent);
  const text = toSrgb(p.text);
  // Rims: light on dark palettes, ink on light ones (glass on white reads by its dark edges).
  // Reflections are always light.
  const light = mixRgb(WHITE, text, dark ? 0.3 : 0);
  return {
    clear: {
      tint: mixRgb(WHITE, accent, 0.1),
      tintAmt: dark ? 0.08 : 0.12,
      edge: dark ? light : text,
      edgeAmt: dark ? 0.75 : 0.55,
      refl: light,
      thick: dark ? 0.82 : 0.6,
      body: dark ? 1.22 : 0.88,
    },
    accent: {
      tint: accent,
      tintAmt: dark ? 0.5 : 0.5,
      edge: dark ? mixRgb(accent, WHITE, 0.55) : mixRgb(accent, text, 0.4),
      edgeAmt: dark ? 0.85 : 0.6,
      refl: light,
      thick: dark ? 0.82 : 0.62,
      body: dark ? 1.25 : 0.9,
    },
  };
}
type GlassLook = ReturnType<typeof glassColours>['clear'];

function makeGlass(texture: THREE.Texture) {
  return new THREE.ShaderMaterial({
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    uniforms: {
      uBg: { value: texture },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uTintAmt: { value: 0.2 },
      uRefract: { value: 0.085 },
      uDisp: { value: 0.22 },
      uEdge: { value: new THREE.Vector3(1, 1, 1) },
      uEdgeAmt: { value: 0.5 },
      uRefl: { value: new THREE.Vector3(1, 1, 1) },
      uThick: { value: 0.82 },
      uBody: { value: 1 },
      uFog: { value: new THREE.Vector2(12, 24) },
      uGrain: { value: 0 },
      uSeed: { value: 0 },
    },
  });
}

// three.js state lives outside React state; these helpers mutate it.
function applyGlass(m: THREE.ShaderMaterial, g: GlassLook) {
  const u = m.uniforms;
  u.uTint.value.set(...g.tint);
  u.uTintAmt.value = g.tintAmt;
  u.uEdge.value.set(...g.edge);
  u.uEdgeAmt.value = g.edgeAmt;
  u.uRefl.value.set(...g.refl);
  u.uThick.value = g.thick;
  u.uBody.value = g.body;
}

interface Bolt {
  m: THREE.Mesh;
  base: THREE.Vector3;
  rot: THREE.Euler;
  speed: number;
  phase: number;
}
interface HeroScene {
  quad: THREE.ShaderMaterial;
  gradScene: THREE.Scene;
  gradCam: THREE.PerspectiveCamera;
  sheet: ReturnType<typeof createSheet>;
  rt: THREE.WebGLRenderTarget;
  glassClear: THREE.ShaderMaterial;
  glassAccent: THREE.ShaderMaterial;
  group: THREE.Group;
  bolts: Bolt[];
}
interface Motion {
  tx: number;
  ty: number;
  px: number;
  py: number;
  spin: number;
  t: number;
}

function animate(h: HeroScene, mo: Motion, dt: number, renderer: THREE.WebGLRenderer, pointer: THREE.Vector2) {
  mo.t += dt;
  mo.px += (mo.tx - mo.px) * Math.min(1, dt * 2.4);
  mo.py += (mo.ty - mo.py) * Math.min(1, dt * 2.4);
  mo.spin *= Math.pow(0.024, dt); // a zap spin settles in about a second
  h.group.rotation.y = mo.px * 0.35;
  h.group.rotation.x = mo.py * 0.22;
  for (const b of h.bolts) {
    b.m.position.y = b.base.y + Math.sin(mo.t * b.speed * 2 + b.phase) * 0.18;
    b.m.rotation.y += (b.speed * 0.35 + mo.spin) * dt;
    b.m.rotation.x = b.rot.x + Math.sin(mo.t * b.speed + b.phase) * 0.12;
  }
  tick(h.sheet.material, dt * h.sheet.def.speed * 4, dt, pointer);
  const seed = (mo.t * 7.31) % 1;
  for (const m of [h.quad, h.glassClear, h.glassAccent]) m.uniforms.uSeed.value = seed;
  renderer.setRenderTarget(h.rt);
  renderer.render(h.gradScene, h.gradCam);
  renderer.setRenderTarget(null);
}

function resizeHero(h: HeroScene, w: number, ht: number, dpr: number, camera: THREE.Camera) {
  const bw = Math.floor(w * dpr);
  const bh = Math.floor(ht * dpr);
  h.rt.setSize(bw, bh);
  h.gradCam.aspect = w / ht;
  h.gradCam.updateProjectionMatrix();
  applyCanvasSize(h.sheet.material, w, ht, dpr);
  // keep the composition on narrow screens, like the classic hero
  const camZ = w < 760 ? 15 : 11;
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.position.z = camZ;
    camera.updateProjectionMatrix();
  }
  for (const g of [h.glassClear, h.glassAccent]) {
    g.uniforms.uRes.value.set(bw, bh);
    g.uniforms.uFog.value.set(camZ + 1, camZ + 13);
  }
}

/** Where a click lands on the gradient sheet, so the ripple starts under the cursor. */
function rippleAt(h: HeroScene, ndcX: number, ndcY: number) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), h.gradCam);
  const mesh = h.sheet.mesh;
  mesh.updateMatrixWorld();
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, mesh.getWorldPosition(new THREE.Vector3()));
  const hit = ray.ray.intersectPlane(plane, new THREE.Vector3());
  if (!hit) return;
  const local = mesh.worldToLocal(hit);
  startRipple(h.sheet.material, local.x, local.y);
}

function homeTargets(hero: Element): [Element, ZoneKind][] {
  const pick = (selector: string, kind: ZoneKind) => Array.from(hero.querySelectorAll(selector)).map((el): [Element, ZoneKind] => [el, kind]);
  return [
    ...pick('.hero-top > p', 1),
    ...pick('.hero-word .sc', 3),
    ...pick('.thesis', 2),
    ...pick('.hero-side > p', 1),
    ...pick('.hero-side .ctas', 1),
  ];
}

export default function LiquidHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HeroScene | null>(null);
  const motionRef = useRef<Motion>({ tx: 0, ty: 0, px: 0, py: 0, spin: 0, t: 2 });
  const pointerRef = useRef(new THREE.Vector2());
  const onScreen = useOnScreen(wrapRef);
  const reduced = useReducedMotion();
  const pal = useFxPalette();
  const [zones, setZones] = useState<Zone[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const stageRef = useStage(wrapRef, {
    animate: onScreen && !reduced,
    dpr: [1, 1.5],
    perspective: { fov: 34, z: 11 },
    setup: ({ scene }) => {
      const wide = (wrapRef.current?.clientWidth ?? 1000) >= 760;
      const gradScene = new THREE.Scene();
      const gradCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      gradCam.position.z = 4;
      const sheet = createSheet('home', wide);
      const grain = sheet.def.grain;
      sheet.material.uniforms.uGrain.value = 0; // grain goes on screen instead (see QUAD_FRAG)
      gradScene.add(sheet.mesh);
      const rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

      const quadGeo = new THREE.PlaneGeometry(2, 2);
      const quadMat = new THREE.ShaderMaterial({
        vertexShader: QUAD_VERT,
        fragmentShader: QUAD_FRAG,
        uniforms: { uBg: { value: rt.texture }, uGrain: { value: grain }, uSeed: { value: 0 } },
        depthTest: false,
        depthWrite: false,
      });
      const quad = new THREE.Mesh(quadGeo, quadMat);
      quad.frustumCulled = false;
      quad.renderOrder = -1;
      scene.add(quad);

      const glassClear = makeGlass(rt.texture);
      const glassAccent = makeGlass(rt.texture);
      glassClear.uniforms.uGrain.value = grain;
      glassAccent.uniforms.uGrain.value = grain;
      const boltGeo = zGeometry(9);
      const group = new THREE.Group();
      scene.add(group);
      const bolts = BOLTS.map(([x, y, z, s, isAccent], i): Bolt => {
        const m = new THREE.Mesh(boltGeo, isAccent ? glassAccent : glassClear);
        m.position.set(x, y, z);
        m.scale.setScalar(s);
        m.rotation.set((i % 3) * 0.4 - 0.4, i * 0.7, (i % 2 ? 1 : -1) * 0.25);
        group.add(m);
        return { m, base: m.position.clone(), rot: m.rotation.clone(), speed: 0.12 + (i % 4) * 0.05, phase: i * 1.7 };
      });

      heroRef.current = { quad: quadMat, gradScene, gradCam, sheet, rt, glassClear, glassAccent, group, bolts };
      return () => {
        heroRef.current = null;
        sheet.geometry.dispose();
        sheet.material.dispose();
        rt.dispose();
        quadGeo.dispose();
        quadMat.dispose();
        glassClear.dispose();
        glassAccent.dispose();
        boltGeo.dispose();
      };
    },
    onResize: ({ width, height, dpr, camera }) => {
      if (heroRef.current) resizeHero(heroRef.current, width, height, dpr, camera);
    },
    onFrame: (dt, { renderer }) => {
      if (heroRef.current) animate(heroRef.current, motionRef.current, dt, renderer, pointerRef.current);
    },
    onReady: () => setReady(true),
    onError: () => setFailed(true),
  });

  // Palette: gradient colours and glass tints.
  useEffect(() => {
    const h = heroRef.current;
    if (!h) return;
    applyColours(h.sheet.material, colourSetup('home', pal));
    const g = glassColours(pal);
    applyGlass(h.glassClear, g.clear);
    applyGlass(h.glassAccent, g.accent);
    stageRef.current?.invalidate();
  }, [pal, stageRef]);

  useEffect(() => {
    applyZones(heroRef.current?.sheet.material ?? null, zones);
    stageRef.current?.invalidate();
  }, [zones, stageRef]);

  // Text zones: the hero's labels, wordmark, headline and copy.
  useEffect(() => {
    const wrap = wrapRef.current;
    const hero = wrap?.parentElement;
    if (!wrap || !hero) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setZones(measureZones(wrap, homeTargets(hero))));
    };
    const ro = new ResizeObserver(update);
    ro.observe(hero);
    document.fonts?.ready.then(update);
    const late = setTimeout(update, 1300); // after the wordmark's boot animation
    update();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(late);
      ro.disconnect();
    };
  }, []);

  // Cursor tilt and parallax; a click zaps (spin + ripple).
  useEffect(() => {
    const hero = wrapRef.current?.parentElement;
    if (!hero) return;
    const mo = motionRef.current;
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      mo.tx = (e.clientX - r.left) / r.width - 0.5;
      mo.ty = (e.clientY - r.top) / r.height - 0.5;
      pointerRef.current.set(mo.tx * 2, -mo.ty * 2);
    };
    const onLeave = () => {
      mo.tx = 0;
      mo.ty = 0;
    };
    const onZap = (e: PointerEvent) => {
      mo.spin = 2.6;
      const h = heroRef.current;
      const r = hero.getBoundingClientRect();
      if (h) rippleAt(h, ((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      stageRef.current?.invalidate();
    };
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    hero.addEventListener('pointerdown', onZap, { passive: true });
    return () => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      hero.removeEventListener('pointerdown', onZap);
    };
  }, [stageRef]);

  if (failed) throw new Error('WebGL could not start for the liquid hero');
  return <div ref={wrapRef} className={`hero-liquid${ready ? ' is-ready' : ''}`} aria-hidden="true" />;
}
