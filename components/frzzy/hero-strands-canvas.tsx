'use client';

import React, { useEffect, useRef } from 'react';
import { readLivePalette } from '@/lib/palette';

interface Point {
  x: number;
  y: number;
  px: number;
  py: number;
}

interface Strand {
  x0: number;
  pts: Point[];
  seg: number;
  c: number;
  z: number;
  volt: boolean;
}

interface Arc {
  pts: [number, number][];
  life: number;
  max: number;
}

interface HeroStrandsCanvasProps {
  /** The `.sc` wordmark element. On zap its `zap` class is restarted directly on the DOM node
   *  (no React state), so clicking never re-renders the page or rebuilds the strands. */
  scRef?: React.RefObject<HTMLElement | null>;
  /** Optional side-effect hook fired on every zap. Read through a ref, so passing a new
   *  function each render does NOT re-initialise the simulation. */
  onZap?: () => void;
}

export function HeroStrandsCanvas({ scRef, onZap }: HeroStrandsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onZapRef = useRef(onZap);

  useEffect(() => {
    onZapRef.current = onZap;
  }, [onZap]);

  // Runs once per mount. It must not depend on anything that changes between renders:
  // re-running it calls build(true), which resets every strand to the frizzed intro pose.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const heroEl = canvas.closest('.hero') as HTMLElement | null;
    if (!heroEl) return;

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Colours follow the active site palette (see lib/palette.ts).
    const pal = readLivePalette();
    const accent = `rgb(${pal.accentRgb})`;

    let W = 0;
    let H = 0;
    const K = 8;
    let strands: Strand[] = [];
    const arcs: Arc[] = [];
    let mx = -9999;
    let my = -9999;
    let hasPtr = false;
    const G = 2800; // Snappy gravity
    let running = false;
    let idleFrames = 0;
    let last = 0;
    let dead = false;
    let animId = 0;

    function build(intro: boolean) {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gap = W < 760 ? 6 : 5;
      const n = Math.floor(W / gap) + 1;
      strands = [];

      for (let i = 0; i < n; i++) {
        const x = i * gap + (Math.random() - 0.5) * gap * 0.6;
        const len = H * (0.13 + Math.random() * 0.13 + 0.05 * (1 + Math.sin(i * 0.11)));
        const seg = len / K;
        const pts: Point[] = [];
        const lean = intro ? (Math.random() - 0.5) * 2.4 : 0;

        for (let k = 0; k <= K; k++) {
          const px = x + (intro ? Math.sin(lean) * k * seg : 0);
          const py = intro ? -Math.cos(lean) * k * seg * 0.2 : k * seg;
          pts.push({ x: px, y: Math.max(0, py), px, py: Math.max(0, py) });
        }
        strands.push({
          x0: x,
          pts,
          seg,
          c: 0,
          z: 0,
          volt: Math.random() < 0.12,
        });
      }
    }

    function step(dt: number) {
      const R = W < 760 ? 110 : 150;
      const RR = W < 760 ? 46 : 60;
      const MAXD = W < 760 ? 44 : 60;
      const FP = 18000;
      const KX = 22;
      const damp = 0.972;
      const dt2 = dt * dt;

      for (let i = 0; i < strands.length; i++) {
        const s = strands[i];
        const pts = s.pts;
        const tip = pts[K];
        const mid = pts[K >> 1];
        const dn = Math.min(Math.hypot(mx - tip.x, my - tip.y), Math.hypot(mx - mid.x, my - mid.y));

        if (hasPtr && dn < R) {
          s.c = Math.min(1, s.c + dt * 5 * (1 - dn / R));
        } else {
          s.c = Math.max(0, s.c - dt * 2.2);
        }

        if (s.z > 0) s.z = Math.max(0, s.z - dt * 1.8);

        for (let k = 1; k <= K; k++) {
          const p = pts[k];
          const vx = (p.x - p.px) * damp;
          const vy = (p.y - p.py) * damp;
          p.px = p.x;
          p.py = p.y;
          let ax = (s.x0 - p.x) * KX;
          let ay = G;

          if (hasPtr) {
            const qx = p.x - mx;
            const qy = p.y - my;
            const qd = Math.sqrt(qx * qx + qy * qy);
            if (qd < RR && Math.abs(p.x - s.x0) < MAXD) {
              const F = FP * (1 - qd / RR);
              ax += qx >= 0 ? F : -F;
            }
          }

          if (s.z > 0) {
            const j = 1400 * s.z;
            ax += (Math.random() - 0.5) * j;
            ay += (Math.random() - 0.5) * j;
          }

          p.x += vx + ax * dt2;
          p.y += vy + ay * dt2;
        }

        for (let it = 0; it < 4; it++) {
          pts[0].x = s.x0;
          pts[0].y = 0;
          for (let k2 = 0; k2 < K; k2++) {
            const a = pts[k2];
            const b = pts[k2 + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
            const diff = (d - s.seg) / d;
            if (k2 === 0) {
              b.x -= dx * diff;
              b.y -= dy * diff;
            } else {
              a.x += dx * diff * 0.5;
              a.y += dy * diff * 0.5;
              b.x -= dx * diff * 0.5;
              b.y -= dy * diff * 0.5;
            }
            if (b.y < 0) b.y = 0;
          }
        }
      }

      for (let q = arcs.length - 1; q >= 0; q--) {
        arcs[q].life -= dt;
        if (arcs[q].life <= 0) arcs.splice(q, 1);
      }
    }

    function trace(s: Strand) {
      if (!ctx) return;
      const pts = s.pts;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < K; k++) {
        const mx2 = (pts[k].x + pts[k + 1].x) / 2;
        const my2 = (pts[k].y + pts[k + 1].y) / 2;
        ctx.quadraticCurveTo(pts[k].x, pts[k].y, mx2, my2);
      }
      ctx.lineTo(pts[K].x, pts[K].y);
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let i: number;
      let s: Strand;

      ctx.beginPath();
      for (i = 0; i < strands.length; i++) {
        s = strands[i];
        if (!s.volt && s.c < 0.35) trace(s);
      }
      ctx.strokeStyle = `rgba(${pal.ivoryRgb}, 0.34)`;
      ctx.stroke();

      ctx.beginPath();
      for (i = 0; i < strands.length; i++) {
        s = strands[i];
        if (!s.volt && s.c >= 0.35) trace(s);
      }
      ctx.strokeStyle = `rgba(${pal.ivoryRgb}, 0.9)`;
      ctx.stroke();

      ctx.beginPath();
      for (i = 0; i < strands.length; i++) {
        s = strands[i];
        if (s.volt) trace(s);
      }
      ctx.strokeStyle = `rgba(${pal.accentRgb}, 0.85)`;
      ctx.stroke();

      ctx.fillStyle = accent;
      for (i = 0; i < strands.length; i++) {
        s = strands[i];
        if (s.c > 0.5) {
          const t = s.pts[K];
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.4, 0, 6.2832);
          ctx.fill();
        }
      }

      if (arcs.length) {
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = accent;
        for (let q = 0; q < arcs.length; q++) {
          const A = arcs[q];
          ctx.globalAlpha = Math.max(0, A.life / A.max);
          ctx.beginPath();
          ctx.moveTo(A.pts[0][0], A.pts[0][1]);
          for (let m = 1; m < A.pts.length; m++) ctx.lineTo(A.pts[m][0], A.pts[m][1]);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    function bolt(x1: number, y1: number, x2: number, y2: number): [number, number][] {
      const pts: [number, number][] = [[x1, y1]];
      const segs = 7;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      for (let i = 1; i < segs; i++) {
        const f = i / segs;
        const off = (Math.random() - 0.5) * Math.min(26, len * 0.25);
        pts.push([x1 + dx * f + nx * off, y1 + dy * f + ny * off]);
      }
      pts.push([x2, y2]);
      return pts;
    }

    function zap(x: number, y: number) {
      const R = W < 760 ? 220 : 320;
      const hits: [number, number, number][] = [];
      for (let i = 0; i < strands.length; i++) {
        const s = strands[i];
        const tip = s.pts[K];
        const d = Math.hypot(tip.x - x, tip.y - y);
        if (d < R) {
          s.c = 1;
          s.z = 1;
          for (let k = 1; k <= K; k++) {
            const p = s.pts[k];
            const ex = p.x - x;
            const ey = p.y - y;
            const ed = Math.hypot(ex, ey) || 1;
            const imp = 16 * (1 - d / R) * (k / K);
            p.px = p.x - (ex / ed) * imp;
            p.py = p.y - (ey / ed) * imp;
          }
          hits.push([d, tip.x, tip.y]);
        }
      }
      hits.sort((a, b) => a[0] - b[0]);
      for (let h = 0; h < Math.min(5, hits.length); h += 1) {
        const life = 0.16 + Math.random() * 0.1;
        arcs.push({ pts: bolt(x, y, hits[h][1], hits[h][2]), life, max: life });
      }

      // Glitch the wordmark: remove, force a reflow, re-add, so rapid clicks restart the animation.
      const sc = scRef?.current;
      if (sc && !reduce) {
        sc.classList.remove('zap');
        void sc.offsetWidth;
        sc.classList.add('zap');
      }

      onZapRef.current?.();
    }

    function frame(now: number) {
      if (dead) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      step(dt / 2);
      step(dt / 2);
      draw();
      const active = hasPtr || arcs.length > 0;
      if (!active) {
        let moving = false;
        for (let i = 0; i < strands.length && !moving; i += 3) {
          const t = strands[i].pts[K];
          if (Math.abs(t.x - t.px) + Math.abs(t.y - t.py) > 0.05 || strands[i].c > 0) {
            moving = true;
          }
        }
        idleFrames = moving ? 0 : idleFrames + 1;
      } else {
        idleFrames = 0;
      }

      if (idleFrames > 30 || document.hidden) {
        running = false;
        return;
      }
      animId = requestAnimationFrame(frame);
    }

    function kick() {
      if (!running && !reduce && !dead) {
        running = true;
        idleFrames = 0;
        last = performance.now();
        animId = requestAnimationFrame(frame);
      }
    }

    build(!reduce);
    draw();

    // Only rebuild when the canvas really changes size. window 'resize' also fires when the
    // mobile address bar shows/hides, which used to wipe the strands mid-interaction.
    const ro = new ResizeObserver(() => {
      if (!canvas || (canvas.clientWidth === W && canvas.clientHeight === H)) return;
      build(false);
      draw();
      kick();
    });
    ro.observe(canvas);

    if (reduce) {
      return () => {
        dead = true;
        ro.disconnect();
      };
    }

    kick();

    function local(e: PointerEvent) {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    }

    const onPointerMove = (e: PointerEvent) => {
      local(e);
      hasPtr = true;
      kick();
    };

    const onPointerDown = (e: PointerEvent) => {
      local(e);
      zap(mx, my);
      kick();
    };

    const onPointerLeave = () => {
      hasPtr = false;
      kick();
    };

    // The loop parks itself when the tab is hidden; resume it when the tab comes back.
    const onVisibility = () => {
      if (!document.hidden) kick();
    };

    heroEl.addEventListener('pointermove', onPointerMove, { passive: true });
    heroEl.addEventListener('pointerdown', onPointerDown, { passive: true });
    heroEl.addEventListener('pointerleave', onPointerLeave);
    heroEl.addEventListener('pointercancel', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      dead = true;
      cancelAnimationFrame(animId);
      ro.disconnect();
      heroEl.removeEventListener('pointermove', onPointerMove);
      heroEl.removeEventListener('pointerdown', onPointerDown);
      heroEl.removeEventListener('pointerleave', onPointerLeave);
      heroEl.removeEventListener('pointercancel', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scRef]);

  return <canvas id="hero-fx" ref={canvasRef} aria-hidden="true" />;
}
