'use client';

import React, { useEffect, useRef } from 'react';

/**
 * FRZZY Studio Homepage - Seamless 16:9 Continuous Looping Showreel
 * Clean cinematic video with interactive hover scale animation.
 */
const REEL_VIDEO_SRC = '/assets/videos/works/work-1.mp4';

export function ShowreelPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Background loop: plays continuously whenever on screen
  useEffect(() => {
    const screen = containerRef.current;
    const vid = videoRef.current;
    if (!screen || !vid) return;

    vid.muted = true;
    vid.loop = true;

    const playVideo = () => {
      vid.play().catch(() => {});
    };

    playVideo();

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) {
        playVideo();
      }
    });

    io.observe(screen);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        playVideo();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="group/reel relative w-full h-full aspect-video overflow-hidden bg-black select-none rounded-[inherit] cursor-pointer"
    >
      <video
        ref={videoRef}
        src={REEL_VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
        aria-label="FRZZY Studio Showreel Video"
        className="w-full h-full object-cover object-center scale-[1.005] group-hover/reel:scale-105 transition-transform duration-700 ease-out"
      />
    </div>
  );
}
