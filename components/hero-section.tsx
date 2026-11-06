'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import {
  HERO_CARDS,
  HeroCardConfig,
  LanguageCode,
  ThemeMode,
  getRevealDelaySeconds,
  splitCharacters,
  computeMagneticOffset,
} from '@/lib/hero-config';
import { InlineVideoCard } from './inline-video-card';

interface HeroSectionProps {
  theme: ThemeMode;
  language: LanguageCode;
  animationKey: number;
}

interface KineticWordProps {
  text: string;
  delay: number;
  className?: string;
  isAccentWord?: boolean;
}

function KineticWord({
  text,
  delay,
  className = '',
  isAccentWord = false,
}: KineticWordProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const wordRef = useRef<HTMLSpanElement | null>(null);
  const chars = splitCharacters(text);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (!wordRef.current) return;
      const rect = wordRef.current.getBoundingClientRect();
      setOffset(computeMagneticOffset(e.clientX, e.clientY, rect, 3.5));
    },
    []
  );

  return (
    <span
      ref={wordRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className={`group/word relative inline-block overflow-hidden align-bottom pt-[0.14em] -mt-[0.14em] pb-[0.30em] -mb-[0.30em] px-[0.02em] cursor-default select-none ${className}`}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0px)`,
        transition: 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Initial Bottom-to-Top Masked Baseline Sweep with Slight Tilt */}
      <motion.span
        initial={{ y: '115%', opacity: 0, rotate: 2 }}
        animate={{ y: '0%', opacity: 1, rotate: 0 }}
        transition={{
          duration: 0.72,
          ease: [0.16, 1, 0.3, 1],
          delay,
        }}
        className="inline-flex items-baseline origin-bottom-left will-change-transform"
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden="true" className="inline-flex items-baseline">
          {chars.map((char, idx) => (
            <span
              key={`${text}-${idx}`}
              className="relative inline-block overflow-hidden leading-[1.12] pt-[0.12em] -mt-[0.12em] pb-[0.28em] -mb-[0.28em]"
            >
              {/* Primary Character — moves -142% on hover so descenders (g, p, y) clear the top clip 100% */}
              <span
                className="inline-block will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  transitionDelay: `${idx * 18}ms`,
                  transform: isHovered ? 'translateY(-142%)' : 'translateY(0%)',
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
              {/* Rolling Incoming Character on Cursor Hover */}
              <span
                className={`absolute left-0 top-0 inline-block pt-[0.12em] pb-[0.28em] will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isAccentWord
                    ? 'text-[#ff4f31]'
                    : 'text-[#090a0a] dark:text-[#f4efea]'
                }`}
                style={{
                  transitionDelay: `${idx * 18}ms`,
                  transform: isHovered ? 'translateY(0%)' : 'translateY(142%)',
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            </span>
          ))}
        </span>
      </motion.span>
    </span>
  );
}

export function HeroSection({
  language,
  animationKey,
}: HeroSectionProps) {
  const card1 = HERO_CARDS[0];
  const card2 = HERO_CARDS[1];
  const card3 = HERO_CARDS[2];
  const card4 = HERO_CARDS[3];

  const isNl = language === 'NL';

  // Scroll-linked 3D depth recession
  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, {
    stiffness: 120,
    damping: 26,
    mass: 0.32,
  });
  const heroParallaxY = useTransform(smoothScrollY, [0, 560], [0, -34]);
  const heroScale = useTransform(smoothScrollY, [0, 560], [1, 0.945]);
  const heroOpacity = useTransform(smoothScrollY, [0, 520], [1, 0.76]);

  // Fuller, impactful typography scale with generous descender headroom
  const textSizeClass =
    'text-[30px] sm:text-[54px] md:text-[68px] lg:text-[82px] leading-[1.04]';

  return (
    <section
      key={animationKey}
      aria-label="Hero Statement"
      className="relative flex min-h-[100svh] w-full flex-col items-center justify-center px-4 sm:px-8 pt-[68px] pb-[28px] overflow-hidden"
    >
      {/* 4-Row Typographic & Fixed-Shape Inline Video/Image Composition Centered in Window */}
      <motion.div
        role="heading"
        aria-level={1}
        aria-label="We build worlds, launch ideas, shape brands, and create impact."
        style={{ y: heroParallaxY, scale: heroScale, opacity: heroOpacity }}
        className="mx-auto flex flex-col items-center justify-center text-center select-none font-medium tracking-[-0.043em] text-[#090a0a] dark:text-[#f4efea] leading-[1.04] origin-center will-change-transform"
      >
        {/* ROW 1: "We" + [Card 1 (Fixed Vertical)] + "build worlds," */}
        <div className="flex flex-nowrap items-center justify-center gap-x-[6px] sm:gap-x-[12px] md:gap-x-[14px] lg:gap-x-[16px] whitespace-nowrap">
          <KineticWord
            text={isNl ? 'Wij' : 'We'}
            delay={getRevealDelaySeconds(0, 0)}
            className={textSizeClass}
          />

          <InlineVideoCard
            card={card1}
            revealDelay={getRevealDelaySeconds(0, 1)}
          />

          <KineticWord
            text={isNl ? 'bouwen' : 'build'}
            delay={getRevealDelaySeconds(0, 2)}
            className={textSizeClass}
          />
          <KineticWord
            text={isNl ? 'werelden,' : 'worlds,'}
            delay={getRevealDelaySeconds(0, 3)}
            className={textSizeClass}
            isAccentWord
          />
        </div>

        {/* ROW 2: "launch" + [Card 2 (Fixed Horizontal)] + "ideas," */}
        <div className="mt-[6px] sm:mt-[12px] md:mt-[14px] lg:mt-[16px] flex flex-nowrap items-center justify-center gap-x-[6px] sm:gap-x-[12px] md:gap-x-[14px] lg:gap-x-[16px] whitespace-nowrap">
          <KineticWord
            text={isNl ? 'lanceren' : 'launch'}
            delay={getRevealDelaySeconds(1, 0)}
            className={textSizeClass}
          />

          <InlineVideoCard
            card={card2}
            revealDelay={getRevealDelaySeconds(1, 1)}
          />

          <KineticWord
            text={isNl ? 'ideeën,' : 'ideas,'}
            delay={getRevealDelaySeconds(1, 2)}
            className={textSizeClass}
            isAccentWord
          />
        </div>

        {/* ROW 3: "shape brands," + [Card 3 (Fixed Panoramic Horizontal)] */}
        <div className="mt-[6px] sm:mt-[10px] md:mt-[12px] lg:mt-[14px] flex flex-nowrap items-center justify-center gap-x-[7px] sm:gap-x-[13px] md:gap-x-[15px] lg:gap-x-[17px] whitespace-nowrap">
          <KineticWord
            text={isNl ? 'vormen' : 'shape'}
            delay={getRevealDelaySeconds(2, 0)}
            className={textSizeClass}
          />
          <KineticWord
            text={isNl ? 'merken,' : 'brands,'}
            delay={getRevealDelaySeconds(2, 1)}
            className={textSizeClass}
            isAccentWord
          />

          <InlineVideoCard
            card={card3}
            revealDelay={getRevealDelaySeconds(2, 2)}
          />
        </div>

        {/* ROW 4: [Card 4 (Fixed Horizontal)] + "and create impact." */}
        <div className="mt-[6px] sm:mt-[10px] md:mt-[12px] lg:mt-[14px] flex flex-nowrap items-center justify-center gap-x-[7px] sm:gap-x-[13px] md:gap-x-[15px] lg:gap-x-[17px] whitespace-nowrap">
          <InlineVideoCard
            card={card4}
            revealDelay={getRevealDelaySeconds(3, 0)}
          />

          <KineticWord
            text={isNl ? 'en' : 'and'}
            delay={getRevealDelaySeconds(3, 1)}
            className={textSizeClass}
          />
          <KineticWord
            text={isNl ? 'creëren' : 'create'}
            delay={getRevealDelaySeconds(3, 2)}
            className={textSizeClass}
          />
          <KineticWord
            text={isNl ? 'impact.' : 'impact.'}
            delay={getRevealDelaySeconds(3, 3)}
            className={textSizeClass}
            isAccentWord
          />
        </div>
      </motion.div>
    </section>
  );
}
