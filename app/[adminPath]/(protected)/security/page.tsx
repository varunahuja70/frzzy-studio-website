'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  LogOut,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  Lock,
  CheckCircle,
  Clock,
  Shield,
  QrCode,
  Copy,
  Check,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface SessionItem {
  id: string;
  ipMasked: string;
  userAgent: string;
  lastActiveAt: number;
  expiresAt: number;
  isCurrent: boolean;
}

export default function AdminSecurityPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);
  const router = useRouter();

  const [sessionsList, setSessionsList] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // 2FA Setup Modal State
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const fetchSecurityData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessRes, twoFaRes] = await Promise.all([
        fetch('/api/admin/sessions'),
        fetch('/api/admin/security/2fa'),
      ]);

      if (sessRes.status === 401 || twoFaRes.status === 401) {
        router.push(`/${adminPath}/login`);
        return;
      }

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessionsList(sessData.sessions || []);
      }

      if (twoFaRes.ok) {
        const twoFaData = await twoFaRes.json();
        setTwoFactorEnabled(Boolean(twoFaData.enabled));
      }
    } catch {
      setMessage('Failed to fetch security information');
    } finally {
      setLoading(false);
    }
  }, [adminPath, router]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchSecurityData();
    });
  }, [fetchSecurityData]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!setupModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSetupModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setupModalOpen]);

  // Start 2FA Setup Flow
  const handleStart2FaSetup = async () => {
    setSetupModalOpen(true);
    setSetupLoading(true);
    setConfirmError('');
    setConfirmCode('');
    try {
      const res = await fetch('/api/admin/security/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSetupData(data);
      } else {
        setConfirmError('Failed to initialize 2FA setup. Please retry.');
      }
    } catch {
      setConfirmError('Network error while requesting 2FA setup key.');
    } finally {
      setSetupLoading(false);
    }
  };

  // Confirm & Activate 2FA
  const handleConfirm2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || !confirmCode.trim()) return;

    setConfirmLoading(true);
    setConfirmError('');

    try {
      const res = await fetch('/api/admin/security/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          code: confirmCode.trim(),
          secret: setupData.secret,
          recoveryCodes: setupData.recoveryCodes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setConfirmError(data.error || 'Verification code failed. Please check your authenticator app.');
      } else {
        setTwoFactorEnabled(true);
        setSetupModalOpen(false);
        setSetupData(null);
        setMessage('✅ Two-Factor Authentication successfully activated and permanently enforced!');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch {
      setConfirmError('Connection failed while confirming code.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.recoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  const handleRevokeSession = async (sessionId: string) => {
    const res = await fetch(`/api/admin/sessions?id=${sessionId}`, { method: 'DELETE' });
    if (res.ok) {
      setSessionsList((prev) => prev.filter((s) => s.id !== sessionId));
      setMessage('Session revoked successfully.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRevokeAllOther = async () => {
    const res = await fetch('/api/admin/sessions?action=revoke_other', { method: 'DELETE' });
    if (res.ok) {
      setSessionsList((prev) => prev.filter((s) => s.isCurrent));
      setMessage('All other sessions terminated.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
            Sessions & Vault Security
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Manage hardware vault defense, multi-factor authentication, and authenticated devices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchSecurityData}
            disabled={loading}
            className="h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-[#f4efea]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {sessionsList.length > 1 && (
            <button
              type="button"
              onClick={handleRevokeAllOther}
              className="h-9 px-4 rounded-[12px] bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Terminate Other Sessions
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* ================= PRIMARY TWO-FACTOR AUTHENTICATION CARD ================= */}
      <div className="p-6 rounded-[22px] bg-[#181712] border border-white/10 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                  twoFactorEnabled
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-[#f4efea]">
                Two-Factor Authentication (TOTP)
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                  twoFactorEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {twoFactorEnabled ? '● Active & Enforced' : '● Setup Required'}
              </span>
            </div>
            <p className="text-xs text-[#a09d93] leading-relaxed">
              {twoFactorEnabled
                ? 'Your account is fortified with RFC 6238 TOTP authentication. Every future sign-in strictly requires your 6-digit authenticator code or emergency recovery code. The QR code has been permanently sealed.'
                : 'Protect your super administrator access. Scan a secure QR code once using Google Authenticator, 1Password, or Apple Keychain to ensure only you can access the vault.'}
            </p>
          </div>

          <div>
            {!twoFactorEnabled ? (
              <button
                type="button"
                onClick={handleStart2FaSetup}
                className="h-[44px] px-5 rounded-full bg-[#ff4f31] hover:bg-[#ff3514] text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,79,49,0.3)] hover:scale-102 flex items-center gap-2 cursor-pointer"
              >
                <QrCode className="h-4 w-4" />
                <span>Turn On Two-Factor Authentication</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#a09d93]">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Permanently Locked & Protected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-emerald-500 font-semibold text-xs">
            <ShieldCheck className="h-4 w-4" />
            <span>Vault Security Level</span>
          </div>
          <h3 className="text-[17px] font-bold text-[#f4efea]">
            {twoFactorEnabled ? 'Maximum (2FA Enforced)' : 'Standard (Password Only)'}
          </h3>
          <p className="text-[11.5px] text-[#5a6265] dark:text-[#a09d93] mt-1 leading-relaxed">
            {twoFactorEnabled
              ? 'Multi-factor verification active on every admin session.'
              : 'Turn on 2FA above to reach maximum security level.'}
          </p>
        </div>

        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-[#ff4f31] font-semibold text-xs">
            <KeyRound className="h-4 w-4" />
            <span>Argon2id Key Derivation</span>
          </div>
          <h3 className="text-[17px] font-bold text-[#f4efea]">64 MB Memory Hardening</h3>
          <p className="text-[11.5px] text-[#5a6265] dark:text-[#a09d93] mt-1 leading-relaxed">
            Server-side pepper and unique per-user salts defend against ASIC brute force.
          </p>
        </div>

        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-blue-500 font-semibold text-xs">
            <Lock className="h-4 w-4" />
            <span>Session Defense</span>
          </div>
          <h3 className="text-[17px] font-bold text-[#f4efea]">15-Min Inactivity Timeout</h3>
          <p className="text-[11.5px] text-[#5a6265] dark:text-[#a09d93] mt-1 leading-relaxed">
            HttpOnly, SameSite=Strict cookies with token rotation upon step-up 2FA.
          </p>
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
        <h3 className="text-[15px] font-bold tracking-tight mb-1 text-[#f4efea]">Active Administrator Devices</h3>
        <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mb-4">
          All currently authenticated sessions across desktop and mobile devices.
        </p>

        <div className="space-y-3">
          {sessionsList.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Laptop className="h-4 w-4 text-[#f4efea]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#f4efea] truncate max-w-xs">{s.userAgent}</span>
                    {s.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Current Session
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-0.5 flex items-center gap-3">
                    <span>IP: {s.ipMasked}</span>
                    <span>·</span>
                    <span>Active: {new Date(s.lastActiveAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {!s.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevokeSession(s.id)}
                  className="self-end sm:self-center px-3 py-1.5 rounded-[9px] text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  Revoke Device
                </button>
              )}
            </div>
          ))}

          {sessionsList.length === 0 && !loading && (
            <div className="py-8 text-center text-xs text-[#5a6265] dark:text-[#a09d93]">
              No active sessions found.
            </div>
          )}
        </div>
      </div>

      {/* ================= 2FA ACTIVATION MODAL ================= */}
      {setupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto py-8"
          onClick={() => setSetupModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-[#181712] p-6 shadow-2xl border border-white/10 text-[#f4efea] space-y-4 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Enable Two-Factor Authentication</h3>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSetupModalOpen(false);
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-colors cursor-pointer z-30"
                aria-label="Close modal"
              >
                <X className="h-4 w-4 pointer-events-none" />
              </button>
            </div>

            {setupLoading && (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#a09d93]">
                <RefreshCw className="h-5 w-5 animate-spin text-[#ff4f31]" />
                <span>Generating cryptographic TOTP key...</span>
              </div>
            )}

            {!setupLoading && setupData && (
              <form onSubmit={handleConfirm2Fa} className="space-y-4 text-xs">
                <p className="text-[#a09d93] leading-relaxed">
                  1. Scan this QR code in Google Authenticator or 1Password. Once verified, this QR code will disappear permanently.
                </p>

                {/* QR Code Container */}
                <div className="flex flex-col items-center p-4 rounded-[16px] bg-white/[0.03] border border-white/[0.08] gap-3">
                  <div className="p-2.5 bg-white rounded-2xl shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setupData.qrCodeDataUrl}
                      alt="Two Factor QR Code"
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                  <div className="w-full text-center">
                    <span className="text-[10px] text-[#a09d93] uppercase font-bold tracking-wider">Manual Secret Key</span>
                    <code className="block mt-1 p-2 rounded-lg bg-black/40 text-[11px] font-mono text-[#ff4f31] select-all break-all border border-white/5">
                      {setupData.secret}
                    </code>
                  </div>
                </div>

                {/* Recovery Codes */}
                <div className="p-3.5 rounded-[14px] bg-white/[0.03] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-white">Emergency Backup Codes (10 single-use codes)</span>
                    <button
                      type="button"
                      onClick={copyRecoveryCodes}
                      className="inline-flex items-center gap-1 text-[10px] text-[#ff4f31] font-semibold hover:underline cursor-pointer"
                    >
                      {copiedCodes ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedCodes ? 'Copied' : 'Copy All'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10.5px] font-mono text-[#a09d93]">
                    {setupData.recoveryCodes.map((c, i) => (
                      <div key={i} className="truncate">{c}</div>
                    ))}
                  </div>
                </div>

                {confirmError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{confirmError}</span>
                  </div>
                )}

                {/* 6-digit verification input */}
                <div>
                  <label className="block text-[12px] font-medium text-[#f4efea] mb-1.5">
                    2. Enter the 6-digit code from your phone:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    autoFocus
                    placeholder="000000"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    className="w-full h-[46px] rounded-[12px] bg-white/[0.05] border border-white/10 px-4 text-center text-lg font-mono text-white tracking-widest outline-none focus:border-[#ff4f31]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSetupModalOpen(false)}
                    className="flex-1 h-[42px] rounded-full border border-white/10 text-xs font-semibold text-[#a09d93] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={confirmLoading}
                    className="flex-1 h-[42px] rounded-full bg-[#ff4f31] hover:bg-[#ff3514] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,79,49,0.3)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {confirmLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Verify & Activate</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
