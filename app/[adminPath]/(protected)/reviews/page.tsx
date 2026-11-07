'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminReview, ReviewInput, ReviewPlatform } from '@/lib/reviews-shared';
import { ReviewCard } from '@/components/frzzy/studio-reviews';

/**
 * Studio Vault → Reviews: client reviews shown on the public home page.
 * Add / edit / hide / delete / reorder, with photo, star rating and details.
 * API: /api/admin/reviews (settings:view to see, settings:edit to change; all changes audit-logged).
 */

interface Limits {
  name: number;
  role: number;
  company: number;
  quoteMin: number;
  quoteMax: number;
  url: number;
  photoBytes: number;
  photoSize: number;
  maxReviews: number;
}
interface ListResponse {
  reviews: AdminReview[];
  canEdit: boolean;
  platforms: { id: ReviewPlatform; name: string }[];
  limits: Limits;
}

const card = 'p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs';
const sub = 'text-xs text-[#5a6265] dark:text-[#a09d93]';
const input =
  'w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-[13px] text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#ff4f31]';
const label = 'block text-[11px] font-semibold uppercase tracking-wider text-[#5a6265] dark:text-[#a09d93] mb-1.5';
const btnGhost =
  'h-9 px-3 rounded-[10px] border border-black/10 dark:border-white/10 text-xs font-semibold text-[#12110b] dark:text-[#f4efea] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-black/25 dark:hover:border-white/25';
const btnIcon =
  'h-8 w-8 shrink-0 rounded-[10px] border border-black/10 dark:border-white/10 text-[#12110b] dark:text-[#f4efea] inline-flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:border-black/25 dark:hover:border-white/25';
const btnPrimary =
  'h-10 px-5 rounded-[12px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const EMPTY: ReviewInput = { name: '', role: '', company: '', quote: '', rating: 5, platform: 'none', url: '', published: true };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

/** Centre-crop to a square and compress (WebP, JPEG fallback) entirely in the browser. */
async function toSquareImage(file: File, size: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const s = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, size, size);
  bitmap.close();
  let url = canvas.toDataURL('image/webp', 0.85);
  if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', 0.86);
  return url;
}

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className="p-0.5 cursor-pointer disabled:cursor-not-allowed"
        >
          <Star className={`h-6 w-6 ${n <= value ? 'fill-[#ff4f31] text-[#ff4f31]' : 'text-black/20 dark:text-white/20'}`} />
        </button>
      ))}
      <span className="ml-2 text-xs text-[#5a6265] dark:text-[#a09d93]">{value} / 5</span>
    </div>
  );
}

function Editor({
  initial,
  limits,
  platforms,
  onClose,
  onSaved,
}: {
  initial: AdminReview | null;
  limits: Limits;
  platforms: { id: ReviewPlatform; name: string }[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<ReviewInput>(
    initial
      ? { name: initial.name, role: initial.role, company: initial.company, quote: initial.quote, rating: initial.rating, platform: initial.platform, url: initial.url, published: initial.published }
      : EMPTY
  );
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [photoTouched, setPhotoTouched] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<ReviewInput>) => setForm((f) => ({ ...f, ...patch }));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!/^image\/(png|jpe?g|webp|gif|avif|heic|heif)$/i.test(file.type)) {
      setError('Please choose an image (PNG, JPEG or WebP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('That image is over 15 MB. Please choose a smaller one.');
      return;
    }
    try {
      setPhoto(await toSquareImage(file, limits.photoSize));
      setPhotoTouched(true);
    } catch {
      setError('Could not read that image. Try a PNG or JPEG.');
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { review: form };
      if (!initial || photoTouched) body.photo = photo; // null = remove; omit = keep
      const res = await fetch(initial ? `/api/admin/reviews/${initial.id}` : '/api/admin/reviews', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      onSaved(initial ? 'Review updated.' : form.published ? 'Review added and published on the site.' : 'Review added (hidden from the site).');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const quoteLen = form.quote.trim().length;
  const valid = form.name.trim().length > 0 && quoteLen >= limits.quoteMin && quoteLen <= limits.quoteMax;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={initial ? 'Edit review' : 'Add review'}>
      <div className="w-full max-w-5xl rounded-[20px] bg-[#ecf5f4] dark:bg-[#12110b] border border-black/10 dark:border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-base font-bold text-[#12110b] dark:text-[#f4efea]">{initial ? 'Edit review' : 'Add review'}</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Form */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center bg-[#ff4f31]/10 text-[#ff4f31] font-bold text-xl border border-black/10 dark:border-white/10 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initials(form.name) || '?'}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" /> {photo ? 'Replace photo' : 'Upload photo'}
                  </button>
                  {photo && (
                    <button type="button" className={btnGhost} onClick={() => { setPhoto(null); setPhotoTouched(true); }}>
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  )}
                </div>
                <p className={sub}>Optional. Cropped to a square and compressed automatically. Without a photo, initials are shown.</p>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
              </div>
            </div>

            <div>
              <label className={label} htmlFor="rv-name">Name *</label>
              <input id="rv-name" className={input} maxLength={limits.name} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. the client's full name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="rv-role">Role</label>
                <input id="rv-role" className={input} maxLength={limits.role} value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="Founder, Creative Director…" />
              </div>
              <div>
                <label className={label} htmlFor="rv-company">Company / brand</label>
                <input id="rv-company" className={input} maxLength={limits.company} value={form.company} onChange={(e) => set({ company: e.target.value })} placeholder="Company or brand" />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="rv-quote">Review text *</label>
              <textarea
                id="rv-quote"
                className={`${input} h-32 py-2.5 resize-y leading-relaxed`}
                maxLength={limits.quoteMax}
                value={form.quote}
                onChange={(e) => set({ quote: e.target.value })}
                placeholder="Their words, exactly as they agreed to share them."
              />
              <p className={`${sub} mt-1 text-right`}>{quoteLen} / {limits.quoteMax}</p>
            </div>
            <div>
              <span className={label}>Star rating *</span>
              <StarPicker value={form.rating} onChange={(rating) => set({ rating })} disabled={false} />
            </div>
            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div>
                <label className={label} htmlFor="rv-platform">Posted on</label>
                <select id="rv-platform" className={`${input} cursor-pointer`} value={form.platform} onChange={(e) => set({ platform: e.target.value as ReviewPlatform })}>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="rv-url">Link to original (optional)</label>
                <input id="rv-url" type="url" className={input} maxLength={limits.url} value={form.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
              </div>
            </div>
            <label className="flex items-center gap-3 text-xs font-semibold text-[#12110b] dark:text-[#f4efea] cursor-pointer">
              <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} className="h-4 w-4 accent-[#ff4f31] cursor-pointer" />
              Show on the website
            </label>
            <p className={sub}>Only publish genuine reviews the client has agreed to share.</p>
          </div>

          {/* Live preview, rendered with the real site card and the site's current palette */}
          <div>
            <p className={label}>Preview (as on the site)</p>
            <div className="rounded-[16px] p-5" style={{ background: 'var(--black)', fontFamily: 'var(--display)' }}>
              <ReviewCard
                as="div"
                r={{
                  name: form.name || 'Client name',
                  role: form.role,
                  company: form.company,
                  quote: form.quote || 'The review text appears here.',
                  rating: form.rating,
                  platform: form.platform,
                  url: form.url,
                  photoUrl: photo,
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-4 p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2" role="alert">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-black/10 dark:border-white/10">
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={!valid || saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add review'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewsAdminPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<AdminReview | null | 'new'>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load reviews');
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const call = async (key: string, url: string, init: RequestInit, ok: string) => {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong');
      setMessage({ kind: 'ok', text: ok });
      await load();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setBusy(null);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    if (!data) return;
    const ids = data.reviews.map((r) => r.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    call(`move-${index}`, '/api/admin/reviews', { method: 'PUT', body: JSON.stringify({ order: ids }) }, 'Order updated.');
  };

  if (loadError) {
    return (
      <div className="p-4 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2 max-w-3xl">
        <AlertTriangle className="h-4 w-4" /> {loadError}
      </div>
    );
  }
  if (!data) return <div className={`${sub} p-2`}>Loading reviews…</div>;

  const published = data.reviews.filter((r) => r.published).length;
  const canEdit = data.canEdit;
  const full = data.reviews.length >= data.limits.maxReviews;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">Client Reviews</h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Reviews shown in the “What clients say” section of the home page. Changes are live within seconds.
          </p>
          <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-1">
            {published} on the site · {data.reviews.length - published} hidden
            {published === 0 && ' · the section is hidden until at least one review is shown'}
          </p>
        </div>
        {canEdit && (
          <button type="button" className={btnPrimary} onClick={() => setEditing('new')} disabled={full} title={full ? `Up to ${data.limits.maxReviews} reviews` : undefined}>
            <Plus className="h-4 w-4" /> Add review
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="p-3.5 rounded-[14px] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> View only: you need the “Modify Studio Configuration” permission (settings:edit) to change reviews.
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
          {message.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} {message.text}
        </div>
      )}

      {data.reviews.length === 0 ? (
        <div className={`${card} text-center py-12`}>
          <Star className="h-8 w-8 mx-auto text-[#ff4f31]" />
          <h3 className="mt-3 font-bold text-sm text-[#12110b] dark:text-[#f4efea]">No reviews yet</h3>
          <p className={`${sub} mt-1`}>Add your first client review. It appears on the home page as soon as it is shown.</p>
          {canEdit && (
            <button type="button" className={`${btnPrimary} mt-4`} onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Add review
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {data.reviews.map((r, i) => (
            <li key={r.id} className={`${card} flex flex-col sm:flex-row sm:items-center gap-4 ${r.published ? '' : 'opacity-70'}`}>
              {canEdit && (
                <div className="flex sm:flex-col gap-1">
                  <button type="button" className={btnIcon} disabled={i === 0 || !!busy} onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp className="h-4 w-4 shrink-0" />
                  </button>
                  <button type="button" className={btnIcon} disabled={i === data.reviews.length - 1 || !!busy} onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDown className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              )}
              <div className="h-14 w-14 rounded-full overflow-hidden flex items-center justify-center bg-[#ff4f31]/10 text-[#ff4f31] font-bold shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- stored data URL */}
                {r.photo ? <img src={r.photo} alt="" className="h-full w-full object-cover" /> : initials(r.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-sm text-[#12110b] dark:text-[#f4efea]">{r.name}</span>
                  {(r.role || r.company) && <span className={sub}>{[r.role, r.company].filter(Boolean).join(' · ')}</span>}
                  <span className="flex">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} className={`h-3.5 w-3.5 ${k < r.rating ? 'fill-[#ff4f31] text-[#ff4f31]' : 'text-black/20 dark:text-white/20'}`} />
                    ))}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      r.published ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/10 text-[#5a6265] dark:text-[#a09d93]'
                    }`}
                  >
                    {r.published ? 'On site' : 'Hidden'}
                  </span>
                </div>
                <p className={`${sub} mt-1 line-clamp-2`}>“{r.quote}”</p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    className={btnGhost}
                    disabled={!!busy}
                    onClick={() =>
                      call(`pub-${r.id}`, `/api/admin/reviews/${r.id}`, { method: 'PATCH', body: JSON.stringify({ review: { published: !r.published } }) }, r.published ? 'Review hidden from the site.' : 'Review is now on the site.')
                    }
                  >
                    {r.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {r.published ? 'Hide' : 'Show on site'}
                  </button>
                  <button type="button" className={btnGhost} disabled={!!busy} onClick={() => setEditing(r)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    type="button"
                    className={`${btnGhost} hover:!border-red-500/50 hover:text-red-600`}
                    disabled={!!busy}
                    onClick={() => {
                      if (window.confirm(`Delete the review from ${r.name}? This cannot be undone.`)) {
                        call(`del-${r.id}`, `/api/admin/reviews/${r.id}`, { method: 'DELETE' }, 'Review deleted.');
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Editor
          initial={editing === 'new' ? null : editing}
          limits={data.limits}
          platforms={data.platforms}
          onClose={() => setEditing(null)}
          onSaved={async (text) => {
            setEditing(null);
            setMessage({ kind: 'ok', text });
            await load();
          }}
        />
      )}
    </div>
  );
}
