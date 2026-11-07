'use client';

import React, { useEffect, useRef } from 'react';

export function FrzzyCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cursor = cursorRef.current;
    if (!fine || !cursor) return;

    cursor.classList.add('on');
    let cx = -100;
    let cy = -100;
    let tx = -100;
    let ty = -100;
    let animId: number;

    const handlePointerMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (reduce) {
        cx = tx;
        cy = ty;
      }
    };

    const follow = () => {
      cx += (tx - cx) * (reduce ? 1 : 0.5);
      cy += (ty - cy) * (reduce ? 1 : 0.5);
      if (cursor) {
        cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      }
      animId = requestAnimationFrame(follow);
    };

    const handlePointerOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !cursor) return;
      const big = el.closest('a, button, .chip, .tilt, select, input, textarea, .filter, .small-btn');
      cursor.classList.toggle('big', Boolean(big));
      const inHero = el.closest('.hero') && !big;
      cursor.classList.toggle('push', Boolean(inHero));
    };

    const handleMouseLeave = () => {
      tx = -100;
      ty = -100;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    animId = requestAnimationFrame(follow);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerover', handlePointerOver);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div ref={cursorRef} className="frzzy-cursor" aria-hidden="true">
      <span>ZAP</span>
    </div>
  );
}
