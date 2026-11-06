'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import {
  HeroCardConfig,
  ViewportTier,
  computeMagneticOffset,
  getActiveHeroMedia,
} from '@/lib/hero-config';

interface InlineVideoCardProps {
  card: HeroCardConfig;
  revealDelay: number;
  className?: string;
}

export function InlineVideoCard({
  card,
  revealDelay,
  className = '',
}: InlineVideoCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [tier, setTier] = useState<ViewportTier>('desktop');
  const [magnetic, setMagnetic] = useState({ x: 0, y: 0 });

  // Track responsive viewport tier so morphing dimensions fit mobile, tablet, and desktop
  useEffect(() => {
    const updateTier = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setTier('mobile');
      } else if (w < 1024) {
        setTier('tablet');
      } else {
        setTier('desktop');
      }
    };
    updateTier();
    window.addEventListener('resize', updateTier);
    return () => window.removeEventListener('resize', updateTier);
  }, []);

  const { item: activeMedia, dimensions } = getActiveHeroMedia(
    card,
    sequenceIndex,
    tier
  );

  const advanceMedia = useCallback(() => {
    setSequenceIndex((prev) => (prev + 1) % card.mediaSequence.length);
  }, [card.mediaSequence.length]);

  // Ensure active video autoplays immediately whenever the active media item changes
  useEffect(() => {
    if (activeMedia.mediaType === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [activeMedia.id, activeMedia.mediaType]);

  // Advance to the next media item (morphing horizontal <-> vertical) after durationMs
  useEffect(() => {
    const timer = window.setTimeout(() => {
      advanceMedia();
    }, activeMedia.durationMs);
    return () => window.clearTimeout(timer);
  }, [activeMedia.id, activeMedia.durationMs, advanceMedia]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMagnetic(computeMagneticOffset(e.clientX, e.clientY, rect, 3.5));
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    setMagnetic({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      ref={containerRef}
      data-testid={card.id}
      data-orientation={activeMedia.orientation}
      data-media-type={activeMedia.mediaType}
      data-playing={activeMedia.mediaType === 'video' ? 'true' : 'image'}
      onClick={advanceMedia}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      initial={{
        y: 38,
        opacity: 0,
        scale: 0.86,
      }}
      animate={{
        y: 0,
        opacity: 1,
        scale: 1,
      }}
      transition={{
        y: { duration: 0.78, ease: [0.16, 1, 0.3, 1], delay: revealDelay },
        opacity: { duration: 0.72, ease: [0.16, 1, 0.3, 1], delay: revealDelay },
        scale: { duration: 0.78, ease: [0.16, 1, 0.3, 1], delay: revealDelay },
      }}
      className={`relative inline-flex shrink-0 items-center justify-center align-middle overflow-hidden rounded-[11px] sm:rounded-[15px] bg-[#d8c4b0]/30 select-none will-change-transform ${className}`}
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        transform: `translate3d(${magnetic.x}px, ${magnetic.y}px, 0px)`,
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={activeMedia.id}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1.01 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 w-full h-full overflow-hidden"
        >
          {/* Base Image / Poster */}
          <Image
            src={activeMedia.posterSrc}
            alt={activeMedia.alt}
            fill
            sizes="(max-width: 768px) 180px, 380px"
            priority
            referrerPolicy="no-referrer"
            draggable={false}
            className="object-cover block pointer-events-none"
          />

          {/* Auto-Playing Video Layer (when mediaType is 'video') */}
          {activeMedia.mediaType === 'video' && (
            <video
              ref={videoRef}
              src={activeMedia.src}
              poster={activeMedia.posterSrc}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
