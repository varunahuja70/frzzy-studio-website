'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  CheckCheck,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Link as LinkIcon,
  MessageSquare,
  Settings,
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
const DEFAULT_EMAIL = 'hello@frxcx.studio';
const DEFAULT_PHONE = '+1 (929) 822-5127';
const DEFAULT_LOCATIONS = 'New York & Brussels • Global Remote';

type ActiveTab = 'message' | 'call';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  category: string;
  message: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
}

const CATEGORIES_EN = [
  'Web Design & Dev',
  'Brand Identity',
  '3D & Motion',
  'Creative Direction',
  'Full Production',
];

const CATEGORIES_NL = [
  'Webdesign & Dev',
  'Merkidentiteit',
  '3D & Animatie',
  'Creatieve Regie',
  'Volledige Productie',
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
  const leftColRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);

  const isLeftInView = useInView(leftColRef, { once: false, amount: 0.1 });
  const isRightInView = useInView(rightColRef, { once: false, amount: 0.1 });

  const [activeTab, setActiveTab] = useState<ActiveTab>('message');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Active Calendly link with easy customization support
  const [customCalendlyUrl, setCustomCalendlyUrl] = useState(calendlyUrl);
  const [showUrlEditor, setShowUrlEditor] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const categories = isNl ? CATEGORIES_NL : CATEGORIES_EN;

  useEffect(() => {
    setCustomCalendlyUrl(calendlyUrl);
  }, [calendlyUrl]);

  const [formData, setFormData] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    category: categories[0],
    message: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

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
      category: categories[0],
      message: '',
    });
    setErrors({});
    setIsSubmitted(false);
  };

  // Build themed Calendly URL with custom styling parameters
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
      className="relative w-full bg-[#ecf5f4] dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] px-4 sm:px-6 lg:px-10 xl:px-16 pt-10 sm:pt-14 pb-16 sm:pb-20 lg:pb-24 min-h-[calc(100vh-80px)] flex items-center justify-center transition-colors duration-500"
    >
      <div className="mx-auto w-full max-w-[1380px]">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-stretch gap-8 lg:gap-10 xl:gap-14">
          {/* ================= LEFT COLUMN: Refined Editorial Balance ================= */}
          <motion.div
            ref={leftColRef}
            initial={{ opacity: 0, y: 18 }}
            animate={isLeftInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-between py-2 sm:py-4"
          >
            <div>
              {/* Reference-Styled Heading */}
              <h2
                id="contact-heading"
                className="text-[42px] sm:text-[54px] lg:text-[58px] xl:text-[68px] font-semibold tracking-[-0.035em] leading-[1.03] text-[#12110b] dark:text-[#f4efea]"
              >
                {isNl ? (
                  <>
                    Neem —
                    <br />
                    contact op
                  </>
                ) : (
                  <>
                    Get in —
                    <br />
                    touch with us
                  </>
                )}
              </h2>

              {/* Agency Description */}
              <p className="mt-4 sm:mt-5 text-[15px] sm:text-[16px] leading-[1.62] text-[#12110b]/75 dark:text-[#f4efea]/75 max-w-[430px]">
                {isNl
                  ? "We denken graag met je mee! Of je nu een vraag hebt over onze diensten, een grensverleggend project wilt bespreken of feedback wilt delen, ons team staat klaar om je te helpen."
                  : "We're here to help! Whether you have a question about our services, need assistance with your project, or want to explore collaboration, our team is ready to assist you."}
              </p>

              {/* Essential Contact Information */}
              <div className="mt-7 sm:mt-10 space-y-5 sm:space-y-6">
                {/* Email Item */}
                <div>
                  <span className="block text-[13px] font-medium text-[#12110b]/60 dark:text-[#f4efea]/60">
                    Email:
                  </span>
                  <div className="mt-1 flex items-center gap-2.5">
                    <a
                      href={`mailto:${studioEmail}`}
                      className="text-[20px] sm:text-[23px] font-semibold tracking-[-0.02em] text-[#12110b] dark:text-[#f4efea] hover:text-[#ff4f31] dark:hover:text-[#ff4f31] transition-colors"
                    >
                      {studioEmail}
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      aria-label="Copy studio email address"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#ff4f31] hover:text-white dark:hover:bg-[#ff4f31] text-[#12110b] dark:text-[#f4efea] transition-all cursor-pointer"
                      title="Copy email"
                    >
                      {copiedEmail ? (
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500 hover:text-white" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {copiedEmail && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {isNl ? 'Gekopieerd!' : 'Copied!'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Phone Item */}
                <div>
                  <span className="block text-[13px] font-medium text-[#12110b]/60 dark:text-[#f4efea]/60">
                    Phone:
                  </span>
                  <a
                    href={`tel:${studioPhone.replace(/\D/g, '')}`}
                    className="mt-1 block text-[20px] sm:text-[23px] font-semibold tracking-[-0.02em] text-[#12110b] dark:text-[#f4efea] hover:text-[#ff4f31] dark:hover:text-[#ff4f31] transition-colors"
                  >
                    {studioPhone}
                  </a>
                  <p className="mt-1 text-[13px] text-[#12110b]/55 dark:text-[#f4efea]/55">
                    {isNl
                      ? 'Beschikbaar van maandag t/m vrijdag, 9:00 – 18:00 GMT'
                      : 'Available Monday to Friday, 9 AM – 6 PM GMT'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom-left Pill Button (Matching Reference Image) */}
            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab((prev) => (prev === 'call' ? 'message' : 'call'));
                }}
                className="group relative inline-flex items-center gap-3.5 h-[50px] rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white pl-6 pr-2.5 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm hover:shadow-xl hover:shadow-black/10 active:scale-[0.97] cursor-pointer"
              >
                {/* Premium Rolling Text Animation */}
                <span className="relative block h-[18px] overflow-hidden text-[14px] font-semibold tracking-[-0.01em] leading-[18px]">
                  <span className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full">
                    {activeTab === 'call'
                      ? isNl
                        ? 'Stuur een Bericht'
                        : 'Send a Message'
                      : isNl
                      ? 'Plan een Gesprek'
                      : 'Book a Call'}
                  </span>
                  <span
                    aria-hidden="true"
                    className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full"
                  >
                    {activeTab === 'call'
                      ? isNl
                        ? 'Stuur een Bericht'
                        : 'Send a Message'
                      : isNl
                      ? 'Plan een Gesprek'
                      : 'Book a Call'}
                  </span>
                </span>

                {/* Circular Arrow Badge */}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] group-hover:bg-white group-hover:text-[#ff4f31] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-45">
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </button>
            </div>
          </motion.div>

          {/* ================= RIGHT COLUMN: Luxury Wide & Fully Visible Card ================= */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end">
            <motion.div
              ref={rightColRef}
              initial={{ opacity: 0, y: 22 }}
              animate={isRightInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
              transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[700px] rounded-[32px] sm:rounded-[40px] bg-[#fbf9f6] dark:bg-[#191812] p-6 sm:p-8 lg:p-10 shadow-[0_26px_60px_-20px_rgba(18,17,11,0.07)] dark:shadow-[0_26px_60px_-20px_rgba(0,0,0,0.65)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between transition-colors duration-500"
            >
              <div>
                {/* Top: Pill Tab Switcher */}
                <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-black/[0.05] dark:border-white/[0.06]">
                  <div className="inline-flex items-center p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] relative">
                    <button
                      type="button"
                      onClick={() => setActiveTab('message')}
                      className={`relative z-10 flex items-center gap-2 px-4 sm:px-5 py-2 text-xs sm:text-[13px] font-semibold transition-colors duration-300 cursor-pointer ${
                        activeTab === 'message'
                          ? 'text-[#12110b] dark:text-[#f4efea]'
                          : 'text-[#12110b]/60 dark:text-[#f4efea]/60 hover:text-[#12110b] dark:hover:text-[#f4efea]'
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{isNl ? 'Stuur een Bericht' : 'Send a Message'}</span>
                      {activeTab === 'message' && (
                        <motion.div
                          layoutId="luxuryWideTabPill"
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
                      className={`relative z-10 flex items-center gap-2 px-4 sm:px-5 py-2 text-xs sm:text-[13px] font-semibold transition-colors duration-300 cursor-pointer ${
                        activeTab === 'call'
                          ? 'text-[#12110b] dark:text-[#f4efea]'
                          : 'text-[#12110b]/60 dark:text-[#f4efea]/60 hover:text-[#12110b] dark:hover:text-[#f4efea]'
                      }`}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>{isNl ? 'Plan een Gesprek' : 'Book a Call'}</span>
                      {activeTab === 'call' && (
                        <motion.div
                          layoutId="luxuryWideTabPill"
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

                  {activeTab === 'call' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowUrlEditor((prev) => !prev)}
                        className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#12110b]/55 dark:text-[#f4efea]/55 transition-colors cursor-pointer"
                        title="Configure Calendly Link"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={customCalendlyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#12110b]/60 dark:text-[#f4efea]/60 hover:text-[#ff4f31] dark:hover:text-[#ff4f31] transition-colors"
                      >
                        <span>Calendly</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Animated Panels with Smooth Cross-fade */}
                <AnimatePresence mode="wait">
                  {activeTab === 'message' ? (
                    /* ================= TAB 1: SEND A MESSAGE (With Category Picker) ================= */
                    <motion.div
                      key="tab-message"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      {isSubmitted ? (
                        <div className="flex flex-col items-center justify-center text-center py-20">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ff4f31]/10 text-[#ff4f31] mb-5">
                            <Check className="h-8 w-8 stroke-[2.5]" />
                          </div>
                          <h3 className="text-2xl font-semibold tracking-tight text-[#12110b] dark:text-[#f4efea]">
                            {isNl ? 'Bericht Ontvangen' : 'Message Sent'}
                          </h3>
                          <p className="mt-3 max-w-sm text-sm text-[#12110b]/70 dark:text-[#f4efea]/70 leading-relaxed">
                            {isNl
                              ? `Bedankt ${formData.firstName}. We hebben je aanvraag voor ${formData.category} ontvangen en nemen binnen 24 uur contact op via ${formData.email}.`
                              : `Thank you, ${formData.firstName}. We received your request for ${formData.category}. Our team will reply to ${formData.email} within 24 hours.`}
                          </p>
                          <button
                            type="button"
                            onClick={resetForm}
                            className="mt-8 inline-flex items-center gap-2 rounded-full bg-black/6 dark:bg-white/10 hover:bg-[#ff4f31] hover:text-white dark:hover:bg-[#ff4f31] dark:hover:text-white px-6 py-3 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            {isNl ? 'Nieuw bericht versturen' : 'Send another message'}
                          </button>
                        </div>
                      ) : (
                        <form
                          onSubmit={handleSubmit}
                          noValidate
                          className="space-y-4"
                        >
                          {/* Row 1: First Name & Last Name */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label
                                htmlFor="fn-input"
                                className="block text-[13px] font-semibold text-[#12110b]/80 dark:text-[#f4efea]/80 mb-1.5"
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
                                  isNl
                                    ? 'Vul je voornaam in...'
                                    : 'Enter your first name...'
                                }
                                className={`w-full h-[48px] sm:h-[50px] rounded-[16px] bg-white dark:bg-black/30 px-4 text-[14.5px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                                  errors.firstName
                                    ? 'border-[#ff4f31]'
                                    : 'border-black/[0.06] dark:border-white/[0.08] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                                } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 transition-all shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)]`}
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
                                className="block text-[13px] font-semibold text-[#12110b]/80 dark:text-[#f4efea]/80 mb-1.5"
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
                                  isNl
                                    ? 'Vul je achternaam in...'
                                    : 'Enter your last name...'
                                }
                                className={`w-full h-[48px] sm:h-[50px] rounded-[16px] bg-white dark:bg-black/30 px-4 text-[14.5px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                                  errors.lastName
                                    ? 'border-[#ff4f31]'
                                    : 'border-black/[0.06] dark:border-white/[0.08] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                                } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 transition-all shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)]`}
                              />
                              {errors.lastName && (
                                <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                                  {errors.lastName}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Email */}
                          <div>
                            <label
                              htmlFor="email-input"
                              className="block text-[13px] font-semibold text-[#12110b]/80 dark:text-[#f4efea]/80 mb-1.5"
                            >
                              {isNl ? 'E-mailadres' : 'Email'}
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
                                  ? 'Vul je e-mailadres in...'
                                  : 'Enter your email address...'
                              }
                              className={`w-full h-[48px] sm:h-[50px] rounded-[16px] bg-white dark:bg-black/30 px-4 text-[14.5px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                                errors.email
                                  ? 'border-[#ff4f31]'
                                  : 'border-black/[0.06] dark:border-white/[0.08] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                              } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 transition-all shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)]`}
                            />
                            {errors.email && (
                              <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                                {errors.email}
                              </p>
                            )}
                          </div>

                          {/* Row 3: Category Selector ("Kya karwana hai?") */}
                          <div>
                            <label className="block text-[13px] font-semibold text-[#12110b]/80 dark:text-[#f4efea]/80 mb-2">
                              {isNl
                                ? 'Wat wil je laten maken?'
                                : 'What are you looking to create?'}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {categories.map((cat) => {
                                const isSelected = formData.category === cat;
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        category: cat,
                                      }))
                                    }
                                    className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-[12.5px] font-semibold transition-all duration-200 cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#12110b] text-white dark:bg-[#f4efea] dark:text-[#12110b] shadow-xs'
                                        : 'bg-white dark:bg-black/30 text-[#12110b]/70 dark:text-[#f4efea]/70 hover:bg-black/5 dark:hover:bg-white/10 border border-black/[0.06] dark:border-white/[0.08]'
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check className="h-3 w-3 stroke-[2.5]" />
                                    )}
                                    <span>{cat}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Row 4: How can we help you? */}
                          <div>
                            <label
                              htmlFor="msg-input"
                              className="block text-[13px] font-semibold text-[#12110b]/80 dark:text-[#f4efea]/80 mb-1.5"
                            >
                              {isNl
                                ? 'Hoe kunnen we je helpen?'
                                : 'How can we help you?'}
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
                                  ? 'Vul je projectdetails of vraag in...'
                                  : 'Enter your message or project details...'
                              }
                              className={`w-full h-[120px] sm:h-[135px] rounded-[18px] bg-white dark:bg-black/30 p-4 text-[14.5px] text-[#12110b] dark:text-[#f4efea] placeholder-[#12110b]/35 dark:placeholder-[#f4efea]/35 border ${
                                errors.message
                                  ? 'border-[#ff4f31]'
                                  : 'border-black/[0.06] dark:border-white/[0.08] focus:border-[#ff4f31] dark:focus:border-[#ff4f31]'
                              } outline-none focus:ring-2 focus:ring-[#ff4f31]/15 resize-none transition-all shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)]`}
                            />
                            {errors.message && (
                              <p className="mt-1 text-[11px] text-[#ff4f31] font-medium">
                                {errors.message}
                              </p>
                            )}
                          </div>

                          {/* Row 5: Action Button (Fully Visible with Plenty of Clearance) */}
                          <div className="pt-3 flex items-center justify-end">
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              data-testid="contact-submit-btn"
                              className="group relative inline-flex items-center gap-3.5 h-[50px] rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white pl-7 pr-3 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm hover:shadow-xl hover:shadow-black/10 active:scale-[0.97] cursor-pointer disabled:opacity-60"
                            >
                              {/* Premium Rolling Text Animation */}
                              <span className="relative block h-[18px] overflow-hidden text-[14px] font-semibold tracking-[-0.01em] leading-[18px]">
                                <span className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full">
                                  {isSubmitting
                                    ? isNl
                                      ? 'Verzenden...'
                                      : 'Sending...'
                                    : isNl
                                    ? 'Verstuur Bericht'
                                    : 'Send Message'}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full"
                                >
                                  {isSubmitting
                                    ? isNl
                                      ? 'Verzenden...'
                                      : 'Sending...'
                                    : isNl
                                    ? 'Verstuur Bericht'
                                    : 'Send Message'}
                                </span>
                              </span>

                              {/* Arrow Circle */}
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] group-hover:bg-white group-hover:text-[#ff4f31] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                                {isSubmitting ? (
                                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5" />
                                )}
                              </span>
                            </button>
                          </div>
                        </form>
                      )}
                    </motion.div>
                  ) : (
                    /* ================= TAB 2: CALENDLY EMBED WITH CUSTOM ROUNDED BORDER FRAME ================= */
                    <motion.div
                      key="tab-booking"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-3"
                    >
                      {/* URL Quick-Config Bar if user wants to change their Calendly Link */}
                      {showUrlEditor && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] flex items-center gap-2 text-xs"
                        >
                          <LinkIcon className="h-3.5 w-3.5 text-[#ff4f31] shrink-0" />
                          <input
                            type="text"
                            value={customCalendlyUrl}
                            onChange={(e) => setCustomCalendlyUrl(e.target.value)}
                            placeholder="Paste Calendly URL (e.g. https://calendly.com/your-name/30min)..."
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
                        </motion.div>
                      )}

                      {/* Custom Framed Border Container for the Calendar */}
                      <div className="relative w-full rounded-[24px] overflow-hidden bg-white dark:bg-black/20 border border-black/[0.08] dark:border-white/[0.1] shadow-inner h-[520px] sm:h-[560px]">
                        <iframe
                          key={iframeKey}
                          src={getThemedCalendlyUrl(customCalendlyUrl)}
                          title="Discovery Call Scheduling Calendar"
                          className="w-full h-full border-none rounded-[22px]"
                          allow="microphone; camera"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
