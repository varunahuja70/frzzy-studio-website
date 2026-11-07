'use client';

import React, { useEffect, useRef } from 'react';

/**
 * "Our process" section, shared by Home and Services.
 * ✏️ Edit the stages in STEPS. Icons animate once when the section scrolls into view,
 * and replay on hover.
 */

type IconKind = 'discover' | 'concept' | 'produce' | 'deliver';

const STEPS: { title: string; subtitle: string; body: string; icon: IconKind }[] = [
  {
    title: 'Discovery',
    subtitle: 'Brief & goals',
    body: 'A kickoff call to understand your goals, audience, channels and deadline. We agree the scope, timeline and budget before any work begins.',
    icon: 'discover',
  },
  {
    title: 'Concept',
    subtitle: 'Creative direction',
    body: 'Moodboards, style frames and a storyboard or script. Production only starts once you have approved the direction.',
    icon: 'concept',
  },
  {
    title: 'Production',
    subtitle: 'Design & animation',
    body: 'Animation, 3D, editing and sound design. You review work in progress at agreed milestones, with feedback rounds built in.',
    icon: 'produce',
  },
  {
    title: 'Delivery',
    subtitle: 'Final files',
    body: 'Final files exported in every size and format your channels need, organised and ready to publish.',
    icon: 'deliver',
  },
];

function StepIcon({ kind }: { kind: IconKind }) {
  const common = {
    className: `ico ico-${kind}`,
    viewBox: '0 0 44 44',
    'aria-hidden': true,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
  };

  switch (kind) {
    case 'discover': // a brief being reviewed under a magnifier
      return (
        <svg {...common}>
          <rect x="6" y="4" width="22" height="30" />
          <line className="ln l1" x1="11" y1="11" x2="23" y2="11" />
          <line className="ln l2" x1="11" y1="17" x2="23" y2="17" />
          <line className="ln l3" x1="11" y1="23" x2="18" y2="23" />
          <g className="lens">
            <circle cx="29" cy="29" r="7" className="lens-glass" />
            <line x1="34" y1="34" x2="40" y2="40" strokeWidth="3" />
          </g>
        </svg>
      );
    case 'concept': // storyboard: four frames, approved one by one
      return (
        <svg {...common}>
          <rect className="fr f1" x="4" y="7" width="16" height="12" />
          <rect className="fr f2" x="24" y="7" width="16" height="12" />
          <rect className="fr f3" x="4" y="25" width="16" height="12" />
          <rect className="fr f4" x="24" y="25" width="16" height="12" />
        </svg>
      );
    case 'produce': // a player with a timeline and moving playhead
      return (
        <svg {...common}>
          <rect x="4" y="5" width="36" height="24" />
          <path className="play" d="M19 12 L27 17 L19 22 Z" fill="currentColor" stroke="none" />
          <line x1="4" y1="37" x2="40" y2="37" strokeWidth="1.5" opacity=".45" />
          <line className="track" x1="4" y1="37" x2="40" y2="37" strokeWidth="2.5" pathLength="100" />
          <line className="head" x1="4" y1="33" x2="4" y2="41" strokeWidth="2" />
        </svg>
      );
    case 'deliver': // export: arrow into a tray, then a check
      return (
        <svg {...common}>
          <polyline points="5,24 5,38 39,38 39,24" />
          <g className="arrow">
            <line x1="22" y1="4" x2="22" y2="24" />
            <polyline points="14,17 22,25 30,17" />
          </g>
          <polyline className="check" points="15,31 20,35 29,27" pathLength="100" />
        </svg>
      );
  }
}

export function ProcessSteps({ eyebrow, id }: { eyebrow: string; id?: string }) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const steps = Array.from(list.querySelectorAll<HTMLElement>('.step'));

    // Play once (staggered) when the section scrolls into view.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          steps.forEach((s) => s.classList.add('play'));
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(list);

    // Replay a step's icon on hover (no stagger delay).
    const replay = (e: Event) => {
      const s = e.currentTarget as HTMLElement;
      s.style.setProperty('--d', '0');
      s.classList.remove('play');
      void s.offsetWidth;
      s.classList.add('play');
    };
    steps.forEach((s) => s.addEventListener('pointerenter', replay));
    return () => {
      io.disconnect();
      steps.forEach((s) => s.removeEventListener('pointerenter', replay));
    };
  }, []);

  return (
    <section className="section" id={id}>
      <div className="wrap">
        <div className="sec-head">
          <p className="mono muted">{eyebrow}</p>
          <div>
            <h2>How we work.</h2>
            <p className="lede">Four clear stages from first call to final files, with your sign-off at each one.</p>
          </div>
        </div>

        <div className="process" ref={listRef}>
          {STEPS.map((s, i) => (
            <div className="step" key={s.title} style={{ '--d': i } as React.CSSProperties}>
              <StepIcon kind={s.icon} />
              <p className="mono muted">Step {String(i + 1).padStart(2, '0')}</p>
              <div className="step-title">
                <h3>{s.title}</h3>
                <p className="mono step-sub">{s.subtitle}</p>
              </div>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
