'use client';

import React, { useRef, useEffect } from 'react';
import { CaseStudy } from './work-data';
import { ProjectItem } from '@/lib/projects-shared';

type WorkItemLike = (Partial<CaseStudy> & Partial<ProjectItem>) & { artType?: string; title?: string };

export function WorkCardArt({ item }: { item: WorkItemLike }) {
  const artRef = useRef<HTMLDivElement>(null);
  const videoUrl = item.videoUrl;
  const imageUrl = item.imageUrl;

  useEffect(() => {
    const art = artRef.current;
    if (!art) return;
    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    const onPointerMove = (e: PointerEvent) => {
      const r = art.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      art.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg');
      art.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
      art.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
      art.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
      art.style.setProperty('--px', px.toFixed(3));
      art.style.setProperty('--py', py.toFixed(3));
    };

    const onPointerLeave = () => {
      art.style.setProperty('--rx', '0deg');
      art.style.setProperty('--ry', '0deg');
      art.style.setProperty('--px', '0');
      art.style.setProperty('--py', '0');
    };

    art.addEventListener('pointermove', onPointerMove);
    art.addEventListener('pointerleave', onPointerLeave);

    return () => {
      art.removeEventListener('pointermove', onPointerMove);
      art.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  if (videoUrl) {
    return (
      <div
        ref={artRef}
        className="art tilt relative overflow-hidden bg-black"
        role="img"
        aria-label={item.title || 'Video project'}
      >
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105"
        />
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div
        ref={artRef}
        className="art tilt relative overflow-hidden bg-black"
        role="img"
        aria-label={item.title || 'Project image'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={item.title || 'Project media'}
          className="w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      ref={artRef}
      className={`art art-${item.artType || 'grid'} tilt`}
      role="img"
      aria-label={item.ariaLabel || item.title || 'Work artwork'}
    >
      {item.artType === 'grid' && (
        <>
          <div className="layer slow">
            <svg className="floor" viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">
              <g stroke="currentColor" strokeOpacity=".5" strokeWidth=".35">
                <line x1="80" y1="38" x2="-160" y2="100" />
                <line x1="80" y1="38" x2="-120" y2="100" />
                <line x1="80" y1="38" x2="-80" y2="100" />
                <line x1="80" y1="38" x2="-40" y2="100" />
                <line x1="80" y1="38" x2="0" y2="100" />
                <line x1="80" y1="38" x2="20" y2="100" />
                <line x1="80" y1="38" x2="40" y2="100" />
                <line x1="80" y1="38" x2="60" y2="100" />
                <line x1="80" y1="38" x2="80" y2="100" />
                <line x1="80" y1="38" x2="100" y2="100" />
                <line x1="80" y1="38" x2="120" y2="100" />
                <line x1="80" y1="38" x2="140" y2="100" />
                <line x1="80" y1="38" x2="160" y2="100" />
                <line x1="80" y1="38" x2="200" y2="100" />
                <line x1="80" y1="38" x2="240" y2="100" />
                <line x1="80" y1="38" x2="280" y2="100" />
                <line x1="80" y1="38" x2="320" y2="100" />
                <line x1="0" y1="38" x2="160" y2="38" strokeOpacity="1" />
                <line x1="0" y1="40.5" x2="160" y2="40.5" />
                <line x1="0" y1="43.5" x2="160" y2="43.5" />
                <line x1="0" y1="47.5" x2="160" y2="47.5" />
                <line x1="0" y1="53" x2="160" y2="53" />
                <line x1="0" y1="60" x2="160" y2="60" />
                <line x1="0" y1="69" x2="160" y2="69" />
                <line x1="0" y1="80.5" x2="160" y2="80.5" />
                <line x1="0" y1="95" x2="160" y2="95" />
              </g>
            </svg>
          </div>
          <div className="layer">
            <svg className="z" viewBox="0 0 34 44" aria-hidden="true">
              <use href="#z" />
            </svg>
          </div>
        </>
      )}

      {item.artType === 'orb' && (
        <>
          <div className="layer slow">
            <div className="ring" />
          </div>
          <div className="layer">
            <div className="orb" />
          </div>
        </>
      )}

      {item.artType === 'bands' && (
        <div className="layer">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      )}

      {item.artType === 'bolts' && (
        <>
          <div className="layer slow pattern" />
          <div className="layer">
            <svg className="z" viewBox="0 0 34 44" aria-hidden="true">
              <use href="#z" />
            </svg>
          </div>
        </>
      )}

      {item.artType === 'rings' && (
        <>
          <div className="layer slow">
            <span className="rg" style={{ width: '78%' }} />
            <span className="rg r2" style={{ width: '60%' }} />
            <span className="rg" style={{ width: '42%' }} />
            <span className="rg r2" style={{ width: '26%' }} />
          </div>
          <div className="layer">
            <div className="orb-sm" />
          </div>
        </>
      )}

      {item.artType === 'spark' && (
        <>
          <div className="layer slow">
            <svg className="full" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <g style={{ stroke: 'var(--ivory)' }} strokeOpacity=".3" strokeWidth=".6">
                <line x1="94.0" y1="50.0" x2="190.0" y2="50.0" />
                <line x1="93.6" y1="53.1" x2="187.2" y2="74.5" />
                <line x1="92.6" y1="56.1" x2="179.1" y2="97.7" />
                <line x1="90.9" y1="58.7" x2="166.0" y2="118.6" />
                <line x1="88.7" y1="60.9" x2="148.6" y2="136.0" />
                <line x1="86.1" y1="62.6" x2="127.7" y2="149.1" />
                <line x1="83.1" y1="63.6" x2="104.5" y2="157.2" />
                <line x1="80.0" y1="64.0" x2="80.0" y2="160.0" />
                <line x1="76.9" y1="63.6" x2="55.5" y2="157.2" />
                <line x1="73.9" y1="62.6" x2="32.3" y2="149.1" />
                <line x1="71.3" y1="60.9" x2="11.4" y2="136.0" />
                <line x1="69.1" y1="58.7" x2="-6.0" y2="118.6" />
                <line x1="67.4" y1="56.1" x2="-19.1" y2="97.7" />
                <line x1="66.4" y1="53.1" x2="-27.2" y2="74.5" />
                <line x1="66.0" y1="50.0" x2="-30.0" y2="50.0" />
                <line x1="66.4" y1="46.9" x2="-27.2" y2="25.5" />
                <line x1="67.4" y1="43.9" x2="-19.1" y2="2.3" />
                <line x1="69.1" y1="41.3" x2="-6.0" y2="-18.6" />
                <line x1="71.3" y1="39.1" x2="11.4" y2="-36.0" />
                <line x1="73.9" y1="37.4" x2="32.3" y2="-49.1" />
                <line x1="76.9" y1="36.4" x2="55.5" y2="-57.2" />
                <line x1="80.0" y1="36.0" x2="80.0" y2="-60.0" />
                <line x1="83.1" y1="36.4" x2="104.5" y2="-57.2" />
                <line x1="86.1" y1="37.4" x2="127.7" y2="-49.1" />
                <line x1="88.7" y1="39.1" x2="148.6" y2="-36.0" />
                <line x1="90.9" y1="41.3" x2="166.0" y2="-18.6" />
                <line x1="92.6" y1="43.9" x2="179.1" y2="2.3" />
                <line x1="93.6" y1="46.9" x2="187.2" y2="25.5" />
              </g>
            </svg>
          </div>
          <div className="layer">
            <svg className="star" viewBox="0 0 44 44" aria-hidden="true">
              <path
                d="M22 4 L25.5 18.5 L40 22 L25.5 25.5 L22 40 L18.5 25.5 L4 22 L18.5 18.5 Z"
                style={{ fill: 'var(--volt)' }}
              />
            </svg>
          </div>
        </>
      )}

      {item.artType === 'charge' && (
        <div className="layer">
          <div className="batt">
            <i className="on" />
            <i className="on" />
            <i className="on" />
            <i className="on" />
            <i />
          </div>
        </div>
      )}

      {item.artType === 'ground' && (
        <div className="layer">
          <svg className="full" viewBox="0 0 160 100" aria-hidden="true">
            <g style={{ stroke: 'var(--ivory)' }} strokeWidth="3" strokeLinecap="square">
              <line x1="80" y1="12" x2="80" y2="50" />
              <line x1="44" y1="50" x2="116" y2="50" />
              <line x1="58" y1="64" x2="102" y2="64" />
              <line x1="70" y1="78" x2="90" y2="78" />
            </g>
            <circle cx="80" cy="30" r="5" style={{ fill: 'var(--volt)' }} />
          </svg>
        </div>
      )}
    </div>
  );
}
