'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, KeyRound, ShieldAlert, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function AdminLoginPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);
  const router = useRouter();

  const [step, setStep] = useState<'password' | '2fa'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  // Step 1: Submit Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          studioToken: '', // Honeypot trap: must remain empty
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.locked && data.remainingSeconds) {
          setLockoutSeconds(data.remainingSeconds);
        }
        setError(data.error || 'Invalid credentials');
      } else if (data.requires2Fa) {
        setStep('2fa');
      } else {
        // Direct login success: redirect into vault
        window.location.href = `/${adminPath}`;
      }
    } catch {
      setError('Connection failure. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit 2FA / Recovery Code
  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode) {
      setError(isRecoveryCode ? 'Enter your 12-character recovery code' : 'Enter your 6-digit authenticator code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: twoFactorCode,
          isRecoveryCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification code failed');
      } else {
        // Successfully verified! Redirect to Dashboard
        window.location.href = `/${adminPath}`;
      }
    } catch {
      setError('Connection failure. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#12110b] text-[#f4efea] flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] rounded-full bg-[#ff4f31]/10 blur-[130px]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] rounded-[28px] bg-[#1a1914]/90 backdrop-blur-xl border border-white/[0.09] p-7 sm:p-9 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.65)]"
      >
        {/* Top Header Badge */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#ff4f31] mb-3.5 shadow-inner">
            <Lock className="h-5 w-5 stroke-[2.2]" />
          </div>
          <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight">
            FRXCX Studio <span className="text-[#ff4f31]">Vault</span>
          </h1>
          <p className="text-xs text-[#a09d93] mt-1">
            {step === 'password'
              ? 'Multi-layer administrative authentication'
              : 'Two-Factor Authentication checkpoint'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'password' ? (
            <motion.form
              key="step-password"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handlePasswordSubmit}
              className="flex flex-col gap-4"
            >
              {/* Email */}
              <div>
                <label className="block text-[12.5px] font-medium text-[#d0cbc2] mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@studio.com"
                    className="w-full h-[48px] rounded-[14px] bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] px-4 pl-10 text-[14px] text-white border border-white/10 focus:border-[#ff4f31] outline-none transition-all placeholder-white/30"
                  />
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12.5px] font-medium text-[#d0cbc2] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-[48px] rounded-[14px] bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] px-4 pl-10 pr-10 text-[14px] text-white border border-white/10 focus:border-[#ff4f31] outline-none transition-all placeholder-white/30"
                  />
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Invisible Honeypot Field */}
              <input
                type="text"
                name="studioToken"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ display: 'none', position: 'absolute', left: '-9999px' }}
                value=""
                onChange={() => {}}
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full h-[48px] rounded-full bg-[#f4efea] text-[#12110b] hover:bg-[#ff4f31] hover:text-white font-semibold text-[14.5px] tracking-tight transition-all duration-300 shadow-md flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? 'Verifying...' : 'Next Step'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="step-2fa"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleTwoFactorSubmit}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-[12.5px] font-medium text-[#d0cbc2] mb-1.5">
                  {isRecoveryCode ? 'Emergency Recovery Code' : '6-Digit Authenticator Code'}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder={isRecoveryCode ? 'XXXX-XXXX-XXXX' : '000000'}
                  className="w-full h-[52px] rounded-[14px] bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] px-4 text-center text-[18px] font-mono tracking-widest text-white border border-white/10 focus:border-[#ff4f31] outline-none transition-all placeholder-white/25"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setIsRecoveryCode((r) => !r)}
                  className="text-[#a09d93] hover:text-[#ff4f31] underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {isRecoveryCode ? 'Use Authenticator App instead' : 'Use emergency recovery code'}
                </button>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('password');
                    setError('');
                  }}
                  className="h-[48px] px-4 rounded-full border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#a09d93] hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-[48px] rounded-full bg-[#ff4f31] text-white hover:bg-[#e03d21] font-semibold text-[14.5px] tracking-tight transition-all duration-300 shadow-md flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <span>{loading ? 'Authenticating...' : 'Enter Studio Vault'}</span>
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
