'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Monitor,
  MousePointerClick,
  Palette as PaletteIcon,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import type { Palette, SiteAppearance } from '@/lib/palette';

/**
 * Studio Vault → Site Appearance.
 * Chooses how the PUBLIC website looks for every visitor: palette, look, scroll mode, hero strands.
 * Saved to the `settings` table via /api/admin/appearance (settings:edit, audit-logged).
 * The preview shows the real site with ?palette=…&look=… overrides (nothing is saved until Save).
 */

interface Option {
  id: string;
  name: string;
  note: string;
}
interface AppearanceResponse {
  appearance: SiteAppearance;
  updatedAt: number | null;
  defaults: SiteAppearance;
  canEdit: boolean;
  options: { palettes: Palette[]; looks: Option[]; scrolls: Option[]; strands: Option[] };
}

const card =
  'p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs';
const title = 'font-bold text-sm text-[#12110b] dark:text-[#f4efea]';
const sub = 'text-xs text-[#5a6265] dark:text-[#a09d93]';

/* Tiny illustrations for the option cards */
function LookArt({ id }: { id: string }) {
  const r = id === 'mac' ? 6 : 0;
  return (
    <svg viewBox="0 0 64 40" className="w-full h-full" aria-hidden="true">
      <rect x="4" y="4" width="56" height="32" rx={r} className="fill-black/[0.06] dark:fill-white/[0.06]" />
      {id === 'mac' && (
        <>
          <circle cx="10" cy="9" r="1.6" fill="#ff5f57" />
          <circle cx="15" cy="9" r="1.6" fill="#febc2e" />
          <circle cx="20" cy="9" r="1.6" fill="#28c840" />
        </>
      )}
      <rect x="10" y="16" width="26" height="5" rx={r / 2} className="fill-[#12110b] dark:fill-[#f4efea]" />
      <rect x="10" y="25" width="16" height="6" rx={id === 'mac' ? 3 : 0} fill="#ff4f31" />
      <rect x="40" y="16" width="14" height="15" rx={r} className="fill-black/[0.12] dark:fill-white/[0.12]" />
    </svg>
  );
}
function ScrollArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 64 40" className="w-full h-full" aria-hidden="true">
      {id === 'stack' ? (
        <>
          <rect x="10" y="4" width="44" height="22" rx="3" className="fill-black/[0.08] dark:fill-white/[0.08]" />
          <rect x="7" y="11" width="50" height="22" rx="3" className="fill-black/[0.14] dark:fill-white/[0.14]" />
          <rect x="4" y="18" width="56" height="20" rx="3" className="fill-[#12110b] dark:fill-[#f4efea]" />
        </>
      ) : (
        <>
          <rect x="4" y="3" width="56" height="10" rx="2" className="fill-black/[0.1] dark:fill-white/[0.1]" />
          <rect x="4" y="15" width="56" height="10" rx="2" className="fill-black/[0.16] dark:fill-white/[0.16]" />
          <rect x="4" y="27" width="56" height="10" rx="2" className="fill-black/[0.1] dark:fill-white/[0.1]" />
        </>
      )}
    </svg>
  );
}
function StrandsArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 64 40" className="w-full h-full" aria-hidden="true">
      <rect x="2" y="2" width="60" height="36" rx="4" className="fill-black/[0.06] dark:fill-white/[0.06]" />
      {id === 'on' &&
        Array.from({ length: 15 }).map((_, i) => (
          <line
            key={i}
            x1={6 + i * 3.7}
            y1="3"
            x2={6 + i * 3.7 + (i % 3) - 1}
            y2={12 + (i % 4) * 3}
            strokeWidth="0.8"
            className={i % 4 === 0 ? 'stroke-[#ff4f31]' : 'stroke-black/40 dark:stroke-white/40'}
          />
        ))}
      <text x="32" y="30" textAnchor="middle" fontSize="11" fontWeight="900" className="fill-[#12110b] dark:fill-[#f4efea]">
        FRZZY
      </text>
    </svg>
  );
}

function OptionGroup({
  icon: Icon,
  heading,
  description,
  options,
  value,
  onChange,
  disabled,
  art: Art,
}: {
  icon: React.ComponentType<{ className?: string }>;
  heading: string;
  description: string;
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
  art: React.ComponentType<{ id: string }>;
}) {
  return (
    <section className={card}>
      <div className="flex items-center gap-2 mb-1 text-[#ff4f31]">
        <Icon className="h-4 w-4" />
        <h3 className={title}>{heading}</h3>
      </div>
      <p className={`${sub} mb-3`}>{description}</p>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={heading}>
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(o.id)}
              className={`text-left p-3 rounded-[14px] border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                active
                  ? 'border-[#ff4f31] bg-[#ff4f31]/[0.06] ring-1 ring-[#ff4f31]'
                  : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25'
              }`}
            >
              <div className="h-14 mb-2">
                <Art id={o.id} />
              </div>
              <div className="text-xs font-semibold text-[#12110b] dark:text-[#f4efea]">{o.name}</div>
              <div className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-0.5 leading-snug">{o.note}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PaletteTile({ p, active, onPick, disabled }: { p: Palette; active: boolean; onPick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onPick}
      title={p.note}
      className={`text-left p-2 rounded-[14px] border transition-colors cursor-pointer disabled:cursor-not-allowed ${
        active
          ? 'border-[#ff4f31] ring-1 ring-[#ff4f31]'
          : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25'
      }`}
    >
      <span className="relative block h-14 rounded-[10px] overflow-hidden border" style={{ background: p.bg, borderColor: p.line }}>
        <span className="absolute left-2 top-1.5 text-[17px] font-extrabold tracking-tight" style={{ color: p.text }}>
          Aa
        </span>
        <span className="absolute left-2 bottom-2 flex flex-col gap-1 w-[42%]">
          <span className="h-[3px] block" style={{ background: p.text }} />
          <span className="h-[3px] block w-[70%]" style={{ background: p.muted }} />
        </span>
        <span className="absolute right-2 top-2 px-1.5 py-0.5 text-[10px] font-bold rounded-[4px] z-[1]" style={{ background: p.accent, color: p.onAccent }}>
          →
        </span>
        <span className="absolute right-0 bottom-0 w-[42%] h-[46%]" style={{ background: p.surface }} />
      </span>
      <span className="block mt-1.5 text-xs font-semibold text-[#12110b] dark:text-[#f4efea]">{p.name}</span>
      <span className="block text-[10.5px] leading-snug text-[#5a6265] dark:text-[#a09d93]">{p.note}</span>
    </button>
  );
}

function LivePreview({ appearance }: { appearance: SiteAppearance }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  const [src, setSrc] = useState('');

  const frame = device === 'desktop' ? { w: 1440, h: 900 } : { w: 390, h: 844 };

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Debounced so clicking through options doesn't reload the preview on every click
  const query = `preview=1&palette=${appearance.palette}&look=${appearance.look}&scroll=${appearance.scroll}&strands=${appearance.strands}`;
  useEffect(() => {
    const t = setTimeout(() => setSrc(`/?${query}#home`), 250);
    return () => clearTimeout(t);
  }, [query]);

  const maxW = device === 'desktop' ? boxW : Math.min(boxW, 300);
  const scale = maxW ? maxW / frame.w : 0;

  return (
    <section className={card}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className={title}>Live preview</h3>
          <p className={sub}>The real site with your selection. Not saved until you press Save.</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.05]">
          {(['desktop', 'mobile'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              aria-pressed={device === d}
              className={`h-8 px-3 rounded-[9px] text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                device === d
                  ? 'bg-white dark:bg-[#2a2922] text-[#12110b] dark:text-[#f4efea] shadow-xs'
                  : 'text-[#5a6265] dark:text-[#a09d93]'
              }`}
            >
              {d === 'desktop' ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
              {d === 'desktop' ? 'Desktop' : 'Mobile'}
            </button>
          ))}
        </div>
      </div>

      <div ref={boxRef} className="w-full">
        <div
          className="mx-auto rounded-[12px] overflow-hidden border border-black/10 dark:border-white/10 bg-black"
          style={{ width: maxW || '100%', height: scale ? frame.h * scale : 360 }}
        >
          {src && scale > 0 && (
            <iframe
              key={device}
              src={src}
              title="Public site preview"
              style={{ width: frame.w, height: frame.h, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0, display: 'block' }}
            />
          )}
        </div>
      </div>
      <a
        href={src || '/'}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#12110b] dark:text-[#f4efea] hover:text-[#ff4f31]"
      >
        Open preview in a new tab <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </section>
  );
}

export default function SiteAppearancePage() {
  const [data, setData] = useState<AppearanceResponse | null>(null);
  const [draft, setDraft] = useState<SiteAppearance | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/appearance', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
      setDraft(json.appearance);
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load appearance settings');
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const dirty = useMemo(
    () => !!data && !!draft && (Object.keys(draft) as (keyof SiteAppearance)[]).some((k) => draft[k] !== data.appearance[k]),
    [data, draft]
  );
  const isDefault = useMemo(
    () => !!data && !!draft && (Object.keys(draft) as (keyof SiteAppearance)[]).every((k) => draft[k] === data.defaults[k]),
    [data, draft]
  );

  const set = (patch: Partial<SiteAppearance>) => {
    setMessage(null);
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/appearance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setData((d) => (d ? { ...d, appearance: json.appearance, updatedAt: json.updatedAt } : d));
      setDraft(json.appearance);
      setMessage({ kind: 'ok', text: 'Saved. The public website now uses this appearance for every visitor.' });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-4 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2 max-w-3xl">
        <AlertTriangle className="h-4 w-4" />
        <span>{loadError}</span>
      </div>
    );
  }
  if (!data || !draft) {
    return <div className={`${sub} p-2`}>Loading appearance settings…</div>;
  }

  const readOnly = !data.canEdit;
  const dark = data.options.palettes.filter((p) => p.mode === 'dark');
  const light = data.options.palettes.filter((p) => p.mode === 'light');
  const current = data.options.palettes.find((p) => p.id === draft.palette);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
            Site Appearance
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Choose how the public website looks for every visitor. Changes go live as soon as you save.
          </p>
          <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-1">
            {data.updatedAt ? `Last saved ${new Date(data.updatedAt).toLocaleString()}` : 'Using the built-in defaults (never saved)'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => set(data.defaults)}
                disabled={isDefault}
                className="h-10 px-4 rounded-[12px] border border-black/10 dark:border-white/10 text-xs font-semibold text-[#12110b] dark:text-[#f4efea] flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" /> Reset to defaults
              </button>
              <button
                type="button"
                onClick={() => setDraft(data.appearance)}
                disabled={!dirty}
                className="h-10 px-4 rounded-[12px] border border-black/10 dark:border-white/10 text-xs font-semibold text-[#12110b] dark:text-[#f4efea] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Discard changes
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className="h-10 px-6 rounded-[12px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#12110b]"
              >
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : dirty ? 'Save & publish' : 'Saved'}
              </button>
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="p-3.5 rounded-[14px] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>View only: you need the “Modify Studio Configuration” permission (settings:edit) to change the site appearance.</span>
        </div>
      )}
      {message && (
        <div
          className={`p-3.5 rounded-[14px] text-xs font-semibold flex items-center gap-2 border ${
            message.kind === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}
          role="status"
        >
          {message.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-start">
        {/* Controls */}
        <div className="space-y-5">
          <OptionGroup
            icon={Sparkles}
            heading="Look"
            description="Overall styling: rounded and glassy, or the original hard-edged FRZZY style."
            options={data.options.looks}
            value={draft.look}
            onChange={(id) => set({ look: id as SiteAppearance['look'] })}
            disabled={readOnly}
            art={LookArt}
          />
          <OptionGroup
            icon={Layers}
            heading="Scroll"
            description="Stack slides each section over the previous one, page by page."
            options={data.options.scrolls}
            value={draft.scroll}
            onChange={(id) => set({ scroll: id as SiteAppearance['scroll'] })}
            disabled={readOnly}
            art={ScrollArt}
          />
          <OptionGroup
            icon={MousePointerClick}
            heading="Hero strands"
            description="The hanging lines at the top of the home page. Clicking still zaps when they are off."
            options={data.options.strands}
            value={draft.strands}
            onChange={(id) => set({ strands: id as SiteAppearance['strands'] })}
            disabled={readOnly}
            art={StrandsArt}
          />

          <section className={card}>
            <div className="flex items-center gap-2 mb-1 text-[#ff4f31]">
              <PaletteIcon className="h-4 w-4" />
              <h3 className={title}>Colour palette</h3>
            </div>
            <p className={`${sub} mb-3`}>
              Each palette is a complete theme (background, panels, text and accent), checked for readable contrast.
              {current ? ` Selected: ${current.name}.` : ''}
            </p>
            {[
              ['Dark', dark],
              ['Light', light],
            ].map(([label, list]) => (
              <div key={label as string} className="mb-4 last:mb-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5a6265] dark:text-[#a09d93] mb-2">{label as string}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5" role="radiogroup" aria-label={`${label} palettes`}>
                  {(list as Palette[]).map((p) => (
                    <PaletteTile key={p.id} p={p} active={p.id === draft.palette} onPick={() => set({ palette: p.id })} disabled={readOnly} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Preview */}
        <div className="xl:sticky xl:top-20">
          <LivePreview appearance={draft} />
        </div>
      </div>
    </div>
  );
}
