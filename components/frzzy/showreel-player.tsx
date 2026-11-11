'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * FRZZY Studio Homepage - Seamless Continuous Looping Showreel
 * Dynamically streams the active video directly from Supabase Storage / Supabase Settings.
 * If deleted or updated in Supabase, it syncs live and falls back cleanly.
 */
const DEFAULT_VIDEO_SRC = '/assets/videos/works/work-1.mp4';

export function ShowreelPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string>(DEFAULT_VIDEO_SRC);

  // Fetch latest active video from Supabase via /api/showreel
  useEffect(() => {
    let isMounted = true;
    fetch('/api/showreel')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.showreel?.videoUrl) {
          setVideoSrc(data.showreel.videoUrl);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

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
  }, [videoSrc]);

  return (
    <div
      ref={containerRef}
      className="group/reel relative w-full h-full aspect-video overflow-hidden bg-black select-none rounded-[inherit] cursor-pointer"
    >
      <video
        key={videoSrc}
        ref={videoRef}
        src={videoSrc}
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
