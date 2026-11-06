'use client';

import React from 'react';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { LanguageCode, ThemeMode } from '@/lib/hero-config';

interface StudioFooterProps {
  theme: ThemeMode;
  language: LanguageCode;
  onSelectSection?: (sectionId: string) => void;
}

export function StudioFooter({
  theme,
  language,
  onSelectSection,
}: StudioFooterProps) {
  const isNl = language === 'NL';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { id: 'home', labelEn: 'Home', labelNl: 'Home' },
    { id: 'work', labelEn: 'Works', labelNl: 'Werk' },
    { id: 'partnerships', labelEn: 'Partnerships', labelNl: 'Partners' },
    { id: 'impact', labelEn: 'Creative Impact', labelNl: 'Impact' },
    { id: 'insights', labelEn: 'FAQ', labelNl: 'FAQ' },
    { id: 'contact', labelEn: 'Contact', labelNl: 'Contact' },
  ];

  const socialLinks = [
    { label: 'Instagram', href: 'https://instagram.com' },
    { label: 'X / Twitter', href: 'https://x.com' },
    { label: 'LinkedIn', href: 'https://linkedin.com' },
    { label: 'Vimeo', href: 'https://vimeo.com' },
    { label: 'Behance', href: 'https://behance.net' },
  ];

  return (
    <footer
      aria-label="FRXCX Studio Footer"
      className="relative w-full bg-[#ecf5f4] dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] border-t border-black/[0.08] dark:border-white/[0.08] px-4 sm:px-6 lg:px-[36px] pt-16 sm:pt-20 pb-12 transition-colors duration-500 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-[1392px]">
        {/* Top Row: Grand Brand Statement & Studio Ethos */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 pb-14 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <span className="block text-xs font-semibold tracking-[0.25em] uppercase text-[#ff4f31] mb-2">
              FRXCX STUDIO
            </span>
            <h3 className="text-3xl sm:text-5xl lg:text-[62px] font-semibold tracking-[-0.035em] leading-[1.05]">
              Think. Shoot. Design.
            </h3>
            <p className="mt-3 text-sm sm:text-base text-[#12110b]/65 dark:text-[#f4efea]/65 max-w-md">
              {isNl
                ? 'Een mensgericht digitaal ontwerpbureau in Brussel & New York voor toonaangevende merken wereldwijd.'
                : 'A human-centered digital design and creative studio in New York & Brussels crafting category-defining brands.'}
            </p>
          </div>

          {/* Quick Back-to-Top Button */}
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top of page"
            className="group self-start lg:self-end inline-flex items-center gap-3 rounded-full bg-[#f4efea] dark:bg-[#1e1d17] hover:bg-[#ff4f31] hover:text-white dark:hover:bg-[#ff4f31] dark:hover:text-white px-5 py-3 text-xs sm:text-sm font-semibold tracking-[-0.01em] transition-all duration-300 border border-black/[0.06] dark:border-white/[0.08] shadow-xs cursor-pointer"
          >
            <span>{isNl ? 'Terug naar boven' : 'Back to top'}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-white group-hover:text-[#ff4f31] transition-colors">
              <ArrowUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </span>
          </button>
        </div>

        {/* Middle Grid: Nav Links, Socials & Coordinates */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 sm:gap-10 py-12">
          {/* Navigation Column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#12110b]/50 dark:text-[#f4efea]/50 mb-4">
              {isNl ? 'Navigatie' : 'Navigation'}
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectSection) {
                        onSelectSection(link.id);
                      } else {
                        const el = document.getElementById(link.id);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="hover:text-[#ff4f31] transition-colors cursor-pointer"
                  >
                    {isNl ? link.labelNl : link.labelEn}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Socials Column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#12110b]/50 dark:text-[#f4efea]/50 mb-4">
              {isNl ? 'Kanalen' : 'Connect'}
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              {socialLinks.map((soc) => (
                <li key={soc.label}>
                  <a
                    href={soc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 hover:text-[#ff4f31] transition-colors"
                  >
                    <span>{soc.label}</span>
                    <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Locations & Coordinates */}
          <div className="col-span-2 sm:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#12110b]/50 dark:text-[#f4efea]/50 mb-4">
              {isNl ? 'Studio Hubs' : 'Studio Hubs'}
            </h4>
            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <span className="block font-semibold">New York</span>
                <span className="text-xs text-[#12110b]/60 dark:text-[#f4efea]/60">
                  40.7128° N, 74.0060° W
                </span>
              </div>
              <div>
                <span className="block font-semibold">Brussels</span>
                <span className="text-xs text-[#12110b]/60 dark:text-[#f4efea]/60">
                  50.8503° N, 4.3517° E
                </span>
              </div>
            </div>
          </div>

          {/* Inquiries */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#12110b]/50 dark:text-[#f4efea]/50 mb-4">
              {isNl ? 'Direct Contact' : 'Direct Inquiries'}
            </h4>
            <div className="space-y-2 text-sm font-medium">
              <a
                href="mailto:hello@frxcx.studio"
                className="block text-[#ff4f31] hover:underline"
              >
                hello@frxcx.studio
              </a>
              <a
                href="tel:+19298225127"
                className="block hover:text-[#ff4f31] transition-colors"
              >
                +1 (929) 822-5127
              </a>
              <p className="text-xs text-[#12110b]/55 dark:text-[#f4efea]/55 pt-1">
                {isNl
                  ? 'Wereldwijd remote beschikbaar'
                  : 'Available globally across all timezones'}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Sub-Footer: Copyright & Fine Print */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-black/[0.06] dark:border-white/[0.08] text-xs text-[#12110b]/55 dark:text-[#f4efea]/55">
          <p>
            &copy; {new Date().getFullYear()} FRXCX Studio. All rights
            reserved.
          </p>
          <p className="flex items-center gap-3">
            <span>Privacy Policy</span>
            <span aria-hidden="true">•</span>
            <span>Terms of Service</span>
            <span aria-hidden="true">•</span>
            <span>Crafted with Precision</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
