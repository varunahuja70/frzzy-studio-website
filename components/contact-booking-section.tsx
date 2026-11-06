'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useInView } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  CheckCheck,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  MessageSquare,
  Settings,
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
const DEFAULT_EMAIL = 'hello@frxcx.studio';
const DEFAULT_PHONE = '+1 (929) 822-5127';
const DEFAULT_LOCATIONS = 'New York & Brussels • Global Remote';

type ActiveTab = 'message' | 'call';

interface FormState {
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

const TESTIMONIALS_EN = [
  {
    quote:
      'An absolute pleasure from start to finish. Their team’s dedication to bringing our vision to life with precision and creativity crafted an immersive online experience that truly elevated our brand.',
    author: 'Elena Vance',
    role: 'Chief Design Officer, Aether',
  },
  {
    quote:
      'The motion design, spatial lighting, and editorial confidence FRXCX brought to our brand relaunch doubled our inbound conversion rate in the first 30 days.',
    author: 'Marcus Chen',
    role: 'Founder, Kinetix AI',
  },
  {
    quote:
      'They do not just build websites; they build complete sensory digital worlds. Reliable, incredibly fast, and world-class in execution quality.',
    author: 'Sophie Laurent',
    role: 'VP Creative Direction, Nova',
  },
];

const TESTIMONIALS_NL = [
  {
    quote:
      'Een absoluut plezier van begin tot eind. De toewijding van het team om onze visie met precisie en creativiteit tot leven te brengen resulteerde in een meeslepende online ervaring.',
    author: 'Elena Vance',
    role: 'Chief Design Officer, Aether',
  },
  {
    quote:
      'Het motion design en het redactionele vertrouwen dat FRXCX in onze herlancering bracht, verdubbelde onze conversieratio in de eerste maand.',
    author: 'Marcus Chen',
    role: 'Oprichter, Kinetix AI',
  },
  {
    quote:
      'Ze bouwen niet zomaar websites; ze creëren complete digitale belevingswerelden. Betrouwbaar, snel en van absoluut wereldklasse niveau.',
    author: 'Sophie Laurent',
    role: 'VP Creative Direction, Nova',
  },
];

export function ContactBookingSection({
  theme,
  language,
  calendlyUrl = DEFAULT_CALENDLY_URL,
  studioEmail = DEFAULT_EMAIL,
  studioPhone = DEFAULT_PHONE,
  studioLocations = DEFAULT_LOCATIONS,
}: ContactBookingSectionProps) {
  const isDark = theme === 'dark';
  const isNl = language === 'NL';

  const sectionRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const isCardInView = useInView(cardRef, { once: false, amount: 0.1 });

  const [activeTab, setActiveTab] = useState<ActiveTab>('message');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Testimonial slider state
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const testimonials = isNl ? TESTIMONIALS_NL : TESTIMONIALS_EN;

  // Calendly URL state
  const [customCalendlyUrl, setCustomCalendlyUrl] = useState(calendlyUrl);
  const [showUrlEditor, setShowUrlEditor] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setCustomCalendlyUrl(calendlyUrl);
  }, [calendlyUrl]);

  const [formData, setFormData] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
    agreeToTerms: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const handlePrevTestimonial = () => {
    setTestimonialIdx((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1
    );
  };

  const handleNextTestimonial = () => {
    setTestimonialIdx((prev) =>
      prev === testimonials.length - 1 ? 0 : prev + 1
    );
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(studioEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      // noop
    }
  };

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
        : 'Please accept terms to continue';
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
    }, 650);
  };

  const resetForm = () => {
    setFormData({
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
      const bg = isDark ? '181712' : 'ffffff';
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

  const currentTestimonial = testimonials[testimonialIdx];

  return (
    <section
      id="contact"
      ref={sectionRef}
      data-testid="contact-booking-section"
      aria-labelledby="contact-heading"
      className="relative w-full bg-[#ecf5f4] dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] px-4 sm:px-6 lg:px-10 xl:px-14 py-12 sm:py-16 lg:py-20 transition-colors duration-500"
    >
      <div className="mx-auto w-full max-w-[1360px]">
        {/* ================= UNIFIED DUAL-COLUMN CARD (Pixel-Perfect Match with User Reference) ================= */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 24 }}
          animate={isCardInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full rounded-[30px] sm:rounded-[38px] bg-white dark:bg-[#181712] p-3 sm:p-4 lg:p-5 shadow-[0_24px_65px_-18px_rgba(18,17,11,0.08)] dark:shadow-[0_24px_65px_-18px_rgba(0,0,0,0.7)] border border-black/[0.05] dark:border-white/[0.07] grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-stretch transition-colors duration-500"
        >
          {/* ================= LEFT COLUMN: Cinematic 3D Visual + Frosted Testimonial Card ================= */}
          <div className="lg:col-span-5 relative rounded-[24px] sm:rounded-[32px] overflow-hidden min-h-[460px] sm:min-h-[520px] lg:min-h-[640px] bg-[#0c0c0e] flex flex-col justify-between p-4 sm:p-6 lg:p-7">
            {/* Background Cinematic Visual / Looping Video */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <video
                src="/assets/videos/card-1.mp4"
                poster="/assets/cards/card-1.png"
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover brightness-[0.92] contrast-[1.08] transition-transform duration-700 hover:scale-105"
              />
              {/* Cinematic Vignette Overlay */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20"
              />
            </div>

            {/* Top Left Floating Studio Badge */}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="inline-flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white/90 border border-white/15">
                <span className="h-2 w-2 rounded-full bg-[#ff4f31] animate-pulse" />
                <span>FRXCX Flagship Studio</span>
              </div>

              {/* Email Copy Tooltip */}
              <button
                type="button"
                onClick={handleCopyEmail}
                className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 text-xs text-white/80 hover:text-white border border-white/15 hover:border-white/30 transition-all cursor-pointer"
                title="Copy direct email"
              >
                {copiedEmail ? (
                  <>
                    <CheckCheck className="h-3 w-3 text-emerald-400" />
                    <span className="text-[11px] font-semibold text-emerald-400">
                      Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span className="text-[11px]">Copy Email</span>
                  </>
                )}
              </button>
            </div>

            {/* Bottom Frosted Glass Testimonial Card (Exact Match with Reference Image) */}
            <div className="relative z-10 rounded-[20px] sm:rounded-[24px] bg-black/45 backdrop-blur-xl border border-white/20 p-5 sm:p-6 text-white shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonialIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-[13.5px] sm:text-[14.5px] leading-[1.65] text-white/95 font-normal tracking-[-0.01em]">
                    &ldquo;{currentTestimonial.quote}&rdquo;
                  </p>
                  <div className="mt-4 pt-3 border-t border-white/15 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[13.5px] font-semibold text-white tracking-tight">
                        {currentTestimonial.author}
                      </p>
                      <p className="text-xs text-white/65 mt-0.5">
                        {currentTestimonial.role}
                      </p>
                    </div>

                    {/* Circular Navigation Buttons: (←) (→) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handlePrevTestimonial}
                        aria-label="Previous testimonial"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white text-white hover:text-black border border-white/20 transition-all duration-300 cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextTestimonial}
                        aria-label="Next testimonial"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 hover:bg-white text-white hover:text-black border border-white/25 transition-all duration-300 cursor-pointer"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Editorial Brand Form & Calendly ================= */}
          <div className="lg:col-span-7 flex flex-col justify-between px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div>
              {/* Brand Header & Mode Switcher */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/[0.05] dark:border-white/[0.07]">
                {/* Brand Logo & Name */}
                <div className="flex items-center gap-2.5">
                  <div className="relative h-6 w-6 shrink-0">
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
                  <span className="text-[15px] font-semibold tracking-tight text-[#12110b] dark:text-[#f4efea]">
                    FRXCX Studio
                  </span>
                </div>

                {/* Tab Pill: Send a Message | Book a Call */}
                <div className="inline-flex items-center p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] relative">
                  <button
                    type="button"
                    onClick={() => setActiveTab('message')}
                    className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                      activeTab === 'message'
                        ? 'text-[#12110b] dark:text-[#f4efea]'
                        : 'text-[#12110b]/60 dark:text-[#f4efea]/60 hover:text-[#12110b] dark:hover:text-[#f4efea]'
                    }`}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>{isNl ? 'Stuur Bericht' : 'Send a Message'}</span>
                    {activeTab === 'message' && (
                      <motion.div
                        layoutId="editorialTabPill"
                        className="absolute inset-0 rounded-full bg-white dark:bg-[#28261e] shadow-xs -z-10"
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
                    className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                      activeTab === 'call'
                        ? 'text-[#12110b] dark:text-[#f4efea]'
                        : 'text-[#12110b]/60 dark:text-[#f4efea]/60 hover:text-[#12110b] dark:hover:text-[#f4efea]'
                    }`}
                  >
                    <CalendarIcon className="h-3 w-3" />
                    <span>{isNl ? 'Plan Gesprek' : 'Book a Call'}</span>
                    {activeTab === 'call' && (
                      <motion.div
                        layoutId="editorialTabPill"
                        className="absolute inset-0 rounded-full bg-white dark:bg-[#28261e] shadow-xs -z-10"
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

              {/* Main Headline & Subtitle (Exact Reference Copywriting) */}
              <div className="mb-6">
                <h2
                  id="contact-heading"
                  className="text-[30px] sm:text-[36px] lg:text-[40px] font-semibold tracking-[-0.035em] leading-[1.08] text-[#12110b] dark:text-[#f4efea]"
                >
                  {isNl ? (
                    <>
                      Heb je een projectidee?
                      <br />
                      Laten we het samen bespreken.
                    </>
                  ) : (
                    <>
                      Have a project idea?
                      <br />
                      Let’s discuss it together.
                    </>
                  )}
                </h2>
                <p className="mt-2.5 text-xs sm:text-[13.5px] text-[#12110b]/65 dark:text-[#f4efea]/65 leading-relaxed max-w-xl">
                  {isNl
                    ? 'We staan altijd open voor nieuwe kansen. Deel gerust je vraag of briefing met ons team.'
                    : 'We’re always open to new opportunities. Feel free to drop us a line if having any questions or projects.'}
                </p>
              </div>

              {/* Body Panels */}
              <AnimatePresence mode="wait">
                {activeTab === 'message' ? (
                  /* ================= TAB 1: WORKING FORM (Pixel-Perfect Reference Match) ================= */
                  <motion.div
                    key="tab-message"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {isSubmitted ? (
                      <div className="flex flex-col items-center justify-center text-center py-16">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff4f31]/10 text-[#ff4f31] mb-4">
                          <Check className="h-7 w-7 stroke-[2.5]" />
                        </div>
                        <h3 className="text-xl font-semibold tracking-tight text-[#12110b] dark:text-[#f4efea]">
                          {isNl ? 'Bericht Ontvangen!' : 'Message Received!'}
                        </h3>
                        <p className="mt-2 max-w-sm text-xs sm:text-sm text-[#12110b]/70 dark:text-[#f4efea]/70 leading-relaxed">
                          {isNl
                            ? `Bedankt ${formData.firstName}. We hebben je bericht ontvangen en nemen binnen 24 uur contact op via ${formData.email}.`
                            : `Thank you, ${formData.firstName}. We received your inquiry and our studio directors will reply to ${formData.email} within 24 hours.`}
                        </p>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="mt-6 inline-flex items-center gap-2 rounded-full bg-black/6 dark:bg-white/10 hover:bg-[#ff4f31] hover:text-white dark:hover:bg-[#ff4f31] dark:hover:text-white px-5 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
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
                        className="space-y-4"
                      >
                        {/* Row 1: First name & Last name */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label
                              htmlFor="fn-input"
                              className="block text-[13px] font-medium text-[#12110b]/75 dark:text-[#f4efea]/75 mb-1.5"
                            >
                              {isNl ? 'Voornaam' : 'First name'}
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
                                isNl ? 'Voornaam' : 'First Name'
                              }
                              className={`w-full h-[46px] rounded-[14px] bg-[#f8f7f5] dark:bg-black/25 px-4 text-[14px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                                errors.firstName
                                  ? 'border-[#ff4f31]'
                                  : 'border-black/[0.06] dark:border-white/[0.08] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
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
                              className="block text-[13px] font-medium text-[#12110b]/75 dark:text-[#f4efea]/75 mb-1.5"
                            >
                              {isNl ? 'Achternaam' : 'Last name'}
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
                                isNl ? 'Achternaam' : 'Last name'
                              }
                              className={`w-full h-[46px] rounded-[14px] bg-[#f8f7f5] dark:bg-black/25 px-4 text-[14px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                                errors.lastName
                                  ? 'border-[#ff4f31]'
                                  : 'border-black/[0.06] dark:border-white/[0.08] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                              } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 transition-all`}
                            />
                            {errors.lastName && (
                              <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                                {errors.lastName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Row 2: Email address */}
                        <div>
                          <label
                            htmlFor="email-input"
                            className="block text-[13px] font-medium text-[#12110b]/75 dark:text-[#f4efea]/75 mb-1.5"
                          >
                            {isNl ? 'E-mailadres' : 'Email address'}
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
                              isNl ? 'E-mailadres' : 'Email address'
                            }
                            className={`w-full h-[46px] rounded-[14px] bg-[#f8f7f5] dark:bg-black/25 px-4 text-[14px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                              errors.email
                                ? 'border-[#ff4f31]'
                                : 'border-black/[0.06] dark:border-white/[0.08] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                            } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 transition-all`}
                          />
                          {errors.email && (
                            <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                              {errors.email}
                            </p>
                          )}
                        </div>

                        {/* Row 3: Message */}
                        <div>
                          <label
                            htmlFor="msg-input"
                            className="block text-[13px] font-medium text-[#12110b]/75 dark:text-[#f4efea]/75 mb-1.5"
                          >
                            {isNl ? 'Bericht' : 'Message'}
                          </label>
                          <textarea
                            id="msg-input"
                            rows={4}
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
                                ? 'Aanvullende informatie of projectdetails...'
                                : 'Any additional information....'
                            }
                            className={`w-full h-[105px] sm:h-[115px] rounded-[16px] bg-[#f8f7f5] dark:bg-black/25 p-4 text-[14px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                              errors.message
                                ? 'border-[#ff4f31]'
                                : 'border-black/[0.06] dark:border-white/[0.08] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                            } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 resize-none transition-all`}
                          />
                          {errors.message && (
                            <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                              {errors.message}
                            </p>
                          )}
                        </div>

                        {/* Row 4: Agreement Checkbox */}
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

                        {/* Row 5: Full-Width Primary Button (Exact Reference Match) */}
                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            data-testid="contact-submit-btn"
                            className="group relative w-full h-[50px] rounded-[14px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white font-semibold text-[14.5px] tracking-[-0.01em] transition-all duration-300 shadow-sm hover:shadow-xl active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
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
                              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                ) : (
                  /* ================= TAB 2: FRAMED CALENDLY BOOKING ================= */
                  <motion.div
                    key="tab-booking"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-3"
                  >
                    {/* URL Quick-Config Bar */}
                    {showUrlEditor && (
                      <div className="p-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] flex items-center gap-2 text-xs">
                        <LinkIcon className="h-3.5 w-3.5 text-[#ff4f31] shrink-0" />
                        <input
                          type="text"
                          value={customCalendlyUrl}
                          onChange={(e) => setCustomCalendlyUrl(e.target.value)}
                          placeholder="Paste Calendly URL..."
                          className="flex-1 bg-white dark:bg-black/30 rounded-lg px-3 py-1.5 outline-none text-xs border border-black/10 dark:border-white/10"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIframeKey((k) => k + 1);
                            setShowUrlEditor(false);
                          }}
                          className="rounded-lg bg-[#12110b] text-white dark:bg-[#f4efea] dark:text-[#12110b] px-3 py-1.5 font-semibold text-xs cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    )}

                    {/* Framed Calendar Container */}
                    <div className="relative w-full rounded-[20px] overflow-hidden bg-white dark:bg-black/20 border border-black/[0.08] dark:border-white/[0.1] shadow-inner h-[460px] sm:h-[490px]">
                      <iframe
                        key={iframeKey}
                        src={getThemedCalendlyUrl(customCalendlyUrl)}
                        title="Discovery Call Scheduling Calendar"
                        className="w-full h-full border-none rounded-[18px]"
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
