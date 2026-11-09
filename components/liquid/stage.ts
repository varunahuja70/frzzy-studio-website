'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { allowSoftwareGl } from './liquid-env';

/**
 * A tiny three.js "stage" hook for the liquid effects, modelled on react-three-fiber's render
 * loop (pmndrs/react-three-fiber) without its runtime: R3F registers the whole three.js namespace,
 * which would add ~50 kB gzipped to every page that already uses three.js (the home hero does).
 *
 * What it borrows from R3F:
 *  - frameloop "always" vs "demand": the loop runs only while `animate` is true; otherwise a frame
 *    is drawn only when something calls `invalidate()` (palette switch, resize, new data)
 *  - an `onFrame(dt)` callback like `useFrame`, sizing that follows the container's box and pixel
 *    ratio, and full disposal (incl. the WebGL context) on unmount
 * The hook creates its own <canvas> inside `boxRef`, so every mount gets a fresh WebGL context
 * (React's dev double-mount and view switches never reuse a context that was released).
 */

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  width: number;
  height: number;
  dpr: number;
  invalidate: () => void;
}

export interface StageOptions {
  /** Run the loop continuously (like R3F frameloop="always"). */
  animate: boolean;
  /** Device-pixel-ratio cap: a number, or [min, max] clamping window.devicePixelRatio. */
  dpr: number | [number, number];
  /** Perspective camera; omit for shaders that write clip space directly. */
  perspective?: { fov: number; z: number };
  /** Build scene contents once the renderer exists; return a cleanup. */
  setup: (stage: Stage) => (() => void) | void;
  onFrame?: (dt: number, stage: Stage) => void;
  onResize?: (stage: Stage) => void;
  /** First frame has been drawn. */
  onReady?: () => void;
  /** WebGL couldn't start; the effect should stay hidden. */
  onError?: (error: unknown) => void;
}

const pickDpr = (dpr: StageOptions['dpr']) =>
  typeof dpr === 'number' ? dpr : Math.min(dpr[1], Math.max(dpr[0], window.devicePixelRatio || 1));

export function useStage(boxRef: RefObject<HTMLElement | null>, options: StageOptions): RefObject<Stage | null> {
  const stageRef = useRef<Stage | null>(null);
  const optsRef = useRef(options);
  const animateRef = useRef(options.animate);

  // Always call the latest callbacks without rebuilding the renderer.
  useEffect(() => {
    optsRef.current = options;
  });

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const opts = optsRef.current;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    box.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: !allowSoftwareGl(),
      });
    } catch (err) {
      canvas.remove();
      opts.onError?.(err);
      return;
    }
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = opts.perspective
      ? new THREE.PerspectiveCamera(opts.perspective.fov, 1, 0.1, 100)
      : new THREE.Camera();
    if (opts.perspective) camera.position.z = opts.perspective.z;

    let frame = 0;
    let last = 0;
    let drawn = false;
    const stage: Stage = {
      renderer,
      scene,
      camera,
      width: 0,
      height: 0,
      dpr: 1,
      invalidate: () => {
        if (!frame) frame = requestAnimationFrame(tick);
      },
    };

    function tick(now: number) {
      frame = 0;
      if (!stage.width || !stage.height) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = animateRef.current ? now : 0; // restarting after a pause doesn't jump ahead
      optsRef.current.onFrame?.(dt, stage);
      renderer.render(scene, camera);
      if (!drawn) {
        drawn = true;
        optsRef.current.onReady?.();
      }
      if (animateRef.current) frame = requestAnimationFrame(tick);
    }

    const resize = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      const dpr = pickDpr(optsRef.current.dpr);
      if (!w || !h) return;
      if (w === stage.width && h === stage.height && dpr === stage.dpr) return;
      stage.width = w;
      stage.height = h;
      stage.dpr = dpr;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      optsRef.current.onResize?.(stage);
      stage.invalidate();
    };

    const cleanupScene = opts.setup(stage);
    stageRef.current = stage;
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      stageRef.current = null;
      cleanupScene?.();
      renderer.dispose();
      renderer.forceContextLoss(); // free the GPU context now, not at garbage collection
      canvas.remove();
    };
  }, [boxRef]);

  // Start/stop the continuous loop.
  useEffect(() => {
    animateRef.current = options.animate;
    if (options.animate) stageRef.current?.invalidate();
  }, [options.animate]);

  // A new pixel-ratio cap (e.g. the liquid metal's mask was rebuilt for another screen).
  const dprKey = JSON.stringify(options.dpr);
  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    const dpr = pickDpr(optsRef.current.dpr);
    if (dpr === st.dpr) return;
    st.dpr = dpr;
    st.renderer.setPixelRatio(dpr);
    st.renderer.setSize(st.width, st.height, false);
    optsRef.current.onResize?.(st);
    st.invalidate();
  }, [dprKey]);

  return stageRef;
}
