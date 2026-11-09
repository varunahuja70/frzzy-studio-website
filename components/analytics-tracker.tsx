'use client';

import { useEffect, useRef } from 'react';
import {
  CONSENT_COOKIE,
  CONSENT_EVENT,
  SESSION_COOKIE,
  SESSION_IDLE_S,
  TAB_SESSION_KEY,
  browserOptedOut,
  parseConsent,
  readCookie,
  type ConsentChoice,
} from '@/lib/analytics/consent';

interface QueuedEvent {
  eventType: 'pageview' | 'click' | 'scroll' | 'time';
  target?: string;
  path?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

const newSessionId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fallbackSessionId = 'anon_' + Date.now().toString(36);

function readTabSession(): string | null {
  try {
    return sessionStorage.getItem(TAB_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeTabSession(sid: string) {
  try {
    sessionStorage.setItem(TAB_SESSION_KEY, sid);
  } catch {
    // storage blocked: the ID just won't survive a reload
  }
}

function writeSessionCookie(sid: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(sid)}; Max-Age=${SESSION_IDLE_S}; Path=/; SameSite=Lax${secure}`;
}

/**
 * Session ID for the next batch. With cookie consent it lives in the frzzy_sid cookie: shared by
 * every tab and ending after 30 idle minutes (each batch pushes the expiry back). Without consent
 * it's this tab's sessionStorage ID, as before. The tab copy is kept in sync either way, so
 * withdrawing consent mid-visit doesn't split the visit.
 */
function resolveSessionId(): string {
  if (parseConsent(readCookie(CONSENT_COOKIE)) === 'granted') {
    const sid = readCookie(SESSION_COOKIE) || newSessionId();
    writeSessionCookie(sid);
    writeTabSession(sid);
    return sid;
  }
  let sid = readTabSession();
  if (!sid) {
    sid = newSessionId();
    writeTabSession(sid);
    if (readTabSession() !== sid) return fallbackSessionId;
  }
  return sid;
}

export function AnalyticsTracker() {
  const eventQueueRef = useRef<QueuedEvent[]>([]);
  const scrollMilestonesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // 1. Do not run on administrative vault routes or when Do Not Track is enabled
    if (
      typeof window === 'undefined' ||
      window.location.pathname.startsWith('/studio-vault') ||
      window.location.pathname.startsWith('/api/admin') ||
      // Inside an iframe = the vault's Site Appearance live preview (the site can only be framed by
      // itself, see frame-ancestors in next.config.ts): don't count previews as visits.
      window.self !== window.top ||
      browserOptedOut()
    ) {
      return;
    }

    // Accepting cookies mid-visit: move this tab's session into the cookie so the visit isn't split.
    const handleConsent = (e: Event) => {
      if ((e as CustomEvent<ConsentChoice>).detail !== 'granted' || readCookie(SESSION_COOKIE)) return;
      const tabSid = readTabSession();
      if (tabSid) writeSessionCookie(tabSid);
    };
    window.addEventListener(CONSENT_EVENT, handleConsent);

    // Detect device, browser, OS
    const width = window.innerWidth;
    const deviceType: 'mobile' | 'tablet' | 'desktop' =
      width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

    const ua = navigator.userAgent;
    let browser = 'Other';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Edge';

    let os = 'Other';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';

    // Parse UTM tags
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || undefined;
    const utmMedium = params.get('utm_medium') || undefined;
    const path = window.location.pathname;
    const referrer = document.referrer ? new URL(document.referrer, window.location.origin).hostname : undefined;

    // Flush batch to endpoint via sendBeacon (fallback to fetch keepalive)
    const flushEvents = () => {
      if (eventQueueRef.current.length === 0) return;
      const payload = {
        sessionId: resolveSessionId(),
        events: eventQueueRef.current.splice(0, 20),
      };

      const jsonStr = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/collect', blob);
      } else {
        fetch('/api/analytics/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: jsonStr,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const pushEvent = (evt: Omit<QueuedEvent, 'timestamp' | 'deviceType' | 'browser' | 'os' | 'utmSource' | 'utmMedium' | 'referrer' | 'path'>) => {
      eventQueueRef.current.push({
        ...evt,
        path,
        referrer,
        utmSource,
        utmMedium,
        deviceType,
        browser,
        os,
        timestamp: Date.now(),
      });

      if (eventQueueRef.current.length >= 10) {
        flushEvents();
      }
    };

    // Delay initialization slightly after initial paint to guarantee zero animation frame drops
    const initTimer = setTimeout(() => {
      // 1. Initial Pageview
      pushEvent({ eventType: 'pageview' });

      // 2. Click Delegation (tracks elements with data-track="...")
      const handleGlobalClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const trackedEl = target.closest('[data-track]') as HTMLElement | null;
        if (trackedEl) {
          const trackName = trackedEl.getAttribute('data-track');
          if (trackName) {
            pushEvent({
              eventType: 'click',
              target: trackName,
            });
          }
        }
      };

      document.addEventListener('click', handleGlobalClick, { passive: true });

      // 3. Scroll Depth Tracking
      const handleScroll = () => {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight <= 0) return;
        const currentScroll = window.scrollY;
        const percent = Math.min(100, Math.round((currentScroll / totalHeight) * 100));

        [25, 50, 75, 100].forEach((milestone) => {
          if (percent >= milestone && !scrollMilestonesRef.current.has(milestone)) {
            scrollMilestonesRef.current.add(milestone);
            pushEvent({
              eventType: 'scroll',
              target: `scroll_${milestone}%`,
              metadata: { depth: milestone },
            });
          }
        });
      };

      window.addEventListener('scroll', handleScroll, { passive: true });

      // 4. Time On Page Heartbeats
      const timeHeartbeats = [10, 30, 60, 120];
      const heartbeatTimers = timeHeartbeats.map((sec) =>
        setTimeout(() => {
          pushEvent({
            eventType: 'time',
            target: `time_${sec}s`,
            metadata: { seconds: sec },
          });
        }, sec * 1000)
      );

      // Periodic flush
      const intervalTimer = setInterval(flushEvents, 4000);

      // Flush on unload / tab close
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          flushEvents();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', flushEvents);

      return () => {
        document.removeEventListener('click', handleGlobalClick);
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', flushEvents);
        clearInterval(intervalTimer);
        heartbeatTimers.forEach(clearTimeout);
      };
    }, 400);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener(CONSENT_EVENT, handleConsent);
      flushEvents();
    };
  }, []);

  return null;
}
