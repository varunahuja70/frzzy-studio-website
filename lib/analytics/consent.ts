/**
 * First-party tracking cookies for the public site, and the visitor's consent to them.
 *
 * Nothing here involves a third party: every cookie is set on this domain and only read by
 * /api/analytics/*. Visitors who decline (or never answer) are still counted the original,
 * cookie-free way: a daily-rotating hash on the server plus a per-tab sessionStorage ID.
 *
 *   frzzy_consent  "<version>.granted|denied"  Remembers the banner choice. Readable by page JS.
 *   frzzy_vid      random UUID                 Recognises a returning visitor. HttpOnly, set by
 *                                              the server only after consent, and never extended,
 *                                              so it expires 13 months after the first "Accept".
 *   frzzy_sid      random ID                   Groups one visit across tabs; expires after 30 idle
 *                                              minutes. Written by the tracker only after consent.
 *
 * ✏️ Bump CONSENT_VERSION whenever what these cookies do changes: everyone is asked again.
 */

export const CONSENT_COOKIE = 'frzzy_consent';
export const VISITOR_COOKIE = 'frzzy_vid';
export const SESSION_COOKIE = 'frzzy_sid';

/** sessionStorage key for the cookie-free, per-tab session ID (kept from the original tracker). */
export const TAB_SESSION_KEY = 'frxcx_sid';

export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_S = 180 * 24 * 60 * 60; // ask again after ~6 months
export const VISITOR_MAX_AGE_S = 395 * 24 * 60 * 60; // 13 months, the usual EU ceiling for analytics cookies
export const SESSION_IDLE_S = 30 * 60;

/** Fired on window after the visitor makes or changes a choice; `detail` is the ConsentChoice. */
export const CONSENT_EVENT = 'frzzy:consent';
/** Fire on window to reopen the cookie banner (footer "Cookie settings"). */
export const OPEN_COOKIE_SETTINGS_EVENT = 'frzzy:cookie-settings';

export type ConsentChoice = 'granted' | 'denied';

export function encodeConsent(choice: ConsentChoice): string {
  return `${CONSENT_VERSION}.${choice}`;
}

/** null = not answered yet (no cookie, an older CONSENT_VERSION, or an unreadable value). */
export function parseConsent(value: string | null | undefined): ConsentChoice | null {
  if (!value) return null;
  const [version, choice] = value.split('.');
  if (version !== String(CONSENT_VERSION)) return null;
  return choice === 'granted' || choice === 'denied' ? choice : null;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidVisitorId(value: string | null | undefined): value is string {
  return !!value && UUID_V4.test(value);
}

/** Browser only: one cookie's value from document.cookie. */
export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/** Browser only: Do Not Track or Global Privacy Control is on, so the tracker doesn't run at all. */
export function browserOptedOut(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}
