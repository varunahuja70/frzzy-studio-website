'use client';

import { useEffect, useRef } from 'react';

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

export function AnalyticsTracker() {
  const sessionIdRef = useRef<string>('');
  const eventQueueRef = useRef<QueuedEvent[]>([]);
  const scrollMilestonesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // 1. Respect Do Not Track and Global Privacy Control
    if (
      typeof window === 'undefined' ||
      navigator.doNotTrack === '1' ||
      (window as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true
    ) {
      return;
    }

    // Initialize or restore session ID
    try {
      let sid = sessionStorage.getItem('frxcx_sid');
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('frxcx_sid', sid);
      }
      sessionIdRef.current = sid;
    } catch {
      sessionIdRef.current = 'anon_' + Date.now().toString(36);
    }

    const sessionId = sessionIdRef.current;

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
        sessionId,
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
      flushEvents();
    };
  }, []);

  return null;
}
