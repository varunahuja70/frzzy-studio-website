'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Shield, User, Clock, RefreshCw, Filter, Search } from 'lucide-react';

interface AuditLogItem {
  id: string;
  adminId?: string | null;
  action: string;
  resource?: string | null;
  details?: string | null;
  ipAddress: string;
  userAgent?: string | null;
  createdAt: number;
}

export default function AdminAuditPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/audit?limit=100');
      if (res.status === 401) {
        router.push(`/${adminPath}/login`);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch audit trail');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [adminPath, router]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchLogs();
    });
  }, [fetchLogs]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('CREATED')) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
    if (action.includes('FAILED') || action.includes('LOCKOUT') || action.includes('DELETED')) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    }
    if (action.includes('EXPORT') || action.includes('CHANGED') || action.includes('REAUTH')) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.resource && l.resource.toLowerCase().includes(search.toLowerCase())) ||
      (l.details && l.details.toLowerCase().includes(search.toLowerCase())) ||
      l.ipAddress.includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
            Immutable Audit Trail
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Tamper-evident system events: authentication records, lead exports, status mutations, and privilege escalation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Trail</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex items-center gap-3">
        <Search className="h-4 w-4 text-[#5a6265] dark:text-[#a09d93] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter audit logs by action, IP, or resource..."
          className="w-full bg-transparent text-xs text-[#12110b] dark:text-[#f4efea] placeholder-[#5a6265]/60 dark:placeholder-[#a09d93]/60 outline-none"
        />
      </div>

      {/* Audit Log Table */}
      <div className="rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#5a6265] dark:text-[#a09d93] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-[#ff4f31]" />
            <span>Verifying audit record chain...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#5a6265] dark:text-[#a09d93]">
            No audit records match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/[0.01] dark:bg-white/[0.02] text-[#5a6265] dark:text-[#a09d93] border-b border-black/[0.06] dark:border-white/[0.07] font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#5a6265] dark:text-[#a09d93] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#12110b] dark:text-[#f4efea]">
                      {log.resource || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                      {log.ipAddress}
                    </td>
                    <td className="py-3.5 px-4 text-[#5a6265] dark:text-[#a09d93] max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}