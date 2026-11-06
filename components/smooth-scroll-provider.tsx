'use client';

import React, { useEffect, useRef } from 'react';

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

/**
 * Inertial / momentum smooth-scroll controller (Lenis-style exponential damping).
 * Smoothly decelerates wheel scrolling, with extra soft cushion when approaching the top or bottom of the page.
 */
export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const targetYRef = useRef(0);
  const currentYRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const isWheelActiveRef = useRef(false);

  useEffect(() => {
    targetYRef.current = window.scrollY;
    currentYRef.current = window.scrollY;

    const getMaxScroll = () =>
      Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

    const updateScroll = () => {
      const maxScroll = getMaxScroll();
      targetYRef.current = Math.max(0, Math.min(maxScroll, targetYRef.current));

      const diff = targetYRef.current - currentYRef.current;

      // Soften damping near the very top (y < 140) so scrolling to the top eases to a gentle, luxurious stop,
      // while keeping normal downward/mid-page scrolling responsive so scroll-triggered animations fire right on time
      const nearTopFactor =
        currentYRef.current < 140
          ? 0.08 + (currentYRef.current / 140) * 0.06
          : 0.145;

      if (Math.abs(diff) > 0.35) {
        currentYRef.current += diff * nearTopFactor;
        window.scrollTo(0, currentYRef.current);
        rafIdRef.current = window.requestAnimationFrame(updateScroll);
      } else {
        currentYRef.current = targetYRef.current;
        window.scrollTo(0, currentYRef.current);
        isWheelActiveRef.current = false;
        rafIdRef.current = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Do not intercept if inside a modal dialog or zoom gesture
      if (e.ctrlKey || document.querySelector('[role="dialog"]')) {
        return;
      }
      const maxScroll = getMaxScroll();
      if (maxScroll <= 0) return;

      e.preventDefault();

      // Normalize delta across wheel modes
      const deltaMultiplier = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
      const rawDelta = e.deltaY * deltaMultiplier * 0.92;

      if (!isWheelActiveRef.current) {
        currentYRef.current = window.scrollY;
        targetYRef.current = window.scrollY;
        isWheelActiveRef.current = true;
      }

      // Apply subtle resistance cushion when scrolling upward very close to top
      const topResistance =
        rawDelta < 0 && targetYRef.current < 160
          ? 0.65 + (targetYRef.current / 160) * 0.35
          : 1;

      targetYRef.current = Math.max(
        0,
        Math.min(maxScroll, targetYRef.current + rawDelta * topResistance)
      );

      if (rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(updateScroll);
      }
    };

    const onNativeScroll = () => {
      if (!isWheelActiveRef.current) {
        currentYRef.current = window.scrollY;
        targetYRef.current = window.scrollY;
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onNativeScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onNativeScroll);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return <>{children}</>;
}
