'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_FX, DEFAULT_LOOK, DEFAULT_METAL, DEFAULT_PALETTE, DEFAULT_SCROLL, DEFAULT_STRANDS, PALETTE_EVENT } from '@/lib/palette';

/**
 * Increments every time the palette is switched live. Use it as a React `key` on canvas / WebGL
 * effects so they re-initialise and read the new colours (CSS-only parts update by themselves).
 *
 * Also self-heals <html data-palette / data-look>: the boot script in <head> sets them before
 * paint, but a tab that was open across an update can be running an older script without them.
 */
export function usePaletteVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const root = document.documentElement;
    let healed = false;
    if (!root.getAttribute('data-palette')) {
      root.setAttribute('data-palette', DEFAULT_PALETTE);
      healed = true;
    }
    if (!root.getAttribute('data-look')) {
      root.setAttribute('data-look', DEFAULT_LOOK);
      healed = true;
    }
    if (!root.getAttribute('data-scroll')) {
      root.setAttribute('data-scroll', DEFAULT_SCROLL);
      healed = true;
    }
    if (!root.getAttribute('data-strands')) {
      root.setAttribute('data-strands', DEFAULT_STRANDS);
      healed = true;
    }
    if (!root.getAttribute('data-fx')) {
      root.setAttribute('data-fx', DEFAULT_FX);
      healed = true;
    }
    if (!root.getAttribute('data-metal')) {
      root.setAttribute('data-metal', DEFAULT_METAL);
      healed = true;
    }
    const bump = () => setVersion((n) => n + 1);
    window.addEventListener(PALETTE_EVENT, bump);
    if (healed) window.dispatchEvent(new CustomEvent(PALETTE_EVENT));
    return () => window.removeEventListener(PALETTE_EVENT, bump);
  }, []);
  return version;
}
