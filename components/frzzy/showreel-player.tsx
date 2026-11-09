'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X } from 'lucide-react';

/**
 * Home page showreel: a dark "screen" playing the reel muted behind the FRZZY wordmark.
 * Clicking it (or Enter / Space on it) opens the reel in a full-screen player.
 *
 * - The full-screen player is a native <dialog> opened with showModal(). That puts it in the
 *   browser's top layer, so the tilting .reel-frame around this component (a CSS transform with
 *   overflow: hidden) can't trap or clip it. The page behind is inert, Esc closes it, and focus
 *   goes back to the reel afterwards.
 * - The screen is always dark, so accents use --image-accent (the palette accent on dark
 *   palettes, white on light ones; see lib/palette.ts) instead of --volt.
 * - The running timecode is written straight into the page (no re-render every frame) and, like
 *   the background video, stops while the reel is off-screen or the visitor prefers reduced motion.
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
  const timecodeRef = useRef<HTMLSpanElement>(null);
  const lengthRef = useRef<HTMLSpanElement>(null);
  const timecodeStart = useRef<number | null>(null);
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

  // Background video + timecode: they run only while the reel is on screen, motion is allowed
  // and the full-screen player is closed.
  useEffect(() => {
    const screen = containerRef.current;
    const bg = bgVideoRef.current;
    if (!screen || !bg) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = (timecodeStart.current ??= performance.now());
    let visible = false;
    let raf = 0;
    let shownFrame = -1;

    const tick = (now: number) => {
      const t = (now - start) / 1000 + 69.4;
      const frame = Math.floor(t * 25); // 25 fps timecode: only touch the page when it changes
      const text = timecodeRef.current?.firstChild; // edit the text in place (no new nodes)
      if (frame !== shownFrame && text) {
        shownFrame = frame;
        text.nodeValue = `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)}:${pad(frame % 25)}`;
      }
      raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      if (visible && !still && !isModalOpen) {
        raf = requestAnimationFrame(tick);
        bg.play().catch(() => {});
      } else {
        bg.pause();
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(screen);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
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
        className="group/reel relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#0d0d0f] select-none cursor-pointer transition-transform duration-500 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--image-accent)]"
      >
        {/* =========================================================
            1. MINIMAL MAC OS GLASS TITLEBAR (Clean & Refined)
        ========================================================= */}
        <div className="relative z-30 h-8 sm:h-10 w-full px-3 sm:px-4 flex items-center justify-between border-b border-white/[0.06] bg-black/40 backdrop-blur-md">
          {/* Subtle Window Dots */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#ff5f56]/90" />
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#ffbd2e]/90" />
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#27c93f]/90" />
          </div>

          {/* Simple Studio Status */}
          <div className="text-[10px] sm:text-[11px] font-mono text-white/40 tracking-wider">FRZZY // REEL 2026</div>

          {/* Quick Expand Icon (the whole screen is the button) */}
          <div className="flex items-center text-white/30 group-hover/reel:text-white/70 transition-colors">
            <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
          </div>
        </div>

        {/* =========================================================
            2. VIDEO LAYER (Dark, Subtle, Cinematic)
        ========================================================= */}
        <div className="absolute inset-x-0 bottom-0 top-8 sm:top-10 overflow-hidden pointer-events-none">
          <video
            ref={bgVideoRef}
            src={activeVideo.src}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
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
        <div className="absolute top-11 right-3 sm:top-14 sm:right-6 pointer-events-none z-10 flex items-center gap-1 text-[var(--image-accent)]">
          <svg className="w-3 h-4 sm:w-3.5 sm:h-4.5" viewBox="0 0 34 44" fill="none" aria-hidden="true">
            <polyline points="4,5 30,5 14,22 22,22 5,39 30,39" stroke="currentColor" strokeWidth="6" strokeLinejoin="miter" strokeLinecap="square" />
          </svg>
          <svg className="w-3 h-4 sm:w-3.5 sm:h-4.5 -ml-1" viewBox="0 0 34 44" fill="none" aria-hidden="true">
            <polyline points="4,5 30,5 14,22 22,22 5,39 30,39" stroke="currentColor" strokeWidth="6" strokeLinejoin="miter" strokeLinecap="square" />
          </svg>
        </div>

        {/* Bottom Bar: Clean REC & Running Timecode */}
        <div className="absolute bottom-2.5 sm:bottom-4 inset-x-3 sm:inset-x-6 pointer-events-none z-10 flex items-center justify-between text-[10px] sm:text-[11px] font-mono tracking-widest text-white/40">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--image-accent)] motion-safe:animate-pulse" />
            <span className="text-white/60 font-semibold tracking-widest text-[9px] sm:text-[10px]">REC</span>
          </div>

          <span ref={timecodeRef} className="font-mono text-white/50 tracking-wider tabular-nums">
            00:01:09:10
          </span>
        </div>

        {/* =========================================================
            4. CENTERPIECE: MINIMAL, CONFIDENT, PREMIUM TYPOGRAPHY
            (bottom padding on phones keeps it clear of the REC / timecode bar)
        ========================================================= */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-3 pt-2 pb-8 sm:p-6 text-center">
          {/* FRZZY Wordmark */}
          <div className="flex items-center justify-center select-none mb-1.5 sm:mb-3 transition-transform duration-500 ease-out group-hover/reel:scale-[1.03]">
            <span
              className="wm font-extrabold tracking-tight text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.8)]"
              style={{ fontSize: 'clamp(30px, 8.5vw, 110px)' }}
            >
              <span>FR</span>
              <svg className="z" style={{ color: '#ffffff' }}>
                <use href="#z" />
              </svg>
              <svg className="z z2" style={{ color: 'var(--image-accent)' }}>
                <use href="#z" />
              </svg>
              <span>Y</span>
            </span>
          </div>

          {/* Understated Minimal Subtitle */}
          <p className="text-[11px] sm:text-[13px] font-mono tracking-[0.18em] sm:tracking-[0.22em] uppercase text-white/60 mb-3 sm:mb-6 transition-colors duration-300 group-hover/reel:text-white/80">
            Showreel 2026
          </p>

          {/* Sleek, Minimal Glass Play Pill */}
          <div className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] hover:border-[var(--image-accent)]/60 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover/reel:scale-105">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[var(--image-accent)] flex items-center justify-center text-black">
              <Play className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-black translate-x-px sm:translate-x-0.5" />
            </div>
            <span className="text-[11px] sm:text-[12px] font-sans font-semibold tracking-wider uppercase text-white/90">
              Watch Reel
            </span>
            <span ref={lengthRef} hidden className="text-[10px] font-mono text-white/40 ml-0.5 tabular-nums" />
          </div>
        </div>
      </div>

      {/* =========================================================
          5. CLEAN MINIMAL FULLSCREEN CINEMA MODAL (a native dialog, see the note at the top)
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
