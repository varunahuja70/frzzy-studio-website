'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { WeichieNavbar } from '@/components/weichie-navbar';
import { HeroSection } from '@/components/hero-section';
import { PartnershipsSection } from '@/components/partnerships-section';
import { LatestWorksSection } from '@/components/latest-works-section';
import { CreativeImpactSection } from '@/components/creative-impact-section';
import { ReviewsSection } from '@/components/reviews-section';
import { FaqSection } from '@/components/faq-section';
import { ContactBookingSection } from '@/components/contact-booking-section';
import { StudioFooter } from '@/components/studio-footer';
import { SmoothScrollProvider } from '@/components/smooth-scroll-provider';
import {
  LanguageCode,
  ThemeMode,
  WorkItemConfig,
  toggleLanguage,
} from '@/lib/hero-config';

export default function HomePage() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [language, setLanguage] = useState<LanguageCode>('EN');
  const [animationKey, setAnimationKey] = useState(0);
  const [selectedWork, setSelectedWork] = useState<WorkItemConfig | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedWork(null);
        setContactOpen(false);
        setActiveSection(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const handleToggleLanguage = useCallback(() => {
    setLanguage((prev) => toggleLanguage(prev));
  }, []);

  const handleSelectSection = useCallback((sectionId: string) => {
    if (sectionId === 'home') {
      setActiveSection(null);
      setAnimationKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (sectionId === 'work') {
      const el = document.getElementById('latest-works') || document.getElementById('work');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (sectionId === 'about') {
      const el = document.getElementById('about');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (sectionId === 'insights') {
      const el = document.getElementById('insights');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (sectionId === 'contact') {
      const el = document.getElementById('contact');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (sectionId === 'partnerships') {
      const el = document.getElementById('partnerships') || document.getElementById('work');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (sectionId === 'impact') {
      const el = document.getElementById('about');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    setActiveSection(sectionId);
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setContactError('Please enter a valid email address.');
      return;
    }
    if (!contactMessage.trim()) {
      setContactError('Please tell us briefly about your project.');
      return;
    }
    setContactError('');
    setContactSubmitted(true);
  };

  return (
    <SmoothScrollProvider>
      <main
        id="top"
        style={{ fontFamily: 'var(--font-nav), sans-serif' }}
        className="relative min-h-screen w-full bg-[#ecf5f4] dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] transition-colors duration-500 overflow-x-hidden"
      >
        {/* Exact FRXCX Navbar */}
        <WeichieNavbar
          theme={theme}
          onToggleTheme={handleToggleTheme}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          onOpenContact={() => {
            const el = document.getElementById('contact');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              setContactSubmitted(false);
              setContactOpen(true);
            }
          }}
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
        />

        {/* Hero Section with 4 Auto-Playing Fixed-Shape Inline Media Boxes */}
        <div style={{ fontFamily: 'var(--font-hero), "Helvetica Neue", Arial, sans-serif' }}>
          <HeroSection
            theme={theme}
            language={language}
            animationKey={animationKey}
          />
        </div>

        {/* Second Section: Our Works (9:16 3D Perspective Video Showcase) */}
        <LatestWorksSection
          theme={theme}
          language={language}
          onSelectWork={(work) => setSelectedWork(work)}
        />

        {/* Third Section: Our Partnerships (Positioned Below Work Section) */}
        <PartnershipsSection theme={theme} language={language} />

        {/* Fourth Section: FRXCX Studio — Creative Impact */}
        <CreativeImpactSection theme={theme} language={language} />

        {/* Fifth Section: Client Reviews (3-Column Staggered Downward Loop / Fixed Grid Directly Above FAQ) */}
        <ReviewsSection theme={theme} language={language} />

        {/* Sixth Section: FAQ — Answers to Common Questions on Hero Background (#ecf5f4) */}
        <FaqSection
          theme={theme}
          language={language}
          onBookProject={() => {
            const el = document.getElementById('contact');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              setContactSubmitted(false);
              setContactOpen(true);
            }
          }}
        />

        {/* Seventh Section: Contact & Booking Section (Inspired by Reference Layout) */}
        <ContactBookingSection
          theme={theme}
          language={language}
          calendlyUrl={
            process.env.NEXT_PUBLIC_CALENDLY_URL ||
            'https://calendly.com/frxcx-studio/intro-call'
          }
          studioEmail="hello@frxcx.studio"
          studioPhone="+1 (929) 822-5127"
          studioLocations="New York & Brussels • Global Remote"
        />

        {/* FRXCX Studio Footer */}
        <StudioFooter
          theme={theme}
          language={language}
          onSelectSection={handleSelectSection}
        />

      {/* 9:16 Vertical Work Reel Modal */}
      <AnimatePresence>
        {selectedWork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setSelectedWork(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-6"
            role="dialog"
            aria-modal="true"
            aria-label={selectedWork.title}
          >
            <motion.div
              initial={{ y: 36, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 24, scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden rounded-[26px] bg-[#f4efea] dark:bg-[#1e1d17] text-[#12110b] dark:text-[#f4efea] shadow-2xl p-5"
            >
              <div className="flex items-center justify-between pb-3.5">
                <div>
                  <span className="inline-block rounded-full bg-black/8 dark:bg-white/10 px-3 py-0.5 text-xs font-medium">
                    {selectedWork.category}
                  </span>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight">
                    {selectedWork.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWork(null)}
                  aria-label="Close 9:16 reel preview"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/8 dark:bg-white/10 hover:bg-[#ff4f31] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative overflow-hidden rounded-[20px] bg-black aspect-[9/16] max-h-[68vh] mx-auto">
                <video
                  src={selectedWork.videoSrc}
                  poster={selectedWork.posterSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Section Quick Drawer */}
      <AnimatePresence>
        {activeSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveSection(null)}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-xs pt-28 px-6"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeSection} overview`}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-[24px] bg-[#f4efea] dark:bg-[#1e1d17] p-7 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold capitalize">
                  {activeSection}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  aria-label="Close navigation preview"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/8 dark:bg-white/10 hover:bg-[#ff4f31] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-sm opacity-80 leading-relaxed">
                Weichie is a human-centered web design and development studio in
                Brussels &amp; New York following one simple creative pattern:
                Think. Shoot. Design.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(null);
                    setAnimationKey((k) => k + 1);
                  }}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold bg-black/8 dark:bg-white/10 hover:bg-black/15 transition-colors cursor-pointer"
                >
                  Replay Hero Animation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(null);
                    setContactOpen(true);
                  }}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold bg-[#ff4f31] text-white hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Get in touch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Get in touch" Interactive Drawer */}
      <AnimatePresence>
        {contactOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setContactOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Get in touch"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative h-full max-h-[640px] w-full max-w-md rounded-[28px] bg-[#f4efea] dark:bg-[#1e1d17] p-8 shadow-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {language === 'EN' ? 'Get in touch' : 'Contacteer ons'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setContactOpen(false)}
                    aria-label="Close contact drawer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/8 dark:bg-white/10 hover:bg-[#ff4f31] hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-sm opacity-75">
                  Brussels &amp; New York — Tell us what you are building.
                </p>

                {contactSubmitted ? (
                  <div className="mt-8 rounded-2xl bg-black/5 dark:bg-white/5 p-6">
                    <p className="text-lg font-semibold">Message received.</p>
                    <p className="mt-1 text-sm opacity-75">
                      Our team in Brussels &amp; New York will get back to{' '}
                      <span className="font-medium">{contactEmail}</span> shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="mt-6 space-y-4" noValidate>
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-xs font-semibold mb-1.5"
                      >
                        Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full rounded-xl bg-white dark:bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff4f31]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-message"
                        className="block text-xs font-semibold mb-1.5"
                      >
                        Project brief
                      </label>
                      <textarea
                        id="contact-message"
                        rows={4}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Think. Shoot. Design..."
                        className="w-full rounded-xl bg-white dark:bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff4f31] resize-none"
                      />
                    </div>
                    {contactError && (
                      <p role="alert" className="text-xs font-medium text-[#ff4f31]">
                        {contactError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="w-full rounded-full bg-[#ff4f31] py-3.5 text-sm font-semibold text-white hover:opacity-95 transition-opacity cursor-pointer"
                    >
                      Send Inquiry
                    </button>
                  </form>
                )}
              </div>

              <div className="pt-4 border-t border-black/10 dark:border-white/10 text-xs opacity-65 flex items-center justify-between">
                <span>hello@weichie.com</span>
                <span>+1 (929) 822-5127</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
    </SmoothScrollProvider>
  );
}
