'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'motion/react';
import {
  LanguageCode,
  REVIEW_ITEMS,
  ReviewItemConfig,
  ThemeMode,
  distributeReviewsIntoColumns,
  shouldAutoScrollReviews,
  splitCharacters,
} from '@/lib/hero-config';

interface ReviewsSectionProps {
  theme: ThemeMode;
  language: LanguageCode;
}

interface ReviewCardProps {
  item: ReviewItemConfig;
  isNl: boolean;
}

function ReviewCard({ item, isNl }: ReviewCardProps) {
  return (
    <article
      data-testid={`review-card-${item.id}`}
      className="w-full rounded-[16px] bg-[#ffffff] dark:bg-[#1a1914] p-6 shadow-[0_2px_14px_rgba(18,17,11,0.035)] border border-black/[0.035] dark:border-white/[0.06] flex flex-col justify-between select-none"
    >
      <div>
        {/* 5 Crisp Black Stars */}
        <div
          aria-label={`${item.rating} out of 5 stars`}
          className="flex items-center gap-[3px] text-[#141416] dark:text-[#f4efea]"
        >
          {Array.from({ length: item.rating }).map((_, idx) => (
            <svg
              key={idx}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6 0.6L7.48 4.02L11.2 4.38L8.4 6.84L9.22 10.48L6 8.58L2.78 10.48L3.6 6.84L0.8 4.38L4.52 4.02L6 0.6Z" />
            </svg>
          ))}
        </div>

        {/* Review Quote */}
        <p className="mt-3.5 text-[14.5px] sm:text-[15px] font-normal leading-[1.48] tracking-[-0.008em] text-[#141416] dark:text-[#e8e3dc]">
          {isNl ? item.textNl : item.textEn}
        </p>
      </div>

      {/* Author Avatar + Name */}
      <div className="mt-4 flex items-center gap-2.5">
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#e4e4e7] dark:bg-white/10">
          <Image
            src={item.avatarSrc}
            alt={item.author}
            fill
            sizes="28px"
            referrerPolicy="no-referrer"
            draggable={false}
            className="object-cover"
          />
        </div>
        <span className="text-[13px] font-medium tracking-[-0.005em] text-[#26282B] dark:text-[#d0cbc2]">
          {item.author}
        </span>
      </div>
    </article>
  );
}

export function ReviewsSection({ language }: ReviewsSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

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

  // Supports full list (>6 reviews -> continuous downward stream) or compact list (<=6 reviews -> fixed static grid)
  const [reviewPoolMode, setReviewPoolMode] = useState<'abundant' | 'compact'>(
    'abundant'
  );
  const [isPaused, setIsPaused] = useState(false);
  const [isHeadingHovered, setIsHeadingHovered] = useState(false);

  const isNl = language === 'NL';

  const activeReviews =
    reviewPoolMode === 'abundant'
      ? REVIEW_ITEMS
      : REVIEW_ITEMS.filter((_, idx) => idx % 2 === 0);

  const autoScroll = shouldAutoScrollReviews(activeReviews.length, 6);
  const [col0, col1, col2] = distributeReviewsIntoColumns(
    activeReviews,
    autoScroll
  );

  const headingLine1 = isNl
    ? 'Ontdek waarom wij #1 staan'
    : "See why we're rated #1";
  const headingLine2 = isNl
    ? 'in creatief merkdesign'
    : 'in creative brand design';

  const line1Chars = splitCharacters(headingLine1);
  const line2Chars = splitCharacters(headingLine2);

  // Downward marquee durations per column (seconds)
  const colDurations = [26, 30, 28];

  return (
    <section
      id="reviews"
      ref={sectionRef}
      data-testid="reviews-section"
      data-autoscroll={autoScroll ? 'true' : 'false'}
      aria-labelledby="reviews-heading"
      className="relative w-full bg-[#ecf5f4] dark:bg-[#12110b] text-[#141416] dark:text-[#f4efea] px-4 sm:px-6 lg:px-[36px] pt-20 pb-14 sm:pt-24 sm:pb-16 lg:pt-[96px] lg:pb-[72px] transition-colors duration-500 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-[1100px] flex flex-col items-center">
        {/* Centered 2-Line Heading + Rating Badges */}
        <div
          ref={headerRef}
          className="flex flex-col items-center text-center max-w-[680px]"
        >
          <h2
            id="reviews-heading"
            aria-label={`${headingLine1} ${headingLine2}`}
            onMouseEnter={() => setIsHeadingHovered(true)}
            onMouseLeave={() => setIsHeadingHovered(false)}
            style={{
              fontFamily:
                'var(--font-hero), "Helvetica Neue", Arial, sans-serif',
            }}
            className="text-[36px] sm:text-[48px] lg:text-[54px] font-semibold leading-[1.07] tracking-[-0.038em] text-[#111214] dark:text-[#f4efea] flex flex-col items-center select-none cursor-default"
          >
            <span className="sr-only">{`${headingLine1} ${headingLine2}`}</span>

            {/* Line 1: "See why we're rated #1" */}
            <span
              aria-hidden="true"
              className="inline-flex flex-wrap justify-center"
            >
              {line1Chars.map((ch, idx) => (
                <motion.span
                  key={`rev-h1-${idx}`}
                  initial={{ y: '112%', rotate: 1.8, opacity: 0 }}
                  animate={
                    isHeaderInView
                      ? { y: '0%', rotate: 0, opacity: 1 }
                      : { y: '112%', rotate: 1.8, opacity: 0 }
                  }
                  transition={{
                    duration: 0.62,
                    delay: 0.01 + idx * 0.014,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative inline-block overflow-hidden leading-[1.12] pt-[0.08em] -mt-[0.08em] pb-[0.22em] -mb-[0.22em] will-change-transform"
                >
                  <span
                    className="inline-block will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      transitionDelay: `${idx * 12}ms`,
                      transform: isHeadingHovered
                        ? 'translateY(-142%)'
                        : 'translateY(0%)',
                    }}
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                  <span
                    className="absolute left-0 top-0 inline-block pt-[0.08em] pb-[0.22em] text-[#111214] dark:text-[#f4efea] will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      transitionDelay: `${idx * 12}ms`,
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

            {/* Line 2: "in creative brand design" */}
            <span
              aria-hidden="true"
              className="inline-flex flex-wrap justify-center"
            >
              {line2Chars.map((ch, idx) => (
                <motion.span
                  key={`rev-h2-${idx}`}
                  initial={{ y: '112%', rotate: 1.8, opacity: 0 }}
                  animate={
                    isHeaderInView
                      ? { y: '0%', rotate: 0, opacity: 1 }
                      : { y: '112%', rotate: 1.8, opacity: 0 }
                  }
                  transition={{
                    duration: 0.62,
                    delay: 0.06 + idx * 0.014,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative inline-block overflow-hidden leading-[1.12] pt-[0.08em] -mt-[0.08em] pb-[0.22em] -mb-[0.22em] will-change-transform"
                >
                  <span
                    className="inline-block will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      transitionDelay: `${idx * 12}ms`,
                      transform: isHeadingHovered
                        ? 'translateY(-142%)'
                        : 'translateY(0%)',
                    }}
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                  <span
                    className="absolute left-0 top-0 inline-block pt-[0.08em] pb-[0.22em] text-[#ff4f31] will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      transitionDelay: `${idx * 12}ms`,
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

          {/* Two Rating Pill Badges Matching Reference Image */}
          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.95 }}
            animate={
              isHeaderInView
                ? { y: 0, opacity: 1, scale: 1 }
                : { y: 18, opacity: 0, scale: 0.95 }
            }
            transition={{
              duration: 0.58,
              delay: 0.14,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
          >
            {/* Left Badge: Capterra-style Icon + "Rated #1 Creative Design Studio" */}
            <button
              type="button"
              data-testid="reviews-mode-toggle"
              onClick={() =>
                setReviewPoolMode((prev) =>
                  prev === 'abundant' ? 'compact' : 'abundant'
                )
              }
              title={
                autoScroll
                  ? 'Currently streaming 12 reviews downward — click to preview 6-review fixed mode'
                  : 'Currently showing 6 fixed reviews — click to resume 12-review downward stream'
              }
              className="flex items-center gap-2.5 rounded-[12px] bg-white/75 dark:bg-[#1c1b15] border border-black/[0.05] dark:border-white/[0.08] px-3.5 py-2 text-left shadow-2xs hover:bg-white dark:hover:bg-[#24221b] transition-colors cursor-pointer"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-2xs">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M2.2 7.6L13.6 2.6L8.8 13.8L7.2 9.1L2.2 7.6Z" fill="#0092D1" />
                  <path d="M13.6 2.6L7.2 9.1L8.8 13.8L13.6 2.6Z" fill="#FF6D2E" />
                </svg>
              </span>
              <span className="text-[11px] font-medium leading-[1.24] text-[#141416] dark:text-[#f4efea]">
                Rated #1 Creative
                <br />
                Design Studio
              </span>
            </button>

            {/* Right Badge: G2-style Coral Circle + "Leader Position Summer 2024" */}
            <div className="flex items-center gap-2.5 rounded-[12px] bg-white/75 dark:bg-[#1c1b15] border border-black/[0.05] dark:border-white/[0.08] px-3.5 py-2 text-left shadow-2xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF492C] text-white font-bold text-[12px] leading-none">
                G
              </span>
              <span className="text-[11px] font-medium leading-[1.24] text-[#141416] dark:text-[#f4efea]">
                Leader Position
                <br />
                Summer 2024
              </span>
            </div>
          </motion.div>
        </div>

        {/* 3-Column Staggered Masonry Reviews Stage */}
        <motion.div
          initial={{ y: 28, opacity: 0 }}
          animate={
            isSectionInView ? { y: 0, opacity: 1 } : { y: 28, opacity: 0 }
          }
          transition={{ duration: 0.68, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className={`relative mt-11 sm:mt-14 w-full ${
            autoScroll
              ? 'h-[530px] sm:h-[560px] overflow-hidden'
              : 'h-auto overflow-visible'
          }`}
        >
          {/* Top Soft Fade Mask (visible when auto-scrolling downward so emerging cards glide in smoothly) */}
          {autoScroll && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-20 h-14 bg-gradient-to-b from-[#ecf5f4] via-[#ecf5f4]/70 to-transparent dark:from-[#12110b] dark:via-[#12110b]/70 dark:to-transparent"
            />
          )}

          {/* 3-Column Grid with Center Column Offset Higher */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 items-start">
            {[col0, col1, col2].map((colItems, colIdx) => {
              const isCenterCol = colIdx === 1;
              return (
                <div
                  key={`review-col-${colIdx}`}
                  data-testid={`review-col-${colIdx}`}
                  className={`flex flex-col ${
                    isCenterCol ? 'md:-mt-7' : 'md:mt-2'
                  }`}
                >
                  {autoScroll ? (
                    <motion.div
                      animate={
                        isPaused ? undefined : { y: ['-50%', '0%'] }
                      }
                      transition={{
                        duration: colDurations[colIdx],
                        ease: 'linear',
                        repeat: Infinity,
                      }}
                      className="flex flex-col will-change-transform"
                    >
                      {colItems.map((item, idx) => (
                        <div
                          key={`${item.id}-dup-${idx}`}
                          className="pb-3.5 sm:pb-4"
                        >
                          <ReviewCard item={item} isNl={isNl} />
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col gap-3.5 sm:gap-4">
                      {colItems.map((item) => (
                        <ReviewCard key={item.id} item={item} isNl={isNl} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Soft Fade-Out Mask Matching Reference Image */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 sm:h-36 bg-gradient-to-t from-[#ecf5f4] via-[#ecf5f4]/88 to-transparent dark:from-[#12110b] dark:via-[#12110b]/88 dark:to-transparent"
          />
        </motion.div>
      </div>
    </section>
  );
}
