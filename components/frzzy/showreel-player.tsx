'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, X } from 'lucide-react';

/**
 * Home page showreel: the reel loops edge to edge behind the FRZZY wordmark; clicking it (or
 * Enter / Space on it) opens the reel in a full-screen player.
 *
 * - The full-screen player is a native <dialog> opened with showModal(). That puts it in the
 *   browser's top layer, so the tilting .reel-frame around this component (a CSS transform with
 *   overflow: hidden) can't trap or clip it. The page behind is inert, Esc closes it, and focus
 *   goes back to the reel afterwards.
 * - The screen is always dark, so accents use --image-accent (the palette accent on dark
 *   palettes, white on light ones; see lib/palette.ts) instead of --volt.
 * - The background loop keeps playing whenever the reel can be seen; it pauses while the reel is
 *   off-screen or the tab is hidden, while the full-screen player is open, and for visitors who
 *   prefer reduced motion.
 * - The length on the "Watch reel" button is read from the video file.
 */

const REEL_VIDEOS = [
  { id: 'work-1', title: 'Grid Runner — Selected Works', src: '/assets/videos/works/work-1.mp4' },
  { id: 'card-1', title: 'Studio Direction Reel', src: '/assets/videos/card-1.mp4' },
  { id: 'work-2', title: 'Chrome Static & 3D Lighting', src: '/assets/videos/works/work-2.mp4' },
];

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
/** Seconds → "01:45" */
const mmss = (s: number) => (Number.isFinite(s) ? `${pad(s / 60)}:${pad(s % 60)}` : '00:00');

export function ShowreelPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const lengthRef = useRef<HTMLSpanElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const modalBoxRef = useRef<HTMLDivElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlayingModal, setIsPlayingModal] = useState(false);
  const [modalMuted, setModalMuted] = useState(false);
  const [modalProgress, setModalProgress] = useState(0);
  const [modalCurrentTime, setModalCurrentTime] = useState('00:00');
  const [modalDuration, setModalDuration] = useState('00:00');
  const [activeVideoIdx] = useState(0);

  const activeVideo = REEL_VIDEOS[activeVideoIdx];

  // Background loop: plays continuously whenever the reel is on screen (and starts again when
  // the tab comes back), pauses otherwise.
  useEffect(() => {
    const screen = containerRef.current;
    const vid = bgVideoRef.current;
    if (!screen || !vid) return;
    vid.muted = true; // React leaves `muted` out of the server HTML, and autoplay needs it
    vid.loop = true;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let onScreen = false;

    const sync = () => {
      if (onScreen && !document.hidden && !still && !isModalOpen) vid.play().catch(() => {});
      else vid.pause();
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(screen);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [isModalOpen]);

  // The button shows the reel's real length, read from the file once it has loaded.
  useEffect(() => {
    const bg = bgVideoRef.current;
    const label = lengthRef.current;
    if (!bg || !label) return;
    const show = () => {
      if (!Number.isFinite(bg.duration)) return;
      label.textContent = `${Math.floor(bg.duration / 60)}:${pad(bg.duration % 60)}`;
      label.hidden = false;
    };
    show();
    bg.addEventListener('loadedmetadata', show);
    return () => bg.removeEventListener('loadedmetadata', show);
  }, []);

  // Open: show the dialog in the top layer, put focus in it (so Space plays/pauses straight
  // away) and stop the page behind from scrolling.
  useEffect(() => {
    if (!isModalOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    modalBoxRef.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    root.setAttribute('data-reel-open', '');
    return () => root.removeAttribute('data-reel-open');
  }, [isModalOpen]);

  const openModal = useCallback(() => {
    setModalDuration(mmss(bgVideoRef.current?.duration ?? NaN));
    setModalProgress(0);
    setModalCurrentTime('00:00');
    setIsModalOpen(true);
  }, []);

  // Every way of closing (Esc, the X, a click outside the player) goes through the dialog's own
  // close(), which hands focus back to the reel; onClose then removes the dialog.
  const closeModal = useCallback(() => dialogRef.current?.close(), []);
  const onDialogClose = () => {
    setIsModalOpen(false);
    setIsPlayingModal(false);
  };

  const handleTimeUpdate = () => {
    const vid = modalVideoRef.current;
    if (!vid || !vid.duration) return;
    setModalProgress((vid.currentTime / vid.duration) * 100);
    setModalCurrentTime(mmss(vid.currentTime));
    setModalDuration(mmss(vid.duration));
  };

  // The play/pause icon follows the video's own play and pause events, so it stays right when
  // the reel ends or the browser blocks autoplay.
  const toggleModalPlay = () => {
    const vid = modalVideoRef.current;
    if (!vid) return;
    if (vid.paused) vid.play().catch(() => {});
    else vid.pause();
  };

  const onDialogKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== ' ') return;
    if ((e.target as HTMLElement).closest('button')) return; // a focused button handles Space itself
    e.preventDefault();
    toggleModalPlay();
  };

  return (
    <>
      <div
        ref={containerRef}
        onClick={openModal}
        role="button"
        tabIndex={0}
        aria-label="Play FRZZY Studio Showreel 2026"
        aria-haspopup="dialog"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal();
          }
        }}
        className="group/reel relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none cursor-pointer border-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--image-accent)]"
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
            aria-hidden="true"
            className="w-full h-full object-cover object-center opacity-75 group-hover/reel:opacity-90 scale-[1.01] group-hover/reel:scale-105 transition-all duration-700 ease-out"
          />

          {/* Clean Subtle Radial Vignette for Typography Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)] pointer-events-none" />
        </div>

        {/* =========================================================
            CENTERPIECE: PURE MINIMAL LUXURY TYPOGRAPHY & PLAY TRIGGER
            (smaller on phones so it fits the smaller frame)
        ========================================================= */}
        <div className="relative z-20 flex flex-col items-center justify-center p-3 sm:p-6 text-center">
          {/* FRZZY Wordmark */}
          <div className="flex items-center justify-center select-none mb-1.5 sm:mb-3 transition-transform duration-500 ease-out group-hover/reel:scale-[1.03]">
            <span
              className="wm font-extrabold tracking-tight text-white drop-shadow-[0_12px_40px_rgba(0,0,0,0.95)]"
              style={{ fontSize: 'clamp(40px, 9vw, 120px)' }}
            >
              <span>FR</span>
              <svg className="z" style={{ color: '#ffffff' }}>
                <use href="#z" />
              </svg>
              <svg
                className="z z2"
                style={{
                  color: 'var(--image-accent)',
                  filter: 'drop-shadow(0 0 24px color-mix(in srgb, var(--image-accent) 75%, transparent))',
                }}
              >
                <use href="#z" />
              </svg>
              <span>Y</span>
            </span>
          </div>

          {/* Clean Understated Subtitle */}
          <p className="text-[11px] sm:text-[13px] font-mono tracking-[0.2em] sm:tracking-[0.25em] uppercase text-white/70 mb-3 sm:mb-6 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] transition-colors duration-300 group-hover/reel:text-white">
            Showreel 2026
          </p>

          {/* Minimalist Tactile Glass Play Button */}
          <div className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-black/50 hover:bg-black/75 border border-white/20 hover:border-[var(--image-accent)]/80 backdrop-blur-xl shadow-[0_16px_36px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover/reel:scale-105">
            <div
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[var(--image-accent)] flex items-center justify-center text-black"
              style={{ boxShadow: '0 0 14px color-mix(in srgb, var(--image-accent) 60%, transparent)' }}
            >
              <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-black translate-x-px sm:translate-x-0.5" />
            </div>
            <span className="text-[11px] sm:text-[12px] font-sans font-semibold tracking-wider uppercase text-white">
              Watch Reel
            </span>
            <span ref={lengthRef} hidden className="text-[10px] font-mono text-white/50 ml-0.5 tabular-nums" />
          </div>
        </div>
      </div>

      {/* =========================================================
          FULLSCREEN CINEMA LIGHTBOX MODAL (a native dialog, see the note at the top)
      ========================================================= */}
      {isModalOpen && (
        <dialog
          ref={dialogRef}
          aria-label="FRZZY Showreel 2026"
          onClose={onDialogClose}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal(); // the dark area around the player
          }}
          onKeyDown={onDialogKeyDown}
          className="m-0 w-full h-full max-w-none max-h-none border-0 p-4 sm:p-8 bg-black/95 backdrop-blur-2xl backdrop:bg-transparent open:flex items-center justify-center overflow-y-auto overscroll-contain"
        >
          <div
            ref={modalBoxRef}
            tabIndex={-1}
            className="relative w-full max-w-[min(56rem,calc((100dvh_-_10rem)*16/9))] flex flex-col bg-[#0d0d0f] rounded-[var(--r,0px)] border border-white/[0.08] overflow-hidden shadow-2xl outline-none"
          >
            {/* Modal Top Bar */}
            <div className="h-11 px-4 flex items-center justify-between border-b border-white/[0.06] bg-black/50 select-none">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <span className="text-xs font-mono text-white/50 ml-2">FRZZY // Showreel 2026</span>
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

            {/* Video Player (the video is pinned inside the 16:9 box: a portrait clip would
                otherwise stretch the box to its own height and push the controls off screen) */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <video
                ref={modalVideoRef}
                src={activeVideo.src}
                autoPlay
                playsInline
                muted={modalMuted}
                onPlay={() => setIsPlayingModal(true)}
                onPause={() => setIsPlayingModal(false)}
                onLoadedMetadata={(e) => setModalDuration(mmss(e.currentTarget.duration))}
                onTimeUpdate={handleTimeUpdate}
                onClick={toggleModalPlay}
                className="absolute inset-0 w-full h-full object-contain cursor-pointer"
              />

              {!isPlayingModal && (
                <button
                  type="button"
                  onClick={toggleModalPlay}
                  aria-label="Play"
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[var(--image-accent)] flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                >
                  <Play className="w-7 h-7 fill-[var(--image-accent)] translate-x-0.5" />
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
                <div className="h-full bg-[var(--image-accent)] rounded-full transition-all" style={{ width: `${modalProgress}%` }} />
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-white/60">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleModalPlay}
                    aria-label={isPlayingModal ? 'Pause' : 'Play'}
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
                    aria-label={modalMuted ? 'Unmute' : 'Mute'}
                    className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
                  >
                    {modalMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[var(--image-accent)]" />}
                  </button>

                  <span className="text-[11px] text-white/40 tabular-nums">
                    {modalCurrentTime} / {modalDuration}
                  </span>
                </div>

                <div className="text-[10px] text-white/30 uppercase tracking-widest">4K • 60 FPS</div>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
