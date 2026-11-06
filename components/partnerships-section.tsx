'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'motion/react';
import { LanguageCode, ThemeMode } from '@/lib/hero-config';

interface PartnershipsSectionProps {
  theme: ThemeMode;
  language: LanguageCode;
}

interface PartnerItem {
  id: string;
  name: string;
  description: string;
  logoSrc: string;
}

const PARTNERS: PartnerItem[] = [
  {
    id: 'partner-1',
    name: 'Logoipsum Sphere',
    description: 'Global Enterprise Architecture & Cloud Infrastructure Partner',
    logoSrc: '/assets/partners/logo-1.png',
  },
  {
    id: 'partner-2',
    name: 'IPSUM Studio',
    description: 'Digital Product Strategy & Design Systems Collective',
    logoSrc: '/assets/partners/logo-2.png',
  },
  {
    id: 'partner-3',
    name: 'L-Motion Labs',
    description: 'High-Frequency WebGL & Interactive Motion Engineering',
    logoSrc: '/assets/partners/logo-3.png',
  },
  {
    id: 'partner-4',
    name: 'Logoipsum Shield',
    description: 'Enterprise Security & Distributed Commerce Systems',
    logoSrc: '/assets/partners/logo-4.png',
  },
  {
    id: 'partner-5',
    name: 'LOGO IPSUM Dual',
    description: 'Brand Architecture & Omnichannel Experience Partner',
    logoSrc: '/assets/partners/logo-5.png',
  },
  {
    id: 'partner-6',
    name: 'logo ipsum Globe',
    description: 'Worldwide Digital Transformation & Venture Studio',
    logoSrc: '/assets/partners/logo-6.png',
  },
];

export function PartnershipsSection({ language }: PartnershipsSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const isInView = useInView(sectionRef, {
    once: false,
    amount: 0.06,
    margin: '0px 0px -24px 0px',
  });
  const [selectedPartner, setSelectedPartner] = useState<PartnerItem | null>(
    null
  );
  const isNl = language === 'NL';

  return (
    <section
      id="work"
      ref={sectionRef}
      aria-labelledby="partnerships-heading"
      className="relative w-full bg-[#ecf5f4] dark:bg-[#12110b] px-3 sm:px-6 lg:px-[36px] pt-3 pb-12 sm:pt-5 sm:pb-16 transition-colors duration-500"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        {/* Full-Width Framed Card with Instant-Trigger Scroll Sheet Rise & Scale */}
        <motion.div
          initial={{ y: 36, scale: 0.96, opacity: 0 }}
          animate={
            isInView
              ? { y: 0, scale: 1, opacity: 1 }
              : { y: 36, scale: 0.96, opacity: 0 }
          }
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full rounded-[18px] border border-black/[0.08] dark:border-white/[0.1] bg-[#f5f6fa] dark:bg-[#181712] px-6 py-10 sm:px-10 sm:py-12 lg:px-[56px] lg:py-[52px] shadow-[0_32px_64px_-24px_rgba(18,17,11,0.11)] will-change-transform"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-12">
            {/* Left Column: Masked Baseline Heading + Subtitle */}
            <div className="lg:col-span-4 flex flex-col justify-center">
              <div className="overflow-hidden pb-1">
                <motion.h2
                  id="partnerships-heading"
                  initial={{ y: '105%', rotate: 2, opacity: 0 }}
                  animate={
                    isInView
                      ? { y: '0%', rotate: 0, opacity: 1 }
                      : { y: '105%', rotate: 2, opacity: 0 }
                  }
                  transition={{
                    duration: 0.62,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.02,
                  }}
                  className="text-[24px] sm:text-[28px] lg:text-[31px] font-semibold tracking-[-0.025em] text-[#17191c] dark:text-[#f4efea] origin-bottom-left will-change-transform"
                >
                  {isNl ? 'Onze Partnerschappen' : 'Our Partnerships'}
                </motion.h2>
              </div>

              <div className="mt-3.5 overflow-hidden">
                <motion.p
                  initial={{ y: '105%', rotate: 1.5, opacity: 0 }}
                  animate={
                    isInView
                      ? { y: '0%', rotate: 0, opacity: 1 }
                      : { y: '105%', rotate: 1.5, opacity: 0 }
                  }
                  transition={{
                    duration: 0.62,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.06,
                  }}
                  className="text-[15px] sm:text-[16.5px] leading-[1.45] text-[#7c848d] dark:text-[#9e9b91] max-w-[360px] origin-bottom-left will-change-transform"
                >
                  {isNl
                    ? 'Dynamische Teams, Vertrouwde Partnerschappen, Blijvende Impact'
                    : 'Dynamic Teams, Trusted Partnerships, Lasting Impact'}
                </motion.p>
              </div>

              {selectedPartner && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-xs sm:text-sm font-medium text-[#ff4f31]"
                >
                  {selectedPartner.name} — {selectedPartner.description}
                </motion.p>
              )}
            </div>

            {/* Right Column: Wide 3x2 Grid of 6 Crisp White Partner Logo Tiles with Snappy Staggered Pop-Scale */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {PARTNERS.map((partner, idx) => {
                const isSelected = selectedPartner?.id === partner.id;
                return (
                  <motion.button
                    key={partner.id}
                    type="button"
                    data-testid={partner.id}
                    aria-label={partner.name}
                    onClick={() =>
                      setSelectedPartner((prev) =>
                        prev?.id === partner.id ? null : partner
                      )
                    }
                    initial={{ y: 28, scale: 0.88, opacity: 0 }}
                    animate={
                      isInView
                        ? { y: 0, scale: 1, opacity: 1 }
                        : { y: 28, scale: 0.88, opacity: 0 }
                    }
                    transition={{
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.03 + idx * 0.03,
                    }}
                    className={`group relative flex h-[96px] sm:h-[110px] lg:h-[118px] w-full items-center justify-center rounded-[12px] bg-[#fdfdfd] dark:bg-[#22211a] px-6 cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-12px_rgba(18,17,11,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4f31] will-change-transform ${
                      isSelected ? 'ring-2 ring-[#ff4f31]/60' : ''
                    }`}
                  >
                    <motion.div
                      initial={{ scale: 0.84, opacity: 0 }}
                      animate={
                        isInView
                          ? { scale: 1, opacity: 1 }
                          : { scale: 0.84, opacity: 0 }
                      }
                      transition={{
                        duration: 0.58,
                        ease: [0.16, 1, 0.3, 1],
                        delay: 0.06 + idx * 0.03,
                      }}
                      className="relative w-[176px] sm:w-[196px] lg:w-[214px] h-[64px] sm:h-[72px] transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                    >
                      <Image
                        src={partner.logoSrc}
                        alt={partner.name}
                        fill
                        sizes="220px"
                        referrerPolicy="no-referrer"
                        draggable={false}
                        className="object-contain dark:invert"
                      />
                    </motion.div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
