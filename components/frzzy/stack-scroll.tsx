'use client';

import { useEffect } from 'react';

/**
 * "Page by page" stacking scroll (active when <html data-scroll="stack">).
 *
 * Every top-level block of the current view becomes a sticky sheet:
 *  - short sections pin just under the header,
 *  - tall sections scroll normally until their bottom reaches the screen bottom, then pin,
 *    so no content is ever hidden before you have seen it.
 * The next section then slides up over the pinned one, which shrinks back and dims
 * (driven by --cover: 0 → 1). Fully covered sheets are hidden to save painting.
 * Styles live in globals.css under :root[data-scroll="stack"].
 */
export function StackScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const site = document.querySelector('.frzzy-site');
    if (!site) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let items: HTMLElement[] = [];
    let raf = 0;
    const isStack = () => root.getAttribute('data-scroll') === 'stack';
    const headerH = () => (document.querySelector('header.site') as HTMLElement | null)?.offsetHeight ?? 0;

    const ro = new ResizeObserver(() => schedule(true));

    const clear = () => {
      items.forEach((el) => {
        el.classList.remove('stack-item');
        el.style.removeProperty('--stick-top');
        el.style.removeProperty('--cover');
        delete el.dataset.covered;
        delete el.dataset.covering;
        ro.unobserve(el);
      });
      items = [];
    };

    const collect = () => {
      clear();
      if (!isStack()) return;
      const view = site.querySelector('.view');
      if (!view) return;
      items = Array.from(view.children).filter((c): c is HTMLElement => c instanceof HTMLElement);
      items.forEach((el) => {
        el.classList.add('stack-item');
        ro.observe(el);
      });
      measure();
      update();
    };

    const measure = () => {
      const vh = window.innerHeight;
      const hh = headerH();
      for (const el of items) {
        const top = Math.min(hh, vh - el.offsetHeight);
        el.style.setProperty('--stick-top', `${Math.round(top)}px`);
      }
    };

    const update = () => {
      raf = 0;
      if (!isStack() || !items.length) return;
      const vh = window.innerHeight;
      const hh = headerH();
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        const next = items[i + 1];
        let p = 0;
        if (next) {
          const nextTop = next.getBoundingClientRect().top;
          p = Math.min(1, Math.max(0, (vh - nextTop) / Math.max(1, vh - hh)));
        }
        // only sheets that are actually being covered get the shrink/dim (no transform otherwise)
        if (!reduce && p > 0.001) {
          el.dataset.covering = '1';
          el.style.setProperty('--cover', p.toFixed(3));
        } else {
          delete el.dataset.covering;
          el.style.removeProperty('--cover');
        }
        if (p >= 0.999) el.dataset.covered = '1';
        else delete el.dataset.covered;
      }
    };

    function schedule(remeasure = false) {
      if (remeasure && isStack()) measure();
      if (!raf) raf = requestAnimationFrame(update);
    }
    const onScroll = () => schedule();
    const onResize = () => schedule(true);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // a new view is mounted by the hash router, a section is added to the current view later
    // (e.g. reviews once they've loaded), or the mode is switched live
    const viewObserver = new MutationObserver((muts) => {
      const changed = muts.some(
        (m) =>
          (m.target instanceof HTMLElement && m.target.classList.contains('view')) ||
          Array.from(m.addedNodes).some((n) => n instanceof HTMLElement && n.classList.contains('view'))
      );
      if (changed) collect();
    });
    viewObserver.observe(site, { childList: true, subtree: true });
    const modeObserver = new MutationObserver(collect);
    modeObserver.observe(root, { attributes: true, attributeFilter: ['data-scroll'] });

    collect();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      viewObserver.disconnect();
      modeObserver.disconnect();
      ro.disconnect();
      clear();
    };
  }, []);

  return null;
}
