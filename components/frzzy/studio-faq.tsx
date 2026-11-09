import React from 'react';
import { Ambient } from '@/components/liquid';

/**
 * Numbered FAQ for the Contact page.
 * ✏️ Edit the questions and answers here. Keep answers short: one or two sentences.
 * Uses native <details>, so it works without JavaScript and with the keyboard.
 */
export const STUDIO_FAQ: { q: string; a: string }[] = [
  {
    q: 'What does working with FRZZY look like?',
    a: 'Four stages: Discovery (we agree goals, scope and timeline), Concept (moodboards and style frames you approve), Production (animation, 3D and sound) and Delivery (final files for every channel). You review progress at every milestone.',
  },
  {
    q: 'How do you price projects?',
    a: 'Every project gets a fixed quote once we have seen the brief, based on the deliverables, length and turnaround. If the scope changes along the way, we agree the cost before doing the extra work.',
  },
  {
    q: 'How long does a project take?',
    a: 'It depends on the scope: a short social loop moves much faster than a full brand identity or launch film. We give you a timeline with milestones together with the quote.',
  },
  {
    q: 'What do you need from us to start?',
    a: 'Your goal, your audience, a deadline and any references or brand assets you already have. The brief builder above collects all of it, or book a call and we will go through it together.',
  },
  {
    q: 'Can you join a project that is already underway?',
    a: 'Yes. We can pick up from an existing idea, script or brand system and take it into motion and 3D, or work alongside your in-house team.',
  },
  {
    q: 'Do you work with clients outside India?',
    a: 'Yes. We are based in India and work worldwide, remotely, with calls scheduled in your time zone.',
  },
];

export function StudioFaq({ onBookCall }: { onBookCall: () => void }) {
  return (
    <section className="section faq" aria-labelledby="faq-title">
      <Ambient at="tr" seed={2} />
      <div className="wrap faq-grid">
        <div className="faq-head">
          <p className="mono index-label">
            <i aria-hidden="true" /> FAQ
          </p>
          <h2 id="faq-title">Good to know.</h2>
          <p className="muted">
            Still unsure?{' '}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the site switches pages in place (navigateTo); the href is for new tabs */}
            <a
              href="/book"
              onClick={(e) => {
                e.preventDefault();
                onBookCall();
              }}
            >
              Book a call
            </a>{' '}
            and ask us directly.
          </p>
        </div>

        <div className="faq-list">
          {STUDIO_FAQ.map((item, i) => (
            <details key={item.q} className="faq-item">
              <summary>
                <span className="mono faq-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="faq-q">{item.q}</span>
                <span className="faq-plus" aria-hidden="true" />
              </summary>
              <p className="faq-a">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
