'use client';

import React from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#12110b] text-[#f4efea] flex items-center justify-center min-h-screen p-6 font-sans">
        <div className="max-w-md w-full bg-[#181712] border border-white/10 rounded-[24px] p-8 text-center flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-[#ff4f31]/15 text-[#ff4f31] flex items-center justify-center text-xl font-bold mb-4">
            !
          </div>
          <h2 className="text-xl font-semibold mb-2">Critical Application Error</h2>
          <p className="text-sm text-white/60 mb-6">
            A critical error interrupted the application. Please reload to resume your session.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="h-11 px-6 rounded-full bg-[#ff4f31] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Reset Experience
          </button>
        </div>
      </body>
    </html>
  );
}
