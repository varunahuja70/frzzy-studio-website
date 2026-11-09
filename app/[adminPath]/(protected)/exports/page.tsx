'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Clock,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Users,
  Settings2,
  Filter,
  Check,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { LeadExportModal } from '@/components/admin/lead-export-modal';
import { ReauthModal } from '@/components/admin/reauth-modal';
import { getCachedData, setCachedData } from '@/lib/client-cache';

interface HistoryItem {
  id: string;
  adminEmail: string;
  format: string;
  filters: any;
  columns: string[];
  rowCount: number;
  fileName: string;
  fileSizeBytes: number;
  createdAt: number;
}

interface ScheduleItem {
  id: string;
  name: string;
  scheduleCron: string;
  timezone: string;
  format: string;
  recipients: string[];
  enabled: boolean;
  lastRunAt?: number | null;
  nextRunAt?: number | null;
}

export default function AdminExportsPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);

  const cachedHist = getCachedData<HistoryItem[]>('exports_history');
  const cachedSched = getCachedData<ScheduleItem[]>('exports_schedules');
  const [history, setHistory] = useState<HistoryItem[]>(cachedHist || []);
  const [schedules, setSchedules] = useState<ScheduleItem[]>(cachedSched || []);
  const [loading, setLoading] = useState(!cachedHist && !cachedSched);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Quick export state
  const [quickExporting, setQuickExporting] = useState<string | null>(null);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedName, setSchedName] = useState('Daily Morning Brief');
  const [schedTime, setSchedTime] = useState('08:00');
  const [schedTimezone, setSchedTimezone] = useState('Asia/Kolkata');
  const [schedFormat, setSchedFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [schedRecipients, setSchedRecipients] = useState('frxcxstudio@gmail.com');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Reauth for re-downloads
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingDownloadId, setPendingDownloadId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [histRes, schedRes] = await Promise.all([
        fetch('/api/admin/leads/export/history'),
        fetch('/api/admin/leads/export/schedule'),
      ]);

      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData.history || []);
        setCachedData('exports_history', histData.history || []);
      }
      if (schedRes.ok) {
        const schedData = await schedRes.json();
        setSchedules(schedData.schedules || []);
        setCachedData('exports_schedules', schedData.schedules || []);
      }
    } catch (err) {
      console.error('Failed to load export data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Quick 1-click export
  const handleQuickExport = async (quickDate: 'today' | 'yesterday', fmt: 'xlsx' | 'csv') => {
    try {
      setQuickExporting(`${quickDate}-${fmt}`);
      const res = await fetch('/api/admin/leads/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: fmt,
          quickDate,
        }),
      });

      if (res.status === 403) {
        const d = await res.json().catch(() => ({}));
        if (d.requiresReauth) {
          setReauthOpen(true);
          return;
        }
      }

      if (!res.ok) throw new Error('Quick export failed');

      const blob = await res.blob();
      const contentDisp = res.headers.get('content-disposition');
      let filename = `Leads_${quickDate}.${fmt}`;
      if (contentDisp && contentDisp.includes('filename=')) {
        const match = contentDisp.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      loadData();
    } catch (err) {
      console.error('Quick export failed:', err);
    } finally {
      setQuickExporting(null);
    }
  };

  // Re-download from history
  const handleDownloadHistorical = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/leads/export/history/${id}`);
      if (res.status === 403) {
        const d = await res.json().catch(() => ({}));
        if (d.requiresReauth) {
          setPendingDownloadId(id);
          setReauthOpen(true);
          return;
        }
      }

      if (!res.ok) throw new Error('Download failed or file expired');

      const blob = await res.blob();
      const contentDisp = res.headers.get('content-disposition');
      let filename = `Export_${id}.xlsx`;
      if (contentDisp && contentDisp.includes('filename=')) {
        const match = contentDisp.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Historical download error:', err);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      setSavingSchedule(true);
      const recipientsList = schedRecipients
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const [hours, minutes] = schedTime.split(':');
      const cron = `${minutes || '0'} ${hours || '8'} * * *`;

      const res = await fetch('/api/admin/leads/export/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schedName,
          scheduleCron: cron,
          timezone: schedTimezone,
          format: schedFormat,
          recipients: recipientsList,
        }),
      });

      if (res.status === 403) {
        const d = await res.json().catch(() => ({}));
        if (d.requiresReauth) {
          setReauthOpen(true);
          return;
        }
      }

      if (res.ok) {
        setShowScheduleModal(false);
        loadData();
      }
    } catch (err) {
      console.error('Create schedule error:', err);
    } finally {
      setSavingSchedule(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <LeadExportModal
        isOpen={exportModalOpen}
        onClose={() => {
          setExportModalOpen(false);
          loadData();
        }}
        adminPath={adminPath}
      />

      <ReauthModal
        isOpen={reauthOpen}
        onClose={() => {
          setReauthOpen(false);
          setPendingDownloadId(null);
        }}
        onSuccess={() => {
          setReauthOpen(false);
          if (pendingDownloadId) {
            handleDownloadHistorical(pendingDownloadId);
            setPendingDownloadId(null);
          }
        }}
        title="Confirm Vault Password for Lead Export"
        description="Re-authentication is required to access sensitive client lead exports and maintain encryption integrity."
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
            Lead Data & Exports Vault
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Compile customer inquiries into executive Excel workbooks, configure automated digests, and retrieve historical runs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="h-9 px-4 rounded-[12px] bg-[#ff4f31] hover:bg-[#ff4f31]/90 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Custom Export Builder</span>
          </button>
        </div>
      </div>

      {/* Quick 1-Click Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Leads Card */}
        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff4f31]">
                Fast Download
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Live
              </span>
            </div>
            <h3 className="text-base font-bold text-[#12110b] dark:text-white">
              Today&apos;s Customer Inquiries
            </h3>
            <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1">
              One-click download of all submissions received since midnight.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <button
              type="button"
              onClick={() => handleQuickExport('today', 'xlsx')}
              disabled={quickExporting === 'today-xlsx'}
              className="h-9 rounded-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {quickExporting === 'today-xlsx' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickExport('today', 'csv')}
              disabled={quickExporting === 'today-csv'}
              className="h-9 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[#12110b] dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {quickExporting === 'today-csv' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              <span>CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* Yesterday's Leads Card */}
        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a6265] dark:text-[#a09d93]">
                Daily Batch
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-[#a09d93]">
                Completed
              </span>
            </div>
            <h3 className="text-base font-bold text-[#12110b] dark:text-white">
              Yesterday&apos;s Full Day Batch
            </h3>
            <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1">
              Complete 24-hour snapshot of inquiries for review and CRM reconciliation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <button
              type="button"
              onClick={() => handleQuickExport('yesterday', 'xlsx')}
              disabled={quickExporting === 'yesterday-xlsx'}
              className="h-9 rounded-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {quickExporting === 'yesterday-xlsx' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickExport('yesterday', 'csv')}
              disabled={quickExporting === 'yesterday-csv'}
              className="h-9 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[#12110b] dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {quickExporting === 'yesterday-csv' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              <span>CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* Scheduled Automation Card */}
        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff4f31]">
                Automated Digest
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ff4f31]/10 text-[#ff4f31]">
                Cron
              </span>
            </div>
            <h3 className="text-base font-bold text-[#12110b] dark:text-white">
              Daily Email Delivery
            </h3>
            <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1">
              Automatic morning workbook sent to management with KPI summaries.
            </p>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              className="w-full h-9 rounded-[10px] bg-[#12110b] dark:bg-white/[0.08] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Configure Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scheduled Exports Active List */}
      {schedules.length > 0 && (
        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-[#ff4f31]" />
              <h2 className="text-sm font-bold text-[#12110b] dark:text-white">
                Active Automation Schedules
              </h2>
            </div>
            <span className="text-xs text-[#5a6265] dark:text-[#a09d93]">
              Timezone: <strong className="text-[#12110b] dark:text-white">Asia/Kolkata (IST)</strong>
            </span>
          </div>

          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
            {schedules.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-[#12110b] dark:text-white">
                    {s.name}
                  </div>
                  <div className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
                    Cron: <code className="font-mono">{s.scheduleCron}</code> · Format:{' '}
                    <span className="uppercase font-semibold">{s.format}</span> · Recipients:{' '}
                    {s.recipients.join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Exports Table */}
      <div className="rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HardDrive className="h-4 w-4 text-[#5a6265] dark:text-[#a09d93]" />
            <h2 className="text-sm font-bold text-[#12110b] dark:text-white">
              Export History & Audit Archive
            </h2>
          </div>
          <span className="text-xs text-[#5a6265] dark:text-[#a09d93]">
            {history.length} export runs recorded
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5a6265] dark:text-[#a09d93]">
            No historical lead exports compiled yet. Click &quot;Custom Export Builder&quot; above to run your first report.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.06] dark:border-white/[0.07] text-[#5a6265] dark:text-[#a09d93] text-[11px] font-medium uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Records</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Generated By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4 text-[#5a6265] dark:text-[#a09d93] whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] font-medium text-[#12110b] dark:text-white whitespace-nowrap">
                      {item.fileName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.format === 'xlsx'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-[#ff4f31]/10 text-[#ff4f31]'
                        }`}
                      >
                        {item.format}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-[#12110b] dark:text-white">
                      {item.rowCount}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#5a6265] dark:text-[#a09d93]">
                      {formatBytes(item.fileSizeBytes)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#5a6265] dark:text-[#a09d93]">
                      {item.adminEmail}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDownloadHistorical(item.id)}
                        className="px-3 py-1 rounded-[8px] bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold text-[#12110b] dark:text-white flex items-center gap-1.5 ml-auto transition-colors cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>Re-download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Configuration Modal */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[20px] bg-[#12110b] border border-white/[0.1] p-6 shadow-2xl text-[#f4efea] space-y-4 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#ff4f31]" />
                <span>Configure Scheduled Daily Export</span>
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowScheduleModal(false);
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-colors cursor-pointer z-30"
                aria-label="Close modal"
              >
                <X className="h-4 w-4 pointer-events-none" />
              </button>
            </div>
            <p className="text-xs text-[#a09d93]">
              Automate report compilation every morning and dispatch to leadership emails.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={schedName}
                  onChange={(e) => setSchedName(e.target.value)}
                  className="w-full h-9 px-3 rounded-[8px] bg-white/[0.04] border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                    Daily Delivery Time
                  </label>
                  <input
                    type="time"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-[8px] bg-white/[0.04] border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                    Format
                  </label>
                  <select
                    value={schedFormat}
                    onChange={(e) => setSchedFormat(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-[8px] bg-white/[0.04] border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  >
                    <option value="xlsx" className="bg-[#181712]">Excel (.xlsx)</option>
                    <option value="csv" className="bg-[#181712]">CSV (.csv)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={schedTimezone}
                  onChange={(e) => setSchedTimezone(e.target.value)}
                  className="w-full h-9 px-3 rounded-[8px] bg-white/[0.04] border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                  Recipients (Comma-separated)
                </label>
                <input
                  type="text"
                  value={schedRecipients}
                  onChange={(e) => setSchedRecipients(e.target.value)}
                  className="w-full h-9 px-3 rounded-[8px] bg-white/[0.04] border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="h-8 px-3 rounded-[8px] bg-white/[0.05] text-xs font-semibold text-white hover:bg-white/[0.1] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSchedule}
                disabled={savingSchedule || !schedName.trim() || !schedRecipients.trim()}
                className="h-8 px-4 rounded-[8px] bg-[#ff4f31] text-xs font-bold text-white hover:bg-[#ff4f31]/90 disabled:opacity-50 cursor-pointer"
              >
                {savingSchedule ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
