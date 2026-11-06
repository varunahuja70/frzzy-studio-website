'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught error:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="w-full rounded-[20px] bg-white/80 dark:bg-[#181712]/80 backdrop-blur-md p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.08] text-center my-6 flex flex-col items-center justify-center min-h-[220px]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ff4f31]/10 text-[#ff4f31] mb-3">
            <AlertTriangle className="h-5 w-5 stroke-[2.2]" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-[#12110b] dark:text-[#f4efea]">
            {this.props.fallbackTitle || 'Section Unavailable'}
          </h3>
          <p className="mt-1 max-w-md text-xs sm:text-sm text-[#12110b]/60 dark:text-[#f4efea]/60">
            {this.props.fallbackMessage ||
              'A temporary glitch occurred while rendering this element. Refreshing will restore it.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#12110b] text-white dark:bg-[#f4efea] dark:text-[#12110b] text-xs font-semibold hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
