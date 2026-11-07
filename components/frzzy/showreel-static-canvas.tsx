'use client';

import React, { useEffect, useRef, useState } from 'react';

export function ShowreelStaticCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timecode, setTimecode] = useState('00:00:00:00');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = canvas.width;
    const H = canvas.height;
    const img = ctx.createImageData(W, H);
    const start = performance.now();
    let last = 0;
    let visible = true;
    let animId: number;

    function pad(n: number) {
      return (n < 10 ? '0' : '') + n;
    }

    function draw() {
      if (!ctx) return;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 46 + 8;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);

      const y = Math.floor(((performance.now() - start) / 18) % (H + 20)) - 10;
      ctx.fillStyle = 'rgba(198,255,0,0.35)';
      ctx.fillRect(0, y, W, 2);

      if (Math.random() < 0.08) {
        ctx.fillStyle = 'rgba(243,239,231,0.18)';
        ctx.fillRect(0, Math.floor(Math.random() * H), W, 1 + Math.floor(Math.random() * 3));
      }
    }

    function updateTime(now: number) {
      const t = (now - start) / 1000;
      const f = Math.floor((t % 1) * 25);
      const hours = pad(Math.floor(t / 3600));
      const mins = pad(Math.floor(t / 60) % 60);
      const secs = pad(Math.floor(t) % 60);
      const frames = pad(f);
      setTimecode(`${hours}:${mins}:${secs}:${frames}`);
    }

    draw();
    if (reduce) return;

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
      });
      observer.observe(canvas);
    }

    function loop(now: number) {
      if (visible && now - last > 66) {
        draw();
        updateTime(now);
        last = now;
      }
      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <>
      <canvas id="static" ref={canvasRef} width={192} height={108} aria-hidden="true" />
      <div className="reel-meta" aria-hidden="true">
        <span className="rec">
          <i />
          REC
        </span>
        <span id="tc" className="tabular-nums font-mono">
          {timecode}
        </span>
      </div>
    </>
  );
}
