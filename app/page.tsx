'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CASES, CASE_ORDER, CaseStudy } from '@/components/frzzy/work-data';
import { FrzzyCursor } from '@/components/frzzy/frzzy-cursor';
import { HeroStrandsCanvas } from '@/components/frzzy/hero-strands-canvas';
import { ShowreelStaticCanvas } from '@/components/frzzy/showreel-static-canvas';
import { Viewport3D } from '@/components/frzzy/viewport-3d';
import { WorkCardArt } from '@/components/frzzy/work-card-art';
import { SvgSymbols } from '@/components/frzzy/svg-symbols';

type ViewRoute = 'home' | 'work' | 'case' | 'services' | 'about' | 'contact';

export default function FrzzyStudioPage() {
  const [currentView, setCurrentView] = useState<ViewRoute>('home');
  const [currentCaseSlug, setCurrentCaseSlug] = useState<string>('grid-runner');
  const [workFilter, setWorkFilter] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isWiping, setIsWiping] = useState<'idle' | 'cover' | 'leave'>('idle');

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

  // Route parser
  const getRouteFromHash = useCallback((): { view: ViewRoute; slug?: string } => {
    if (typeof window === 'undefined') return { view: 'home' };
    const hash = (window.location.hash || '').replace('#', '');
    if (hash.startsWith('case-')) {
      const slug = hash.replace('case-', '');
      if (CASES[slug]) return { view: 'case', slug };
    }
    if (['home', 'work', 'services', 'about', 'contact'].includes(hash)) {
      return { view: hash as ViewRoute };
    }
    return { view: 'home' };
  }, []);

  // Navigate with high-voltage transition wipe
  const navigateTo = useCallback((hash: string) => {
    const targetRoute = hash.startsWith('#case-')
      ? 'case'
      : (hash.replace('#', '') as ViewRoute);
    const slug = hash.startsWith('#case-') ? hash.replace('#case-', '') : undefined;

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      if (slug) setCurrentCaseSlug(slug);
      setCurrentView(targetRoute);
      window.location.hash = hash;
      window.scrollTo(0, 0);
      return;
    }

    setIsWiping('cover');
    setTimeout(() => {
      if (slug) setCurrentCaseSlug(slug);
      setCurrentView(targetRoute);
      window.location.hash = hash;
      window.scrollTo(0, 0);

      setIsWiping('leave');
      setTimeout(() => {
        setIsWiping('idle');
      }, 360);
    }, 340);
  }, []);

  // Listen to browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const route = getRouteFromHash();
      setCurrentView(route.view);
      if (route.slug) setCurrentCaseSlug(route.slug);
    };

    const initial = getRouteFromHash();
    setCurrentView(initial.view);
    if (initial.slug) setCurrentCaseSlug(initial.slug);

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [getRouteFromHash]);

  // Scroll listener for top charge bar and showreel perspective tilt
  useEffect(() => {
    const handleScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (chargeBarRef.current) {
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        chargeBarRef.current.style.transform = `scaleX(${p})`;
      }

      if (reelFrameRef.current) {
        const rect = reelFrameRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, 1 - (rect.top - vh * 0.15) / (vh * 0.85)));
        reelFrameRef.current.style.setProperty('--tilt', `${((1 - p) * 26).toFixed(2)}deg`);
        reelFrameRef.current.style.setProperty('--sc', (0.86 + p * 0.14).toFixed(3));
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
    <div className="bg-[#080808] text-[#F3EFE7] min-h-screen relative font-[family-name:var(--display)] selection:bg-[#C6FF00] selection:text-[#080808]">
      <SvgSymbols />
      <FrzzyCursor />

      {/* Top Charge Progress Bar */}
      <div ref={chargeBarRef} className="charge" aria-hidden="true" />

      {/* Full-Screen High-Voltage Transition Wipe */}
      <div
        className={`wipe ${isWiping === 'cover' ? 'cover' : isWiping === 'leave' ? 'leave' : ''}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 34 44">
          <use href="#z" />
        </svg>
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
          </a>

          <button
            className="menu-btn"
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="nav-links"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? 'CLOSE' : 'MENU'}
          </button>

          <ul className={`nav-links ${mobileMenuOpen ? 'open' : ''}`} id="nav-links">
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
                className="btn btn-volt magnetic"
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

      <main>
        {/* ======================================================== */}
        {/*                         HOME VIEW                        */}
        {/* ======================================================== */}
        {currentView === 'home' && (
          <div className="view enter" data-view="home">
            {/* Hero */}
            <section className="hero" id="top">
              <div className="hero-word" aria-hidden="true">
                <span className="sc" ref={scRef}>
                  <span className="base">FRZZY</span>
                  <span className="s s1">FRZZY</span>
                  <span className="s s2">FRZZY</span>
                  <span className="s s3">FRZZY</span>
                </span>
              </div>

              <HeroStrandsCanvas scRef={scRef} />

              <div className="hero-ui wrap">
                <div className="hero-top">
                  <p className="mono muted">Motion · 3D · Visuals</p>
                  <p className="mono muted hint">
                    <i />
                    <span>Brush through the strands · click to zap</span>
                  </p>
                  <p className="mono muted">Studio · India</p>
                </div>

                <h1 className="sr-only">FRZZY Studio: motion design, 3D and branding</h1>

                <div className="hero-bottom">
                  <p className="thesis">
                    Visuals with <em>static energy.</em>
                  </p>
                  <div className="hero-side">
                    <p>
                      Motion design, 3D and branding for brands that refuse to be boring. Real ideas,
                      built to move and made for every screen your audience lives on.
                    </p>
                    <div className="ctas">
                      <a
                        className="btn btn-volt magnetic"
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
                    Stay FRZZY. <svg><use href="#z" /></svg> For real. <svg><use href="#z" /></svg> Static energy. <svg><use href="#z" /></svg> Zero boring. <svg><use href="#z" /></svg> Stay FRZZY. <svg><use href="#z" /></svg> For real. <svg><use href="#z" /></svg> Static energy. <svg><use href="#z" /></svg> Zero boring. <svg><use href="#z" /></svg>
                  </span>
                  <span>
                    Stay FRZZY. <svg><use href="#z" /></svg> For real. <svg><use href="#z" /></svg> Static energy. <svg><use href="#z" /></svg> Zero boring. <svg><use href="#z" /></svg> Stay FRZZY. <svg><use href="#z" /></svg> For real. <svg><use href="#z" /></svg> Static energy. <svg><use href="#z" /></svg> Zero boring. <svg><use href="#z" /></svg>
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
            <section className="reel" aria-label="Showreel">
              <div className="wrap">
                <div className="reel-frame" ref={reelFrameRef} id="reel-frame">
                  <ShowreelStaticCanvas />
                  <div className="reel-corner" aria-hidden="true">
                    <svg style={{ color: 'var(--ivory)' }}>
                      <use href="#z" />
                    </svg>
                    <svg style={{ color: 'var(--volt)' }}>
                      <use href="#z" />
                    </svg>
                  </div>
                  <div className="reel-over">
                    <span className="wm" aria-hidden="true">
                      <span>FR</span>
                      <svg className="z">
                        <use href="#z" />
                      </svg>
                      <svg className="z z2">
                        <use href="#z" />
                      </svg>
                      <span>Y</span>
                    </span>
                    <p className="mono">Showreel 2026</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Featured Work Experiments */}
            <section className="section" id="featured">
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
                  {CASE_ORDER.slice(0, 4).map((slug) => {
                    const item = CASES[slug];
                    return (
                      <a
                        key={item.slug}
                        className="card"
                        onClick={() => navigateTo(`#case-${item.slug}`)}
                      >
                        <WorkCardArt item={item} />
                        <div className="card-meta">
                          <h3>{item.title}</h3>
                          <p className="mono muted">{item.type}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Services Teaser */}
            <section className="section" id="home-services">
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
            <section className="section" id="process">
              <div className="wrap">
                <div className="sec-head">
                  <p className="mono muted">03 / Process</p>
                  <div>
                    <h2>How a project charges up.</h2>
                    <p className="lede">Four stages, named after the thing we are made of.</p>
                  </div>
                </div>

                <div className="process">
                  <div className="step">
                    <svg className="ico ico-spark" viewBox="0 0 44 44" aria-hidden="true">
                      <g className="rays" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                        <line x1="22" y1="1" x2="22" y2="4" />
                        <line x1="22" y1="40" x2="22" y2="43" />
                        <line x1="1" y1="22" x2="4" y2="22" />
                        <line x1="40" y1="22" x2="43" y2="22" />
                        <line x1="7" y1="7" x2="9" y2="9" />
                        <line x1="35" y1="35" x2="37" y2="37" />
                        <line x1="37" y1="7" x2="35" y2="9" />
                        <line x1="7" y1="37" x2="9" y2="35" />
                      </g>
                      <path
                        className="star"
                        d="M22 7 L25 19 L37 22 L25 25 L22 37 L19 25 L7 22 L19 19 Z"
                        fill="currentColor"
                      />
                    </svg>
                    <p className="mono muted">Stage 1</p>
                    <h3>Spark</h3>
                    <p>We dig into your brief, your audience and the one feeling the piece has to leave behind.</p>
                  </div>

                  <div className="step">
                    <svg className="ico ico-charge" viewBox="0 0 44 44" aria-hidden="true">
                      <rect x="6" y="13" width="28" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
                      <rect className="tip" x="34" y="18" width="4" height="8" fill="currentColor" />
                      <rect className="fill" x="10" y="17" width="20" height="10" fill="currentColor" />
                      <polyline
                        className="mini"
                        points="21,15.5 17.5,22 21.5,22 18.5,28.5"
                        fill="none"
                        stroke="#080808"
                        strokeWidth="1.8"
                        strokeLinejoin="miter"
                      />
                    </svg>
                    <p className="mono muted">Stage 2</p>
                    <h3>Charge</h3>
                    <p>Moodboards, styleframes and a direction you approve before a single frame is animated.</p>
                  </div>

                  <div className="step">
                    <svg className="ico ico-strike" viewBox="0 0 44 44" aria-hidden="true">
                      <polyline
                        className="bolt"
                        pathLength="100"
                        points="26,4 14,23 24,23 16,40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinejoin="miter"
                        strokeLinecap="square"
                      />
                      <g className="hit" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                        <line x1="10" y1="42" x2="7" y2="40" />
                        <line x1="22" y1="42" x2="25" y2="40" />
                        <line x1="16" y1="43" x2="16" y2="43.5" />
                      </g>
                    </svg>
                    <p className="mono muted">Stage 3</p>
                    <h3>Strike</h3>
                    <p>Animation, 3D and sound come together. You see progress at every milestone.</p>
                  </div>

                  <div className="step">
                    <svg className="ico ico-ground" viewBox="0 0 44 44" aria-hidden="true">
                      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                        <line className="wire" x1="22" y1="5" x2="22" y2="20" />
                        <line className="g1" x1="8" y1="20" x2="36" y2="20" />
                        <line className="g2" x1="13" y1="27" x2="31" y2="27" />
                        <line className="g3" x1="18" y1="34" x2="26" y2="34" />
                      </g>
                      <circle className="pulse" cx="22" cy="5" r="3" fill="currentColor" />
                    </svg>
                    <p className="mono muted">Stage 4</p>
                    <h3>Ground</h3>
                    <p>Final files in every size and format your channels need, ready to post.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* The Name Section */}
            <section className="section" id="name">
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
                          <span className="sr-only">FR: </span>For real.
                          <span>Real ideas and real craft. No filler, no stock tricks.</span>
                        </p>
                      </div>
                      <div className="mean-row">
                        <span className="big wm" aria-hidden="true">
                          <svg className="z"><use href="#z" /></svg>
                          <svg className="z z2"><use href="#z" /></svg>
                        </span>
                        <p>
                          <span className="sr-only">ZZ: </span>The buzz.
                          <span>Static energy in every frame we make.</span>
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
            <section className="cta-band">
              <div className="wrap">
                <h2>Got a brief?<br />Let’s make it FRZZY.</h2>
                <div className="ctas">
                  <a className="btn btn-black magnetic" onClick={() => navigateTo('#contact')}>
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
              <div className="wrap">
                <div className="work-grid three" id="all-work">
                  {CASE_ORDER.filter(
                    (slug) => workFilter === 'all' || CASES[slug].category === workFilter
                  ).map((slug) => {
                    const item = CASES[slug];
                    return (
                      <a
                        key={item.slug}
                        className="card"
                        onClick={() => navigateTo(`#case-${item.slug}`)}
                      >
                        <WorkCardArt item={item} />
                        <div className="card-meta">
                          <h3>{item.title}</h3>
                          <p className="mono muted">{item.type}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>

                {CASE_ORDER.filter(
                  (slug) => workFilter === 'all' || CASES[slug].category === workFilter
                ).length === 0 && (
                  <p className="mono muted empty-note">Nothing here yet. Try another filter.</p>
                )}
              </div>
            </section>

            <section className="cta-band">
              <div className="wrap">
                <h2>Got a brief?<br />Let’s make it FRZZY.</h2>
                <div className="ctas">
                  <a className="btn btn-black magnetic" onClick={() => navigateTo('#contact')}>
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
                  Six ways we put static energy into your brand. Mix them, or start with one.
                </p>
              </div>
            </section>

            <section className="section">
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
            <section className="section">
              <div className="wrap">
                <div className="sec-head">
                  <p className="mono muted">How we work</p>
                  <div>
                    <h2>How a project charges up.</h2>
                    <p className="lede">Four stages, named after the thing we are made of.</p>
                  </div>
                </div>

                <div className="process">
                  <div className="step">
                    <svg className="ico ico-spark" viewBox="0 0 44 44" aria-hidden="true">
                      <g className="rays" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                        <line x1="22" y1="1" x2="22" y2="4" />
                        <line x1="22" y1="40" x2="22" y2="43" />
                        <line x1="1" y1="22" x2="4" y2="22" />
                        <line x1="40" y1="22" x2="43" y2="22" />
                      </g>
                      <path
                        className="star"
                        d="M22 7 L25 19 L37 22 L25 25 L22 37 L19 25 L7 22 L19 19 Z"
                        fill="currentColor"
                      />
                    </svg>
                    <p className="mono muted">Stage 1</p>
                    <h3>Spark</h3>
                    <p>We dig into your brief, your audience and the one feeling the piece has to leave behind.</p>
                  </div>

                  <div className="step">
                    <svg className="ico ico-charge" viewBox="0 0 44 44" aria-hidden="true">
                      <rect x="6" y="13" width="28" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
                      <rect className="tip" x="34" y="18" width="4" height="8" fill="currentColor" />
                      <rect className="fill" x="10" y="17" width="20" height="10" fill="currentColor" />
                      <polyline
                        className="mini"
                        points="21,15.5 17.5,22 21.5,22 18.5,28.5"
                        fill="none"
                        stroke="#080808"
                        strokeWidth="1.8"
                        strokeLinejoin="miter"
                      />
                    </svg>
                    <p className="mono muted">Stage 2</p>
                    <h3>Charge</h3>
                    <p>Moodboards, styleframes and a direction you approve before a single frame is animated.</p>
                  </div>

                  <div className="step">
                    <svg className="ico ico-strike" viewBox="0 0 44 44" aria-hidden="true">
                      <polyline
                        className="bolt"
                        pathLength="100"
                        points="26,4 14,23 24,23 16,40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinejoin="miter"
                        strokeLinecap="square"
                      />
                    </svg>
                    <p className="mono muted">Stage 3</p>
                    <h3>Strike</h3>
                    <p>Animation, 3D and sound come together. You see progress at every milestone.</p>
                  </div>

                  <div className="step">
                    <svg className="ico ico-ground" viewBox="0 0 44 44" aria-hidden="true">
                      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                        <line className="wire" x1="22" y1="5" x2="22" y2="20" />
                        <line className="g1" x1="8" y1="20" x2="36" y2="20" />
                        <line className="g2" x1="13" y1="27" x2="31" y2="27" />
                        <line className="g3" x1="18" y1="34" x2="26" y2="34" />
                      </g>
                      <circle className="pulse" cx="22" cy="5" r="3" fill="currentColor" />
                    </svg>
                    <p className="mono muted">Stage 4</p>
                    <h3>Ground</h3>
                    <p>Final files in every size and format your channels need, ready to post.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="cta-band">
              <div className="wrap">
                <h2>Got a brief?<br />Let’s make it FRZZY.</h2>
                <div className="ctas">
                  <a className="btn btn-black magnetic" onClick={() => navigateTo('#contact')}>
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

            {/* The Name with Viewport 3D */}
            <section className="section">
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
                          <span className="sr-only">FR: </span>For real.
                          <span>Real ideas and real craft. No filler, no stock tricks.</span>
                        </p>
                      </div>
                      <div className="mean-row">
                        <span className="big wm" aria-hidden="true">
                          <svg className="z"><use href="#z" /></svg>
                          <svg className="z z2"><use href="#z" /></svg>
                        </span>
                        <p>
                          <span className="sr-only">ZZ: </span>The buzz.
                          <span>Static energy in every frame we make.</span>
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
                      <span className="wm">
                        <svg className="z"><use href="#z" /></svg>
                        <svg className="z z2"><use href="#z" /></svg>
                      </span>
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
              <div className="wrap">
                <h2>Got a brief?<br />Let’s make it FRZZY.</h2>
                <div className="ctas">
                  <a className="btn btn-black magnetic" onClick={() => navigateTo('#contact')}>
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
              <div className="wrap">
                <div className="contact-grid">
                  <div className="reach">
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
                          <button className="btn btn-volt magnetic" type="submit">
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
                            className="btn btn-volt"
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
          </div>
        )}
      </main>

      {/* Site Footer */}
      <footer className="site-foot">
        <div className="wrap">
          <div className="foot-big">
            <span className="wm" aria-hidden="true">
              <span>FR</span>
              <svg className="z"><use href="#z" /></svg>
              <svg className="z z2"><use href="#z" /></svg>
              <span>Y</span>
            </span>
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
            </ul>
            <p className="mono muted">
              © {new Date().getFullYear()} FRZZY Studio · India · Worldwide
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
