'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStage } from './stage';
import { useFxPalette, useOnScreen, useReducedMotion } from './liquid-env';
import {
  applyCanvasSize,
  applyColours,
  applyZones,
  colourSetup,
  createSheet,
  measureZones,
  tick,
  type GradientPreset,
  type Zone,
  type ZoneKind,
} from './gradient-core';

export type { GradientPreset } from './gradient-core';

/**
 * The liquid gradient as a section background: page heroes (preset "hero") and the accent
 * "Got a brief?" bands (preset "cta"). The sheet, colours and contrast guard live in gradient-core.ts.
 * Put it as the first child of the section; it fills the section and sits behind its `.wrap`.
 */

/** Page heroes: every block of the `.wrap` is a text zone; the page title is "large". */
function heroTargets(wrapper: HTMLElement): [Element, ZoneKind][] {
  const content = wrapper.parentElement?.querySelector(':scope > .wrap');
  return Array.from(content?.children ?? []).map((el) => [el, el.classList.contains('page-title') ? 2 : 1]);
}

export default function LiquidGradient({ preset }: { preset: Exclude<GradientPreset, 'home'> }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const pointerRef = useRef(new THREE.Vector2());
  const onScreen = useOnScreen(wrapRef);
  const reduced = useReducedMotion();
  const pal = useFxPalette();
  const [zones, setZones] = useState<Zone[]>([]);
  const [ready, setReady] = useState(false);

  const stageRef = useStage(wrapRef, {
    animate: onScreen && !reduced,
    dpr: [1, 1.5],
    perspective: { fov: 45, z: 4 },
    setup: ({ scene }) => {
      const sheet = createSheet(preset, (wrapRef.current?.clientWidth ?? 1000) >= 700);
      scene.add(sheet.mesh);
      matRef.current = sheet.material;
      return () => {
        matRef.current = null;
        sheet.geometry.dispose();
        sheet.material.dispose();
      };
    },
    onResize: ({ width, height, dpr }) => applyCanvasSize(matRef.current, width, height, dpr),
    onFrame: (dt) => tick(matRef.current, dt * (preset === 'cta' ? 0.48 : 0.28), dt, pointerRef.current),
    onReady: () => setReady(true),
  });

  useEffect(() => {
    applyColours(matRef.current, colourSetup(preset, pal));
    stageRef.current?.invalidate();
  }, [preset, pal, stageRef]);

  useEffect(() => {
    applyZones(matRef.current, zones);
    stageRef.current?.invalidate();
  }, [zones, stageRef]);

  // Text zones (page heroes only): re-measured when the layout or fonts change.
  useEffect(() => {
    const wrap = wrapRef.current;
    const section = wrap?.parentElement;
    if (preset !== 'hero' || !wrap || !section) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setZones(measureZones(wrap, heroTargets(wrap))));
    };
    const ro = new ResizeObserver(update);
    ro.observe(section);
    document.fonts?.ready.then(update);
    const late = setTimeout(update, 900); // after the title's glitch-in animation
    update();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(late);
      ro.disconnect();
    };
  }, [preset]);

  // Gentle parallax towards the cursor.
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r || !r.width) return;
      pointerRef.current.set(((e.clientX - r.left) / r.width - 0.5) * 2, -((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return <div ref={wrapRef} className={`liquid-gradient lg-${preset}${ready ? ' is-ready' : ''}`} aria-hidden="true" />;
}
