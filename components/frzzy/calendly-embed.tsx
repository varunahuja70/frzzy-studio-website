'use client';

import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { readLivePalette } from '@/lib/palette';

/**
 * Inline Calendly scheduler for the "Book a call" page.
 *
 * Calendly does the heavy lifting: it shows your real availability, asks the visitor your
 * booking questions, creates the Google Meet / Zoom link, and emails the link + calendar
 * invite to BOTH the visitor and you. Set it up once in Calendly; see BOOKING_GUIDE.md.
 *
 * The link comes from NEXT_PUBLIC_CALENDLY_URL in .env.local (restart `npm run dev` after changing it).
 */

const CALENDLY_ORIGIN = 'https://calendly.com';
const DEFAULT_CALENDLY_URL = 'https://calendly.com/frxcxstudio/30min';

// Brand colours from the active site palette (only applied on paid Calendly plans; the free plan shows white).
const hex6 = (n: number) => n.toString(16).padStart(6, '0');
function calendlyTheme() {
  const p = readLivePalette();
  return { background_color: hex6(p.blackHex), text_color: hex6(p.ivoryHex), primary_color: hex6(p.accentHex) };
}

function buildEmbedUrl(raw: string, prefill: { name?: string; email?: string }): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  // Only ever embed Calendly itself.
  if (url.protocol !== 'https:' || url.hostname !== 'calendly.com') return null;

  url.searchParams.set('embed_domain', window.location.hostname);
  url.searchParams.set('embed_type', 'Inline'); // makes Calendly post booking events (e.g. event_scheduled) to us
  url.searchParams.set('hide_gdpr_banner', '1');
  for (const [k, v] of Object.entries(calendlyTheme())) url.searchParams.set(k, v);
  if (prefill.name?.trim()) url.searchParams.set('name', prefill.name.trim());
  if (prefill.email?.trim()) url.searchParams.set('email', prefill.email.trim());
  return url.toString();
}

const noSubscribe = () => () => {};
const inBrowser = () => true;
const onServer = () => false;

interface CalendlyEmbedProps {
  /** Pre-fills the Calendly form if the visitor already typed these on the contact page. */
  prefillName?: string;
  prefillEmail?: string;
  /** Shown as a fallback when booking isn't configured yet. */
  studioEmail: string;
}

export function CalendlyEmbed({ prefillName, prefillEmail, studioEmail }: CalendlyEmbedProps) {
  const [overrideUrl, setOverrideUrl] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('frxcx_calendly_url');
      if (saved && saved.trim()) {
        setOverrideUrl(saved.trim());
      }
    } catch {
      // ignore
    }
  }, []);

  const rawUrl = overrideUrl || process.env.NEXT_PUBLIC_CALENDLY_URL || DEFAULT_CALENDLY_URL;
  const [loaded, setLoaded] = useState(false);
  const [booked, setBooked] = useState(false);

  // Prefill is captured once when the page opens; later edits shouldn't reload the scheduler mid-booking.
  const [initialPrefill] = useState({ name: prefillName, email: prefillEmail });
  // The scheduler address needs this site's hostname, so it is built in the browser: the server
  // (/book is server-rendered) and the hydrating render show the skeleton, then the browser fills in.
  const ready = useSyncExternalStore(noSubscribe, inBrowser, onServer);
  const src = useMemo(
    () => (ready && rawUrl ? buildEmbedUrl(rawUrl, initialPrefill) : null),
    [ready, rawUrl, initialPrefill]
  );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== CALENDLY_ORIGIN) return;
      const data = e.data as { event?: string } | null;
      if (!data || typeof data.event !== 'string') return;
      // Note: Calendly's 'calendly.page_height' reports its inner content height (often <200px),
      // not a usable frame height, so the frame keeps a fixed CSS height like Calendly's own embed.
      if (data.event === 'calendly.event_scheduled') {
        setBooked(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!ready) return <div className="cal-frame cal-skeleton" aria-hidden="true" />;

  if (!src) {
    return (
      <div className="cal-frame cal-empty">
        <p className="mono" style={{ color: 'var(--volt)' }}>Online booking opens soon</p>
        <p>
          Email{' '}
          <a href={`mailto:${studioEmail}?subject=Booking%20a%20call%20with%20FRZZY`}>{studioEmail}</a>{' '}
          with two or three times that suit you, and we’ll send a meeting link.
        </p>
        {process.env.NODE_ENV !== 'production' && (
          <p className="mono muted cal-dev">
            Dev note: {rawUrl ? 'NEXT_PUBLIC_CALENDLY_URL must be an https://calendly.com/… link.' : 'set NEXT_PUBLIC_CALENDLY_URL in .env.local, then restart npm run dev.'}{' '}
            See BOOKING_GUIDE.md.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {booked && (
        <div className="cal-booked" role="status">
          <p className="mono" style={{ color: 'var(--volt)' }}>You’re booked ✓</p>
          <p>
            Check your inbox: the meeting link and a calendar invite are on their way. Need to change it?
            Use the reschedule link in that email.
          </p>
        </div>
      )}
      <div className="cal-frame">
        {!loaded && <div className="cal-loading mono muted">Loading available times…</div>}
        <iframe
          src={src}
          title="Book a call with FRZZY Studio"
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
      </div>
      <p className="mono muted cal-alt">
        Trouble loading?{' '}
        <a href={rawUrl} target="_blank" rel="noopener noreferrer">Open the booking page in a new tab ↗</a>
      </p>
    </div>
  );
}
