'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useInView } from 'motion/react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  ArrowUpRight,
  Plus,
  Minus,
} from 'lucide-react';
import {
  FAQ_ITEMS,
  LanguageCode,
  ThemeMode,
  formatVideoTimecode,
  splitCharacters,
  toggleFaqItem,
} from '@/lib/hero-config';

interface FaqSectionProps {
  theme: ThemeMode;
  language: LanguageCode;
  onBookProject?: () => void;
}

export function FaqSection({ language, onBookProject }: FaqSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isHeaderInView = useInView(headerRef, {
    once: false,
    amount: 0.08,
    margin: '0px 0px -16px 0px',
  });
  const isSectionInView = useInView(sectionRef, {
    once: false,
    amount: 0.06,
    margin: '0px 0px -24px 0px',
  });
  const isRightInView = useInView(rightColRef, {
    once: false,
    amount: 0.08,
    margin: '0px 0px -24px 0px',
  });

  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id);
  const [isHeadingHovered, setIsHeadingHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(24);

  const isNl = language === 'NL';

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isSectionInView && isPlaying) {
      const p = vid.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    } else if (!isSectionInView) {
      vid.pause();
    }
  }, [isSectionInView, isPlaying]);

  const handleTogglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  }, []);

  const handleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const line1Text = isNl ? 'Antwoorden op' : 'Answers to';
  const line2Text = isNl ? 'veelgestelde vragen.' : 'common questions.';
  const line1Chars = splitCharacters(line1Text);
  const line2Chars = splitCharacters(line2Text);

  const progressPct =
    duration > 0 ? Math.min(100, Math.max(4, (currentTime / duration) * 100)) : 8;

  return (
    <section
      id="insights"
      ref={sectionRef}
      data-testid="faq-section"
      aria-labelledby="faq-heading"
      className="relative w-full bg-[#ecf5f4] dark:bg-[#12110b] text-[#090a0a] dark:text-[#f4efea] px-4 sm:px-6 lg:px-[36px] py-20 sm:py-24 lg:py-[104px] transition-colors duration-500 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-[1392px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-12 lg:gap-14">
          {/* Left Column: Eyebrow + Display Heading + Subtitle + 6 FAQ Accordion Cards */}
          <div className="lg:col-span-6 flex flex-col">
            <div ref={headerRef}>
              {/* Eyebrow Row: Line + FAQ */}
              <motion.div
                initial={{ opacity: 0, x: -14 }}
                animate={
                  isHeaderInView
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: -14 }
                }
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-4"
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-[1.5px] w-11 bg-[#090a0a]/28 dark:bg-[#f4efea]/28"
                />
                <span className="text-[12.5px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-[#090a0a]/70 dark:text-[#f4efea]/70">
                  FAQ
                </span>
              </motion.div>

              {/* Main 2-Line Display Heading Matching Website Hero Font & Character Roll */}
              <h2
                id="faq-heading"
                aria-label={`${line1Text} ${line2Text}`}
                onMouseEnter={() => setIsHeadingHovered(true)}
                onMouseLeave={() => setIsHeadingHovered(false)}
                style={{
                  fontFamily:
                    'var(--font-hero), "Helvetica Neue", Arial, sans-serif',
                }}
                className="mt-5 sm:mt-6 text-[40px] sm:text-[52px] lg:text-[62px] font-medium leading-[1.03] tracking-[-0.043em] text-[#090a0a] dark:text-[#f4efea] flex flex-col items-start select-none cursor-default"
              >
                <span className="sr-only">{`${line1Text} ${line2Text}`}</span>

                {/* Line 1: "Answers to" */}
                <span aria-hidden="true" className="inline-flex flex-wrap">
                  {line1Chars.map((ch, idx) => (
                    <motion.span
                      key={`faq-l1-${idx}`}
                      initial={{ y: '112%', rotate: 2, opacity: 0 }}
                      animate={
                        isHeaderInView
                          ? { y: '0%', rotate: 0, opacity: 1 }
                          : { y: '112%', rotate: 2, opacity: 0 }
                      }
                      transition={{
                        duration: 0.66,
                        delay: 0.02 + idx * 0.018,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="relative inline-block overflow-hidden leading-[1.12] pt-[0.1em] -mt-[0.1em] pb-[0.24em] -mb-[0.24em] will-change-transform"
                    >
                      <span
                        className="inline-block will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{
                          transitionDelay: `${idx * 14}ms`,
                          transform: isHeadingHovered
                            ? 'translateY(-142%)'
                            : 'translateY(0%)',
                        }}
                      >
                        {ch === ' ' ? '\u00A0' : ch}
                      </span>
                      <span
                        className="absolute left-0 top-0 inline-block pt-[0.1em] pb-[0.24em] text-[#090a0a] dark:text-[#f4efea] will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{
                          transitionDelay: `${idx * 14}ms`,
                          transform: isHeadingHovered
                            ? 'translateY(0%)'
                            : 'translateY(142%)',
                        }}
                      >
                        {ch === ' ' ? '\u00A0' : ch}
                      </span>
                    </motion.span>
                  ))}
                </span>

                {/* Line 2: "common questions." */}
                <span aria-hidden="true" className="inline-flex flex-wrap">
                  {line2Chars.map((ch, idx) => (
                    <motion.span
                      key={`faq-l2-${idx}`}
                      initial={{ y: '112%', rotate: 2, opacity: 0 }}
                      animate={
                        isHeaderInView
                          ? { y: '0%', rotate: 0, opacity: 1 }
                          : { y: '112%', rotate: 2, opacity: 0 }
                      }
                      transition={{
                        duration: 0.66,
                        delay: 0.08 + idx * 0.016,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="relative inline-block overflow-hidden leading-[1.12] pt-[0.1em] -mt-[0.1em] pb-[0.24em] -mb-[0.24em] will-change-transform"
                    >
                      <span
                        className="inline-block will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{
                          transitionDelay: `${idx * 14}ms`,
                          transform: isHeadingHovered
                            ? 'translateY(-142%)'
                            : 'translateY(0%)',
                        }}
                      >
                        {ch === ' ' ? '\u00A0' : ch}
                      </span>
                      <span
                        className="absolute left-0 top-0 inline-block pt-[0.1em] pb-[0.24em] text-[#ff4f31] will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{
                          transitionDelay: `${idx * 14}ms`,
                          transform: isHeadingHovered
                            ? 'translateY(0%)'
                            : 'translateY(142%)',
                        }}
                      >
                        {ch === ' ' ? '\u00A0' : ch}
                      </span>
                    </motion.span>
                  ))}
                </span>
              </h2>

              {/* Subtitle */}
              <div className="mt-4 overflow-hidden">
                <motion.p
                  initial={{ y: '108%', rotate: 1.4, opacity: 0 }}
                  animate={
                    isHeaderInView
                      ? { y: '0%', rotate: 0, opacity: 1 }
                      : { y: '108%', rotate: 1.4, opacity: 0 }
                  }
                  transition={{
                    duration: 0.62,
                    delay: 0.14,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="text-[15.5px] sm:text-[17px] leading-[1.5] text-[#5a6265] dark:text-[#9e9b91] origin-bottom-left will-change-transform"
                >
                  {isNl
                    ? 'Alles wat je moet weten voordat we samen creëren.'
                    : 'Everything you need to know before we create together.'}
                </motion.p>
              </div>
            </div>

            {/* 6 Accordion Cards */}
            <div className="mt-8 sm:mt-10 flex flex-col gap-3">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openId === item.id;
                const question = isNl ? item.questionNl : item.questionEn;
                const answer = isNl ? item.answerNl : item.answerEn;

                return (
                  <motion.div
                    key={item.id}
                    data-testid={item.id}
                    data-open={isOpen ? 'true' : 'false'}
                    initial={{ y: 24, scale: 0.97, opacity: 0 }}
                    animate={
                      isSectionInView
                        ? { y: 0, scale: 1, opacity: 1 }
                        : { y: 24, scale: 0.97, opacity: 0 }
                    }
                    transition={{
                      duration: 0.58,
                      delay: 0.04 + idx * 0.045,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`rounded-[18px] sm:rounded-[20px] border transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
                      isOpen
                        ? 'bg-white/95 dark:bg-[#201f18] border-black/[0.08] dark:border-white/[0.12] shadow-[0_18px_40px_-20px_rgba(18,17,11,0.10)]'
                        : 'bg-white/68 hover:bg-white/90 dark:bg-[#181712] dark:hover:bg-[#1e1d16] border-black/[0.05] dark:border-white/[0.07]'
                    }`}
                  >
                    <button
                      type="button"
                      data-testid={`${item.id}-trigger`}
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenId((prev) => toggleFaqItem(prev, item.id))
                      }
                      className="w-full px-5 py-4 sm:px-6 sm:py-[18px] flex items-center justify-between gap-4 text-left cursor-pointer group"
                    >
                      <span className="text-[15px] sm:text-[16.5px] font-semibold tracking-[-0.015em] text-[#090a0a] dark:text-[#f4efea] leading-[1.35]">
                        <span className="mr-2 text-[#ff4f31] font-semibold tabular-nums">
                          {item.number}.
                        </span>
                        {question}
                      </span>

                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ecf5f4] dark:bg-white/10 text-[#090a0a] dark:text-[#f4efea] group-hover:bg-[#ff4f31] group-hover:text-white transition-colors duration-300"
                      >
                        {isOpen ? (
                          <Minus className="h-3.5 w-3.5 stroke-[2.2]" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 stroke-[2.2]" />
                        )}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key={`${item.id}-content`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            duration: 0.38,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0.5 pr-10">
                            <p className="text-[14px] sm:text-[15px] leading-[1.58] text-[#5a6265] dark:text-[#a09d93]">
                              {answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Showreel Video Card + "Book a Project" Full-Width Pill Button */}
          <div
            ref={rightColRef}
            className="lg:col-span-6 lg:mt-[46px] flex flex-col gap-4"
          >
            {/* Rounded Video Showcase Card */}
            <motion.div
              ref={videoContainerRef}
              initial={{ y: 32, scale: 0.95, opacity: 0 }}
              animate={
                isRightInView
                  ? { y: 0, scale: 1, opacity: 1 }
                  : { y: 32, scale: 0.95, opacity: 0 }
              }
              transition={{
                duration: 0.68,
                delay: 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={handleTogglePlay}
              data-testid="faq-video-card"
              className="group relative w-full aspect-[4/3] sm:aspect-[16/12.5] overflow-hidden rounded-[24px] sm:rounded-[28px] bg-[#141416] shadow-[0_28px_64px_-24px_rgba(18,17,11,0.22)] cursor-pointer select-none will-change-transform"
            >
              {/* Poster Image Fallback */}
              <Image
                src="/assets/cards/card-3.png"
                alt="FRXCX Studio Showreel"
                fill
                sizes="(max-width: 1024px) 100vw, 680px"
                referrerPolicy="no-referrer"
                draggable={false}
                className="object-cover opacity-90"
              />

              {/* Auto-Playing Showreel Video */}
              <video
                ref={videoRef}
                src="/assets/videos/card-3.mp4"
                poster="/assets/cards/card-3.png"
                autoPlay
                loop
                muted={isMuted}
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  if (Number.isFinite(dur) && dur > 0) {
                    setDuration(Math.max(24, Math.round(dur)));
                  }
                }}
                onTimeUpdate={(e) => {
                  setCurrentTime(e.currentTarget.currentTime);
                }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]"
              />

              {/* Subtle Top & Bottom Cinematic Vignette */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/15"
              />

              {/* Center Frosted Glass Circular Play/Pause Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePlay();
                  }}
                  aria-label={isPlaying ? 'Pause studio reel' : 'Play studio reel'}
                  className="flex h-16 w-16 sm:h-[72px] sm:w-[72px] items-center justify-center rounded-full bg-white/25 backdrop-blur-md border border-white/45 text-white shadow-lg transition-all duration-300 group-hover:scale-105 hover:bg-white/35 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 fill-white text-white" />
                  ) : (
                    <Play className="h-6 w-6 translate-x-0.5 fill-white text-white" />
                  )}
                </button>
              </div>

              {/* Bottom Player Controls Overlay (Timecode + Volume + Fullscreen + Progress Bar) */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between text-white">
                  <span className="text-[13px] sm:text-[14px] font-medium tracking-[0.02em] tabular-nums drop-shadow-xs">
                    {formatVideoTimecode(currentTime)} /{' '}
                    {formatVideoTimecode(duration)}
                  </span>

                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      className="text-white/90 hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted ? (
                        <VolumeX className="h-[18px] w-[18px]" />
                      ) : (
                        <Volume2 className="h-[18px] w-[18px]" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleFullscreen}
                      aria-label="Toggle fullscreen video"
                      className="text-white/90 hover:text-white transition-colors cursor-pointer"
                    >
                      <Maximize2 className="h-[17px] w-[17px]" />
                    </button>
                  </div>
                </div>

                {/* Progress Scrubber Track */}
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/30">
                  <div
                    style={{ width: `${progressPct}%` }}
                    className="h-full rounded-full bg-white transition-all duration-200"
                  />
                </div>
              </div>
            </motion.div>

            {/* Full-Width "Book a Project" Pill CTA Button */}
            <motion.button
              type="button"
              data-testid="faq-book-project-btn"
              onClick={onBookProject}
              initial={{ y: 22, scale: 0.96, opacity: 0 }}
              animate={
                isRightInView
                  ? { y: 0, scale: 1, opacity: 1 }
                  : { y: 22, scale: 0.96, opacity: 0 }
              }
              transition={{
                duration: 0.62,
                delay: 0.14,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group relative flex h-[62px] sm:h-[68px] w-full items-center justify-between rounded-full bg-[#141416] dark:bg-[#f4efea] text-[#f4efea] dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white px-7 sm:px-8 shadow-[0_20px_44px_-16px_rgba(18,17,11,0.25)] transition-colors duration-400 cursor-pointer will-change-transform"
            >
              <span className="relative block h-[24px] overflow-hidden text-[16.5px] sm:text-[18px] font-medium tracking-[-0.015em] leading-[24px]">
                <span className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full">
                  {isNl ? 'Boek een Project' : 'Book a Project'}
                </span>
                <span
                  aria-hidden="true"
                  className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full"
                >
                  {isNl ? 'Boek een Project' : 'Book a Project'}
                </span>
              </span>

              <ArrowUpRight className="h-5 w-5 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
