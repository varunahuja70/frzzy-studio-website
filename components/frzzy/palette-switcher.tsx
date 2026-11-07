'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { applyLook, applyPalette, applyScroll, DEFAULT_LOOK, DEFAULT_PALETTE, DEFAULT_SCROLL, LOOKS, Palette, PALETTE_EVENT, PALETTES, SCROLLS } from '@/lib/palette';

/**
 * Dev-only palette preview (bottom-right). Not rendered in production builds.
 * ‹ › step through palettes; the middle button opens a grid of every palette.
 * Switching is live: no reload, scroll position kept.
 * The live site uses DEFAULT_PALETTE (lib/palette.ts) unless ?palette= is in the URL.
 */
const subscribe = (cb: () => void) => {
  window.addEventListener(PALETTE_EVENT, cb);
  return () => window.removeEventListener(PALETTE_EVENT, cb);
};
const getActive = () => document.documentElement.getAttribute('data-palette');
const getLook = () => document.documentElement.getAttribute('data-look');
const getScroll = () => document.documentElement.getAttribute('data-scroll');
// attribute changes (look/scroll) don't fire the palette event, so also watch <html> attributes
const subscribeAttrs = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-look', 'data-scroll', 'data-palette'] });
  return () => mo.disconnect();
};
const getServerActive = () => null;

function Swatch({ p }: { p: Palette }) {
  return (
    <i
      className="ps-swatch"
      style={{ background: `linear-gradient(135deg, ${p.bg} 0 50%, ${p.accent} 50% 100%)`, borderColor: p.line }}
    />
  );
}

function Tile({ p, active, onPick }: { p: Palette; active: boolean; onPick: () => void }) {
  return (
    <button type="button" className="ps-tile" aria-pressed={active} onClick={onPick} title={p.note}>
      <span className="ps-preview" style={{ background: p.bg, borderColor: p.line }}>
        <span className="ps-aa" style={{ color: p.text }}>Aa</span>
        <span className="ps-lines">
          <span style={{ background: p.text }} />
          <span style={{ background: p.muted }} />
        </span>
        <span className="ps-chip" style={{ background: p.accent, color: p.onAccent }}>
          →
        </span>
        <span className="ps-surface" style={{ background: p.surface }} />
      </span>
      <span className="ps-name">
        {p.name}
        {p.id === DEFAULT_PALETTE && <em>default</em>}
      </span>
      <span className="ps-note">{p.note}</span>
    </button>
  );
}

export function PaletteSwitcher() {
  const active = useSyncExternalStore(subscribe, getActive, getServerActive);
  const look = useSyncExternalStore(subscribeAttrs, getLook, getServerActive);
  const scroll = useSyncExternalStore(subscribeAttrs, getScroll, getServerActive);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (process.env.NODE_ENV === 'production') return null;

  const index = Math.max(0, PALETTES.findIndex((p) => p.id === active));
  const current = PALETTES[index];
  const step = (d: number) => applyPalette(PALETTES[(index + d + PALETTES.length) % PALETTES.length].id);

  return (
    <div className="palette-switcher" ref={rootRef}>
      {open && (
        <div className="ps-panel" role="dialog" aria-label="Choose a colour palette">
          {(['dark', 'light'] as const).map((mode) => (
            <div key={mode} className="ps-group">
              <p className="mono">{mode === 'dark' ? 'Dark themes' : 'Light themes'}</p>
              <div className="ps-grid">
                {PALETTES.filter((p) => p.mode === mode).map((p) => (
                  <Tile key={p.id} p={p} active={p.id === active} onPick={() => applyPalette(p.id)} />
                ))}
              </div>
            </div>
          ))}
          <p className="ps-foot">
            Preview only (dev). Live defaults: <b>{PALETTES.find((p) => p.id === DEFAULT_PALETTE)?.name}</b> palette,{' '}
            <b>{LOOKS.find((l) => l.id === DEFAULT_LOOK)?.name}</b> look,{' '}
            <b>{SCROLLS.find((m) => m.id === DEFAULT_SCROLL)?.name}</b> scroll. Set in lib/palette.ts
          </p>
        </div>
      )}

      <div className="ps-bar" role="group" aria-label="Look and colour palette preview (dev only)">
        <span className="mono">Look</span>
        <span className="ps-seg" role="group" aria-label="Look">
          {LOOKS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={look === l.id}
              title={`${l.note}${l.id === DEFAULT_LOOK ? ' (default)' : ''}`}
              onClick={() => applyLook(l.id)}
            >
              {l.name}
            </button>
          ))}
        </span>
        <span className="mono ps-sep">Scroll</span>
        <span className="ps-seg" role="group" aria-label="Scroll">
          {SCROLLS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={scroll === m.id}
              title={`${m.note}${m.id === DEFAULT_SCROLL ? ' (default)' : ''}`}
              onClick={() => applyScroll(m.id)}
            >
              {m.name}
            </button>
          ))}
        </span>
        <span className="mono ps-sep">Palette</span>
        <button type="button" className="ps-step" aria-label="Previous palette" onClick={() => step(-1)}>
          ‹
        </button>
        <button type="button" className="ps-current" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {current && <Swatch p={current} />}
          {current?.name ?? '…'}
          <span className="ps-count">
            {index + 1}/{PALETTES.length}
          </span>
        </button>
        <button type="button" className="ps-step" aria-label="Next palette" onClick={() => step(1)}>
          ›
        </button>
      </div>
    </div>
  );
}
