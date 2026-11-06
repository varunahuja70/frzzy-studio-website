'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { ProtectedVideo } from '@/components/protected-video';
import {
  ArrowUpRight,
  Eye,
  Minus,
  Plus,
} from 'lucide-react';
import {
  FAQ_ITEMS,
  LanguageCode,
  ThemeMode,
  splitCharacters,
  toggleFaqItem,
} from '@/lib/hero-config';

interface FaqSectionProps {
  theme?: ThemeMode;
  language: LanguageCode;
  onBookProject?: () => void;
}

interface ShowcaseCard {
  id: string;
  label: string;
  subtitle: string;
  videoSrc: string;
  posterSrc: string;
  isCenter?: boolean;
}

const SHOWCASE_CARDS: ShowcaseCard[] = [
  {
    id: 'story',
    label: 'STORY',
    subtitle: 'NOT HAVING ANY CREATIVE',
    videoSrc: '/assets/videos/works/work-1.mp4',
    posterSrc: '/assets/works/work-1.png',
  },
  {
    id: 'pace',
    label: 'PACE',
    subtitle: 'BALI MASTERMIND',
    videoSrc: '/assets/videos/works/work-2.mp4',
    posterSrc: '/assets/works/work-2.png',
    isCenter: true,
  },
  {
    id: 'motion',
    label: 'MOTION',
    subtitle: 'WE GET ASKED OVER AGAIN',
    videoSrc: '/assets/videos/works/work-3.mp4',
    posterSrc: '/assets/works/work-3.png',
  },
];

export function FaqSection({ language, onBookProject }: FaqSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);

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

  const isNl = language === 'NL';

  const line1Text = isNl ? 'Antwoorden op' : 'Answers to';
  const line2Text = isNl ? 'veelgestelde vragen.' : 'common questions.';
  const line1Chars = splitCharacters(line1Text);
  const line2Chars = splitCharacters(line2Text);

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
          {/* ================= LEFT COLUMN: Eyebrow + Display Heading + Subtitle + 6 FAQ Accordion Cards ================= */}
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

          {/* ================= RIGHT COLUMN: Shifted Down, Borderless Video Cards + Tight Aligned Button ================= */}
          <div
            ref={rightColRef}
            className="lg:col-span-6 flex flex-col justify-end lg:pt-36 xl:pt-48 gap-6 sm:gap-7 h-full"
          >
            {/* 3 Vertical Reel Cards (Borderless, Shifted Down, No Empty Gap) */}
            <motion.div
              initial={{ y: 28, opacity: 0 }}
              animate={
                isRightInView
                  ? { y: 0, opacity: 1 }
                  : { y: 28, opacity: 0 }
              }
              transition={{
                duration: 0.65,
                delay: 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end w-full"
            >
              {SHOWCASE_CARDS.map((card) => {
                const isCenter = card.isCenter;
                return (
                  <div
                    key={card.id}
                    className={`relative overflow-hidden rounded-[20px] sm:rounded-[24px] bg-[#0c0c0e] select-none border-0 border-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isCenter
                        ? 'aspect-[9/16] sm:scale-[1.06] z-10 shadow-[0_28px_60px_-14px_rgba(0,0,0,0.45)]'
                        : 'aspect-[9/15.2] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.3)] opacity-95 hover:opacity-100'
                    }`}
                  >
                    {/* Poster Fallback */}
                    <Image
                      src={card.posterSrc}
                      alt={card.label}
                      fill
                      sizes="(max-width: 768px) 33vw, 240px"
                      draggable={false}
                      className="object-cover"
                    />

                    {/* Continuous Auto-Playing Protected Video */}
                    <ProtectedVideo
                      slotId={
                        card.id === 'story'
                          ? 'faq-reel-1'
                          : card.id === 'pace'
                          ? 'faq-reel-2'
                          : 'faq-reel-3'
                      }
                      fallbackSrc={card.videoSrc}
                      poster={card.posterSrc}
                      autoPlay
                      loop
                      muted
                      playsInline
                      disablePictureInPicture
                      className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                    />

                    {/* Subtle Gradient Shade for Text & Badge Visibility */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
                    />

                    {/* Middle Subtitle Text Overlay */}
                    <div className="absolute inset-x-0 bottom-12 sm:bottom-14 px-2 sm:px-3 text-center pointer-events-none">
                      <p className="text-[10px] sm:text-[12px] font-bold text-white tracking-wider uppercase leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                        {card.subtitle}
                      </p>
                    </div>

                    {/* Bottom Frosted Pill Badge: Eye Icon + Label */}
                    <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 flex items-center justify-center pointer-events-none">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md text-white shadow-sm border-0 border-transparent">
                        <Eye className="h-3.5 w-3.5 stroke-[2.2]" />
                        <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase">
                          {card.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Bottom "Book a Project" Pill Button — Directly Below the Cards, Aligned With Last FAQ */}
            <motion.button
              type="button"
              data-testid="faq-book-project-btn"
              data-track="faq_book_project"
              onClick={onBookProject}
              initial={{ y: 20, opacity: 0 }}
              animate={
                isRightInView
                  ? { y: 0, opacity: 1 }
                  : { y: 20, opacity: 0 }
              }
              transition={{
                duration: 0.6,
                delay: 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group relative flex h-[58px] sm:h-[64px] w-full items-center justify-between rounded-full bg-[#141416] dark:bg-[#f4efea] text-[#f4efea] dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white px-7 sm:px-8 shadow-[0_20px_44px_-16px_rgba(18,17,11,0.25)] transition-colors duration-400 cursor-pointer will-change-transform"
            >
              <span className="relative block h-[24px] overflow-hidden text-[16px] sm:text-[17.5px] font-medium tracking-[-0.015em] leading-[24px]">
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
