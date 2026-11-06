'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
  WEICHIE_NAV_ITEMS,
  LanguageCode,
  ThemeMode,
  toggleLanguage,
} from '@/lib/hero-config';

interface WeichieNavbarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  language: LanguageCode;
  onToggleLanguage: () => void;
  onOpenContact: () => void;
  activeSection: string | null;
  onSelectSection: (sectionId: string) => void;
}

export function WeichieNavbar({
  theme,
  onToggleTheme,
  language,
  onToggleLanguage,
  onOpenContact,
  onSelectSection,
}: WeichieNavbarProps) {
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [isContactHovered, setIsContactHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = theme === 'dark';
  const pillSurfaceClass = isDark
    ? 'bg-[#1e1d17] text-[#f4efea]'
    : 'bg-[#f4efea] text-[#12110b]';

  return (
    <motion.header
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
      className="fixed top-0 left-0 right-0 z-40 w-full pt-[7px] pb-[7px] select-none border-none"
    >
      {/* True Multi-Stage Progressive Blur Backdrop:
          - Bottom edge (54px–76px): barely-there ~0.8px blur fading to 0%
          - Middle band (26px–56px): gentle ~3px blur
          - Upper band (0px–34px): richer ~7.5px blur at the very top
          - Zero sharp bottom border */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[76px] -z-10 overflow-hidden"
      >
        {/* Layer 1: Full-height whisper blur (1px) + subtle translucent veil that feathers out completely at the bottom */}
        <div
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.18) 78%, rgba(0,0,0,0) 100%)',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.18) 78%, rgba(0,0,0,0) 100%)',
          }}
          className="absolute inset-0 backdrop-blur-[1px] bg-gradient-to-b from-[#ecf5f4]/38 via-[#ecf5f4]/14 to-transparent dark:from-[#12110b]/55 dark:via-[#12110b]/20 dark:to-transparent transition-colors duration-500"
        />
        {/* Layer 2: Mid-upper progressive blur (3px) */}
        <div
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0.08) 68%, rgba(0,0,0,0) 90%)',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0.08) 68%, rgba(0,0,0,0) 90%)',
          }}
          className="absolute inset-0 backdrop-blur-[3px]"
        />
        {/* Layer 3: Top-concentrated blur (6.5px) */}
        <div
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.45) 28%, rgba(0,0,0,0) 58%)',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.45) 28%, rgba(0,0,0,0) 58%)',
          }}
          className="absolute inset-0 backdrop-blur-[6.5px]"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between pl-2.5 pr-2.5 sm:pl-4 sm:pr-4 lg:pl-[16px] lg:pr-[16px] h-[48px]">
        {/* Left: Cropped FRXCX Brand Logo Icon — larger visual presence & shifted slightly right */}
        <a
          href="#top"
          aria-label="FRXCX Studio Home"
          data-testid="navbar-brand-logo"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('home');
          }}
          className="relative inline-flex items-center justify-center shrink-0 w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] lg:w-[48px] lg:h-[48px] ml-2 sm:ml-4 lg:ml-[22px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4f31] transition-transform duration-300 hover:scale-[1.04]"
        >
          {isDark ? (
            <Image
              src="/assets/aistudio/icon_dark_theam_png_crop_dccd2441.png"
              alt="FRXCX Studio Dark Theme Logo"
              width={56}
              height={56}
              priority
              referrerPolicy="no-referrer"
              draggable={false}
              className="w-full h-full object-contain mix-blend-screen select-none"
            />
          ) : (
            <Image
              src="/assets/aistudio/icon_light_theam_png_crop_7be5d239.png"
              alt="FRXCX Studio Light Theme Logo"
              width={56}
              height={56}
              priority
              referrerPolicy="no-referrer"
              draggable={false}
              className="w-full h-full object-contain mix-blend-multiply select-none"
            />
          )}
        </a>

        {/* Right-aligned Navigation + Get in Touch + Controls */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-[24px] h-[44px] mr-0">
            <nav aria-label="Main navigation">
              <ul className="flex items-center gap-[24px]">
                {WEICHIE_NAV_ITEMS.map((item) => {
                  const label = language === 'EN' ? item.labelEn : item.labelNl;
                  const chars =
                    language === 'EN' ? item.charactersEn : item.charactersNl;
                  const isHovered = hoveredNav === item.id;

                  return (
                    <li key={item.id} className="inline-flex items-center">
                      <a
                        href={item.href}
                        data-track={`nav_${item.id}`}
                        onMouseEnter={() => setHoveredNav(item.id)}
                        onMouseLeave={() => setHoveredNav(null)}
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectSection(item.id);
                        }}
                        className="relative inline-flex items-center text-[14.5px] font-semibold leading-[1.35] tracking-[-0.01em] whitespace-nowrap shrink-0 overflow-hidden py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4f31]"
                      >
                        <span className="sr-only">{label}</span>
                        <span
                          aria-hidden="true"
                          className="inline-flex items-center"
                        >
                          {chars.map((char, idx) => (
                            <span
                              key={`${item.id}-${idx}`}
                              className="relative inline-block overflow-hidden h-[1.35em] py-[0.05em]"
                            >
                              <span
                                className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                style={{
                                  transitionDelay: `${idx * 18}ms`,
                                  transform: isHovered
                                    ? 'translateY(-135%)'
                                    : 'translateY(0%)',
                                }}
                              >
                                {char === ' ' ? '\u00A0' : char}
                              </span>
                              <span
                                className="absolute left-0 top-0 inline-block py-[0.05em] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                style={{
                                  transitionDelay: `${idx * 18}ms`,
                                  transform: isHovered
                                    ? 'translateY(0%)'
                                    : 'translateY(135%)',
                                }}
                              >
                                {char === ' ' ? '\u00A0' : char}
                              </span>
                            </span>
                          ))}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Exact Weichie "Get in touch" Pill Button with Orange Waving Hand Circle */}
            <button
              type="button"
              data-track="nav_get_in_touch"
              onClick={onOpenContact}
              onMouseEnter={() => setIsContactHovered(true)}
              onMouseLeave={() => setIsContactHovered(false)}
              className={`group inline-flex items-center gap-[12px] h-[44px] rounded-[40px] pl-[15px] pr-[7px] py-[7px] text-[14.5px] font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${pillSurfaceClass} hover:shadow-sm`}
            >
              <span className="relative overflow-hidden h-[1.25em] inline-flex items-center">
                <span
                  className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: isContactHovered
                      ? 'translateY(-105%)'
                      : 'translateY(0%)',
                  }}
                >
                  {language === 'EN' ? 'Get in touch' : 'Contacteer ons'}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: isContactHovered
                      ? 'translateY(0%)'
                      : 'translateY(105%)',
                  }}
                >
                  {language === 'EN' ? 'Get in touch' : 'Contacteer ons'}
                </span>
              </span>

              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[#ff4f31] text-[#f4efea] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              >
                <svg
                  width="17"
                  height="24"
                  viewBox="0 0 16.3384 23.6096"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-[13px] h-[18px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom group-hover:rotate-[14deg]"
                >
                  <path
                    d="M3.98877 11.1797L4.01535 10.3889C4.01535 9.031 3.94424 7.67379 3.80203 6.32313L3.72402 5.58309C3.63152 4.70463 4.2404 3.90624 5.11196 3.763L5.27764 3.73573C6.22721 3.57971 7.11119 4.25763 7.20715 5.21513L7.29171 6.05873C7.42046 7.34484 7.48501 8.63682 7.48501 9.92948L7.54058 10.499C7.53955 10.5253 7.57821 10.5277 7.58062 10.5018L7.61169 10.4697C7.79808 8.22365 7.82017 5.96692 7.67762 3.71744L7.60375 2.55283C7.53748 1.5073 8.31687 0.599849 9.36033 0.507688C10.448 0.411386 11.3989 1.23531 11.4583 2.32571L11.4849 2.81378C11.6336 5.53649 11.5418 8.26748 11.2101 10.974L11.5415 9.69891C11.8276 8.29682 11.9719 6.8692 11.9719 5.43812C11.9719 4.53998 12.6833 3.80304 13.5811 3.77163C14.4927 3.73953 15.261 4.44644 15.3049 5.35769L15.348 6.24996C15.4288 7.923 14.8551 10.8504 14.5431 12.4962L14.3798 13.3204"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M0.99855 15.9141C0.377242 16.4319 0.335821 17.4118 0.876704 18.0839L3.393 21.2121C3.9791 21.9411 5.06122 22.0185 5.74535 21.3806L5.79643 21.333C6.42119 20.7503 6.48194 19.7814 5.93519 19.1252L3.13896 16.1216C3.13896 16.1216 2.08653 15.008 0.998895 15.9145L0.99855 15.9141Z"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeMiterlimit="10"
                  />
                  <path
                    d="M12.1808 15.4665L8.94001 16.1803C8.04084 16.3785 7.16514 15.7648 7.04399 14.8521C6.93905 14.0603 7.44473 13.3158 8.21964 13.1214L10.5699 12.5319C14.0731 11.6531 17.0198 15.3133 15.3612 18.5216C15.2901 18.6594 15.2121 18.7954 15.1279 18.9289L14.3499 20.1609C13.4134 21.6434 11.9068 22.6744 10.1857 23.0099C8.92586 23.2557 7.61973 23.0437 6.50241 22.4124L5.25669 21.7089"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11.0161 15.7229C11.0161 15.7229 8.92544 15.9583 7.40151 19.6596"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M7.07933 14.7494L4.18714 11.4403C3.49404 10.6471 2.26454 10.6343 1.55487 11.4126L1.46512 11.511C0.850374 12.1851 0.851064 13.2169 1.46685 13.8903L5.44219 18.2377C6.15117 19.0133 7.37687 19.0009 8.06998 18.2111C8.51318 17.7065 8.62052 17.012 8.39202 16.4156L8.25292 16.1015"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeMiterlimit="10"
                  />
                </svg>
              </span>
            </button>
          </div>

          {/* Right Controls: Theme Toggle (42x42) + Language Switcher (42x42) + Mobile Hamburger */}
          <div className="flex items-center gap-[6px] ml-[8px]">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-pressed={isDark}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title="Switch theme"
              className={`group relative flex items-center justify-center w-[42px] h-[42px] rounded-[40px] backdrop-blur-[22px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 cursor-pointer ${pillSurfaceClass}`}
            >
              <span
                className="relative w-[18px] h-[18px] overflow-hidden block"
                aria-hidden="true"
              >
                {/* Sun Icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-[18px] h-[18px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: isDark ? 'translateY(-120%) rotate(45deg)' : 'translateY(0%) rotate(0deg)',
                  }}
                >
                  <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
                {/* Moon Icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute inset-0 w-[18px] h-[18px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: isDark ? 'translateY(0%) rotate(0deg)' : 'translateY(120%) rotate(-45deg)',
                  }}
                >
                  <path
                    d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </button>

            {/* Language Switcher (EN / NL) */}
            <button
              type="button"
              onClick={onToggleLanguage}
              title={`Switch to ${toggleLanguage(language)}`}
              aria-label={`Switch language to ${toggleLanguage(language)}`}
              className={`group relative flex items-center justify-center w-[42px] h-[42px] rounded-[40px] backdrop-blur-[22px] text-[13.5px] font-semibold tracking-[-0.01em] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 cursor-pointer ${pillSurfaceClass}`}
            >
              <span
                className="relative h-[1.25em] overflow-hidden inline-flex flex-col items-center justify-center"
                aria-hidden="true"
              >
                <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full">
                  {language}
                </span>
                <span className="absolute top-full left-0 right-0 inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full text-[#ff4f31]">
                  {toggleLanguage(language)}
                </span>
              </span>
            </button>

            {/* Mobile Hamburger Button (exact Weichie SVG shape) */}
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={`md:hidden flex items-center justify-center w-[40px] h-[40px] rounded-[40px] backdrop-blur-[22px] cursor-pointer ${pillSurfaceClass}`}
            >
              <svg
                className="w-[22px] h-[22px]"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="currentColor"
                  d="M27.535 2.31179C27.535 1.03423 26.5351 0 25.3025 0H6.69751C5.46485 0 4.46501 1.03422 4.46501 2.30926C4.46501 3.58682 3.46517 4.62104 2.23251 4.62104C0.999858 4.62104 0 5.65526 0 6.93029V7.69075C0 8.96578 0.999858 10 2.23251 10H2.96769C4.20035 10 5.20019 8.96578 5.20019 7.69075C5.20019 6.41572 6.20003 5.37896 7.43269 5.37896H24.5673C25.8 5.37896 26.7998 6.41318 26.7998 7.68821C26.7998 8.96325 27.7997 10 29.0323 10H29.7675C31.0002 10 32 8.96578 32 7.69075V6.93029C32 5.65526 31.0002 4.62104 29.7675 4.62104C28.5348 4.62104 27.535 3.58683 27.535 2.31179ZM26.8002 13H2.23234C0.999781 13 0 14.1536 0 15.5759V16.4241C0 17.8464 0.999781 19 2.23234 19H29.7677C31.0002 19 32 17.8464 32 16.4241V15.5759C32 14.1536 31.0002 13 29.7677 13H26.7978H26.8002ZM26.7998 24.3118C26.7998 25.5868 25.8 26.621 24.5673 26.621H7.43269C6.20003 26.621 5.20019 25.5868 5.20019 24.3118C5.20019 23.0368 4.20035 22 2.96769 22H2.23251C0.999858 22 0 23.0342 0 24.3092V25.0697C0 26.3447 0.999858 27.379 2.23251 27.379C3.46517 27.379 4.46501 28.4132 4.46501 29.6882C4.46501 30.9658 5.46485 32 6.69751 32H25.3025C26.5351 32 27.535 30.9658 27.535 29.6908C27.535 28.4132 28.5348 27.379 29.7675 27.379C31.0002 27.379 32 26.3447 32 25.0697V24.3092C32 23.0342 31.0002 22 29.7675 22H29.0323C27.7997 22 26.7998 23.0342 26.7998 24.3092V24.3118Z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`md:hidden mx-6 mt-3 rounded-3xl p-5 shadow-lg ${pillSurfaceClass}`}
        >
          <ul className="flex flex-col gap-3">
            {WEICHIE_NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    onSelectSection(item.id);
                  }}
                  className="block py-2 text-lg font-semibold"
                >
                  {language === 'EN' ? item.labelEn : item.labelNl}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenContact();
                }}
                className="w-full flex items-center justify-between rounded-full bg-[#ff4f31] text-white px-5 py-3 font-semibold"
              >
                <span>{language === 'EN' ? 'Get in touch' : 'Contacteer ons'}</span>
                <span>→</span>
              </button>
            </li>
          </ul>
        </motion.div>
      )}
    </motion.header>
  );
}
