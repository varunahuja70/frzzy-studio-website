'use client';

/**
 * The public FRZZY site: every page (home, work, case studies, services, about, contact, book)
 * in one component that switches pages in place with the page wipe. Each page also has its own
 * clean address (app/page.tsx, app/work/page.tsx, …), which render this with `initialView`, so a
 * refresh or a shared link opens the right page; switching pages keeps the address bar in sync
 * (see components/frzzy/site-routes.ts).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CASES, CASE_ORDER, CaseStudy } from '@/components/frzzy/work-data';
import { pathFor, routeFromId, routeFromPath, type SiteRoute, type ViewRoute } from '@/components/frzzy/site-routes';
import { HeroStrandsCanvas } from '@/components/frzzy/hero-strands-canvas';
import { ShowreelPlayer } from '@/components/frzzy/showreel-player';
import { Viewport3D } from '@/components/frzzy/viewport-3d';
import { WorkCardArt } from '@/components/frzzy/work-card-art';
import { SvgSymbols } from '@/components/frzzy/svg-symbols';
import { CalendlyEmbed } from '@/components/frzzy/calendly-embed';
import { ProjectCard } from '@/components/frzzy/project-card';
import { StudioFaq } from '@/components/frzzy/studio-faq';
import { ProcessSteps } from '@/components/frzzy/process-steps';
import { usePaletteVersion } from '@/components/frzzy/use-palette-version';
import { ImageBand } from '@/components/frzzy/image-band';
import { RevealOnScroll } from '@/components/frzzy/reveal-on-scroll';
import { StackScroll } from '@/components/frzzy/stack-scroll';
import { StudioReviews } from '@/components/frzzy/studio-reviews';
import { MenuButton, MobileMenu } from '@/components/frzzy/mobile-menu';
import { CookieConsent } from '@/components/cookie-consent';
import { OPEN_COOKIE_SETTINGS_EVENT } from '@/lib/analytics/consent';
import { Ambient, GlassRefraction, HeroBackdrop, LiquidGradient, LiquidZZ, NavLens } from '@/components/liquid';

// The wide card at the top of the Work page. Change the slug to feature a different project.
const FEATURED_SLUG = 'short-circuit';

// Page-switch overlay timing (ms). Two panels slide across: an ivory one leads and the accent
// panel follows WIPE_LAG_MS later (reversed on the way out). WIPE_MS is each slide, WIPE_HOLD_MS
// the pause while the screen is covered. Total ≈ 2 × (WIPE_MS + WIPE_LAG_MS) + WIPE_HOLD_MS.
// The CSS reads these via --wipe-ms / --wipe-lag / --wipe-hold.
const WIPE_MS = 380;
const WIPE_LAG_MS = 35;
const WIPE_HOLD_MS = 100;

// Destination name shown on the overlay ("→ Work").
const VIEW_LABELS: Record<string, string> = {
  home: 'Home',
  work: 'Work',
  services: 'Services',
  about: 'About',
  contact: 'Contact',
  book: 'Book a call',
};

export function FrzzySite({ initialView = 'home', initialSlug }: { initialView?: ViewRoute; initialSlug?: string }) {
  const [currentView, setCurrentView] = useState<ViewRoute>(initialView);
  const [currentCaseSlug, setCurrentCaseSlug] = useState<string>(initialSlug ?? 'grid-runner');
  const [workFilter, setWorkFilter] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMobileMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);
  // Bumps on a live palette switch; keys the canvas/3D effects below so they redraw in the new colours.
  const paletteVersion = usePaletteVersion();
  const [isWiping, setIsWiping] = useState<'idle' | 'cover' | 'leave'>('idle');
  const [wipeLabel, setWipeLabel] = useState('');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNeeds, setContactNeeds] = useState<string[]>([]);
  const [contactTimeline, setContactTimeline] = useState('Within a month');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState('');
  const [briefGenerated, setBriefGenerated] = useState(false);
  const [briefText, setBriefText] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [emailCopyStatus, setEmailCopyStatus] = useState('');

  // Hero wordmark. The strands canvas restarts its `zap` glitch class directly on this node,
  // so a click never re-renders the page (a re-render used to rebuild the strands from scratch).
  const scRef = useRef<HTMLSpanElement>(null);

  // Reel tilt ref
  const reelFrameRef = useRef<HTMLDivElement>(null);
  const chargeBarRef = useRef<HTMLDivElement>(null);

  // Navigate with high-voltage transition wipe. `id` is an in-site link id ('#work', '#case-…'); the
  // address bar gets the page's clean address (/work, /work/…), keeping any ?query (vault previews).
  const navigateTo = useCallback((id: string) => {
    const route = routeFromId(id) ?? { view: 'home' as ViewRoute };
    setMobileMenuOpen(false);
    const show = () => {
      if (route.slug) setCurrentCaseSlug(route.slug);
      setCurrentView(route.view);
      const path = pathFor(id);
      if (window.location.pathname !== path) window.history.pushState(null, '', path + window.location.search);
      window.scrollTo(0, 0);
    };

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      show();
      return;
    }

    setWipeLabel(route.slug ? CASES[route.slug]?.title ?? 'Work' : VIEW_LABELS[route.view] ?? '');
    setIsWiping('cover');
    setTimeout(() => {
      show();
      setIsWiping('leave');
      setTimeout(() => {
        setIsWiping('idle');
      }, WIPE_MS + WIPE_LAG_MS + 40);
    }, WIPE_MS + WIPE_LAG_MS + WIPE_HOLD_MS);
  }, []);

  // Back/forward between pages, and old '#work'-style links (shown, then the address is cleaned up).
  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    const show = (route: SiteRoute) => {
      setCurrentView(route.view);
      if (route.slug) setCurrentCaseSlug(route.slug);
    };
    const legacy = routeFromId(window.location.hash);
    if (legacy) {
      window.history.replaceState(null, '', pathFor(window.location.hash) + window.location.search);
      queueMicrotask(() => show(legacy));
    }
    const onPopState = () => {
      setMobileMenuOpen(false);
      show(routeFromPath(window.location.pathname));
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Scroll listener for top charge bar and showreel perspective tilt
  useEffect(() => {
    const handleScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (chargeBarRef.current) {
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        chargeBarRef.current.style.transform = `scaleX(${p})`;
      }

      // The header turns into light glass while only a hero gradient is under it (CSS, Liquid only):
      // at the top of every page, until the hero's first line of text (home labels, page crumb)
      // reaches it.
      const header = document.querySelector<HTMLElement>('header.site');
      const hero = document.querySelector<HTMLElement>('.view > .hero, .view > .page-hero');
      if (header) {
        const hh = header.offsetHeight;
        const firstText = hero?.querySelector('.hero-top, .wrap > :first-child')?.getBoundingClientRect();
        const overHero = !!hero && !!firstText && firstText.top > hh + 2;
        header.toggleAttribute('data-over-hero', overHero);
      }

      if (reelFrameRef.current) {
        const rect = reelFrameRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, 1 - (rect.top - vh * 0.15) / (vh * 0.85)));
        reelFrameRef.current.style.setProperty('--tilt', `${((1 - p) * 22).toFixed(2)}deg`);
        reelFrameRef.current.style.setProperty('--sc', (0.88 + p * 0.12).toFixed(3));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [currentView]);

  // Magnetic hover physics for buttons
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (!fine || reduce) return;

    const buttons = document.querySelectorAll<HTMLElement>('.btn.magnetic');
    const cleanups: (() => void)[] = [];

    buttons.forEach((btn) => {
      const onPointerMove = (e: PointerEvent) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${(dx * 0.25).toFixed(1)}px, ${(dy * 0.35).toFixed(1)}px)`;
      };

      const onPointerLeave = () => {
        btn.style.transform = '';
      };

      btn.addEventListener('pointermove', onPointerMove);
      btn.addEventListener('pointerleave', onPointerLeave);
      cleanups.push(() => {
        btn.removeEventListener('pointermove', onPointerMove);
        btn.removeEventListener('pointerleave', onPointerLeave);
      });
    });

    return () => {
      cleanups.forEach((c) => c());
    };
  }, [currentView]);

  // Contact form submission -> saves lead to DB and builds instant brief
  const handleBriefSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactEmail.includes('@')) {
      setContactError('Add your name and a valid email so we can reply.');
      return;
    }
    setContactError('');

    const formattedBrief = [
      `Subject: New project brief from ${contactName}`,
      '',
      'Hi FRZZY Studio,',
      '',
      `Name: ${contactName}`,
      `Email: ${contactEmail}`,
      `Need: ${contactNeeds.length ? contactNeeds.join(', ') : 'Not sure yet'}`,
      `Timeline: ${contactTimeline}`,
      '',
      'About the project:',
      contactMessage.trim() || '(Add a few lines about what you are launching.)',
      '',
      'Stay FRZZY.',
    ].join('\n');

    setBriefText(formattedBrief);
    setBriefGenerated(true);

    // Save lead into backend database
    try {
      const parts = contactName.trim().split(/\s+/);
      const firstName = parts[0] || 'Friend';
      const lastName = parts.slice(1).join(' ') || 'Studio Client';

      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: contactEmail.trim().toLowerCase(),
          category: contactNeeds[0] || '3D & Motion',
          message: `${formattedBrief}\n\n[Client Notes]: ${contactMessage.trim()}`,
          companyWebsite: '',
          agreeToTerms: true,
        }),
      });
    } catch {
      // Graceful fallback
    }
  };

  const copyToClipboard = (text: string, setStatus: (s: string) => void) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setStatus('Copied');
        setTimeout(() => setStatus(''), 2500);
      });
    }
  };

  const toggleNeed = (need: string) => {
    setContactNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const currentCase = CASES[currentCaseSlug] || CASES['grid-runner'];
  const caseIndex = CASE_ORDER.indexOf(currentCaseSlug);
  const nextCaseSlug = CASE_ORDER[(caseIndex + 1) % CASE_ORDER.length];
  const nextCase = CASES[nextCaseSlug];

  return (
    <div className="frzzy-site bg-[var(--black)] text-[var(--ivory)] min-h-screen relative font-[family-name:var(--display)] selection:bg-[var(--volt)] selection:text-[var(--on-volt)]">
      <SvgSymbols />
      <RevealOnScroll />
      <StackScroll />

      {/* Top Charge Progress Bar */}
      <div ref={chargeBarRef} className="charge" aria-hidden="true" />

      {/* Full-Screen High-Voltage Transition Wipe */}
      <div
        className={`wipe ${isWiping === 'cover' ? 'cover' : isWiping === 'leave' ? 'leave' : ''}`}
        style={
          {
            '--wipe-ms': `${WIPE_MS}ms`,
            '--wipe-lag': `${WIPE_LAG_MS}ms`,
            '--wipe-hold': `${WIPE_HOLD_MS}ms`,
          } as React.CSSProperties
        }
        aria-hidden="true"
      >
        <div className="wipe-panel wipe-back" />
        <div className="wipe-panel wipe-front">
          <div className="wipe-center">
            <span className="wipe-mark">
              {['base', 's1', 's2', 's3'].map((k) => (
                <svg key={k} className={`m ${k}`} viewBox="0 0 34 44">
                  <use href="#z" />
                </svg>
              ))}
            </span>
            <span className="wipe-label">→ {wipeLabel}</span>
            <span className="wipe-bar">
              <i />
            </span>
          </div>
        </div>
      </div>

      {/* Site Header */}
      <header className="site">
        <nav className="wrap nav" aria-label="Main">
          <a
            className="brand wm"
            onClick={() => navigateTo('#home')}
            aria-label="FRZZY Studio, home"
          >
            <span aria-hidden="true">FR</span>
            <svg className="z" aria-hidden="true">
              <use href="#z" />
            </svg>
            <svg className="z z2" aria-hidden="true">
              <use href="#z" />
            </svg>
            <span aria-hidden="true">Y</span>
            <span className="brand-sub" aria-hidden="true">Studio</span>
          </a>

          <MenuButton open={mobileMenuOpen} onToggle={toggleMenu} />

          <ul className="nav-links" id="nav-links">
            <NavLens />
            <li>
              <a
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('#home');
                }}
                aria-current={currentView === 'home' ? 'page' : undefined}
              >
                Home
              </a>
            </li>
            <li>
              <a
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('#work');
                }}
                aria-current={currentView === 'work' || currentView === 'case' ? 'page' : undefined}
              >
                Work
              </a>
            </li>
            <li>
              <a
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('#services');
                }}
                aria-current={currentView === 'services' ? 'page' : undefined}
              >
                Services
              </a>
            </li>
            <li>
              <a
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('#about');
                }}
                aria-current={currentView === 'about' ? 'page' : undefined}
              >
                About
              </a>
            </li>
            <li>
              <a
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('#book');
                }}
                aria-current={currentView === 'book' ? 'page' : undefined}
              >
                Book a call
              </a>
            </li>
            <li>
              <a
                className="btn btn-volt btn-glass magnetic"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('#contact');
                }}
                aria-current={currentView === 'contact' ? 'page' : undefined}
              >
                Start a project
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <MobileMenu open={mobileMenuOpen} current={currentView} onNavigate={navigateTo} onClose={closeMenu} />

      {/* while the phone menu is open, the page behind it can't be focused or tapped */}
      <main inert={mobileMenuOpen}>
        {/* ======================================================== */}
        {/*                         HOME VIEW                        */}
        {/* ======================================================== */}
        {currentView === 'home' && (
          <div className="view enter" data-view="home">
            {/* Hero */}
            <section className="hero" id="top">
              {/* Back layer behind the strands and the FRZZY wordmark: the liquid gradient with glass
                  bolts (Effects: Liquid), or the classic glossy 3D bolts */}
              <HeroBackdrop />
              <div className="hero-word" aria-hidden="true">
                <span className="sc" ref={scRef}>
                  <span className="base">FRZZY</span>
                  <span className="s s1">FRZZY</span>
                  <span className="s s2">FRZZY</span>
                  <span className="s s3">FRZZY</span>
                </span>
              </div>

              <HeroStrandsCanvas key={`strands-${paletteVersion}`} scRef={scRef} />

              <div className="hero-ui wrap">
                <div className="hero-top">
                  <p className="mono muted">Motion · 3D · Visuals</p>
                  <p className="mono muted hint">
                    <i />
                    <span className="hint-strands">Brush through the strands · click to zap</span>
                    <span className="hint-zap">Move to tilt · click to zap</span>
                  </p>
                  <p className="mono muted">Studio · India</p>
                </div>

                <h1 className="sr-only">FRZZY Studio: motion design, 3D and branding</h1>

                <div className="hero-bottom">
                  <GlassRefraction />
                  <p className="thesis">
                    Motion design, <em>frame&nbsp;by&nbsp;frame.</em>
                  </p>
                  <div className="hero-side">
                    <p>
                      Motion design, 3D and branding for brands that refuse to be boring. Real ideas,
                      built to move and made for every screen your audience lives on.
                    </p>
                    <div className="ctas">
                      <a
                        className="btn btn-volt btn-glass magnetic"
                        onClick={() => navigateTo('#contact')}
                      >
                        Start a project{' '}
                        <svg aria-hidden="true">
                          <use href="#arrow" />
                        </svg>
                      </a>
                      <a
                        className="btn btn-ghost magnetic"
                        onClick={() => navigateTo('#work')}
                      >
                        See the work
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Crossing Tickers */}
            <div className="bands" aria-hidden="true">
              <div className="band b2">
                <div className="track">
                  <span>
                    Storyboards <svg><use href="#z" /></svg> Styleframes <svg><use href="#z" /></svg> Keyframes <svg><use href="#z" /></svg> Final render <svg><use href="#z" /></svg> Storyboards <svg><use href="#z" /></svg> Styleframes <svg><use href="#z" /></svg> Keyframes <svg><use href="#z" /></svg> Final render <svg><use href="#z" /></svg>
                  </span>
                  <span>
                    Storyboards <svg><use href="#z" /></svg> Styleframes <svg><use href="#z" /></svg> Keyframes <svg><use href="#z" /></svg> Final render <svg><use href="#z" /></svg> Storyboards <svg><use href="#z" /></svg> Styleframes <svg><use href="#z" /></svg> Keyframes <svg><use href="#z" /></svg> Final render <svg><use href="#z" /></svg>
                  </span>
                </div>
              </div>
              <div className="band b1">
                <div className="track">
                  <span>
                    Motion design <svg><use href="#z" /></svg> 3D &amp; visuals <svg><use href="#z" /></svg> Branding <svg><use href="#z" /></svg> Digital experiences <svg><use href="#z" /></svg> Creative direction <svg><use href="#z" /></svg> Campaigns <svg><use href="#z" /></svg>
                  </span>
                  <span>
                    Motion design <svg><use href="#z" /></svg> 3D &amp; visuals <svg><use href="#z" /></svg> Branding <svg><use href="#z" /></svg> Digital experiences <svg><use href="#z" /></svg> Creative direction <svg><use href="#z" /></svg> Campaigns <svg><use href="#z" /></svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Showreel Section */}
            <section className="reel w-full" aria-label="Showreel">
              <div className="wrap max-w-[1100px] px-4 sm:px-8 lg:px-10">
                <div
                  className="reel-frame w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
                  ref={reelFrameRef}
                  id="reel-frame"
                >
                  <ShowreelPlayer key={`reel-${paletteVersion}`} />
                </div>
              </div>
            </section>

            {/* Featured Work Experiments */}
            <section className="section" id="featured">
              <Ambient at="tr" seed={0} />
              <div className="wrap">
                <div className="sec-head">
                  <p className="mono muted">01 / Work</p>
                  <div>
                    <h2>Studio experiments.</h2>
                    <p className="lede">
                      Self-initiated pieces where we push the FRZZY look: light, loops, glitches and chrome.
                    </p>
                    <a className="text-link" onClick={() => navigateTo('#work')}>
                      See all work{' '}
                      <svg aria-hidden="true">
                        <use href="#arrow" />
                      </svg>
                    </a>
                  </div>
                </div>

                <div className="work-grid">
                  {CASE_ORDER.slice(0, 4).map((slug, i) => (
                    <ProjectCard
                      key={slug}
                      item={CASES[slug]}
                      index={i + 1}
                      total={CASE_ORDER.length}
                      onOpen={navigateTo}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Image chapter: original FRZZY render, tinted by the palette */}
            <ImageBand
              grade="bolts"
              src="/assets/frzzy/frzzy-bolts.webp"
              eyebrow="The studio"
              title={<>Ideas, <em>built to move.</em></>}
              body="Motion, 3D and branding made in-house, from the first sketch to the final render."
            />

            {/* Services Teaser */}
            <section className="section" id="home-services">
              <Ambient at="tl" seed={1} />
              <div className="wrap">
                <div className="sec-head">
                  <p className="mono muted">02 / Services</p>
                  <div>
                    <h2>What we make.</h2>
                    <p className="lede">Six things, done with the same energy. Pick one to start a brief.</p>
                    <a className="text-link" onClick={() => navigateTo('#services')}>
                      All services{' '}
                      <svg aria-hidden="true">
                        <use href="#arrow" />
                      </svg>
                    </a>
                  </div>
                </div>

                <ol className="services">
                  {[
                    { num: '01', title: 'Motion design', desc: 'Launch films, explainers, title sequences and social loops that move like they mean it.', need: 'Motion design' },
                    { num: '02', title: '3D & visuals', desc: 'Product renders, abstract worlds and CGI moments that stop the scroll.', need: '3D & visuals' },
                    { num: '03', title: 'Branding', desc: 'Identity systems and logos designed to animate from day one.', need: 'Branding' },
                    { num: '04', title: 'Digital experiences', desc: 'Web animation, real-time 3D and motion for product interfaces.', need: 'Digital experiences' },
                    { num: '05', title: 'Creative direction', desc: 'One clear idea carried from the first moodboard to the final frame.', need: 'Creative direction' },
                    { num: '06', title: 'Campaigns', desc: 'Launch packs cut for every format, from a 6-second story to a 60-second film.', need: 'Campaign' },
                  ].map((s) => (
                    <li key={s.num}>
                      <a
                        onClick={() => {
                          setContactNeeds([s.need]);
                          navigateTo('#contact');
                        }}
                      >
                        <span className="num mono">{s.num}</span>
                        <h3>{s.title}</h3>
                        <p>{s.desc}</p>
                        <svg className="go" aria-hidden="true">
                          <use href="#arrow" />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Process Section */}
            <ProcessSteps eyebrow="03 / Process" id="process" />

            {/* The Name Section */}
            <section className="section" id="name">
              <Ambient at="tl" seed={2} />
              <div className="wrap">
                <div className="sec-head">
                  <p className="mono muted">04 / The name</p>
                  <div>
                    <h2>Why FRZZY.</h2>
                  </div>
                </div>

                <div className="name-grid">
                  <div>
                    <div className="meaning">
                      <div className="mean-row">
                        <span className="big volt" aria-hidden="true">FR</span>
                        <p>
                          <span className="sr-only">FR: </span>Frame rate.
                          <span>Every move timed to the frame, from first keyframe to final render.</span>
                        </p>
                      </div>
                      <div className="mean-row">
                        <span className="big wm" aria-hidden="true">
                          <svg className="z"><use href="#z" /></svg>
                          <svg className="z z2"><use href="#z" /></svg>
                          <LiquidZZ variant="inline" />
                        </span>
                        <p>
                          <span className="sr-only">ZZ: </span>Z-depth.
                          <span>Layers, light and camera that give every shot real dimension.</span>
                        </p>
                      </div>
                    </div>
                    <p className="say mono muted">Say it like “frizzy”. Stay FRZZY.</p>
                  </div>

                  <div className="vp-slot">
                    <Viewport3D />
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Band */}
            {/* Client reviews (placeholders are hidden on the live site) */}
            <StudioReviews onStartProject={() => navigateTo('#contact')} />

            <section className="cta-band">
              <LiquidGradient preset="cta" />
              <div className="wrap">
                <h2>Got a brief?<br />Let’s make it FRZZY.</h2>
                <div className="ctas">
                  <a className="btn btn-black btn-glass magnetic" onClick={() => navigateTo('#contact')}>
                    Start a project <svg aria-hidden="true"><use href="#arrow" /></svg>
                  </a>
                  <a className="btn btn-line magnetic" onClick={() => navigateTo('#work')}>
                    See the work
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/*                         WORK VIEW                        */}
        {/* ======================================================== */}
        {currentView === 'work' && (
          <div className="view enter" data-view="work">
            <section className="page-hero">
              <LiquidGradient preset="hero" />
              <div className="wrap">
                <p className="mono muted crumb">
                  <a onClick={() => navigateTo('#home')}>FRZZY</a>
                  <span>/</span>
                  <span>Work</span>
                </p>
                <h1 className="page-title">
                  Work<span className="dot">.</span>
                </h1>
                <p className="page-lede">
                  Studio experiments and concept pieces. Each one tests an idea we bring to client projects: light,
                  loops, glitches and chrome.
                </p>

                <div className="filters" role="group" aria-label="Filter work">
                  {['all', 'motion', '3d', 'branding', 'social', 'digital', 'campaign'].map((f) => (
                    <button
                      key={f}
                      className="filter"
                      type="button"
                      aria-pressed={workFilter === f}
                      onClick={() => setWorkFilter(f)}
                    >
                      {f === 'all'
                        ? 'All'
                        : f === '3d'
                        ? '3D'
                        : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="section">
              <Ambient at="tl" seed={3} />
              <div className="wrap">
                {(() => {
                  const visible = CASE_ORDER.filter(
                    (slug) => workFilter === 'all' || CASES[slug].category === workFilter
                  );
                  // Feature one project in a wide card when it's part of the current filter.
                  const featured = visible.includes(FEATURED_SLUG) ? FEATURED_SLUG : null;
                  const rest = visible.filter((slug) => slug !== featured);
                  const total = CASE_ORDER.length;
                  const indexOf = (slug: string) => CASE_ORDER.indexOf(slug) + 1;

                  return (
                    <>
                      <div className="index-bar">
                        <span className="mono index-label">
                          <i aria-hidden="true" /> Selected experiments
                        </span>
                        <span className="mono muted" aria-live="polite">
                          (FRZ — {String(visible.length).padStart(2, '0')})
                        </span>
                        <span className="mono muted">©{new Date().getFullYear()}</span>
                      </div>

                      {featured && (
                        <ProjectCard
                          item={CASES[featured]}
                          index={indexOf(featured)}
                          total={total}
                          onOpen={navigateTo}
                          featured
                        />
                      )}

                      {rest.length > 0 && (
                        <div className="work-grid three" id="all-work">
                          {rest.map((slug) => (
                            <ProjectCard
                              key={slug}
                              item={CASES[slug]}
                              index={indexOf(slug)}
                              total={total}
                              onOpen={navigateTo}
                            />
                          ))}
                        </div>
                      )}

                      {visible.length === 0 && (
                        <p className="mono muted empty-note">Nothing here yet. Try another filter.</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </section>

            <section className="cta-band">
              <LiquidGradient preset="cta" />
              <div className="wrap">
                <h2>Got a brief?<br />Let’s make it FRZZY.</h2>
                <div className="ctas">
                  <a className="btn btn-black btn-glass magnetic" onClick={() => navigateTo('#contact')}>
                    Start a project <svg aria-hidden="true"><use href="#arrow" /></svg>
                  </a>
                  <a className="btn btn-line magnetic" onClick={() => navigateTo('#work')}>
                    See the work
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/*                      CASE STUDY VIEW                     */}
        {/* ======================================================== */}
        {currentView === 'case' && (
          <div className="view enter" data-view="case">
            <section className="page-hero">
              <LiquidGradient preset="hero" />
              <div className="wrap">
                <p className="mono muted crumb">
                  <a onClick={() => navigateTo('#work')}>Work</a>
                  <span>/</span>
                  <span>Studio experiment {('0' + (caseIndex + 1)).slice(-2)}</span>
                </p>
                <h1 className="page-title">
                  {currentCase.title}
                  <span className="dot">.</span>
                </h1>
                <div className="case-meta">
                  <div>
                    <p className="mono muted">Type</p>
                    <p>{currentCase.type}</p>
                  </div>
                  <div>
                    <p className="mono muted">Year</p>
                    <p>2026</p>
                  </div>
                  <div>
                    <p className="mono muted">Made with</p>
                    <p>Houdini · Cinema 4D · Octane · After Effects</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="case-art">
              <div className="wrap">
                <WorkCardArt item={currentCase} />
              </div>
            </section>

            <section className="section">
              <Ambient at="tr" seed={1} />
              <div className="wrap case-body">
                <div>
                  <p className="mono muted">The idea</p>
                  <p className="case-lede">{currentCase.idea}</p>
                </div>
                <div>
                  <p className="mono muted">What we explored</p>
                  <ul className="ticks">
                    {currentCase.explored.map((point, idx) => (
                      <li key={idx}>
                        <svg viewBox="0 0 34 44" aria-hidden="true">
                          <use href="#z" />
                        </svg>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <div className="wrap">
                <a
                  className="next-link"
                  onClick={() => navigateTo(`#case-${nextCaseSlug}`)}
                >
                  <span>
                    <span className="mono muted">Next experiment</span>
                    <span className="t">{nextCase.title}</span>
                  </span>
                  <svg aria-hidden="true">
                    <use href="#arrow" />
                  </svg>
                </a>
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/*                       SERVICES VIEW                      */}
        {/* ======================================================== */}
        {currentView === 'services' && (
          <div className="view enter" data-view="services">
            <section className="page-hero">
              <LiquidGradient preset="hero" />
              <div className="wrap">
                <p className="mono muted crumb">
                  <a onClick={() => navigateTo('#home')}>FRZZY</a>
                  <span>/</span>
                  <span>Services</span>
                </p>
                <h1 className="page-title">
                  Services<span className="dot">.</span>
                </h1>
                <p className="page-lede">
                  Six disciplines, from first storyboard to final render. Commission one, or combine them.
                </p>
              </div>
            </section>

            <section className="section">
              <Ambient at="tl" seed={2} />
              <div className="wrap">
                <div className="svc-grid">
                  {[
                    { num: '01', title: 'Motion design', desc: 'Launch films, explainers, title sequences and social loops that move like they mean it.', tags: ['Launch films', 'Explainers', 'Title sequences', 'Social loops'], need: 'Motion design' },
                    { num: '02', title: '3D & visuals', desc: 'Product renders, abstract worlds and CGI moments that stop the scroll.', tags: ['Product renders', 'Abstract 3D', 'CGI for ads', 'Stills and loops'], need: '3D & visuals' },
                    { num: '03', title: 'Branding', desc: 'Identity systems and logos designed to animate from day one.', tags: ['Logo design', 'Logo motion', 'Brand systems', 'Guidelines'], need: 'Branding' },
                    { num: '04', title: 'Digital experiences', desc: 'Web animation, real-time 3D and motion for product interfaces.', tags: ['Website motion', 'Real-time 3D', 'UI animation', 'Lottie files'], need: 'Digital experiences' },
                    { num: '05', title: 'Creative direction', desc: 'One clear idea carried from the first moodboard to the final frame.', tags: ['Concepts', 'Moodboards', 'Styleframes', 'Art direction'], need: 'Creative direction' },
                    { num: '06', title: 'Campaigns', desc: 'Launch packs cut for every format, from a 6-second story to a 60-second film.', tags: ['Launch packs', 'Story and reel cuts', 'Ad variations', 'Key visuals'], need: 'Campaign' },
                  ].map((s) => (
                    <article key={s.num} className="svc">
                      <p className="mono muted">{s.num}</p>
                      <h2>{s.title}</h2>
                      <p>{s.desc}</p>
                      <ul>
                        {s.tags.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                      <a
                        className="text-link"
                        onClick={() => {
                          setContactNeeds([s.need]);
                          navigateTo('#contact');
                        }}
                      >
                        Start a brief for this{' '}
                        <svg aria-hidden="true">
                          <use href="#arrow" />
                        </svg>
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* Process Section */}
            <ProcessSteps eyebrow="Process" />

            <section className="cta-band">
              <LiquidGradient preset="cta" />
              <div className="wrap">
                <h2>Got a brief?<br />Let’s make it FRZZY.</h2>
                <div className="ctas">
                  <a className="btn btn-black btn-glass magnetic" onClick={() => navigateTo('#contact')}>
                    Start a project <svg aria-hidden="true"><use href="#arrow" /></svg>
                  </a>
                  <a className="btn btn-line magnetic" onClick={() => navigateTo('#work')}>
                    See the work
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/*                         ABOUT VIEW                       */}
        {/* ======================================================== */}
        {currentView === 'about' && (
          <div className="view enter" data-view="about">
            <section className="page-hero">
              <LiquidGradient preset="hero" />
              <div className="wrap">
                <p className="mono muted crumb">
                  <a onClick={() => navigateTo('#home')}>FRZZY</a>
                  <span>/</span>
                  <span>About</span>
                </p>
                <h1 className="page-title">
                  About<span className="dot">.</span>
                </h1>
                <p className="page-lede">
                  FRZZY is a motion and 3D studio based in India, making visuals for brands that refuse to be boring.
                </p>
              </div>
            </section>

            <ImageBand
              variant="framed"
              src="/assets/frzzy/frzzy-monolith.webp"
              position="center 42%"
              eyebrow="In-house"
              title={<>One small team, <em>end to end.</em></>}
              body="Concept, 3D, animation and sound handled by the same people, so nothing gets lost between hand-offs."
            />

            {/* The Name with Viewport 3D */}
            <section className="section">
              <Ambient at="tr" seed={0} />
              <div className="wrap">
                <div className="sec-head">
                  <p className="mono muted">The name</p>
                  <div>
                    <h2>Why FRZZY.</h2>
                  </div>
                </div>

                <div className="name-grid">
                  <div>
                    <div className="meaning">
                      <div className="mean-row">
                        <span className="big volt" aria-hidden="true">FR</span>
                        <p>
                          <span className="sr-only">FR: </span>Frame rate.
                          <span>Every move timed to the frame, from first keyframe to final render.</span>
                        </p>
                      </div>
                      <div className="mean-row">
                        <span className="big wm" aria-hidden="true">
                          <svg className="z"><use href="#z" /></svg>
                          <svg className="z z2"><use href="#z" /></svg>
                          <LiquidZZ variant="inline" />
                        </span>
                        <p>
                          <span className="sr-only">ZZ: </span>Z-depth.
                          <span>Layers, light and camera that give every shot real dimension.</span>
                        </p>
                      </div>
                    </div>
                    <p className="say mono muted">Say it like “frizzy”. Stay FRZZY.</p>
                  </div>

                  <div className="vp-slot">
                    <Viewport3D />
                  </div>
                </div>
              </div>
            </section>

            {/* What We Believe */}
            <section className="section">
              <Ambient at="tl" seed={3} />
              <div className="wrap">
                <div className="sec-head">
                  <p className="mono muted">What we believe</p>
                  <div>
                    <h2>Three rules we work by.</h2>
                  </div>
                </div>

                <div className="values">
                  <div className="value">
                    <p className="mono muted">01</p>
                    <h3>Real ideas.</h3>
                    <p>Every piece starts from one clear thought. If we can’t say it in a sentence, we don’t animate it yet.</p>
                  </div>
                  <div className="value">
                    <p className="mono muted">02</p>
                    <h3>Static energy.</h3>
                    <p>Motion that feels alive, even when it loops. Timing, texture and a little voltage in every frame.</p>
                  </div>
                  <div className="value">
                    <p className="mono muted">03</p>
                    <h3>Zero boring.</h3>
                    <p>If it could belong to anyone, we start again. Your brand should look like nobody else’s.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* The Studio Founders */}
            <section className="section">
              <Ambient at="tr" seed={1} />
              <div className="wrap">
                <div className="sec-head">
                  <p className="mono muted">The studio</p>
                  <div>
                    <h2>Who’s behind it.</h2>
                    <p className="lede">
                      A tight-knit collective of motion designers, 3D artists, and creative directors making bespoke visuals.
                    </p>
                  </div>
                </div>

                <div className="people">
                  <div className="person">
                    <div className="avatar" aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/assets/frzzy/frzzy-team-badge.png"
                        alt="FRZZY Emblem"
                        width={48}
                        height={48}
                        className="w-11 h-11 object-contain drop-shadow-[0_2px_12px_rgba(38,214,124,0.35)]"
                      />
                    </div>
                    <div>
                      <h3>FRZZY Team</h3>
                      <p className="mono muted">Creative Direction &amp; Motion</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="cta-band">
              <LiquidGradient preset="cta" />
              <div className="wrap">
                <h2>Got a brief?<br />Let’s make it FRZZY.</h2>
                <div className="ctas">
                  <a className="btn btn-black btn-glass magnetic" onClick={() => navigateTo('#contact')}>
                    Start a project <svg aria-hidden="true"><use href="#arrow" /></svg>
                  </a>
                  <a className="btn btn-line magnetic" onClick={() => navigateTo('#work')}>
                    See the work
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/*                       CONTACT VIEW                       */}
        {/* ======================================================== */}
        {currentView === 'contact' && (
          <div className="view enter" data-view="contact">
            <section className="page-hero">
              <LiquidGradient preset="hero" />
              <div className="wrap">
                <p className="mono muted crumb">
                  <a onClick={() => navigateTo('#home')}>FRZZY</a>
                  <span>/</span>
                  <span>Contact</span>
                </p>
                <h1 className="page-title">
                  Contact<span className="dot">.</span>
                </h1>
                <p className="page-lede">
                  Got a brief? Fill this in and it turns into a ready-to-send brief. Copy it into an email and we’ll take it from there.
                </p>
              </div>
            </section>

            <section className="section" id="contact-main">
              <Ambient at="tl" seed={0} />
              <div className="wrap">
                <div className="contact-grid">
                  <div className="reach">
                    <div className="reach-item book-prompt">
                      <p className="mono muted">Prefer to talk?</p>
                      <span className="val">Book a video call</span>
                      <p className="muted">Pick a time that suits you. The meeting link lands in your inbox straight away.</p>
                      <div className="reach-row">
                        <a className="btn btn-volt btn-glass magnetic" onClick={() => navigateTo('#book')}>
                          Book a call{' '}
                          <svg aria-hidden="true">
                            <use href="#arrow" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    <div className="reach-item">
                      <p className="mono muted">Email</p>
                      <div className="reach-row">
                        <span className="val" id="email-text">
                          frxcxstudio@gmail.com
                        </span>
                        <button
                          className="small-btn"
                          type="button"
                          onClick={() => copyToClipboard('frxcxstudio@gmail.com', setEmailCopyStatus)}
                        >
                          Copy
                        </button>
                      </div>
                      <span className="mono" style={{ color: 'var(--volt)', fontSize: '11px', marginTop: '4px' }}>
                        {emailCopyStatus}
                      </span>
                    </div>

                    <div className="reach-item">
                      <p className="mono muted">Instagram</p>
                      <span className="val">@frzzystudio</span>
                    </div>

                    <div className="reach-item">
                      <p className="mono muted">Based in</p>
                      <span className="val">India · working worldwide</span>
                    </div>
                  </div>

                  <div>
                    {!briefGenerated ? (
                      <form onSubmit={handleBriefSubmit} noValidate>
                        <div className="field-row">
                          <div className="field">
                            <label htmlFor="f-name">Your name</label>
                            <input
                              type="text"
                              id="f-name"
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              placeholder="Name"
                              required
                            />
                          </div>
                          <div className="field">
                            <label htmlFor="f-email">Your email</label>
                            <input
                              type="email"
                              id="f-email"
                              value={contactEmail}
                              onChange={(e) => setContactEmail(e.target.value)}
                              placeholder="name@company.com"
                              required
                            />
                          </div>
                        </div>

                        <fieldset className="field">
                          <legend>What do you need?</legend>
                          <div className="chips">
                            {[
                              'Motion design',
                              '3D & visuals',
                              'Branding',
                              'Digital experiences',
                              'Creative direction',
                              'Campaign',
                            ].map((need) => (
                              <label key={need} className="chip">
                                <input
                                  type="checkbox"
                                  checked={contactNeeds.includes(need)}
                                  onChange={() => toggleNeed(need)}
                                />
                                <span>{need}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>

                        <div className="field">
                          <label htmlFor="f-time">Timeline</label>
                          <select
                            id="f-time"
                            value={contactTimeline}
                            onChange={(e) => setContactTimeline(e.target.value)}
                          >
                            <option>As soon as possible</option>
                            <option>Within a month</option>
                            <option>In 1 to 3 months</option>
                            <option>Just exploring</option>
                          </select>
                        </div>

                        <div className="field">
                          <label htmlFor="f-msg">Tell us about it</label>
                          <textarea
                            id="f-msg"
                            rows={4}
                            value={contactMessage}
                            onChange={(e) => setContactMessage(e.target.value)}
                            placeholder="What are you launching, and where will it live?"
                          />
                        </div>

                        {contactError && (
                          <p className="form-error" role="alert">
                            {contactError}
                          </p>
                        )}

                        <div className="form-foot">
                          <button className="btn btn-volt btn-glass magnetic" type="submit">
                            Build my brief{' '}
                            <svg aria-hidden="true">
                              <use href="#arrow" />
                            </svg>
                          </button>
                          <p>Your brief is saved directly to our studio vault, and ready to email.</p>
                        </div>
                      </form>
                    ) : (
                      <div className="brief-out" id="brief-out">
                        <p className="mono" style={{ color: 'var(--volt)', fontWeight: 600 }}>
                          Your brief is ready &amp; saved!
                        </p>
                        <textarea id="brief-text" readOnly value={briefText} />
                        <div className="reach-row">
                          <button
                            className="btn btn-volt btn-glass"
                            type="button"
                            onClick={() => copyToClipboard(briefText, setCopyStatus)}
                          >
                            Copy brief
                          </button>
                          <button
                            className="small-btn"
                            type="button"
                            onClick={() => setBriefGenerated(false)}
                          >
                            Edit answers
                          </button>
                          <span className="status font-mono" style={{ color: 'var(--volt)' }}>
                            {copyStatus}
                          </span>
                        </div>
                        <p className="muted" style={{ fontSize: '14px' }}>
                          Paste it into an email to{' '}
                          <a href="mailto:frxcxstudio@gmail.com" className="text-white underline">
                            frxcxstudio@gmail.com
                          </a>
                          .
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <StudioFaq onBookCall={() => navigateTo('#book')} />
          </div>
        )}

        {/* ======================================================== */}
        {/*                       BOOK A CALL VIEW                   */}
        {/* ======================================================== */}
        {currentView === 'book' && (
          <div className="view enter" data-view="book">
            <section className="page-hero">
              <LiquidGradient preset="hero" />
              <div className="wrap">
                <p className="mono muted crumb">
                  <a onClick={() => navigateTo('#home')}>FRZZY</a>
                  <span>/</span>
                  <a onClick={() => navigateTo('#contact')}>Contact</a>
                  <span>/</span>
                  <span>Book a call</span>
                </p>
                <h1 className="page-title">
                  Book a call<span className="dot">.</span>
                </h1>
                <p className="page-lede">
                  Pick a time that works for you. You’ll get the video link by email straight away, and so will we.
                </p>
              </div>
            </section>

            <section className="section" id="book-main">
              <Ambient at="tr" seed={2} />
              <div className="wrap">
                <div className="book-grid">
                  <aside className="book-how" aria-label="How booking works">
                    <p className="mono muted">How it works</p>
                    <ol className="book-steps">
                      <li>
                        <span className="mono">01</span>
                        <div>
                          <h3>Pick a time</h3>
                          <p>Choose a day and a slot. Times show in your own time zone.</p>
                        </div>
                      </li>
                      <li>
                        <span className="mono">02</span>
                        <div>
                          <h3>Tell us the basics</h3>
                          <p>Your name, email and a line about the project, so we come prepared.</p>
                        </div>
                      </li>
                      <li>
                        <span className="mono">03</span>
                        <div>
                          <h3>Get the link</h3>
                          <p>You and the studio both get a calendar invite with the meeting link and reminders.</p>
                        </div>
                      </li>
                    </ol>
                    <p className="muted book-alt">
                      Rather write it down?{' '}
                      <a onClick={() => navigateTo('#contact')}>Send us a brief instead</a>.
                    </p>
                  </aside>

                  <CalendlyEmbed
                    key={`cal-${paletteVersion}`}
                    prefillName={contactName}
                    prefillEmail={contactEmail}
                    studioEmail="frxcxstudio@gmail.com"
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Site Footer */}
      <footer className="site-foot" inert={mobileMenuOpen}>
        <div className="wrap">
          <div className="foot-band">
            <div className="ib-media" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative, CSS-tinted background */}
              <img src="/assets/frzzy/frzzy-field.webp" alt="" loading="lazy" decoding="async" />
              <span className="ib-tint" />
            </div>
            <div className="foot-big">
              <span className="wm" aria-hidden="true">
                <span>FR</span>
                <svg className="z"><use href="#z" /></svg>
                <svg className="z z2"><use href="#z" /></svg>
                <span>Y</span>
                <LiquidZZ variant="footer" />
              </span>
            </div>
          </div>

          <div className="foot-contact">
            <p className="mono muted">Got an idea? Say hello</p>
            <a className="foot-email" href="mailto:frxcxstudio@gmail.com">
              frxcxstudio@gmail.com
              <svg aria-hidden="true">
                <use href="#arrow" />
              </svg>
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the site switches pages in place (navigateTo); the href is for new tabs */}
            <a className="btn btn-ghost magnetic" href="/book" onClick={(e) => { e.preventDefault(); navigateTo('#book'); }}>
              Book a call
            </a>
          </div>

          <div className="foot-row">
            <p className="mono" style={{ color: 'var(--volt)' }}>
              Stay FRZZY.
            </p>
            <ul>
              <li><a onClick={() => navigateTo('#home')}>Home</a></li>
              <li><a onClick={() => navigateTo('#work')}>Work</a></li>
              <li><a onClick={() => navigateTo('#services')}>Services</a></li>
              <li><a onClick={() => navigateTo('#about')}>About</a></li>
              <li><a onClick={() => navigateTo('#contact')}>Contact</a></li>
              <li><a onClick={() => navigateTo('#book')}>Book a call</a></li>
              <li>
                <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}>
                  Cookie settings
                </button>
              </li>
            </ul>
            <p className="mono muted">
              © {new Date().getFullYear()} FRZZY Studio · India · Worldwide
            </p>
          </div>
        </div>
      </footer>

      <CookieConsent />
    </div>
  );
}
