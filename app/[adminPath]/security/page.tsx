'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { ShieldCheck, Smartphone, Laptop, Globe, LogOut, KeyRound, AlertTriangle } from 'lucide-react';

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

  const [sessionsList, setSessionsList] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/sessions');
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessionsList(data.sessions || []);
    } catch {
      setMessage('Failed to fetch active sessions');
    } finally {
      setLoading(false);
    }
  }, []);

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
    <div className="flex flex-col gap-8 pb-12 select-none">
      {/* Top Header */}
      <div>
        <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">
          Security & <span className="text-[#ff4f31]">Active Sessions</span>
        </h1>
        <p className="text-xs sm:text-[13.5px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
          Manage active studio devices, session fixation protection, and multi-factor credentials
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-[20px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-emerald-500 font-semibold text-xs">
            <ShieldCheck className="h-4 w-4" />
            <span>Two-Factor Authentication</span>
          </div>
          <h3 className="text-[17px] font-bold">Mandatory TOTP Active</h3>
          <p className="text-[11.5px] text-[#a09d93] mt-1">
            RFC 6238 time-based one-time passwords + 10 hashed emergency recovery codes.
          </p>
        </div>

        <div className="p-5 rounded-[20px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-[#ff4f31] font-semibold text-xs">
            <KeyRound className="h-4 w-4" />
            <span>Argon2id Key Derivation</span>
          </div>
          <h3 className="text-[17px] font-bold">64 MB Memory Hardening</h3>
          <p className="text-[11.5px] text-[#a09d93] mt-1">
            Server-side pepper and unique per-user salts protect all admin credentials.
          </p>
        </div>

        <div className="p-5 rounded-[20px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-blue-500 font-semibold text-xs">
            <Globe className="h-4 w-4" />
            <span>PII at Rest Encryption</span>
          </div>
          <h3 className="text-[17px] font-bold">AES-256-GCM Vault</h3>
          <p className="text-[11.5px] text-[#a09d93] mt-1">
            Client lead emails and project messages are encrypted at rest with blind indexes.
          </p>
        </div>
      </div>

      {/* Active Sessions Card */}
      <div className="p-6 rounded-[22px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight">Active Devices & Sessions</h2>
            <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-0.5">
              Sessions expire automatically after 15 minutes of idle time or 8 hours maximum
            </p>
          </div>

          <button
            type="button"
            onClick={handleRevokeAllOther}
            className="h-[36px] px-4 rounded-full border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition-all self-start sm:self-auto cursor-pointer"
          >
            Log Out Everywhere Else
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#a09d93]">Loading active sessions...</div>
        ) : (
          <div className="flex flex-col divide-y divide-black/[0.05] dark:divide-white/[0.05]">
            {sessionsList.map((s) => (
              <div key={s.id} className="py-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#f4f3f0] dark:bg-white/[0.04] flex items-center justify-center text-[#ff4f31]">
                    {s.userAgent.includes('Mobile') ? (
                      <Smartphone className="h-4 w-4" />
                    ) : (
                      <Laptop className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px]">{s.userAgent.split(' ')[0]}</span>
                      {s.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                          Current Device
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#a09d93] font-mono">IP: {s.ipMasked}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <span className="text-[11px] text-[#a09d93] block">
                      Last active: {new Date(s.lastActiveAt).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-[#a09d93] block">
                      Expires: {new Date(s.expiresAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {!s.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(s.id)}
                      className="h-8 px-3 rounded-full hover:bg-rose-500/10 text-rose-500 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Reset Guide */}
      <div className="p-6 rounded-[22px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm flex flex-col gap-3">
        <h3 className="text-[15px] font-bold">Credential Management CLI</h3>
        <p className="text-xs text-[#5a6265] dark:text-[#a09d93] leading-relaxed">
          In accordance with strict security architecture, admin passwords cannot be reset through public web forms. Use the authenticated CLI commands on the server terminal:
        </p>
        <div className="p-3.5 rounded-[12px] bg-[#f4f3f0] dark:bg-white/[0.03] font-mono text-xs text-[#ff4f31]">
          npm run admin:reset-password -- --email admin@frxcxstudio.com
        </div>
      </div>
    </div>
  );
}
