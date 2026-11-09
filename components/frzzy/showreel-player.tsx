'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, X } from 'lucide-react';

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
  const [activeVideoIdx] = useState(0);

  const activeVideo = REEL_VIDEOS[activeVideoIdx];

  // Ensure background video plays continuously in loop
  useEffect(() => {
    const vid = bgVideoRef.current;
    if (!vid) return;

    vid.muted = true;
    vid.loop = true;

    const startPlay = () => {
      vid.play().catch(() => {});
    };

    startPlay();

    // Re-trigger play on visibility change so it never stops
    const handleVis = () => {
      if (!document.hidden && vid.paused && !isModalOpen) {
        startPlay();
      }
    };

    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [isModalOpen]);

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
        className="group/reel relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none cursor-pointer border-0 outline-none"
      >
        {/* =========================================================
            CONTINUOUS LOOPING STUDIO VIDEO (Full Card, Edge-to-Edge)
        ========================================================= */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <video
            ref={bgVideoRef}
            src={activeVideo.src}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center opacity-75 group-hover/reel:opacity-90 scale-[1.01] group-hover/reel:scale-105 transition-all duration-700 ease-out"
          />

          {/* Clean Subtle Radial Vignette for Typography Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)] pointer-events-none" />
        </div>

        {/* =========================================================
            CENTERPIECE: PURE MINIMAL LUXURY TYPOGRAPHY & PLAY TRIGGER
        ========================================================= */}
        <div className="relative z-20 flex flex-col items-center justify-center p-6 text-center">
          {/* FRZZY Wordmark */}
          <div className="flex items-center justify-center select-none mb-3 transition-transform duration-500 ease-out group-hover/reel:scale-[1.03]">
            <span
              className="wm font-extrabold tracking-tight text-white drop-shadow-[0_12px_40px_rgba(0,0,0,0.95)]"
              style={{ fontSize: 'clamp(56px, 9vw, 120px)' }}
            >
              <span>FR</span>
              <svg className="z" style={{ color: '#ffffff' }}>
                <use href="#z" />
              </svg>
              <svg
                className="z z2"
                style={{
                  color: 'var(--volt)',
                  filter: 'drop-shadow(0 0 24px rgba(var(--volt-rgb), 0.75))',
                }}
              >
                <use href="#z" />
              </svg>
              <span>Y</span>
            </span>
          </div>

          {/* Clean Understated Subtitle */}
          <p className="text-[12px] sm:text-[13px] font-mono tracking-[0.25em] uppercase text-white/70 mb-6 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] transition-colors duration-300 group-hover/reel:text-white">
            Showreel 2026
          </p>

          {/* Minimalist Tactile Glass Play Button */}
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-black/50 hover:bg-black/75 border border-white/20 hover:border-[var(--volt)]/80 backdrop-blur-xl shadow-[0_16px_36px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover/reel:scale-105">
            <div className="w-6 h-6 rounded-full bg-[var(--volt)] flex items-center justify-center text-black shadow-[0_0_14px_rgba(var(--volt-rgb),0.6)]">
              <Play className="w-3 h-3 fill-black translate-x-0.5" />
            </div>
            <span className="text-[12px] font-sans font-semibold tracking-wider uppercase text-white">
              Watch Reel
            </span>
            <span className="text-[10px] font-mono text-white/50 ml-0.5">
              1:45
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          FULLSCREEN CINEMA LIGHTBOX MODAL
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
