'use client';

import React, { useEffect, useState } from 'react';
import type { PublicReview, ReviewPlatform } from '@/lib/reviews-shared';

/**
 * Client reviews section (home page).
 * Reviews are managed in Studio Vault → Reviews (add / edit / hide / delete / reorder, with photo,
 * star rating and details) and loaded from /api/reviews. The section only appears when at least
 * one review is published.
 */

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

export function PlatformIcon({ platform }: { platform: ReviewPlatform }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true as const, className: 'rv-platform-icon' };
  switch (platform) {
    case 'x':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.34l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.74H5.58l11.09 14.44Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.6h.06c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.77 2.5 4.77 5.75v5.6h-4v-4.97c0-1.19-.02-2.72-1.75-2.72-1.75 0-2.02 1.3-2.02 2.63v5.06h-4v-11Z" />
        </svg>
      );
    case 'website':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c2.4 2.5 2.4 14.5 0 17M12 3.5c-2.4 2.5-2.4 14.5 0 17" />
        </svg>
      );
    default:
      return null;
  }
}

export function Stars({ rating }: { rating: number }) {
  return (
    <div className="rv-stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true" className={i < rating ? 'on' : 'off'}>
          <path d="M12 2.8l2.83 5.74 6.33.92-4.58 4.46 1.08 6.3L12 17.25l-5.66 2.97 1.08-6.3L2.84 9.46l6.33-.92L12 2.8Z" />
        </svg>
      ))}
    </div>
  );
}

/** One review card (also used by the vault editor's live preview). */
export function ReviewCard({ r, as: Tag = 'li' }: { r: Omit<PublicReview, 'id'>; as?: 'li' | 'div' }) {
  const hasIcon = r.platform && r.platform !== 'none';
  return (
    <Tag className="review">
      <div className="review-top">
        <span className="review-avatar" aria-hidden="true">
          {r.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small avatar served by /api/reviews
            <img src={r.photoUrl} alt="" />
          ) : (
            initials(r.name) || '★'
          )}
        </span>
        {hasIcon &&
          (r.url ? (
            <a className="review-platform" href={r.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Original review on ${r.platform}`}>
              <PlatformIcon platform={r.platform} />
            </a>
          ) : (
            <span className="review-platform">
              <PlatformIcon platform={r.platform} />
            </span>
          ))}
      </div>
      <Stars rating={r.rating} />
      <blockquote className="review-quote">{r.quote}</blockquote>
      <footer className="review-by">
        <p className="review-name">
          {r.name}
          {r.role && (
            <>
              {' '}
              <span aria-hidden="true">·</span> <span className="review-role">{r.role}</span>
            </>
          )}
        </p>
        {r.company && <p className="review-company">{r.company}</p>}
      </footer>
    </Tag>
  );
}

export function StudioReviews({ onStartProject }: { onStartProject: () => void }) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/reviews')
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d) => alive && setReviews(Array.isArray(d.reviews) ? d.reviews : []))
      .catch(() => alive && setReviews([]));
    return () => {
      alive = false;
    };
  }, []);

  if (!reviews || reviews.length === 0) return null; // nothing published yet: no section

  return (
    <section className="section reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="wrap">
        <div className="reviews-head">
          <p className="reviews-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.8l2.83 5.74 6.33.92-4.58 4.46 1.08 6.3L12 17.25l-5.66 2.97 1.08-6.3L2.84 9.46l6.33-.92L12 2.8Z" />
            </svg>
            Client reviews
          </p>
          <h2 id="reviews-title">
            What clients say<span className="dot">.</span>
          </h2>
          <p className="lede">Feedback from the brands and creators we have worked with.</p>
          <a
            className="btn btn-volt magnetic"
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              onStartProject();
            }}
          >
            Start a project{' '}
            <svg aria-hidden="true">
              <use href="#arrow" />
            </svg>
          </a>
        </div>

        <ul className="reviews-grid">
          {reviews.map((r) => (
            <ReviewCard key={r.id} r={r} />
          ))}
        </ul>
      </div>
    </section>
  );
}
