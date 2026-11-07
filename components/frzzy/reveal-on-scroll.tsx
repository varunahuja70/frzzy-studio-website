'use client';

import { useEffect } from 'react';

/**
 * Apple-style "fade up as it enters" for content blocks. Adds .rv to matching elements and
 * .rv-in once they scroll into view (siblings get a small stagger via --rv-i).
 * The visual effect is defined only for the Mac look in globals.css, so the Studio look is
 * unchanged. Nothing is hidden without JavaScript (the .rv class is added here), and
 * reduced-motion users get no animation.
 */
const SELECTOR = [
  '.sec-head',
  '.page-hero .wrap > *',
  '.card',
  '.process .step',
  '.services li',
  '.faq-item',
  '.review',
  '.reviews-head',
  '.reach-item',
  '.book-steps li',
  '.value',
  '.image-band',
  '.cta-band',
  '.index-bar',
  '.foot-band',
].join(',');

export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('rv-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    const scan = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (el.classList.contains('rv')) return;
        const sibs = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.matches(SELECTOR)) : [];
        el.style.setProperty('--rv-i', String(Math.min(6, Math.max(0, sibs.indexOf(el)))));
        el.classList.add('rv');
        io.observe(el);
      });
    };

    const main = document.querySelector('.frzzy-site') ?? document.body;
    scan(main);
    // views are swapped in by the hash router: pick up new content as it mounts
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof HTMLElement && scan(n.parentElement ?? n));
    });
    mo.observe(main, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
