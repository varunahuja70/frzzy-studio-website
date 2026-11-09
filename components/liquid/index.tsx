'use client';

import { Component, useSyncExternalStore, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Hero3DBackdrop } from '@/components/frzzy/hero-3d-backdrop';
import { canUseWebGL, useFxMode, useLiquidFx, useMetalOn } from './liquid-env';
import type { GradientPreset } from './liquid-gradient';
import type { MetalVariant } from './liquid-metal';
import type { AmbientAt } from './ambient-glow';

/**
 * Public entry points for the liquid effects. They render only when Effects is Liquid (Studio
 * Vault → Site Appearance) and hardware WebGL is available; the effect code is downloaded only
 * when an effect actually mounts (three.js itself is shared with the classic hero). Any runtime
 * error inside an effect is contained here, leaving the original design in place.
 */

export { NavLens, GlassRefraction } from './liquid-glass';

class FxBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[liquid-fx] effect disabled after an error:', error);
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

const GradientImpl = dynamic(() => import('./liquid-gradient'), { ssr: false, loading: () => null });
const MetalImpl = dynamic(() => import('./liquid-metal'), { ssr: false, loading: () => null });
const HeroImpl = dynamic(() => import('./liquid-hero'), { ssr: false, loading: () => null });
const AmbientImpl = dynamic(() => import('./ambient-glow'), { ssr: false, loading: () => null });

const noSubscribe = () => () => {};
function useWebGL() {
  return useSyncExternalStore(noSubscribe, canUseWebGL, () => false);
}

/** Flowing shader gradient. Put it as the first child of a `.page-hero` or `.cta-band`. */
export function LiquidGradient({ preset }: { preset: Exclude<GradientPreset, 'home'> }) {
  const fx = useLiquidFx();
  const gl = useWebGL();
  if (!fx || !gl) return null;
  return (
    <FxBoundary>
      <GradientImpl preset={preset} />
    </FxBoundary>
  );
}

/**
 * A faint glow of the liquid gradient in a content section: put it as the first child of a
 * `.section`. `at` picks the corner it gathers in; `seed` (0–3) varies the crop so neighbouring
 * sections don't look alike. Calm by design: dim enough that all text in the section keeps 4.5:1.
 */
export function Ambient({ at = 'tr', seed = 0 }: { at?: AmbientAt; seed?: number }) {
  const fx = useLiquidFx();
  const gl = useWebGL();
  if (!fx || !gl) return null;
  return (
    <FxBoundary>
      <AmbientImpl at={at} seed={seed} />
    </FxBoundary>
  );
}

/**
 * Liquid-metal ZZ. Put it inside a `.wm` that contains two `svg.z`. Shown only when Effects is
 * Liquid AND "Liquid-metal ZZ" is switched on (off by default).
 */
export function LiquidZZ({ variant }: { variant: MetalVariant }) {
  const fx = useLiquidFx();
  const metal = useMetalOn();
  const gl = useWebGL();
  if (!fx || !metal || !gl) return null;
  return (
    <FxBoundary>
      <MetalImpl variant={variant} />
    </FxBoundary>
  );
}

/**
 * The home hero's 3D layer: the liquid hero (gradient + glass bolts) when Effects is Liquid,
 * otherwise, or if WebGL/the effect fails, the classic glossy bolts.
 */
export function HeroBackdrop() {
  const mode = useFxMode();
  const gl = useWebGL();
  if (mode === 'pending') return null; // decided right after hydration, so only one hero ever starts
  if (mode === 'classic' || !gl) return <Hero3DBackdrop />;
  return (
    <FxBoundary fallback={<Hero3DBackdrop />}>
      <HeroImpl />
    </FxBoundary>
  );
}
