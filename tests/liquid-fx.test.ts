import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES, normalizeAppearance, appearanceBootScript, DEFAULT_APPEARANCE } from '../lib/palette';
import { contrastSafeRange, luminance, type FxPalette, type Rgb } from '../components/liquid/liquid-env';
import { colourSetup } from '../components/liquid/gradient-core';

const lin = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
};
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const EPS = 1e-9;

describe('Liquid effects: text over the shader gradients stays readable on every palette', () => {
  for (const p of PALETTES) {
    test(`${p.name}: CTA band keeps 4.5:1 with its text, and the accent itself is allowed`, () => {
      const la = luminance(lin(p.accent));
      const lo = luminance(lin(p.onAccent));
      const [min, max] = contrastSafeRange(lo, 4.5, lo < la);
      // the most extreme shade the shader may produce still has 4.5:1 with the band's text
      assert.ok(contrast(lo < la ? min : max, lo) >= 4.5 - EPS);
      // the palette's own accent is inside the range, so the band never gets pushed off-brand
      assert.ok(la >= min - EPS && la <= max + EPS, `accent luminance ${la} outside [${min}, ${max}]`);
    });

    test(`${p.name}: page-hero gradient keeps 4.5:1 for body text and 3:1 for the title`, () => {
      const dark = p.mode === 'dark';
      const lb = luminance(lin(p.bg));
      const small = contrastSafeRange(luminance(lin(p.muted)), 4.5, !dark);
      const large = contrastSafeRange(luminance(lin(p.text)), 3, !dark);
      assert.ok(contrast(dark ? small[1] : small[0], luminance(lin(p.muted))) >= 4.5 - EPS);
      assert.ok(contrast(dark ? large[1] : large[0], luminance(lin(p.text))) >= 3 - EPS);
      // the page background passes both, so the clamp never fights the palette itself
      assert.ok(lb >= small[0] - EPS && lb <= small[1] + EPS, `bg outside small-text range`);
      assert.ok(lb >= large[0] - EPS && lb <= large[1] + EPS, `bg outside title range`);
    });
  }
});

describe('Liquid effects: the shader colour setups used on screen', () => {
  const fxPalette = (p: (typeof PALETTES)[number]): FxPalette => ({
    bg: lin(p.bg),
    surface: lin(p.surface),
    text: lin(p.text),
    muted: lin(p.muted),
    accent: lin(p.accent),
    onAccent: lin(p.onAccent),
    mode: p.mode,
    key: p.id,
  });
  const within = (l: number, [min, max]: [number, number]) => l >= min - EPS && l <= max + EPS;

  for (const p of PALETTES) {
    test(`${p.name}: every text range admits the palette's own background (home and page heroes)`, () => {
      const pal = fxPalette(p);
      const lb = luminance(pal.bg);
      for (const preset of ['home', 'hero'] as const) {
        const c = colourSetup(preset, pal);
        for (const key of ['free', 'small', 'large', 'mark'] as const) assert.ok(within(lb, c[key]), `${preset}.${key} excludes the background`);
        // the wordmark range is never looser than the title range
        assert.ok(c.mark[0] >= c.large[0] - EPS && c.mark[1] <= c.large[1] + EPS);
      }
    });

    test(`${p.name}: the CTA band's range admits its accent`, () => {
      const pal = fxPalette(p);
      assert.ok(within(luminance(pal.accent), colourSetup('cta', pal).free));
    });

    test(`${p.name}: section ambience keeps 4.5:1 for body, muted and accent text everywhere`, () => {
      const pal = fxPalette(p);
      const c = colourSetup('ambient', pal);
      const [min, max] = c.free;
      for (const colour of [pal.text, pal.muted, pal.accent]) {
        const lt = luminance(colour);
        // the clamp's extremes still read against every text colour used in sections
        if (max >= lt) assert.ok(contrast(min, lt) >= 4.5 - EPS);
        else assert.ok(contrast(max, lt) >= 4.5 - EPS);
      }
      assert.ok(within(luminance(pal.bg), c.free), 'background outside the ambient range');
      if (p.mode === 'dark') {
        // dark palettes are scaled so even the brightest lit fold stays under the limit, i.e. no flat clipping
        const peak = luminance(c.c2) * (c.shade[0] + c.shade[1]) + luminance(c.hi) * 1.1 * c.light;
        assert.ok(peak <= max + EPS, `peak ${peak} above ${max}`);
      }
    });
  }
});

describe('Liquid effects: the Effects and Liquid-metal appearance settings', () => {
  test('effects default to liquid, keep classic, reject unknown values', () => {
    assert.equal(DEFAULT_APPEARANCE.fx, 'liquid');
    assert.equal(normalizeAppearance({}).fx, 'liquid');
    assert.equal(normalizeAppearance({ fx: 'classic' }).fx, 'classic');
    assert.equal(normalizeAppearance({ fx: '<script>' }).fx, 'liquid');
  });

  test('liquid-metal ZZ is off by default and can be switched on', () => {
    assert.equal(DEFAULT_APPEARANCE.metal, 'off');
    assert.equal(normalizeAppearance({}).metal, 'off');
    assert.equal(normalizeAppearance({ metal: 'on' }).metal, 'on');
    assert.equal(normalizeAppearance({ metal: 'chrome' }).metal, 'off');
  });

  test('settings saved before these existed still load', () => {
    const old = { palette: 'cobalt', look: 'studio', scroll: 'normal', strands: 'on' };
    assert.deepEqual(normalizeAppearance(old), { ...old, fx: 'liquid', metal: 'off' });
  });

  test('the preview boot script accepts ?fx= and ?metal= overrides', () => {
    assert.match(appearanceBootScript, /fx:\["liquid","classic"\]/);
    assert.match(appearanceBootScript, /metal:\["off","on"\]/);
  });
});
