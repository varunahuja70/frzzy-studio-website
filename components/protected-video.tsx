'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useProtectedMedia } from '@/hooks/use-protected-media';

export interface ProtectedVideoProps
  extends React.VideoHTMLAttributes<HTMLVideoElement> {
  slotId: string;
  fallbackSrc?: string;
  enableVisibilityObserver?: boolean;
}

export const ProtectedVideo = forwardRef<HTMLVideoElement, ProtectedVideoProps>(
  function ProtectedVideo(
    {
      slotId,
      fallbackSrc,
      enableVisibilityObserver = true,
      className = '',
      poster,
      autoPlay = true,
      loop = true,
      muted = true,
      playsInline = true,
      ...props
    },
    forwardedRef
  ) {
    const internalVideoRef = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Merge internal and forwarded refs
    useImperativeHandle(forwardedRef, () => internalVideoRef.current as HTMLVideoElement);

    const { src, protectionProps } = useProtectedMedia(
      slotId,
      fallbackSrc || (props.src as string | undefined)
    );

    // IntersectionObserver: automatically pauses when offscreen to preserve 60-120fps
    useEffect(() => {
      if (!enableVisibilityObserver) return;
      const vid = internalVideoRef.current;
      if (!vid) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const playPromise = vid.play();
              if (playPromise !== undefined) {
                playPromise.catch(() => {});
              }
            } else {
              vid.pause();
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(vid);

      // Page Visibility API: pause on tab switch, resume when visible
      const handleVisibilityChange = () => {
        if (document.hidden) {
          vid.pause();
        } else if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const inView =
            rect.top < window.innerHeight && rect.bottom > 0;
          if (inView) {
            vid.play().catch(() => {});
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [enableVisibilityObserver]);

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden select-none"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <video
          ref={internalVideoRef}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          {...protectionProps}
          {...props}
          className={`w-full h-full object-cover pointer-events-none select-none ${className}`}
        />
        {/* Invisible overlay intercepting right-click / drag directly */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-transparent pointer-events-auto select-none"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>
    );
  }
);
