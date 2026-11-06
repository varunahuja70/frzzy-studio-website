'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { ClipboardList, Shield, User, Clock } from 'lucide-react';

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

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/audit?limit=60');
      if (!res.ok) throw new Error('Failed to fetch audit trail');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchLogs();
    });
  }, [fetchLogs]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('CREATED')) {
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
    if (action.includes('FAILED') || action.includes('LOCKOUT') || action.includes('DELETED')) {
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }
    if (action.includes('EXPORT') || action.includes('CHANGED')) {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  return (
    <div className="flex flex-col gap-6 pb-12 select-none">
      {/* Top Header */}
      <div>
        <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">
          Immutable <span className="text-[#ff4f31]">Audit Trail</span>
        </h1>
        <p className="text-xs sm:text-[13.5px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
          Tamper-evident logs of administrative actions, authentications, exports, and status changes
        </p>
      </div>

      <div className="rounded-[22px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#a09d93]">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#a09d93]">No audit logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f3f0]/70 dark:bg-white/[0.02] text-[#5a6265] dark:text-[#a09d93] border-b border-black/[0.05] dark:border-white/[0.06] font-semibold">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 sm:px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 sm:px-6 text-[#a09d93] font-mono whitespace-nowrap">
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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#12110b] dark:text-[#f4efea] truncate max-w-[140px]">
                      {log.resource || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#a09d93]">
                      {log.ipAddress}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-[11px] text-[#5a6265] dark:text-[#a09d93] max-w-[280px] truncate">
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
