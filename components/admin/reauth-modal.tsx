'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldAlert, X, Lock } from 'lucide-react';

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function ReauthModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Re-Authentication Required',
  description = 'For your security, please confirm your admin password before proceeding with this sensitive action.',
}: ReauthModalProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
      } else {
        setPassword('');
        onSuccess();
        onClose();
      }
    } catch {
      setError('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[24px] bg-[#181712] p-7 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.7)] border border-white/10 text-[#f4efea]"
          >
            <button
              type="button"
              aria-label="Close modal"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-5 right-5 h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
            >
              <X className="h-4 w-4 pointer-events-none" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-[#ff4f31]/10 flex items-center justify-center text-[#ff4f31]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.015em] leading-tight">
                  {title}
                </h3>
                <p className="text-[13px] text-[#5a6265] dark:text-[#9e9b91] mt-0.5">
                  High-privilege security checkpoint
                </p>
              </div>
            </div>

            <p className="text-[13.5px] leading-relaxed text-[#5a6265] dark:text-[#a09d93] mb-5">
              {description}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-[#12110b]/75 dark:text-[#f4efea]/75 mb-1.5">
                  Enter Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Your admin password"
                    className="w-full h-[46px] rounded-[12px] bg-[#f4f3f0] dark:bg-white/[0.05] px-4 pl-10 text-[14px] text-[#12110b] dark:text-[#f4efea] border border-black/[0.06] dark:border-white/[0.08] focus:border-[#ff4f31] focus:bg-white dark:focus:bg-[#12110b] outline-none transition-all"
                  />
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[#12110b]/40 dark:text-[#f4efea]/40" />
                </div>
                {error && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-[42px] px-5 rounded-full text-xs font-semibold hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-[42px] px-6 rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? 'Verifying...' : 'Confirm'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
