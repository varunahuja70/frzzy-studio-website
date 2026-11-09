import React from 'react';

/**
 * Colour grade for the "Ideas, built to move" bolts render on the Volt palette (applied in
 * globals.css via data-grade="bolts"): render brightness → colour. Deep emerald shadows and floor
 * (no olive), neon-volt bolt faces, glowing pale-lime highlights.
 * ✏️ Tweak by editing the stops: [brightness 0–1, red, green, blue], colours in 0–1.
 */
const BOLTS_GRADE: [number, number, number, number][] = [
  [0, 0, 0, 0],
  [0.05, 0.004, 0.014, 0.006],
  [0.15, 0.02, 0.07, 0.035],
  [0.35, 0.07, 0.2, 0.06],
  [0.5, 0.17, 0.36, 0.04],
  [0.62, 0.33, 0.54, 0.02],
  [0.75, 0.58, 0.82, 0],
  [0.86, 0.776, 1, 0],
  [0.94, 0.88, 1, 0.45],
  [1, 0.97, 1, 0.86],
];

function gradeTable(channel: 1 | 2 | 3) {
  return Array.from({ length: 41 }, (_, i) => {
    const x = i / 40;
    let k = 1;
    while (k < BOLTS_GRADE.length - 1 && x > BOLTS_GRADE[k][0]) k++;
    const a = BOLTS_GRADE[k - 1];
    const b = BOLTS_GRADE[k];
    const t = Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0])));
    return (a[channel] + (b[channel] - a[channel]) * t).toFixed(3);
  }).join(' ');
}

export function SvgSymbols() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="z" viewBox="0 0 34 44">
          <polyline
            points="4,5 30,5 14,22 22,22 5,39 30,39"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinejoin="miter"
            strokeLinecap="square"
          />
        </symbol>
        <symbol id="arrow" viewBox="0 0 16 16">
          <path
            d="M3 8h9M8.5 4L12.5 8l-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="square"
          />
        </symbol>
        <filter id="frzzy-grade-bolts" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={gradeTable(1)} />
            <feFuncG type="table" tableValues={gradeTable(2)} />
            <feFuncB type="table" tableValues={gradeTable(3)} />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
