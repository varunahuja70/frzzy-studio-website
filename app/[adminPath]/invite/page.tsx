'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, KeyRound, Check, ArrowRight, Eye, EyeOff, Smartphone } from 'lucide-react';
import Image from 'next/image';

export default function AdminInvitePage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<{
    admin: { id: string; email: string; name: string | null };
    totp: { secret: string; qrCodeDataUrl: string };
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  // Password requirements calculation
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol && passwordsMatch && totpCode.length === 6;

  useEffect(() => {
    if (!token) {
      setError('Invite token is missing from URL.');
      setLoading(false);
      return;
    }

    fetch(`/api/admin/invite/verify?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Invite link is invalid or expired');
        } else {
          setInviteData(data);
        }
      })
      .catch(() => setError('Connection failure verifying invite'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !inviteData) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          totpSecret: inviteData.totp.secret,
          totpCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to complete account activation');
      } else {
        // Land directly on dashboard
        window.location.href = `/${adminPath}`;
      }
    } catch {
      setError('Connection failure completing activation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#12110b] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#ff4f31] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen w-full bg-[#12110b] text-[#f4efea] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[24px] bg-[#1a1914] border border-white/10 p-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold mb-2">Invalid Invite Link</h2>
          <p className="text-xs text-[#a09d93] mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#12110b] text-[#f4efea] flex items-center justify-center p-4 sm:p-6 select-none relative overflow-y-auto py-12">
      <div className="w-full max-w-lg rounded-[24px] bg-[#1a1914] border border-white/10 p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#ff4f31] mx-auto mb-3 shadow-inner">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight">Activate Studio Account</h1>
          <p className="text-xs text-[#a09d93] mt-1">
            Setting up credentials for <span className="text-white font-medium">{inviteData?.admin.email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Section 1: Set Password */}
          <div>
            <label className="block text-xs font-semibold text-[#d0cbc2] mb-1.5">
              Create New Password (min 12 chars)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter high-entropy password..."
                className="w-full h-[46px] rounded-[14px] bg-white/[0.05] border border-white/10 px-4 pr-11 text-xs text-white focus:border-[#ff4f31] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-[11px] text-[#a09d93]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : ''}`}>
                <Check className="h-3 w-3" /> 12+ characters
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper && hasLower ? 'text-emerald-400' : ''}`}>
                <Check className="h-3 w-3" /> Uppercase & lowercase
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : ''}`}>
                <Check className="h-3 w-3" /> Number
              </div>
              <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-400' : ''}`}>
                <Check className="h-3 w-3" /> Symbol (!@#$)
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#d0cbc2] mb-1.5">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password..."
              className="w-full h-[46px] rounded-[14px] bg-white/[0.05] border border-white/10 px-4 text-xs text-white focus:border-[#ff4f31] outline-none"
            />
          </div>

          {/* Section 2: Mandatory 2FA Setup */}
          <div className="p-4 rounded-[16px] bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4 text-[#ff4f31]" />
              <span className="text-xs font-bold text-white">Two-Factor Authentication Setup</span>
            </div>
            <p className="text-[11.5px] text-[#a09d93] leading-relaxed mb-3">
              Scan this QR code with Google Authenticator, 1Password, or Apple Keychain to configure your 2FA tokens.
            </p>

            {inviteData?.totp.qrCodeDataUrl && (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="h-28 w-28 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inviteData.totp.qrCodeDataUrl}
                    alt="2FA QR Code"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-[#a09d93] break-all">
                  <span className="font-semibold text-white">Manual Key:</span>
                  <code className="bg-black/40 px-2 py-1 rounded text-white font-mono text-[10.5px]">
                    {inviteData.totp.secret}
                  </code>
                </div>
              </div>
            )}

            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[#d0cbc2] mb-1">
                Enter 6-Digit Authenticator Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full h-[42px] text-center tracking-widest font-mono text-[16px] font-bold rounded-[12px] bg-white/[0.05] border border-white/10 text-white focus:border-[#26d67c] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || submitting}
            className="w-full h-[48px] rounded-full bg-[#f4efea] text-[#12110b] hover:bg-[#ff4f31] hover:text-white font-semibold text-xs tracking-tight transition-all duration-300 shadow-md flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <span>{submitting ? 'Activating...' : 'Complete Activation & Open Vault'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
