'use client';

import React, { useState, useEffect, useRef } from 'react';
import { animate, motion, useInView } from 'motion/react';
import {
  CreativeImpactMetrics,
  DEFAULT_CREATIVE_IMPACT_METRICS,
  LanguageCode,
  ThemeMode,
  formatAnimatedMetric,
} from '@/lib/hero-config';

interface CreativeImpactSectionProps {
  theme: ThemeMode;
  language: LanguageCode;
}

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  suffix?: string;
  trigger: boolean;
  delay?: number;
  className?: string;
  testId?: string;
}

function AnimatedCounter({
  value,
  decimals = 0,
  suffix = '',
  trigger,
  delay = 0,
  className = '',
  testId,
}: AnimatedCounterProps) {
  const [displayText, setDisplayText] = useState(() =>
    formatAnimatedMetric(value, decimals, suffix)
  );

  useEffect(() => {
    if (!trigger) {
      return;
    }
    const controls = animate(0, value, {
      duration: 1.15,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplayText(formatAnimatedMetric(latest, decimals, suffix));
      },
      onComplete: () => {
        setDisplayText(formatAnimatedMetric(value, decimals, suffix));
      },
    });
    return () => controls.stop();
  }, [value, decimals, suffix, trigger, delay]);

  return (
    <span data-testid={testId} className={`tabular-nums ${className}`}>
      {displayText}
    </span>
  );
}

export function CreativeImpactSection({
  language,
}: CreativeImpactSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);

  const isSectionInView = useInView(sectionRef, {
    once: false,
    amount: 0.04,
    margin: '0px 0px -16px 0px',
  });
  const isHeaderInView = useInView(headerRef, {
    once: false,
    amount: 0.08,
    margin: '0px 0px -16px 0px',
  });
  const isContentInView = useInView(contentRef, {
    once: false,
    amount: 0.08,
    margin: '0px 0px -24px 0px',
  });
  const isFooterInView = useInView(footerRef, {
    once: false,
    amount: 0.08,
  });

  const [metrics, setMetrics] = useState<CreativeImpactMetrics>(
    DEFAULT_CREATIVE_IMPACT_METRICS
  );
  const [isEditing, setIsEditing] = useState(false);

  const isNl = language === 'NL';
  const clampedPct = Math.max(10, Math.min(100, metrics.completedPercentage));

  return (
    <motion.section
      id="about"
      ref={sectionRef}
      data-testid="creative-impact-section"
      aria-labelledby="creative-impact-heading"
      initial={{ y: 28, opacity: 0.95 }}
      animate={
        isSectionInView ? { y: 0, opacity: 1 } : { y: 24, opacity: 0.95 }
      }
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      }}
      className="relative w-full min-h-screen rounded-[36px] sm:rounded-[48px] shadow-[0_-24px_64px_-20px_rgba(18,17,11,0.07),0_24px_64px_-20px_rgba(18,17,11,0.07)] bg-[#ffffff] dark:bg-[#141416] text-[#141416] dark:text-[#f4efea] px-4 sm:px-6 lg:px-[36px] pt-20 pb-12 sm:pt-24 sm:pb-14 lg:pt-[96px] lg:pb-[56px] flex flex-col justify-between transition-colors duration-500 will-change-transform"
    >
      <div className="mx-auto w-full max-w-[1392px] flex-1 flex flex-col justify-between min-h-[720px] lg:min-h-[740px]">
        {/* Top Header Row: Left Studio Title & Subtitle + Right Minimal Bar Chart Icon */}
        <div ref={headerRef} className="flex items-start justify-between gap-4">
          <div>
            <div className="overflow-hidden pb-0.5">
              <motion.h2
                id="creative-impact-heading"
                initial={{ y: '105%', rotate: 1.8, opacity: 0 }}
                animate={
                  isHeaderInView
                    ? { y: '0%', rotate: 0, opacity: 1 }
                    : { y: '105%', rotate: 1.8, opacity: 0 }
                }
                transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
                className="text-[15.5px] sm:text-[16.5px] font-semibold leading-[1.35] tracking-[-0.005em] text-[#141416] dark:text-[#f4efea] origin-bottom-left will-change-transform"
              >
                {metrics.studioName}
              </motion.h2>
            </div>
            <div className="overflow-hidden">
              <motion.p
                initial={{ y: '105%', rotate: 1.5, opacity: 0 }}
                animate={
                  isHeaderInView
                    ? { y: '0%', rotate: 0, opacity: 1 }
                    : { y: '105%', rotate: 1.5, opacity: 0 }
                }
                transition={{
                  duration: 0.58,
                  delay: 0.03,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-0.5 text-[15.5px] sm:text-[16.5px] font-normal leading-[1.35] tracking-normal text-[#8A8D93] origin-bottom-left will-change-transform"
              >
                {isNl ? 'Creatieve Impact.' : metrics.sectionSubtitle}
              </motion.p>
            </div>
          </div>

          <motion.div
            initial={{ scale: 0.78, opacity: 0 }}
            animate={
              isHeaderInView
                ? { scale: 1, opacity: 1 }
                : { scale: 0.78, opacity: 0 }
            }
            transition={{ duration: 0.55, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3"
          >
            {isEditing && (
              <span className="text-[11px] font-medium text-[#7A8B84] bg-[#DCEBE5]/60 px-2.5 py-1 rounded-md">
                Click any value below to edit
              </span>
            )}
            <button
              type="button"
              data-testid="impact-edit-toggle"
              onClick={() => setIsEditing((prev) => !prev)}
              aria-label={
                isEditing
                  ? 'Finish editing agency statistics'
                  : 'Edit placeholder agency statistics'
              }
              title="Customize agency statistics"
              className="group inline-flex h-8 w-8 items-center justify-center rounded-md text-[#141416] dark:text-[#f4efea] hover:bg-[#F4F4F6] dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {/* Exact 3-bar chart icon from reference image */}
              <svg
                width="18"
                height="17"
                viewBox="0 0 16 15"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="1"
                  width="2.3"
                  height="13"
                  rx="0.6"
                  fill="currentColor"
                />
                <rect
                  x="6.4"
                  y="5"
                  width="2.3"
                  height="9"
                  rx="0.6"
                  fill="currentColor"
                />
                <rect
                  x="11.8"
                  y="3"
                  width="2.3"
                  height="11"
                  rx="0.6"
                  fill="currentColor"
                />
              </svg>
            </button>
          </motion.div>
        </div>

        {/* Inline Quick Editor Drawer when toggled */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[14px] bg-[#F4F4F6] dark:bg-[#1E1E22] p-4 text-xs"
          >
            <label className="flex flex-col gap-1">
              <span className="font-medium text-[#8A8D93]">
                Projects Delivered
              </span>
              <input
                type="number"
                step="any"
                value={metrics.mainValue}
                onChange={(e) =>
                  setMetrics((m) => ({
                    ...m,
                    mainValue: Number(e.target.value) || 0,
                  }))
                }
                className="rounded-lg bg-white dark:bg-black/30 px-2.5 py-1.5 font-semibold text-[#141416] dark:text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-[#8A8D93]">
                Completed (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={metrics.completedPercentage}
                onChange={(e) =>
                  setMetrics((m) => ({
                    ...m,
                    completedPercentage: Math.min(
                      100,
                      Math.max(0, Number(e.target.value) || 0)
                    ),
                  }))
                }
                className="rounded-lg bg-white dark:bg-black/30 px-2.5 py-1.5 font-semibold text-[#141416] dark:text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-[#8A8D93]">
                Brands Collaborated
              </span>
              <input
                type="number"
                step="any"
                value={metrics.brandsValue}
                onChange={(e) =>
                  setMetrics((m) => ({
                    ...m,
                    brandsValue: Number(e.target.value) || 0,
                  }))
                }
                className="rounded-lg bg-white dark:bg-black/30 px-2.5 py-1.5 font-semibold text-[#141416] dark:text-white outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-[#8A8D93]">
                Creative Campaigns
              </span>
              <input
                type="number"
                step="any"
                value={metrics.campaignsValue}
                onChange={(e) =>
                  setMetrics((m) => ({
                    ...m,
                    campaignsValue: Number(e.target.value) || 0,
                  }))
                }
                className="rounded-lg bg-white dark:bg-black/30 px-2.5 py-1.5 font-semibold text-[#141416] dark:text-white outline-none"
              />
            </label>
          </motion.div>
        )}

        {/* Center Main Grid: Left Primary Statistic + Right Larger 3-Card Bento Grid */}
        <div
          ref={contentRef}
          className="my-10 sm:my-14 lg:my-[48px] grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-8"
        >
          {/* Left Column: Main Large Statistic ("Projects Delivered.") */}
          <div className="lg:col-span-5 flex flex-col items-start pt-1">
            <div className="overflow-hidden pb-1">
              <motion.span
                initial={{ y: '105%', rotate: 1.6, opacity: 0 }}
                animate={
                  isContentInView
                    ? { y: '0%', rotate: 0, opacity: 1 }
                    : { y: '105%', rotate: 1.6, opacity: 0 }
                }
                transition={{
                  duration: 0.58,
                  delay: 0.01,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="block text-[15px] sm:text-[16px] font-semibold tracking-[-0.005em] text-[#141416] dark:text-[#f4efea] origin-bottom-left will-change-transform"
              >
                {isNl ? 'Opgeleverde Projecten.' : metrics.mainLabel}
              </motion.span>
            </div>

            <div className="mt-3 sm:mt-4 overflow-hidden pb-1">
              <motion.div
                initial={{ y: '102%', scale: 0.94, opacity: 0 }}
                animate={
                  isContentInView
                    ? { y: '0%', scale: 1, opacity: 1 }
                    : { y: '102%', scale: 0.94, opacity: 0 }
                }
                transition={{
                  duration: 0.65,
                  delay: 0.03,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="origin-bottom-left will-change-transform"
              >
                <AnimatedCounter
                  value={metrics.mainValue}
                  decimals={metrics.mainDecimals}
                  suffix={metrics.mainSuffix}
                  trigger={isContentInView}
                  delay={0.03}
                  testId="impact-main-stat"
                  className="text-[86px] sm:text-[110px] lg:text-[132px] font-light leading-[0.94] tracking-[-0.045em] text-[#141416] dark:text-[#f4efea]"
                />
              </motion.div>
            </div>

            {/* Two Neutral Gray Pill Badges with Snappy Capsule Pop-Expansion */}
            <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-2.5">
              <motion.span
                initial={{ scaleX: 0.72, scaleY: 0.88, y: 10, opacity: 0 }}
                animate={
                  isContentInView
                    ? { scaleX: 1, scaleY: 1, y: 0, opacity: 1 }
                    : { scaleX: 0.72, scaleY: 0.88, y: 10, opacity: 0 }
                }
                transition={{
                  duration: 0.58,
                  delay: 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="inline-flex items-center rounded-[7px] bg-[#F4F4F6] dark:bg-[#1E1E22] px-4 py-1.5 text-[12.5px] font-medium tracking-[-0.005em] text-[#7A7D84] origin-left will-change-transform"
              >
                {metrics.badge1Text}
              </motion.span>
              <motion.span
                initial={{ scaleX: 0.72, scaleY: 0.88, y: 10, opacity: 0 }}
                animate={
                  isContentInView
                    ? { scaleX: 1, scaleY: 1, y: 0, opacity: 1 }
                    : { scaleX: 0.72, scaleY: 0.88, y: 10, opacity: 0 }
                }
                transition={{
                  duration: 0.58,
                  delay: 0.09,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="inline-flex items-center rounded-[7px] bg-[#F4F4F6] dark:bg-[#1E1E22] px-4 py-1.5 text-[12.5px] font-medium tracking-[-0.005em] text-[#7A7D84] origin-left will-change-transform"
              >
                {metrics.badge2Text}
              </motion.span>
            </div>

            {/* Supporting Editorial Description */}
            <div className="mt-6 sm:mt-7 overflow-hidden">
              <motion.p
                initial={{ y: 18, opacity: 0 }}
                animate={
                  isContentInView
                    ? { y: 0, opacity: 1 }
                    : { y: 18, opacity: 0 }
                }
                transition={{
                  duration: 0.62,
                  delay: 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="text-[14.5px] sm:text-[15px] leading-[1.54] tracking-normal text-[#8A8D93] max-w-[380px] will-change-transform"
              >
                {metrics.mainDescription}
              </motion.p>
            </div>
          </div>

          {/* Right Column: Enlarged 3-Card Bento Grid */}
          <div className="lg:col-span-7 w-full max-w-[748px] lg:ml-auto flex flex-col gap-4 sm:gap-[20px]">
            {/* Top Full-Width Highlight Card: Pale Mint (#DCEBE5) with Soft Dotted Fade into Neutral Gray (#F4F4F6) */}
            <motion.div
              initial={{ y: 28, scale: 0.94, opacity: 0 }}
              animate={
                isContentInView
                  ? { y: 0, scale: 1, opacity: 1 }
                  : { y: 28, scale: 0.94, opacity: 0 }
              }
              transition={{
                duration: 0.65,
                delay: 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
              data-testid="impact-card-completed"
              className="group relative h-[168px] sm:h-[186px] w-full overflow-hidden rounded-[20px] bg-[#F4F4F6] dark:bg-[#1E1E22] p-7 sm:px-9 sm:py-8 flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 will-change-transform"
            >
              {/* Animated Pale Mint (#DCEBE5) Progress Fill with Feather Gradient */}
              <motion.div
                initial={{ width: '0%' }}
                animate={
                  isContentInView
                    ? { width: `${Math.min(100, clampedPct + 14)}%` }
                    : { width: '0%' }
                }
                transition={{
                  duration: 1.15,
                  delay: 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                aria-hidden="true"
                style={{
                  background:
                    'linear-gradient(90deg, #DCEBE5 0%, #DCEBE5 74%, rgba(220, 235, 229, 0) 100%)',
                }}
                className="pointer-events-none absolute inset-y-0 left-0 z-0 dark:opacity-25"
              >
                {/* Subtle stippled dot matrix inside the pale mint region matching reference card */}
                <div
                  style={{
                    backgroundImage:
                      'radial-gradient(rgba(255, 255, 255, 0.55) 1.35px, transparent 1.35px)',
                    backgroundSize: '7px 7px',
                  }}
                  className="h-full w-full opacity-80"
                />
              </motion.div>

              {/* Card Top Row */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[14.5px] sm:text-[15.5px] font-semibold tracking-[-0.005em] text-[#141416] dark:text-[#f4efea]">
                  {isNl ? 'Voltooide Projecten.' : metrics.completedTitle}
                </span>
                <span className="text-[14px] sm:text-[14.5px] font-normal tracking-normal text-[#8A8D93]">
                  {metrics.completedTargetLabel}
                </span>
              </div>

              {/* Card Bottom Percentage */}
              <div className="relative z-10 overflow-hidden">
                <AnimatedCounter
                  value={metrics.completedPercentage}
                  decimals={0}
                  suffix="%"
                  trigger={isContentInView}
                  delay={0.06}
                  testId="impact-completed-stat"
                  className="block text-[44px] sm:text-[52px] font-light leading-none tracking-[-0.03em] text-[#141416] dark:text-[#f4efea]"
                />
              </div>
            </motion.div>

            {/* Bottom 2-Column Supporting Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-[20px]">
              {/* Bottom-Left Card: "Brands Collaborated." */}
              <motion.div
                initial={{ y: 30, scale: 0.94, opacity: 0 }}
                animate={
                  isContentInView
                    ? { y: 0, scale: 1, opacity: 1 }
                    : { y: 30, scale: 0.94, opacity: 0 }
                }
                transition={{
                  duration: 0.65,
                  delay: 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                data-testid="impact-card-brands"
                className="group relative h-[198px] sm:h-[222px] w-full rounded-[20px] bg-[#F4F4F6] dark:bg-[#1E1E22] p-7 sm:px-9 sm:py-8 flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 will-change-transform"
              >
                <div>
                  <span className="block text-[14.5px] sm:text-[15.5px] font-semibold tracking-[-0.005em] text-[#141416] dark:text-[#f4efea]">
                    {isNl ? 'Samenwerkende Merken.' : metrics.brandsTitle}
                  </span>
                  {/* Minimalist Radial Sun/Sparkle Icon with subtle rotation reveal */}
                  <motion.div
                    initial={{ scale: 0.6, rotate: -35, opacity: 0 }}
                    animate={
                      isContentInView
                        ? { scale: 1, rotate: 0, opacity: 1 }
                        : { scale: 0.6, rotate: -35, opacity: 0 }
                    }
                    transition={{
                      duration: 0.6,
                      delay: 0.12,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="mt-3.5 inline-block text-[#141416] dark:text-[#f4efea]"
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="2.6"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M8 1.5V3.1M8 12.9V14.5M1.5 8H3.1M12.9 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M12.6 3.4L11.5 4.5M4.5 11.5L3.4 12.6"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.div>
                </div>

                <div>
                  <AnimatedCounter
                    value={metrics.brandsValue}
                    decimals={metrics.brandsDecimals}
                    suffix={metrics.brandsSuffix}
                    trigger={isContentInView}
                    delay={0.1}
                    testId="impact-brands-stat"
                    className="block text-[40px] sm:text-[48px] font-light leading-none tracking-[-0.03em] text-[#141416] dark:text-[#f4efea]"
                  />
                  <span className="mt-2.5 block text-[11px] sm:text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#8A8D93]">
                    {metrics.brandsCaption}
                  </span>
                </div>
              </motion.div>

              {/* Bottom-Right Card: "Creative Campaigns." */}
              <motion.div
                initial={{ y: 30, scale: 0.94, opacity: 0 }}
                animate={
                  isContentInView
                    ? { y: 0, scale: 1, opacity: 1 }
                    : { y: 30, scale: 0.94, opacity: 0 }
                }
                transition={{
                  duration: 0.65,
                  delay: 0.12,
                  ease: [0.16, 1, 0.3, 1],
                }}
                data-testid="impact-card-campaigns"
                className="group relative h-[198px] sm:h-[222px] w-full rounded-[20px] bg-[#F4F4F6] dark:bg-[#1E1E22] p-7 sm:px-9 sm:py-8 flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 will-change-transform"
              >
                <div>
                  <span className="block text-[14.5px] sm:text-[15.5px] font-semibold tracking-[-0.005em] text-[#141416] dark:text-[#f4efea]">
                    {isNl ? 'Creatieve Campagnes.' : metrics.campaignsTitle}
                  </span>
                  {/* Minimalist Portrait Device Frame Icon with pop reveal */}
                  <motion.div
                    initial={{ scale: 0.6, y: 6, opacity: 0 }}
                    animate={
                      isContentInView
                        ? { scale: 1, y: 0, opacity: 1 }
                        : { scale: 0.6, y: 6, opacity: 0 }
                    }
                    transition={{
                      duration: 0.6,
                      delay: 0.15,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="mt-3.5 inline-block text-[#141416] dark:text-[#f4efea]"
                  >
                    <svg
                      width="17"
                      height="19"
                      viewBox="0 0 14 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="2.2"
                        y="1.5"
                        width="9.6"
                        height="13"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <line
                        x1="5.8"
                        y1="3.6"
                        x2="8.2"
                        y2="3.6"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.div>
                </div>

                <div>
                  <AnimatedCounter
                    value={metrics.campaignsValue}
                    decimals={metrics.campaignsDecimals}
                    suffix={metrics.campaignsSuffix}
                    trigger={isContentInView}
                    delay={0.13}
                    testId="impact-campaigns-stat"
                    className="block text-[40px] sm:text-[48px] font-light leading-none tracking-[-0.03em] text-[#141416] dark:text-[#f4efea]"
                  />
                  <span className="mt-2.5 block text-[11px] sm:text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#8A8D93]">
                    {metrics.campaignsCaption}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom Hairline Divider & Report Pagination Footer */}
        <motion.div
          ref={footerRef}
          initial={{ opacity: 0, y: 10 }}
          animate={
            isFooterInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }
          }
          transition={{ duration: 0.55, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
          className="border-t border-[#F0F0F2] dark:border-white/10 pt-5 flex items-center justify-between text-[11px] sm:text-[11.5px] font-medium tracking-[0.05em] text-[#8A8D93]"
        >
          <span className="uppercase">{metrics.reportFooterLeft}</span>
          <span className="tabular-nums">{metrics.reportFooterRight}</span>
        </motion.div>
      </div>
    </motion.section>
  );
}
