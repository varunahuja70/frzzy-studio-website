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

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/sessions');
      if (res.status === 401) {
        router.push(`/${adminPath}/login`);
        return;
      }
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessionsList(data.sessions || []);
    } catch {
      setMessage('Failed to fetch active sessions');
    } finally {
      setLoading(false);
    }
  }, [adminPath, router]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchSessions();
    });
  }, [fetchSessions]);

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
            Manage authenticated studio devices, cryptographic keys, and progressive lockout rules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchSessions}
            disabled={loading}
            className="h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
        <div className="p-3.5 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-emerald-500 font-semibold text-xs">
            <ShieldCheck className="h-4 w-4" />
            <span>Two-Factor Authentication</span>
          </div>
          <h3 className="text-[17px] font-bold">Mandatory TOTP Active</h3>
          <p className="text-[11.5px] text-[#5a6265] dark:text-[#a09d93] mt-1 leading-relaxed">
            RFC 6238 time-based tokens + 10 hashed single-use recovery codes.
          </p>
        </div>

        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-[#ff4f31] font-semibold text-xs">
            <KeyRound className="h-4 w-4" />
            <span>Argon2id Key Derivation</span>
          </div>
          <h3 className="text-[17px] font-bold">64 MB Memory Hardening</h3>
          <p className="text-[11.5px] text-[#5a6265] dark:text-[#a09d93] mt-1 leading-relaxed">
            Server-side pepper and unique per-user salts defend against ASIC brute force.
          </p>
        </div>

        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-blue-500 font-semibold text-xs">
            <Lock className="h-4 w-4" />
            <span>Session Fixation Defense</span>
          </div>
          <h3 className="text-[17px] font-bold">15-Min Inactivity Timeout</h3>
          <p className="text-[11.5px] text-[#5a6265] dark:text-[#a09d93] mt-1 leading-relaxed">
            HttpOnly, SameSite=Strict cookies with token rotation upon step-up 2FA.
          </p>
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
        <h3 className="text-[15px] font-bold tracking-tight mb-1">Active Administrator Devices</h3>
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
                  <Laptop className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs truncate max-w-xs">{s.userAgent}</span>
                    {s.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
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
    </div>
  );
}