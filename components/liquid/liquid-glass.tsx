'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLiquidFx, useLook } from './liquid-env';

/**
 * Liquid glass. Inspired by dashersw/liquid-glass-js, but instead of re-rendering a screenshot of
 * the page in WebGL it refracts the real thing: a displacement map is generated for the shape
 * (strong bend at the rim, optional magnification in the middle) and applied with an SVG filter
 * as a `backdrop-filter`.
 *   NavLens         → a lens that glides to the hovered nav link and rests on the current page
 *   GlassRefraction → gives its parent element a refracting, frosted glass rim (home hero dock)
 *
 * Only Chromium browsers can use an SVG filter as a backdrop filter; elsewhere the same elements
 * are frosted glass with a lit rim (CSS in globals.css). If this code fails to run, the original
 * styles stay.
 */

let glassChecked = false;
/** Marks <html data-glass="refract"> when SVG backdrop filters are supported (Chromium). */
function detectRefraction() {
  if (glassChecked) return;
  glassChecked = true;
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands ?? [];
  const chromium = brands.some((b) => /Chromium/i.test(b.brand));
  if (chromium && CSS.supports('backdrop-filter', 'url(#x)')) document.documentElement.dataset.glass = 'refract';
}

/**
 * Displacement map for a rounded rectangle, as a PNG data URL. R/G store the x/y offset
 * (128 = none), scaled so ±127 means ±maxShift px:
 *   - rim (within `bezel` px of the edge): samples from further out, like the curved edge of a lens
 *   - everywhere inside: samples slightly towards the centre, i.e. magnifies by 1 / (1 - magnify)
 */
export function glassMap(w: number, h: number, radius: number, { bezel = 7, edge = 7, magnify = 0.06, maxShift = 16 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(w, h);
  const r = Math.min(radius, w / 2, h / 2);
  const cx = w / 2;
  const cy = h / 2;
  const sdf = (x: number, y: number) => {
    const qx = Math.abs(x - cx) - (cx - r);
    const qy = Math.abs(y - cy) - (cy - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d = sdf(px, py);
      let dx = 0;
      let dy = 0;
      // outside, or (without magnification) inside the flat middle: no offset, skip the maths
      if (d < 0 && (magnify > 0 || d > -bezel)) {
        const nx = sdf(px + 0.5, py) - sdf(px - 0.5, py);
        const ny = sdf(px, py + 0.5) - sdf(px, py - 0.5);
        const len = Math.hypot(nx, ny) || 1;
        const rim = Math.max(0, 1 + d / bezel); // 1 at the edge → 0 at the inner end of the bezel
        const bend = edge * rim * rim;
        dx = (nx / len) * bend + (cx - px) * magnify;
        dy = (ny / len) * bend + (cy - py) * magnify;
      }
      const o = (y * w + x) * 4;
      img.data[o] = Math.round(128 + Math.max(-1, Math.min(1, dx / maxShift)) * 127);
      img.data[o + 1] = Math.round(128 + Math.max(-1, Math.min(1, dy / maxShift)) * 127);
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

/** Renders one SVG filter that refracts through a generated map of the given size (then frosts it). */
function GlassFilter({
  id,
  w,
  h,
  url,
  maxShift,
  frost = 0,
  saturate = 1.45,
}: {
  id: string;
  w: number;
  h: number;
  url: string;
  maxShift: number;
  frost?: number;
  saturate?: number;
}) {
  return (
    <svg className="glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feFlood floodColor="rgb(128,128,128)" result="neutral" />
        <feImage href={url} x="0" y="0" width={w} height={h} preserveAspectRatio="none" result="map" />
        <feComposite in="map" in2="neutral" operator="over" result="fullmap" />
        <feDisplacementMap in="SourceGraphic" in2="fullmap" scale={maxShift * 2} xChannelSelector="R" yChannelSelector="G" result="bent" />
        {/* The header is see-through glass, so the backdrop has transparent areas; flatten the bent image
            onto the page colour so the unbent text underneath can't show through as a ghost. */}
        <feFlood style={{ floodColor: 'rgb(var(--black-rgb))' }} result="page" />
        <feComposite in="bent" in2="page" operator="over" result="solid" />
        {frost > 0 && <feGaussianBlur in="solid" stdDeviation={frost} result="solid" />}
        <feColorMatrix in="solid" type="saturate" values={String(saturate)} />
      </filter>
    </svg>
  );
}

const MAX_SHIFT = 16;

/**
 * Glass lens for `.nav-links`. Render it as the first child of the <ul>; it positions itself over
 * the hovered (or current) link. Hidden when the nav collapses into the mobile menu.
 */
export function NavLens() {
  const lensRef = useRef<HTMLLIElement>(null);
  const fx = useLiquidFx();
  const look = useLook();
  const enabled = fx && look === 'mac';
  const filterId = `lg-nav-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [map, setMap] = useState<{ w: number; h: number; url: string } | null>(null);

  useEffect(() => {
    const lens = lensRef.current;
    const ul = lens?.parentElement;
    if (!enabled || !lens || !ul) return;
    detectRefraction();
    ul.setAttribute('data-lens', 'on'); // an attribute, not a class: React owns the <ul>'s className

    let hover: HTMLElement | null = null;
    let lastX: number | null = null;
    let size = '';
    let squishTimer = 0;
    const links = () => Array.from(ul.querySelectorAll<HTMLElement>(':scope > li > a:not(.btn)'));

    const place = () => {
      const target = hover ?? links().find((a) => a.getAttribute('aria-current') === 'page') ?? null;
      const collapsed = getComputedStyle(ul).flexDirection === 'column' || !ul.offsetWidth;
      if (!target || collapsed) {
        lens.style.opacity = '0';
        lastX = null;
        return;
      }
      const x = target.offsetLeft;
      const y = target.offsetTop;
      const w = target.offsetWidth;
      const h = target.offsetHeight;
      if (lastX === null) {
        // first appearance: no glide in from the corner
        lens.classList.add('no-anim');
        requestAnimationFrame(() => requestAnimationFrame(() => lens.classList.remove('no-anim')));
      } else if (Math.abs(x - lastX) > 2) {
        lens.classList.remove('is-moving');
        void lens.offsetWidth; // restart the squish
        lens.classList.add('is-moving');
        clearTimeout(squishTimer);
        squishTimer = window.setTimeout(() => lens.classList.remove('is-moving'), 480);
      }
      lastX = x;
      lens.style.transform = `translate(${x}px, ${y}px)`;
      lens.style.width = `${w}px`;
      lens.style.height = `${h}px`;
      lens.style.opacity = '1';
      const key = `${w}x${h}`;
      if (key !== size && w > 0 && h > 0) {
        size = key;
        setMap({ w, h, url: glassMap(w, h, h / 2, { maxShift: MAX_SHIFT }) });
      }
    };

    const onOver = (e: PointerEvent) => {
      const a = (e.target as Element | null)?.closest?.('a');
      const next = a && ul.contains(a) && !a.classList.contains('btn') ? (a as HTMLElement) : null;
      if (next !== hover) {
        hover = next;
        place();
      }
    };
    const onLeave = () => {
      hover = null;
      place();
    };
    ul.addEventListener('pointerover', onOver);
    ul.addEventListener('pointerleave', onLeave);
    const mo = new MutationObserver(place);
    mo.observe(ul, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
    const ro = new ResizeObserver(place);
    ro.observe(ul);
    document.fonts?.ready.then(place);
    place();

    return () => {
      clearTimeout(squishTimer);
      ul.removeEventListener('pointerover', onOver);
      ul.removeEventListener('pointerleave', onLeave);
      mo.disconnect();
      ro.disconnect();
      ul.removeAttribute('data-lens');
      for (const prop of ['transform', 'width', 'height', 'opacity']) lens.style.removeProperty(prop);
    };
  }, [enabled]);

  return (
    <li ref={lensRef} className="nav-lens" aria-hidden="true" role="presentation" style={{ ['--lens-filter' as string]: `url(#${filterId})` }}>
      {enabled && map && <GlassFilter id={filterId} w={map.w} h={map.h} url={map.url} maxShift={MAX_SHIFT} />}
    </li>
  );
}

/**
 * Refracting glass for its parent element: render it as a child of the panel. It builds a
 * displacement map matching the parent's size and corner radius and exposes the filter as the
 * parent's `--glass-filter` custom property; CSS applies it as the `backdrop-filter` where
 * supported (see the hero dock in globals.css). Rebuilt when the panel resizes.
 */
export function GlassRefraction({
  bezel = 26,
  edge = 20,
  maxShift = 26,
  frost = 12,
  saturate = 1.6,
}: {
  bezel?: number;
  edge?: number;
  maxShift?: number;
  frost?: number;
  saturate?: number;
}) {
  const holderRef = useRef<HTMLSpanElement>(null);
  const fx = useLiquidFx();
  const filterId = `lg-panel-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [map, setMap] = useState<{ w: number; h: number; url: string } | null>(null);

  useEffect(() => {
    const host = holderRef.current?.parentElement;
    if (!fx || !host) return;
    detectRefraction();
    let raf = 0;
    let key = '';
    const build = () => {
      const w = host.offsetWidth;
      const h = host.offsetHeight;
      const radius = parseFloat(getComputedStyle(host).borderTopLeftRadius) || 0;
      const next = `${w}x${h}x${radius}`;
      if (!w || !h || next === key) return;
      key = next;
      setMap({ w, h, url: glassMap(w, h, radius, { bezel, edge, magnify: 0, maxShift }) });
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(build);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(host);
    // the corner radius depends on the look (Mac rounds, Studio doesn't)
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-look'] });
    host.style.setProperty('--glass-filter', `url(#${filterId})`);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      host.style.removeProperty('--glass-filter');
    };
  }, [fx, filterId, bezel, edge, maxShift]);

  if (!fx) return null;
  return (
    <span ref={holderRef} className="glass-defs" aria-hidden="true">
      {map && <GlassFilter id={filterId} w={map.w} h={map.h} url={map.url} maxShift={maxShift} frost={frost} saturate={saturate} />}
    </span>
  );
}
