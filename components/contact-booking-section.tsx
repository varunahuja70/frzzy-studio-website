'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useInView } from 'motion/react';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  Compass,
  ExternalLink,
  Globe,
  Layers,
  MessageSquare,
  Palette,
  Sparkles,
} from 'lucide-react';
import { LanguageCode, ThemeMode } from '@/lib/hero-config';

export interface ContactBookingSectionProps {
  theme: ThemeMode;
  language: LanguageCode;
  calendlyUrl?: string;
  studioEmail?: string;
  studioPhone?: string;
  studioLocations?: string;
}

const DEFAULT_CALENDLY_URL =
  'https://calendly.com/d/cp35-m2m-w7x/30-minute-meeting';

type ActiveTab = 'message' | 'call';

const SERVICE_CATEGORIES = [
  { id: 'web', en: 'Web Design & Dev', nl: 'Webdesign & Dev', icon: Globe },
  { id: 'branding', en: 'Brand Identity', nl: 'Merkidentiteit', icon: Palette },
  { id: '3d-motion', en: '3D & Motion', nl: '3D & Motion', icon: Layers },
  { id: 'direction', en: 'Creative Direction', nl: 'Creatieve Directie', icon: Compass },
  { id: 'production', en: 'Full Production', nl: 'Volledige Productie', icon: Sparkles },
];

interface FormState {
  category: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  agreeToTerms: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
  agreeToTerms?: string;
}

export function ContactBookingSection({
  theme,
  language,
  calendlyUrl = DEFAULT_CALENDLY_URL,
}: ContactBookingSectionProps) {
  const isDark = theme === 'dark';
  const isNl = language === 'NL';

  const sectionRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const isCardInView = useInView(cardRef, { once: false, amount: 0.1 });

  const [activeTab, setActiveTab] = useState<ActiveTab>('message');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Calendly URL state (persists custom URLs if previously set in localStorage)
  const [customCalendlyUrl, setCustomCalendlyUrl] = useState(calendlyUrl);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('frxcx_calendly_url');
      if (saved && saved.trim()) {
        setCustomCalendlyUrl(saved.trim());
      } else {
        setCustomCalendlyUrl(calendlyUrl);
      }
    } catch {
      setCustomCalendlyUrl(calendlyUrl);
    }
  }, [calendlyUrl]);

  const [formData, setFormData] = useState<FormState>({
    category: 'Full Production',
    firstName: '',
    lastName: '',
    email: '',
    message: '',
    agreeToTerms: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!formData.firstName.trim()) {
      errs.firstName = isNl ? 'Voornaam is verplicht' : 'First name required';
    }
    if (!formData.lastName.trim()) {
      errs.lastName = isNl ? 'Achternaam is verplicht' : 'Last name required';
    }
    if (!formData.email.trim()) {
      errs.email = isNl ? 'E-mailadres is verplicht' : 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = isNl ? 'Ongeldig e-mailadres' : 'Valid email required';
    }
    if (!formData.message.trim()) {
      errs.message = isNl ? 'Bericht is verplicht' : 'Message is required';
    }
    if (!formData.agreeToTerms) {
      errs.agreeToTerms = isNl
        ? 'Ga akkoord met de voorwaarden'
        : 'Please agree to terms';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  const resetForm = () => {
    setFormData({
      category: 'Full Production',
      firstName: '',
      lastName: '',
      email: '',
      message: '',
      agreeToTerms: true,
    });
    setErrors({});
    setIsSubmitted(false);
  };

  const getThemedCalendlyUrl = (rawUrl: string) => {
    try {
      const url = new URL(rawUrl);
      const bg = isDark ? '191812' : 'ffffff';
      const text = isDark ? 'f4efea' : '12110b';
      const primary = 'ff4f31';
      url.searchParams.set('hide_landing_page_details', '1');
      url.searchParams.set('hide_gdpr_banner', '1');
      url.searchParams.set('background_color', bg);
      url.searchParams.set('text_color', text);
      url.searchParams.set('primary_color', primary);
      return url.toString();
    } catch {
      return rawUrl;
    }
  };

  return (
    <section
      id="contact"
      ref={sectionRef}
      data-testid="contact-booking-section"
      aria-labelledby="contact-heading"
      className="relative w-full bg-[#ecf5f4] dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] px-3 sm:px-6 lg:px-8 xl:px-12 py-10 sm:py-14 lg:py-16 transition-colors duration-500"
    >
      <div className="mx-auto w-full max-w-[1360px]">
        {/* ================= ULTRA-PREMIUM DUAL-PANEL CARD (Minimal Architectural Edges: rounded-[20px]) ================= */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 18 }}
          animate={isCardInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full rounded-[20px] bg-white dark:bg-[#181712] p-3 sm:p-5 lg:p-6 shadow-[0_20px_50px_-20px_rgba(18,17,11,0.08)] dark:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.7)] border border-black/[0.06] dark:border-white/[0.08] grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch transition-colors duration-500"
        >
          {/* ================= LEFT COLUMN: 100% PURE CONTINUOUS VIDEO (Zero text, Zero buttons, Non-pausable) ================= */}
          <div className="lg:col-span-5 relative rounded-[16px] overflow-hidden min-h-[420px] sm:min-h-[520px] lg:min-h-[720px] lg:h-full bg-[#0c0c0e] pointer-events-none select-none">
            <video
              src="/assets/videos/card-1.mp4"
              poster="/assets/cards/card-1.png"
              autoPlay
              loop
              muted
              playsInline
              disablePictureInPicture
              controls={false}
              className="absolute inset-0 h-full w-full object-cover brightness-[0.95] contrast-[1.04] pointer-events-none select-none"
            />
          </div>

          {/* ================= RIGHT COLUMN: Spacious, Harmonious Vertical Layout ================= */}
          <div className="lg:col-span-7 flex flex-col justify-between px-1 py-1 sm:px-3 sm:py-2 lg:px-4 lg:py-2 min-h-full">
            <div>
              {/* Header Bar: Studio Brand Badge + Apple-style Minimal Tab Switcher */}
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="relative h-5 w-5 shrink-0">
                    <Image
                      src={
                        isDark
                          ? '/assets/aistudio/icon_dark_theam_png_crop_dccd2441.png'
                          : '/assets/aistudio/icon_light_theam_png_crop_7be5d239.png'
                      }
                      alt="FRXCX Studio Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-[14px] font-semibold tracking-tight text-[#12110b] dark:text-[#f4efea]">
                    FRXCX Studio
                  </span>
                </div>

                {/* Minimal Segmented Pill Toggle */}
                <div className="inline-flex items-center p-1 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06] relative">
                  <button
                    type="button"
                    onClick={() => setActiveTab('message')}
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-colors duration-200 cursor-pointer ${
                      activeTab === 'message'
                        ? 'text-[#12110b] dark:text-[#f4efea]'
                        : 'text-[#12110b]/60 dark:text-[#f4efea]/60 hover:text-[#12110b] dark:hover:text-[#f4efea]'
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{isNl ? 'Stuur Bericht' : 'Send a Message'}</span>
                    {activeTab === 'message' && (
                      <motion.div
                        layoutId="minimalTabIndicator"
                        className="absolute inset-0 rounded-[8px] bg-white dark:bg-[#28261e] shadow-xs -z-10"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 32,
                        }}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('call')}
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-colors duration-200 cursor-pointer ${
                      activeTab === 'call'
                        ? 'text-[#12110b] dark:text-[#f4efea]'
                        : 'text-[#12110b]/60 dark:text-[#f4efea]/60 hover:text-[#12110b] dark:hover:text-[#f4efea]'
                    }`}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>{isNl ? 'Boek Gesprek' : 'Book a Call'}</span>
                    {activeTab === 'call' && (
                      <motion.div
                        layoutId="minimalTabIndicator"
                        className="absolute inset-0 rounded-[8px] bg-white dark:bg-[#28261e] shadow-xs -z-10"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 32,
                        }}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Elevated Title */}
              <div className="mb-5">
                <h2
                  id="contact-heading"
                  className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.025em] leading-[1.2] text-[#12110b] dark:text-[#f4efea]"
                >
                  {isNl
                    ? 'Start een project of plan een afspraak'
                    : 'Have a project idea? Let’s discuss it together.'}
                </h2>
                <p className="mt-1 text-[13px] sm:text-[14px] text-[#12110b]/60 dark:text-[#f4efea]/60">
                  {isNl
                    ? 'We reageren binnen 24 uur of kies direct een geschikt moment in onze studio agenda.'
                    : 'Drop us a direct inquiry or select an instant time on our studio calendar.'}
                </p>
              </div>

              {/* Dynamic Content Views */}
              <AnimatePresence mode="wait">
                {activeTab === 'message' ? (
                  /* ================= TAB 1: FORM WITH REDESIGNED CATEGORY CARDS & PROPER SPACING ================= */
                  <motion.div
                    key="tab-message"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {isSubmitted ? (
                      <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff4f31]/10 text-[#ff4f31] mb-4">
                          <Check className="h-7 w-7 stroke-[2.5]" />
                        </div>
                        <h3 className="text-xl font-semibold tracking-tight text-[#12110b] dark:text-[#f4efea]">
                          {isNl ? 'Bericht Ontvangen!' : 'Message Received!'}
                        </h3>
                        <p className="mt-2 max-w-sm text-sm text-[#12110b]/70 dark:text-[#f4efea]/70 leading-relaxed">
                          {isNl
                            ? `Bedankt ${formData.firstName}. We nemen spoedig contact op via ${formData.email}.`
                            : `Thank you, ${formData.firstName}. We received your project brief and will reply to ${formData.email} within 24 hours.`}
                        </p>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="mt-6 inline-flex items-center gap-2 rounded-[12px] bg-black/5 dark:bg-white/10 hover:bg-[#ff4f31] hover:text-white dark:hover:bg-[#ff4f31] dark:hover:text-white px-5 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {isNl
                            ? 'Nieuw bericht versturen'
                            : 'Send another message'}
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleSubmit}
                        noValidate
                        className="space-y-4 sm:space-y-4.5"
                      >
                        {/* REDESIGNED OPTION CARDS: What are you looking to create? */}
                        <div>
                          <label className="block text-[13px] font-medium text-[#12110b]/80 dark:text-[#f4efea]/80 mb-2">
                            {isNl
                              ? 'Wat wil je laten maken?'
                              : 'What are you looking to create?'}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                            {SERVICE_CATEGORIES.map((cat, idx) => {
                              const isSelected = formData.category === cat.en;
                              const IconComponent = cat.icon;
                              const isLastOdd =
                                idx === SERVICE_CATEGORIES.length - 1;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      category: cat.en,
                                    }))
                                  }
                                  className={`relative h-[46px] sm:h-[48px] px-3 sm:px-3.5 rounded-[12px] text-[13px] sm:text-[14px] font-medium transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 text-left ${
                                    isLastOdd ? 'col-span-2 sm:col-span-1' : ''
                                  } ${
                                    isSelected
                                      ? 'bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] shadow-[0_4px_14px_rgba(0,0,0,0.12)] border border-transparent'
                                      : 'bg-black/[0.03] dark:bg-white/[0.04] text-[#12110b]/80 dark:text-[#f4efea]/80 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.07] dark:border-white/[0.08]'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <IconComponent
                                      className={`h-4 w-4 shrink-0 ${
                                        isSelected
                                          ? 'text-[#ff4f31]'
                                          : 'opacity-60'
                                      }`}
                                    />
                                    <span className="truncate">
                                      {isNl ? cat.nl : cat.en}
                                    </span>
                                  </span>
                                  {isSelected ? (
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 dark:bg-black/15">
                                      <Check className="h-3 w-3 stroke-[3]" />
                                    </span>
                                  ) : (
                                    <span className="h-2 w-2 rounded-full bg-black/15 dark:bg-white/20 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Row: First Name & Last Name */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="fn-input"
                              className="block text-[13px] font-medium text-[#12110b]/80 dark:text-[#f4efea]/80 mb-1.5"
                            >
                              {isNl ? 'Voornaam' : 'First Name'}
                            </label>
                            <input
                              id="fn-input"
                              type="text"
                              value={formData.firstName}
                              onChange={(e) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  firstName: e.target.value,
                                }));
                                if (errors.firstName) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    firstName: undefined,
                                  }));
                                }
                              }}
                              placeholder={
                                isNl ? 'Voornaam...' : 'Enter your first name...'
                              }
                              className={`w-full h-[46px] sm:h-[48px] rounded-[12px] bg-[#f8f7f5] dark:bg-black/30 px-3.5 text-[14px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                                errors.firstName
                                  ? 'border-[#ff4f31]'
                                  : 'border-black/[0.07] dark:border-white/[0.09] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                              } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 transition-all`}
                            />
                            {errors.firstName && (
                              <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                                {errors.firstName}
                              </p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="ln-input"
                              className="block text-[13px] font-medium text-[#12110b]/80 dark:text-[#f4efea]/80 mb-1.5"
                            >
                              {isNl ? 'Achternaam' : 'Last Name'}
                            </label>
                            <input
                              id="ln-input"
                              type="text"
                              value={formData.lastName}
                              onChange={(e) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  lastName: e.target.value,
                                }));
                                if (errors.lastName) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    lastName: undefined,
                                  }));
                                }
                              }}
                              placeholder={
                                isNl ? 'Achternaam...' : 'Enter your last name...'
                              }
                              className={`w-full h-[46px] sm:h-[48px] rounded-[12px] bg-[#f8f7f5] dark:bg-black/30 px-3.5 text-[14px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                                errors.lastName
                                  ? 'border-[#ff4f31]'
                                  : 'border-black/[0.07] dark:border-white/[0.09] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                              } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 transition-all`}
                            />
                            {errors.lastName && (
                              <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                                {errors.lastName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Row: Email */}
                        <div>
                          <label
                            htmlFor="email-input"
                            className="block text-[13px] font-medium text-[#12110b]/80 dark:text-[#f4efea]/80 mb-1.5"
                          >
                            {isNl ? 'E-mailadres' : 'Email Address'}
                          </label>
                          <input
                            id="email-input"
                            type="email"
                            value={formData.email}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }));
                              if (errors.email) {
                                setErrors((prev) => ({
                                  ...prev,
                                  email: undefined,
                                }));
                              }
                            }}
                            placeholder={
                              isNl
                                ? 'Voer je e-mailadres in...'
                                : 'Enter your email address...'
                            }
                            className={`w-full h-[46px] sm:h-[48px] rounded-[12px] bg-[#f8f7f5] dark:bg-black/30 px-3.5 text-[14px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                              errors.email
                                ? 'border-[#ff4f31]'
                                : 'border-black/[0.07] dark:border-white/[0.09] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                            } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 transition-all`}
                          />
                          {errors.email && (
                            <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                              {errors.email}
                            </p>
                          )}
                        </div>

                        {/* Row: Message */}
                        <div>
                          <label
                            htmlFor="msg-input"
                            className="block text-[13px] font-medium text-[#12110b]/80 dark:text-[#f4efea]/80 mb-1.5"
                          >
                            {isNl
                              ? 'Hoe kunnen we je helpen?'
                              : 'How can we help you?'}
                          </label>
                          <textarea
                            id="msg-input"
                            rows={3}
                            value={formData.message}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                message: e.target.value,
                              }));
                              if (errors.message) {
                                setErrors((prev) => ({
                                  ...prev,
                                  message: undefined,
                                }));
                              }
                            }}
                            placeholder={
                              isNl
                                ? 'Voer je bericht of projectomschrijving in...'
                                : 'Enter your message or project requirements...'
                            }
                            className={`w-full h-[110px] sm:h-[125px] rounded-[12px] bg-[#f8f7f5] dark:bg-black/30 p-3.5 text-[14px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                              errors.message
                                ? 'border-[#ff4f31]'
                                : 'border-black/[0.07] dark:border-white/[0.09] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                            } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 resize-none transition-all`}
                          />
                          {errors.message && (
                            <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                              {errors.message}
                            </p>
                          )}
                        </div>

                        {/* Agreement Checkbox */}
                        <div className="pt-1">
                          <label className="flex items-center gap-2.5 text-xs text-[#12110b]/70 dark:text-[#f4efea]/70 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formData.agreeToTerms}
                              onChange={(e) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  agreeToTerms: e.target.checked,
                                }));
                                if (errors.agreeToTerms) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    agreeToTerms: undefined,
                                  }));
                                }
                              }}
                              className="h-4 w-4 rounded-[4px] accent-[#ff4f31] cursor-pointer"
                            />
                            <span>
                              {isNl
                                ? 'Door op de knop te klikken ga je akkoord met onze algemene voorwaarden.'
                                : 'By clicking the button you agree to our terms and conditions.'}
                            </span>
                          </label>
                          {errors.agreeToTerms && (
                            <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                              {errors.agreeToTerms}
                            </p>
                          )}
                        </div>

                        {/* DUAL ACTION BUTTONS (Balanced spacing, properly situated at bottom) */}
                        <div className="pt-3 pb-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Button 1: Send Message */}
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            data-testid="contact-submit-btn"
                            className="group relative w-full h-[48px] sm:h-[50px] rounded-[12px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white font-semibold text-[14px] sm:text-[15px] tracking-[-0.01em] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            <span>
                              {isSubmitting
                                ? isNl
                                  ? 'Verzenden...'
                                  : 'Sending...'
                                : isNl
                                ? 'Verstuur Bericht'
                                : 'Send Message'}
                            </span>
                            {isSubmitting ? (
                              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                            )}
                          </button>

                          {/* Button 2: Schedule / Book a Call (Switches directly to Calendar tab) */}
                          <button
                            type="button"
                            onClick={() => setActiveTab('call')}
                            className="w-full h-[48px] sm:h-[50px] rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] text-[#12110b] dark:text-[#f4efea] border border-black/15 dark:border-white/15 hover:border-[#ff4f31] hover:text-[#ff4f31] dark:hover:border-[#ff4f31] dark:hover:text-[#ff4f31] font-semibold text-[14px] sm:text-[15px] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <CalendarIcon className="h-4 w-4 text-[#ff4f31]" />
                            <span>
                              {isNl ? 'Plan een Gesprek' : 'Book a Call'}
                            </span>
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                ) : (
                  /* ================= TAB 2: ELEVATED FULL-HEIGHT CALENDLY (Input bar removed, Height increased) ================= */
                  <motion.div
                    key="tab-booking"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-3"
                  >
                    {/* Header bar with external link, URL bar removed as requested */}
                    <div className="flex items-center justify-between text-xs text-[#12110b]/60 dark:text-[#f4efea]/60 pb-1">
                      <span className="font-medium">
                        {isNl
                          ? 'Kies een datum en tijdstip:'
                          : 'Select an available date and time slot:'}
                      </span>
                      <a
                        href={customCalendlyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#12110b]/70 dark:text-[#f4efea]/70 hover:text-[#ff4f31] dark:hover:text-[#ff4f31] transition-colors"
                      >
                        <span>{isNl ? 'Volledig scherm' : 'Full window'}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {/* Increased Height Calendar Container (h-[640px] sm:h-[690px] lg:h-[720px]) */}
                    <div className="relative w-full rounded-[14px] overflow-hidden bg-white dark:bg-black/20 border border-black/[0.08] dark:border-white/[0.1] shadow-inner h-[620px] sm:h-[670px] lg:h-[720px]">
                      <iframe
                        src={getThemedCalendlyUrl(customCalendlyUrl)}
                        title="Discovery Call Scheduling Calendar"
                        className="w-full h-full border-none rounded-[12px]"
                        allow="microphone; camera"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
