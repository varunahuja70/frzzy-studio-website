'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import {
  CONSENT_COOKIE,
  CONSENT_EVENT,
  OPEN_COOKIE_SETTINGS_EVENT,
  browserOptedOut,
  parseConsent,
  readCookie,
  type ConsentChoice,
} from '@/lib/analytics/consent';

/**
 * Cookie banner for the public site. Asks once whether we may set the tracking cookies described
 * in lib/analytics/consent.ts; the footer's "Cookie settings" reopens it to change the answer.
 * Not shown in the vault's live preview (the site framed by itself), and only shown on request to
 * visitors whose browser sends Do Not Track / Global Privacy Control, since they aren't tracked at all.
 */

const subscribeConsent = (onChange: () => void) => {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
};
const readConsent = () => parseConsent(readCookie(CONSENT_COOKIE));
const noSubscribe = () => () => {};
const readEnvironment = () => (window.self !== window.top ? 'framed' : browserOptedOut() ? 'opted-out' : 'normal');

export function CookieConsent() {
  // `undefined` while server-rendering and hydrating; the real values arrive right after.
  const choice = useSyncExternalStore(subscribeConsent, readConsent, () => undefined);
  const environment = useSyncExternalStore(noSubscribe, readEnvironment, () => undefined);
  const [reopened, setReopened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  useEffect(() => {
    if (reopened) panelRef.current?.focus();
  }, [reopened]);

  const choose = async (next: ConsentChoice) => {
    setSaving(true);
    setFailed(false);
    try {
      const res = await fetch('/api/analytics/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setReopened(false);
      window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: next }));
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  if (environment === undefined || environment === 'framed') return null;
  const optedOut = environment === 'opted-out';
  if (!reopened && (optedOut || choice !== null)) return null;

  return (
    <section ref={panelRef} className="cookie-consent" aria-labelledby={titleId} tabIndex={-1}>
      <p className="mono" id={titleId}>
        Cookies
      </p>

      {optedOut ? (
        <p className="cc-copy">
          Your browser is asking sites not to track you (Do Not Track or Global Privacy Control), so this
          site doesn&apos;t track you at all, with or without cookies.
        </p>
      ) : (
        <>
          <p className="cc-copy">
            Can we set a cookie to recognise you when you come back? It only helps us see how people use the
            site, and stays on our own server: no ads, no third parties. Say no and we only count anonymous
            visits, without cookies.
          </p>
          <details className="cc-details">
            <summary>What we set</summary>
            <ul>
              <li>
                <code>frzzy_vid</code> tells us you&apos;ve been here before <span>13 months</span>
              </li>
              <li>
                <code>frzzy_sid</code> ties one visit together across tabs <span>30 min</span>
              </li>
              <li>
                <code>frzzy_consent</code> remembers this choice, either way <span>6 months</span>
              </li>
            </ul>
          </details>
          {reopened && choice && (
            <p className="cc-status mono muted">Right now: {choice === 'granted' ? 'cookies on' : 'no cookies'}</p>
          )}
          {failed && (
            <p className="cc-status mono" role="alert">
              Couldn&apos;t save that. Try again?
            </p>
          )}
        </>
      )}

      <div className="cc-actions">
        {optedOut ? (
          <button type="button" className="btn btn-ghost" onClick={() => setReopened(false)}>
            Close
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => choose('denied')}>
              No thanks
            </button>
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => choose('granted')}>
              Accept
            </button>
            {reopened && choice && (
              <button type="button" className="cc-close" onClick={() => setReopened(false)}>
                Close
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
