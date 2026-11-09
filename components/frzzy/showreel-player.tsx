'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X } from 'lucide-react';

const REEL_VIDEOS = [
  {
    id: 'work-1',
    title: 'Grid Runner — Selected Works',
    src: '/assets/videos/works/work-1.mp4',
    duration: '01:45',
  },
  {
    id: 'card-1',
    title: 'Studio Direction Reel',
    src: '/assets/videos/card-1.mp4',
    duration: '01:20',
  },
  {
    id: 'work-2',
    title: 'Chrome Static & 3D Lighting',
    src: '/assets/videos/works/work-2.mp4',
    duration: '00:45',
  },
];

export function ShowreelPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlayingModal, setIsPlayingModal] = useState(false);
  const [modalMuted, setModalMuted] = useState(false);
  const [modalProgress, setModalProgress] = useState(0);
  const [modalCurrentTime, setModalCurrentTime] = useState('00:00');
  const [modalDuration, setModalDuration] = useState('01:45');
  const [timecode, setTimecode] = useState('00:01:09:10');
  const [activeVideoIdx] = useState(0);

  const activeVideo = REEL_VIDEOS[activeVideoIdx];

  // Minimal clean timecode runner
  useEffect(() => {
    const start = performance.now();
    let animId: number;
    const pad = (n: number) => (n < 10 ? '0' : '') + Math.floor(n);

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000 + 69.4;
      const hours = pad(elapsed / 3600);
      const mins = pad((elapsed / 60) % 60);
      const secs = pad(elapsed % 60);
      const frames = pad((elapsed % 1) * 25);
      setTimecode(`${hours}:${mins}:${secs}:${frames}`);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    setIsPlayingModal(true);
    if (bgVideoRef.current) bgVideoRef.current.pause();
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setIsPlayingModal(false);
    if (modalVideoRef.current) modalVideoRef.current.pause();
    if (bgVideoRef.current) bgVideoRef.current.play().catch(() => {});
  }, []);

  const handleTimeUpdate = () => {
    const vid = modalVideoRef.current;
    if (!vid || !vid.duration) return;
    setModalProgress((vid.currentTime / vid.duration) * 100);

    const pad = (n: number) => (n < 10 ? '0' : '') + Math.floor(n);
    setModalCurrentTime(`${pad(vid.currentTime / 60)}:${pad(vid.currentTime % 60)}`);
    setModalDuration(`${pad(vid.duration / 60)}:${pad(vid.duration % 60)}`);
  };

  const toggleModalPlay = () => {
    const vid = modalVideoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsPlayingModal(true);
    } else {
      vid.pause();
      setIsPlayingModal(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === ' ') {
        e.preventDefault();
        toggleModalPlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  return (
    <>
      <div
        ref={containerRef}
        onClick={openModal}
        role="button"
        tabIndex={0}
        aria-label="Play FRZZY Studio Showreel 2026"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal();
          }
        }}
        className="group/reel relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#0d0d0f] select-none cursor-pointer transition-transform duration-500"
      >
        {/* =========================================================
            1. MINIMAL MAC OS GLASS TITLEBAR (Clean & Refined)
        ========================================================= */}
        <div
          className="relative z-30 h-10 w-full px-4 flex items-center justify-between border-b border-white/[0.06] bg-black/40 backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Window Dots */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/90 transition-opacity group-hover/reel:opacity-100" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/90 transition-opacity group-hover/reel:opacity-100" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/90 transition-opacity group-hover/reel:opacity-100" />
          </div>

          {/* Simple Studio Status */}
          <div className="text-[11px] font-mono text-white/40 tracking-wider">
            FRZZY // REEL 2026
          </div>

          {/* Quick Expand Icon */}
          <div className="flex items-center text-white/30 group-hover/reel:text-white/70 transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* =========================================================
            2. VIDEO LAYER (Dark, Subtle, Cinematic)
        ========================================================= */}
        <div className="absolute inset-0 top-10 w-full h-[calc(100%-40px)] overflow-hidden pointer-events-none">
          <video
            ref={bgVideoRef}
            src={activeVideo.src}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center opacity-40 scale-[1.01] transition-all duration-700 ease-out group-hover/reel:opacity-60 group-hover/reel:scale-105"
          />

          {/* Clean Vignette & Minimal Dark Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0f] via-transparent to-[#0d0d0f]/60" />
          <div className="absolute inset-0 bg-black/35" />
        </div>

        {/* =========================================================
            3. MINIMAL CORNER METADATA
        ========================================================= */}
        {/* Top-Right: Clean ZZ glyphs */}
        <div className="absolute top-14 right-5 sm:right-6 pointer-events-none z-10 flex items-center gap-1 text-[var(--volt)]">
          <svg className="w-3.5 h-4.5" viewBox="0 0 34 44" fill="none">
            <polyline
              points="4,5 30,5 14,22 22,22 5,39 30,39"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
          </svg>
          <svg className="w-3.5 h-4.5 -ml-1 text-[var(--volt)]" viewBox="0 0 34 44" fill="none">
            <polyline
              points="4,5 30,5 14,22 22,22 5,39 30,39"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
          </svg>
        </div>

        {/* Bottom Bar: Clean REC & Running Timecode */}
        <div className="absolute bottom-4 inset-x-5 sm:inset-x-6 pointer-events-none z-10 flex items-center justify-between text-[11px] font-mono tracking-widest text-white/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--volt)] animate-pulse" />
            <span className="text-white/60 font-semibold tracking-widest text-[10px]">REC</span>
          </div>

          <div className="font-mono text-white/50 tracking-wider">
            {timecode}
          </div>
        </div>

        {/* =========================================================
            4. CENTERPIECE: MINIMAL, CONFIDENT, PREMIUM TYPOGRAPHY
        ========================================================= */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 text-center">
          {/* FRZZY Wordmark */}
          <div className="flex items-center justify-center select-none mb-3 transition-transform duration-500 ease-out group-hover/reel:scale-[1.03]">
            <span
              className="wm font-extrabold tracking-tight text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.8)]"
              style={{ fontSize: 'clamp(52px, 8.5vw, 110px)' }}
            >
              <span>FR</span>
              <svg className="z" style={{ color: '#ffffff' }}>
                <use href="#z" />
              </svg>
              <svg className="z z2" style={{ color: 'var(--volt)' }}>
                <use href="#z" />
              </svg>
              <span>Y</span>
            </span>
          </div>

          {/* Understated Minimal Subtitle */}
          <p className="text-[12px] sm:text-[13px] font-mono tracking-[0.22em] uppercase text-white/60 mb-6 transition-colors duration-300 group-hover/reel:text-white/80">
            Showreel 2026
          </p>

          {/* Sleek, Minimal Glass Play Pill */}
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] hover:border-[var(--volt)]/60 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover/reel:scale-105">
            <div className="w-5 h-5 rounded-full bg-[var(--volt)] flex items-center justify-center text-black">
              <Play className="w-2.5 h-2.5 fill-black translate-x-0.5" />
            </div>
            <span className="text-[12px] font-sans font-semibold tracking-wider uppercase text-white/90">
              Watch Reel
            </span>
            <span className="text-[10px] font-mono text-white/40 ml-0.5">
              1:45
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          5. CLEAN MINIMAL FULLSCREEN CINEMA MODAL
      ========================================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-4xl flex flex-col bg-[#0d0d0f] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="h-11 px-4 flex items-center justify-between border-b border-white/[0.06] bg-black/50 select-none">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <span className="text-xs font-mono text-white/50 ml-2">
                  FRZZY // Showreel 2026
                </span>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <video
                ref={modalVideoRef}
                src={activeVideo.src}
                autoPlay
                playsInline
                muted={modalMuted}
                onTimeUpdate={handleTimeUpdate}
                onClick={toggleModalPlay}
                className="w-full h-full object-contain cursor-pointer"
              />

              {!isPlayingModal && (
                <button
                  type="button"
                  onClick={toggleModalPlay}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[var(--volt)] flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                >
                  <Play className="w-7 h-7 fill-[var(--volt)] translate-x-0.5" />
                </button>
              )}
            </div>

            {/* Clean Modal Controls */}
            <div className="p-4 bg-[#0d0d0f] border-t border-white/[0.06] flex flex-col gap-2.5">
              {/* Scrub line */}
              <div
                className="relative w-full h-1 bg-white/10 hover:h-1.5 rounded-full cursor-pointer transition-all overflow-hidden"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  if (modalVideoRef.current && modalVideoRef.current.duration) {
                    modalVideoRef.current.currentTime = ratio * modalVideoRef.current.duration;
                  }
                }}
              >
                <div
                  className="h-full bg-[var(--volt)] rounded-full transition-all"
                  style={{ width: `${modalProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-white/60">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleModalPlay}
                    className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
                  >
                    {isPlayingModal ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (modalVideoRef.current) {
                        const next = !modalVideoRef.current.muted;
                        modalVideoRef.current.muted = next;
                        setModalMuted(next);
                      }
                    }}
                    className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
                  >
                    {modalMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[var(--volt)]" />}
                  </button>

                  <span className="text-[11px] text-white/40">
                    {modalCurrentTime} / {modalDuration}
                  </span>
                </div>

                <div className="text-[10px] text-white/30 uppercase tracking-widest">
                  4K • 60 FPS
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
