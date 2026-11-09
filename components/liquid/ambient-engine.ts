import * as THREE from 'three';
import { allowSoftwareGl, type FxPalette } from './liquid-env';
import { applyCanvasSize, applyColours, colourSetup, createSheet, tick } from './gradient-core';

/**
 * One shared renderer for every ambient glow on the page (ambient-glow.tsx). It draws the liquid
 * gradient (preset "ambient") at a low resolution and copies each frame into the plain 2D canvas of
 * every section currently on screen, cropped and mirrored per section so they don't repeat. A page
 * full of sections therefore costs one WebGL context, rendered at ~30 fps and only while at least
 * one section is visible. The context is released a few seconds after the last section unmounts.
 */

const W = 640;
const H = 360;
const FRAME_MS = 1000 / 30;

export interface AmbientTarget {
  canvas: HTMLCanvasElement;
  /** 0–3: which mirror image and crop of the shared frame this section shows. */
  seed: number;
}

/** Copies the shared frame into a section's canvas, cover-cropped and mirrored by `seed`. */
function blit(src: HTMLCanvasElement, t: AmbientTarget) {
  const c = t.canvas;
  const ctx = c.getContext('2d');
  if (!ctx || !c.width || !c.height) return;
  const targetAspect = c.width / c.height;
  let sw = W;
  let sh = H;
  if (targetAspect > W / H) sh = W / targetAspect;
  else sw = H * targetAspect;
  const sx = (W - sw) * ((0.2 + t.seed * 0.27) % 1);
  const sy = (H - sh) * 0.5;
  const fx = t.seed & 1 ? -1 : 1;
  const fy = t.seed & 2 ? -1 : 1;
  ctx.setTransform(fx, 0, 0, fy, fx < 0 ? c.width : 0, fy < 0 ? c.height : 0);
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
}

class AmbientEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  private sheet = createSheet('ambient', true);
  private targets = new Set<AmbientTarget>();
  private raf = 0;
  private lastDraw = 0;
  private animate = true;
  private paletteKey = '';

  constructor() {
    const canvas = document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: !allowSoftwareGl(),
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.camera.position.z = 4;
    this.scene.add(this.sheet.mesh);
    applyCanvasSize(this.sheet.material, W, H, 1);
  }

  setPalette(p: FxPalette) {
    if (p.key === this.paletteKey) return;
    this.paletteKey = p.key;
    applyColours(this.sheet.material, colourSetup('ambient', p));
    this.redraw();
  }

  setAnimate(on: boolean) {
    this.animate = on;
    this.kick();
  }

  add(t: AmbientTarget) {
    this.targets.add(t);
    this.draw(0, t);
    this.kick();
  }

  remove(t: AmbientTarget) {
    this.targets.delete(t);
  }

  /** Re-renders the current frame into every visible section (palette switch, resize, still frames). */
  redraw() {
    this.draw(0);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.targets.clear();
    this.sheet.geometry.dispose();
    this.sheet.material.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private kick() {
    if (!this.raf && this.animate && this.targets.size) this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    this.raf = 0;
    if (!this.animate || !this.targets.size) {
      this.lastDraw = 0;
      return;
    }
    if (!this.lastDraw) this.lastDraw = now;
    if (now - this.lastDraw >= FRAME_MS) {
      this.draw(Math.min(0.1, (now - this.lastDraw) / 1000));
      this.lastDraw = now;
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Renders a frame and copies it into one section (`only`) or all visible ones. The WebGL buffer is
   *  still intact within this task, so the copy needs no preserveDrawingBuffer. */
  private draw(dt: number, only?: AmbientTarget) {
    tick(this.sheet.material, dt * this.sheet.def.speed * 4, dt, null);
    this.renderer.render(this.scene, this.camera);
    const src = this.renderer.domElement;
    if (only) blit(src, only);
    else for (const t of this.targets) blit(src, t);
  }
}

let engine: AmbientEngine | null = null;
let users = 0;
let releaseTimer = 0;

/** Shared engine, or null when WebGL can't start (the glow then simply doesn't show). */
export function acquireAmbientEngine(): AmbientEngine | null {
  clearTimeout(releaseTimer);
  if (!engine) {
    try {
      engine = new AmbientEngine();
    } catch {
      return null;
    }
  }
  users += 1;
  return engine;
}

export function releaseAmbientEngine() {
  users = Math.max(0, users - 1);
  if (users > 0) return;
  // kept briefly so switching pages doesn't recreate the WebGL context
  clearTimeout(releaseTimer);
  releaseTimer = window.setTimeout(() => {
    if (users > 0 || !engine) return;
    engine.dispose();
    engine = null;
  }, 4000);
}

export type { AmbientEngine };
