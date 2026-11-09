'use client';

import React from 'react';
import { CaseStudy } from '@/components/frzzy/work-data';
import { WorkCardArt } from '@/components/frzzy/work-card-art';

const pad = (n: number) => String(n).padStart(2, '0');

interface ProjectCardProps {
  item: CaseStudy;
  /** 1-based position in the full project list (stays the same when filters are applied). */
  index: number;
  total: number;
  /** Plays the page wipe, then opens the case study. */
  onOpen: (hash: string) => void;
  /** Wide hero-style card used once at the top of the Work page. */
  featured?: boolean;
}

/**
 * Project card used on Home and Work.
 * Hover / keyboard focus: the art blurs and a volt ↗ "open" disc appears.
 * Meta row: index · title on the left, the project's tags on the right.
 */
export function ProjectCard({ item, index, total, onOpen, featured = false }: ProjectCardProps) {
  const hash = `#case-${item.slug}`;
  const tags = item.type.split('·').map((t) => t.trim()).filter(Boolean);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let cmd/ctrl/shift-click open a new tab as normal links do.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onOpen(hash);
  };

  return (
    <a className={featured ? 'card card-featured' : 'card'} href={`/work/${item.slug}`} onClick={handleClick}>
      <div className="card-media">
        <WorkCardArt item={item} />
        <span className="card-go" aria-hidden="true">
          <svg>
            <use href="#arrow" />
          </svg>
        </span>
      </div>

      <div className="card-meta">
        <div className="card-title">
          <span className="mono card-idx" aria-label={`Project ${index} of ${total}`}>
            {pad(index)}/{pad(total)}
          </span>
          <h3>{item.title}</h3>
        </div>
        <ul className="card-tags" aria-label="Tags">
          {featured && <li className="is-featured">Featured</li>}
          {tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      {featured && <p className="card-idea">{item.idea}</p>}
    </a>
  );
}
