'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'motion/react';
import {
  Carousel3DCardInstance,
  LanguageCode,
  ThemeMode,
  WORK_ITEMS,
  WorkItemConfig,
  computeResponsiveStageScale,
  format3DCardTransform,
  get3DCarouselStageCards,
  splitCharacters,
} from '@/lib/hero-config';

interface LatestWorksSectionProps {
  theme: ThemeMode;
  language: LanguageCode;
  onSelectWork?: (work: WorkItemConfig) => void;
}

interface Work3DCardButtonProps {
  card: Carousel3DCardInstance;
  distanceFactor: number;
  isSectionInView: boolean;
  onCardClick: (
    relativePos: -3 | -2 | -1 | 0 | 1 | 2 | 3,
    item: WorkItemConfig
  ) => void;
}

function Work3DCardButton({
  card,
  distanceFactor,
  isSectionInView,
  onCardClick,
}: Work3DCardButtonProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Play video ONLY when the card is in the center slot AND section is in view; pause immediately when on the sides
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (card.isCenter && isSectionInView) {
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy fallback
        });
      }
    } else {
      vid.pause();
    }
  }, [card.isCenter, isSectionInView]);

  const targetX = card.xPx * distanceFactor * (isSectionInView ? 1 : 0.88);
  const targetY = isSectionInView ? card.yPx : card.yPx + 44;
  const targetScale =
    card.scale *
    (distanceFactor < 0.85 ? 0.9 : 1) *
    (isSectionInView ? 1 : 0.9);
  const targetRotateY = isSectionInView
    ? card.rotateYDeg
    : card.rotateYDeg * 1.15;
  const targetOpacity = isSectionInView ? card.opacity : 0;

  return (
    <motion.button
      type="button"
      data-testid={card.isWing ? `works-wing-${card.relativePos}` : `works-slot-${card.slotIndex}`}
      data-playing={card.isCenter ? 'true' : 'false'}
      tabIndex={card.isWing ? -1 : 0}
      aria-hidden={card.isWing ? 'true' : undefined}
      onClick={() => {
        if (!card.isWing) {
          onCardClick(card.relativePos, card.item);
        }
      }}
      aria-label={`${card.item.title} — ${card.item.category} 9:16 video`}
      style={{
        zIndex: card.zIndex,
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
        pointerEvents: card.isWing ? 'none' : 'auto',
      }}
      transformTemplate={({ x, y, scale, rotateY }) =>
        format3DCardTransform({
          x: x ?? 0,
          y: y ?? 0,
          scale: scale ?? 1,
          rotateY: rotateY ?? 0,
        })
      }
      initial={false}
      animate={{
        x: targetX,
        y: targetY,
        scale: targetScale,
        rotateY: targetRotateY,
        opacity: targetOpacity,
      }}
      transition={{
        duration: 1.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group absolute left-1/2 top-1/2 -ml-[104px] -mt-[185px] sm:-ml-[122px] sm:-mt-[217px] lg:-ml-[138px] lg:-mt-[246px] w-[208px] h-[370px] sm:w-[244px] sm:h-[434px] lg:w-[276px] lg:h-[492px] aspect-[9/16] overflow-hidden rounded-[11px] sm:rounded-[13px] bg-[#d8c4b0] cursor-pointer select-none will-change-[transform,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4f31]"
    >
      {/* Poster Fallback Image */}
      <Image
        src={card.item.posterSrc}
        alt={card.item.title}
        fill
        sizes="(max-width: 768px) 260px, 320px"
        referrerPolicy="no-referrer"
        draggable={false}
        className="object-cover"
      />

      {/* 9:16 Vertical Client Reel Video — plays ONLY when in center slot, pauses on side slots */}
      <video
        ref={videoRef}
        src={card.item.videoSrc}
        poster={card.item.posterSrc}
        autoPlay={card.isCenter}
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </motion.button>
  );
}

export function LatestWorksSection({
  language,
  onSelectWork,
}: LatestWorksSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const isHeaderInView = useInView(headerRef, {
    once: false,
    amount: 0.05,
    margin: '0px 0px -16px 0px',
  });
  const isSectionInView = useInView(sectionRef, {
    once: false,
    amount: 0.06,
    margin: '0px 0px -24px 0px',
  });

  const [stepOffset, setStepOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [distanceFactor, setDistanceFactor] = useState(1);

  // Measure actual stage width so all 5 cards fit 100% inside the frame at any screen/iframe width
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.getBoundingClientRect().width;
      setDistanceFactor(computeResponsiveStageScale(width));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const stageCards = get3DCarouselStageCards(stepOffset, WORK_ITEMS);
  const isNl = language === 'NL';

  const handleNext = useCallback(() => {
    setStepOffset((prev) => prev + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setStepOffset((prev) => prev - 1);
  }, []);

  const handleCardClick = useCallback(
    (
      relativePos: -3 | -2 | -1 | 0 | 1 | 2 | 3,
      item: WorkItemConfig
    ) => {
      if (relativePos === 0) {
        onSelectWork?.(item);
        return;
      }
      setStepOffset((prev) => prev + relativePos);
    },
    [onSelectWork]
  );

  // Continuous ultra-smooth 3D rotation cycle (runs smoothly while visible and not hovered)
  useEffect(() => {
    if (isPaused || !isSectionInView) return;
    const timer = window.setInterval(() => {
      setStepOffset((prev) => prev + 1);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [isPaused, isSectionInView]);

  const [isTitleHovered, setIsTitleHovered] = useState(false);

  const poemLines = isNl
    ? [
        'Elk project combineert strategie,',
        'filmische regie en verfijnd design',
        'om merken te bouwen die blijvende',
        'indruk achterlaten.',
      ]
    : [
        'Every project combines strategy,',
        'cinematic direction, and refined craft',
        "to shape experiences that's as",
        'distinctive as your brand.',
      ];

  const titleWord1 = isNl ? 'Onze' : 'Our';
  const titleWord2 = isNl ? 'Werken.' : 'Works.';
  const titleWord1Chars = splitCharacters(titleWord1);
  const titleWord2Chars = splitCharacters(titleWord2);

  return (
    <section
      id="latest-works"
      ref={sectionRef}
      aria-labelledby="latest-works-heading"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full scroll-mt-16 bg-[#ecf5f4] dark:bg-[#12110b] px-2 sm:px-4 lg:px-[24px] pt-6 pb-12 sm:pt-8 sm:pb-14 transition-colors duration-500 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-[1440px] flex flex-col justify-between">
        {/* Top Title Row Matching Website Font System + Masked Baseline Reveal & Hover Character Roll */}
        <div
          ref={headerRef}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-8 px-2 sm:px-4"
        >
          <div className="text-[15px] sm:text-[16.5px] font-normal leading-[1.45] tracking-[-0.01em] text-[#5a6265] dark:text-[#9e9b91] shrink-0">
            {poemLines.map((line, idx) => (
              <div key={line} className="overflow-hidden">
                <motion.span
                  initial={{ y: '108%', rotate: 1.6, opacity: 0 }}
                  animate={
                    isHeaderInView
                      ? { y: '0%', rotate: 0, opacity: 1 }
                      : { y: '108%', rotate: 1.6, opacity: 0 }
                  }
                  transition={{
                    duration: 0.62,
                    delay: idx * 0.035,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="block origin-bottom-left will-change-transform"
                >
                  {line}
                </motion.span>
              </div>
            ))}
          </div>

          <div className="flex justify-start lg:justify-end overflow-visible">
            <h2
              id="latest-works-heading"
              aria-label={`${titleWord1} ${titleWord2}`}
              onMouseEnter={() => setIsTitleHovered(true)}
              onMouseLeave={() => setIsTitleHovered(false)}
              style={{
                fontFamily: 'var(--font-hero), "Helvetica Neue", Arial, sans-serif',
              }}
              className="text-[42px] sm:text-[58px] md:text-[68px] lg:text-[78px] font-medium leading-[1.04] tracking-[-0.043em] text-[#090a0a] dark:text-[#f4efea] inline-flex items-baseline gap-x-[10px] sm:gap-x-[14px] select-none cursor-default"
            >
              <span className="sr-only">{`${titleWord1} ${titleWord2}`}</span>

              {/* Word 1: "Our" */}
              <span aria-hidden="true" className="inline-flex items-baseline">
                {titleWord1Chars.map((ch, idx) => (
                  <motion.span
                    key={`works-w1-${idx}`}
                    initial={{ y: '112%', rotate: 2, opacity: 0 }}
                    animate={
                      isHeaderInView
                        ? { y: '0%', rotate: 0, opacity: 1 }
                        : { y: '112%', rotate: 2, opacity: 0 }
                    }
                    transition={{
                      duration: 0.68,
                      delay: 0.02 + idx * 0.025,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="relative inline-block overflow-hidden leading-[1.12] pt-[0.12em] -mt-[0.12em] pb-[0.26em] -mb-[0.26em] will-change-transform"
                  >
                    <span
                      className="inline-block will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        transitionDelay: `${idx * 18}ms`,
                        transform: isTitleHovered
                          ? 'translateY(-142%)'
                          : 'translateY(0%)',
                      }}
                    >
                      {ch}
                    </span>
                    <span
                      className="absolute left-0 top-0 inline-block pt-[0.12em] pb-[0.26em] text-[#090a0a] dark:text-[#f4efea] will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        transitionDelay: `${idx * 18}ms`,
                        transform: isTitleHovered
                          ? 'translateY(0%)'
                          : 'translateY(142%)',
                      }}
                    >
                      {ch}
                    </span>
                  </motion.span>
                ))}
              </span>

              {/* Word 2: "Works." (rolls in accent #ff4f31 on hover like Hero accent words) */}
              <span aria-hidden="true" className="inline-flex items-baseline">
                {titleWord2Chars.map((ch, idx) => {
                  const charIndex = titleWord1Chars.length + idx;
                  return (
                    <motion.span
                      key={`works-w2-${idx}`}
                      initial={{ y: '112%', rotate: 2, opacity: 0 }}
                      animate={
                        isHeaderInView
                          ? { y: '0%', rotate: 0, opacity: 1 }
                          : { y: '112%', rotate: 2, opacity: 0 }
                      }
                      transition={{
                        duration: 0.68,
                        delay: 0.02 + charIndex * 0.025,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="relative inline-block overflow-hidden leading-[1.12] pt-[0.12em] -mt-[0.12em] pb-[0.26em] -mb-[0.26em] will-change-transform"
                    >
                      <span
                        className="inline-block will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{
                          transitionDelay: `${charIndex * 18}ms`,
                          transform: isTitleHovered
                            ? 'translateY(-142%)'
                            : 'translateY(0%)',
                        }}
                      >
                        {ch}
                      </span>
                      <span
                        className="absolute left-0 top-0 inline-block pt-[0.12em] pb-[0.26em] text-[#ff4f31] will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{
                          transitionDelay: `${charIndex * 18}ms`,
                          transform: isTitleHovered
                            ? 'translateY(0%)'
                            : 'translateY(142%)',
                        }}
                      >
                        {ch}
                      </span>
                    </motion.span>
                  );
                })}
              </span>
            </h2>
          </div>
        </div>

        {/* 3D Perspective True 9:16 Video Carousel Stage (7-slot pre-warmed ring + responsive scale) */}
        <div
          ref={stageRef}
          data-testid="works-3d-stage"
          className="relative mt-3 sm:mt-5 h-[430px] sm:h-[500px] lg:h-[558px] w-full flex items-center justify-center"
        >
          {stageCards.map((card) => (
            <Work3DCardButton
              key={card.virtualKey}
              card={card}
              distanceFactor={distanceFactor}
              isSectionInView={isSectionInView}
              onCardClick={handleCardClick}
            />
          ))}
        </div>

        {/* Bottom Navigation Controls: Circle Left Arrow + Oval Pill Right Arrow */}
        <motion.div
          initial={{ y: 18, opacity: 0, scale: 0.94 }}
          animate={
            isSectionInView
              ? { y: 0, opacity: 1, scale: 1 }
              : { y: 18, opacity: 0, scale: 0.94 }
          }
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 sm:mt-5 flex items-center justify-center gap-3"
        >
          <button
            type="button"
            data-testid="works-prev-btn"
            onClick={handlePrev}
            aria-label="Previous work card"
            className="group flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[#12110b]/25 dark:border-white/25 text-[#12110b]/60 dark:text-white/60 hover:border-[#12110b] dark:hover:border-white hover:text-[#12110b] dark:hover:text-white transition-all duration-300 cursor-pointer"
          >
            <svg
              width="18"
              height="14"
              viewBox="0 0 18 14"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            >
              <path
                d="M17 7H1.5M1.5 7L7 1.5M1.5 7L7 12.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            data-testid="works-next-btn"
            onClick={handleNext}
            aria-label="Next work card"
            className="group flex h-[44px] w-[70px] items-center justify-center rounded-full border-[1.5px] border-[#12110b] dark:border-white bg-white/80 dark:bg-white/10 text-[#12110b] dark:text-white hover:bg-[#12110b] hover:text-white dark:hover:bg-white dark:hover:text-[#12110b] transition-all duration-300 cursor-pointer"
          >
            <svg
              width="18"
              height="14"
              viewBox="0 0 18 14"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            >
              <path
                d="M1 7H16.5M16.5 7L11 1.5M16.5 7L11 12.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
