'use client';

import React, { useEffect } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      console.error('App runtime error caught by app/error.tsx:', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#ecf5f4] dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] p-6">
      <div className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#181712] p-8 sm:p-10 shadow-[0_24px_60px_-16px_rgba(18,17,11,0.12)] border border-black/[0.06] dark:border-white/[0.08] text-center flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff4f31]/10 text-[#ff4f31] mb-5">
          <AlertCircle className="h-7 w-7 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#12110b]/65 dark:text-[#f4efea]/65 leading-relaxed">
          An unexpected display glitch occurred. Our studio experience can be safely restored right away.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 h-[46px] rounded-full bg-[#12110b] text-white dark:bg-[#f4efea] dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reload Experience</span>
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="h-[46px] px-6 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
