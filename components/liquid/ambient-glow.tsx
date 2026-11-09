'use client';

import { useEffect, useRef } from 'react';
import { useFxPalette, useOnScreen, useReducedMotion } from './liquid-env';
import { acquireAmbientEngine, releaseAmbientEngine, type AmbientEngine, type AmbientTarget } from './ambient-engine';

/**
 * A faint glow of the liquid gradient inside a content section, shaped by a soft mask in one
 * corner (`at`). Frames come from the shared ambient engine; this component only owns a small 2D
 * canvas (half the section's CSS size, which is plenty for a soft glow) and shows it while the
 * section is on screen. Place it as the first child of a `.section`.
 */

export type AmbientAt = 'tr' | 'tl' | 'br' | 'bl' | 'tc';

/** Canvas pixels per CSS pixel. */
const RES = 0.5;

export default function AmbientGlow({ at, seed }: { at: AmbientAt; seed: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AmbientEngine | null>(null);
  const targetRef = useRef<AmbientTarget | null>(null);
  const onScreen = useOnScreen(boxRef, '80px');
  const reduced = useReducedMotion();
  const pal = useFxPalette();

  // Join the shared engine and keep the canvas sized to the section.
  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const engine = acquireAmbientEngine();
    if (!engine) return;
    const target: AmbientTarget = { canvas, seed: seed & 3 };
    engineRef.current = engine;
    targetRef.current = target;
    const resize = () => {
      const w = Math.max(32, Math.round(box.clientWidth * RES));
      const h = Math.max(32, Math.round(box.clientHeight * RES));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      engine.redraw(); // resizing clears a canvas
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();
    return () => {
      ro.disconnect();
      engine.remove(target);
      engineRef.current = null;
      targetRef.current = null;
      releaseAmbientEngine();
    };
  }, [seed]);

  useEffect(() => {
    engineRef.current?.setPalette(pal);
  }, [pal]);

  useEffect(() => {
    engineRef.current?.setAnimate(!reduced);
  }, [reduced]);

  // Receive frames only while on screen (and not covered by the stack scroll).
  useEffect(() => {
    const engine = engineRef.current;
    const target = targetRef.current;
    if (!engine || !target) return;
    if (!onScreen) {
      engine.remove(target);
      return;
    }
    engine.add(target);
    boxRef.current?.classList.add('is-ready');
    return () => engine.remove(target);
  }, [onScreen]);

  return (
    <div ref={boxRef} className="ambient" data-at={at} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
