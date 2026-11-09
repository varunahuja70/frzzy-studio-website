'use client';

import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import { pathFor, type ViewRoute } from './site-routes';

/**
 * Navigation on phones and small tablets (≤880px; wider screens use the header's .nav-links).
 *
 * MenuButton sits in the header: a glass capsule whose bead flips over (lines → FRZZY Z) while
 * the menu is open, so there is no separate close button. MobileMenu is a floating glass sheet
 * just under the header. It is rendered outside the header because the header's backdrop blur
 * would stop the sheet's own blur from reaching the page. It closes on a tap outside it, on
 * choosing a page, on Esc, or on the menu button. Styles: "MOBILE MENU" in app/globals.css.
 */

export const MOBILE_MENU_ID = 'mobile-menu';

const PAGES: { id: string; label: string; views: ViewRoute[] }[] = [
  { id: '#home', label: 'Home', views: ['home'] },
  { id: '#work', label: 'Work', views: ['work', 'case'] },
  { id: '#services', label: 'Services', views: ['services'] },
  { id: '#about', label: 'About', views: ['about'] },
  { id: '#book', label: 'Book a call', views: ['book'] },
];

const step = (i: number) => ({ '--i': i }) as CSSProperties;

export function MenuButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button className="menu-btn" type="button" aria-expanded={open} aria-controls={MOBILE_MENU_ID} onClick={onToggle}>
      <span className="mb-label">Menu</span>
      <span className="mb-bead" aria-hidden="true">
        <span className="mb-coin">
          <span className="mb-face mb-front">
            <i />
            <i />
          </span>
          <span className="mb-face mb-back">
            <svg viewBox="0 0 34 44">
              <use href="#z" />
            </svg>
          </span>
        </span>
      </span>
    </button>
  );
}

interface MobileMenuProps {
  open: boolean;
  current: ViewRoute;
  /** Switches page with the page wipe (and closes the menu). Takes an in-site id like '#work'. */
  onNavigate: (id: string) => void;
  onClose: () => void;
}

export function MobileMenu({ open, current, onNavigate, onClose }: MobileMenuProps) {
  const sheetRef = useRef<HTMLElement>(null);

  // While open: the page behind doesn't scroll, Esc closes, and growing past the phone layout
  // closes it too. Focus left inside the sheet goes back to the menu button when it closes.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const sheet = sheetRef.current;
    const menuButton = () => document.querySelector<HTMLElement>('header.site .menu-btn');
    const wide = window.matchMedia('(min-width: 881px)');
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onClose();
      menuButton()?.focus({ preventScroll: true });
    };
    const onWide = () => {
      if (wide.matches) onClose();
    };
    root.setAttribute('data-menu-open', '');
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      root.removeAttribute('data-menu-open');
      window.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
      if (sheet?.contains(document.activeElement)) menuButton()?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  const go = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab as usual
    e.preventDefault();
    onNavigate(id);
  };

  return (
    <div className="mnav" data-open={open ? '' : undefined}>
      <div className="mnav-scrim" aria-hidden="true" onClick={onClose} />
      <nav ref={sheetRef} id={MOBILE_MENU_ID} className="mnav-sheet" aria-label="Menu">
        <span className="mnav-glow" aria-hidden="true" />
        <ul className="mnav-list">
          {PAGES.map((page, i) => (
            <li key={page.id} style={step(i)}>
              <a href={pathFor(page.id)} aria-current={page.views.includes(current) ? 'page' : undefined} onClick={go(page.id)}>
                <span className="mnav-idx" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="mnav-label">{page.label}</span>
                <svg className="mnav-go" aria-hidden="true">
                  <use href="#arrow" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
        <a
          className="btn btn-volt btn-glass mnav-cta"
          href={pathFor('#contact')}
          aria-current={current === 'contact' ? 'page' : undefined}
          onClick={go('#contact')}
          style={step(PAGES.length)}
        >
          Start a project
          <svg aria-hidden="true">
            <use href="#arrow" />
          </svg>
        </a>
        <p className="mono mnav-foot" aria-hidden="true" style={step(PAGES.length + 1)}>
          <span>Motion · 3D · Visuals</span>
          <span>Studio · India</span>
        </p>
      </nav>
    </div>
  );
}
