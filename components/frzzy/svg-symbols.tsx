import React from 'react';

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
      </defs>
    </svg>
  );
}
