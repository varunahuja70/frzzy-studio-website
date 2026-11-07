'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  CheckSquare,
  Square,
  Sparkles,
  Save,
  RotateCcw,
  Eye,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { ReauthModal } from '@/components/admin/reauth-modal';

interface LeadExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminPath: string;
}

const AVAILABLE_COLUMNS = [
  { id: 'createdAt', label: 'Date & Time' },
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'email', label: 'Email Address' },
  { id: 'category', label: 'Service / Category' },
  { id: 'status', label: 'Inquiry Status' },
  { id: 'message', label: 'Client Message' },
  { id: 'assignedTo', label: 'Assigned Specialist' },
  { id: 'sourcePage', label: 'Source Page' },
  { id: 'country', label: 'Country' },
  { id: 'deviceType', label: 'Device & Platform' },
];

const DEFAULT_COLUMNS = [
  'createdAt',
  'firstName',
  'lastName',
  'email',
  'category',
  'status',
  'message',
  'assignedTo',
];

const STATUS_CHOICES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'spam', label: 'Spam' },
];

export function LeadExportModal({ isOpen, onClose, adminPath }: LeadExportModalProps) {
  const [exportType, setExportType] = useState<'leads' | 'work_items' | 'financial_ledger' | 'team_performance'>('leads');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [datePreset, setDatePreset] = useState<
    'all' | 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'custom' | 'multi_days'
  >('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);

  // Live preview & count
  const [previewLoading, setPreviewLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Presets
  const [presets, setPresets] = useState<Array<{ id: string; name: string; columns: string[]; filters: any }>>([]);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [showSavePresetInput, setShowSavePresetInput] = useState(false);

  // Reauth & Export state
  const [reauthOpen, setReauthOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Escape key handling
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !reauthOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, reauthOpen, onClose]);

  // Fetch presets on open
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/admin/leads/export/presets')
      .then((r) => r.json())
      .then((d) => {
        if (d.presets) setPresets(d.presets);
      })
      .catch(() => {});
  }, [isOpen]);

  // Fetch live preview
  const fetchPreview = useCallback(async () => {
    try {
      setPreviewLoading(true);
      setErrorMessage(null);

      const payload: Record<string, any> = {
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        datePreset,
      };

      if (datePreset === 'custom') {
        if (customStart) payload.startDate = new Date(customStart).getTime();
        if (customEnd) payload.endDate = new Date(customEnd).getTime() + 86400000 - 1;
      }

      const res = await fetch('/api/admin/leads/export/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to load export preview');
      const data = await res.json();
      setTotalCount(data.totalCount ?? 0);
      setPreviewRows(data.preview || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Preview error';
      setErrorMessage(msg);
    } finally {
      setPreviewLoading(false);
    }
  }, [datePreset, customStart, customEnd, selectedStatuses]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(fetchPreview, 250);
    return () => clearTimeout(t);
  }, [isOpen, fetchPreview]);

  if (!isOpen) return null;

  const toggleStatus = (id: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleColumn = (id: string) => {
    setSelectedColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map((c) => c.id));
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const resetDefaultColumns = () => {
    setSelectedColumns(DEFAULT_COLUMNS);
  };

  const handleApplyPreset = (preset: (typeof presets)[0]) => {
    if (preset.columns && preset.columns.length > 0) {
      setSelectedColumns(preset.columns);
    }
    if (preset.filters) {
      if (preset.filters.statuses) setSelectedStatuses(preset.filters.statuses);
      if (preset.filters.datePreset) setDatePreset(preset.filters.datePreset);
      if (preset.filters.format) setFormat(preset.filters.format);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    try {
      setSavingPreset(true);
      const res = await fetch('/api/admin/leads/export/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: presetName.trim(),
          columns: selectedColumns,
          filters: {
            format,
            datePreset,
            statuses: selectedStatuses,
          },
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setPresets((p) => [d.preset, ...p]);
        setPresetName('');
        setShowSavePresetInput(false);
      }
    } catch (err) {
      console.error('Save preset failed:', err);
    } finally {
      setSavingPreset(false);
    }
  };

  const executeExport = async () => {
    try {
      setExporting(true);
      setErrorMessage(null);

      const payload: Record<string, any> = {
        format,
        exportType,
        datePreset,
        columns: selectedColumns,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        specificDates: datePreset === 'multi_days' ? selectedDays : undefined,
      };

      if (datePreset === 'custom') {
        if (customStart) payload.startDate = new Date(customStart).getTime();
        if (customEnd) payload.endDate = new Date(customEnd).getTime() + 86400000 - 1;
      }

      const targetEndpoint = exportType === 'leads' ? '/api/admin/leads/export' : '/api/admin/work-items/export';

      const res = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body.requiresReauth) {
          setReauthOpen(true);
          return;
        }
        throw new Error(body.error || 'Access denied');
      }

      if (!res.ok) {
        throw new Error('Export generation failed');
      }

      // Download file directly
      const blob = await res.blob();
      const contentDisp = res.headers.get('content-disposition');
      let filename = `${exportType === 'leads' ? 'Leads' : 'WorkItems'}_${new Date().toISOString().slice(0, 10)}.${format}`;
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

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export';
      setErrorMessage(msg);
    } finally {
      setExporting(false);
    }
  };

  const handleReauthSuccess = () => {
    setReauthOpen(false);
    executeExport();
  };

  return (
    <>
      <ReauthModal
        isOpen={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSuccess={handleReauthSuccess}
        title="Vault Authentication Required for Lead Export"
        description="Exporting encrypted customer data requires re-authentication to satisfy GDPR compliance and security standards."
      />

      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-[22px] bg-[#12110b] border border-white/[0.09] shadow-2xl overflow-hidden text-[#f4efea]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[10px] bg-[#ff4f31]/15 text-[#ff4f31] flex items-center justify-center border border-[#ff4f31]/25">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Export Customer Inquiries</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Encrypted Vault
                  </span>
                </h2>
                <p className="text-xs text-[#a09d93]">
                  Generate branded executive Excel workbooks or RFC-compliant CSVs.
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close export modal"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
            >
              <X className="h-4 w-4 pointer-events-none" />
            </button>
          </div>

          {/* Body Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-[12px] bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Presets Bar */}
            {presets.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-[12px] bg-white/[0.03] border border-white/[0.05]">
                <span className="text-[11px] font-semibold text-[#a09d93]">Saved Presets:</span>
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-[8px] bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-medium text-white transition-colors cursor-pointer"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Section 0: Dataset Selection */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a09d93] mb-2">
                1. Select Export Dataset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'leads', label: 'Client Leads', desc: 'Inquiries & CRM' },
                  { id: 'work_items', label: 'Work Items', desc: 'Tasks & Sprints' },
                  { id: 'financial_ledger', label: 'Financial Ledger', desc: 'Deliveries & Revenue' },
                  { id: 'team_performance', label: 'Team Workload', desc: 'Specialist KPIs' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExportType(item.id as any)}
                    className={`p-2.5 rounded-[12px] border text-left transition-all cursor-pointer ${
                      exportType === item.id
                        ? 'bg-[#ff4f31]/15 border-[#ff4f31]/50 text-white shadow-xs'
                        : 'bg-white/[0.02] border-white/[0.06] text-[#a09d93] hover:text-white'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{item.label}</div>
                    <div className="text-[10px] text-[#a09d93] mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 1: File Format */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a09d93] mb-2">
                2. Select Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('xlsx')}
                  className={`p-3.5 rounded-[14px] border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    format === 'xlsx'
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xs'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`p-2 rounded-[9px] shrink-0 ${format === 'xlsx' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.05] text-[#a09d93]'}`}>
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Excel (.xlsx)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-[#a09d93] mt-0.5 leading-snug">
                      2 branded sheets: Executive Summary (KPI cards + breakdowns) & leads list with status pills & frozen panes.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('csv')}
                  className={`p-3.5 rounded-[14px] border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    format === 'csv'
                      ? 'bg-[#ff4f31]/10 border-[#ff4f31]/40 shadow-xs'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`p-2 rounded-[9px] shrink-0 ${format === 'csv' ? 'bg-[#ff4f31]/20 text-[#ff4f31]' : 'bg-white/[0.05] text-[#a09d93]'}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">CSV (.csv)</div>
                    <p className="text-[11px] text-[#a09d93] mt-0.5 leading-snug">
                      Universal UTF-8 with BOM for instant Excel/Google Sheets compatibility and formula injection defense.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 2: Date Range */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#a09d93]">
                  2. Date Range
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDatePreset('today')}
                    className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer ${
                      datePreset === 'today'
                        ? 'bg-[#ff4f31] text-white'
                        : 'bg-white/[0.04] text-[#a09d93] hover:text-white'
                    }`}
                  >
                    1-Click Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset('yesterday')}
                    className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer ${
                      datePreset === 'yesterday'
                        ? 'bg-[#ff4f31] text-white'
                        : 'bg-white/[0.04] text-[#a09d93] hover:text-white'
                    }`}
                  >
                    Yesterday
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-[12px] bg-white/[0.02] border border-white/[0.05]">
                {(
                  [
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                    { id: 'custom', label: 'Date Range' },
                    { id: 'multi_days', label: 'Multi-Day (Pick Days)' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDatePreset(preset.id)}
                    className={`px-3 py-1.5 rounded-[8px] text-[11px] font-medium transition-colors cursor-pointer ${
                      datePreset === preset.id
                        ? 'bg-white/[0.1] text-white font-semibold'
                        : 'text-[#a09d93] hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {datePreset === 'multi_days' && (
                <div className="mt-2.5 p-3.5 rounded-[12px] bg-white/[0.03] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white font-medium">Click individual days to select/unselect:</span>
                    <span className="text-[#ff4f31] font-bold">
                      {selectedDays.length} day{selectedDays.length === 1 ? '' : 's'} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center pt-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                      <span key={i} className="text-[10px] text-neutral-500 font-mono py-0.5">{d}</span>
                    ))}
                    {Array.from({ length: 30 }, (_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `2026-11-${String(dayNum).padStart(2, '0')}`;
                      const isSelected = selectedDays.includes(dateStr);
                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => {
                            setSelectedDays((prev) =>
                              prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
                            );
                          }}
                          className={`h-7 rounded-[6px] text-[11px] font-mono font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#ff4f31] text-white shadow-xs font-bold scale-105'
                              : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDays.length > 0 && (
                    <div className="text-[10px] font-mono text-neutral-400 pt-1 border-t border-white/5 truncate">
                      Selected: {selectedDays.map((d) => d.slice(8) + 'th').join(', ')}
                    </div>
                  )}
                </div>
              )}

              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mt-2.5 p-3 rounded-[12px] bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <label className="block text-[10px] font-medium text-[#a09d93] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-[8px] bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#ff4f31]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[#a09d93] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-[8px] bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#ff4f31]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Status Filters */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a09d93] mb-2">
                3. Filter by Status (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_CHOICES.map((st) => {
                  const active = selectedStatuses.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleStatus(st.id)}
                      className={`px-3 py-1.5 rounded-[9px] text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-[#ff4f31]/15 border-[#ff4f31]/50 text-white'
                          : 'bg-white/[0.02] border-white/[0.06] text-[#a09d93] hover:text-white'
                      }`}
                    >
                      {active ? (
                        <CheckSquare className="h-3.5 w-3.5 text-[#ff4f31]" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Columns Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#a09d93]">
                  4. Columns to Include ({selectedColumns.length}/{AVAILABLE_COLUMNS.length})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllColumns}
                    className="text-[10px] text-[#a09d93] hover:text-white transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-[#a09d93]/40">·</span>
                  <button
                    type="button"
                    onClick={deselectAllColumns}
                    className="text-[10px] text-[#a09d93] hover:text-white transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                  <span className="text-[#a09d93]/40">·</span>
                  <button
                    type="button"
                    onClick={resetDefaultColumns}
                    className="text-[10px] text-[#ff4f31] hover:underline transition-colors cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_COLUMNS.map((col) => {
                  const isChecked = selectedColumns.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => toggleColumn(col.id)}
                      className={`px-2.5 py-1.5 rounded-[8px] text-left border flex items-center gap-2 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-white/[0.07] border-white/20 text-white'
                          : 'bg-white/[0.01] border-white/[0.05] text-[#a09d93] hover:text-white'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-[#a09d93] shrink-0" />
                      )}
                      <span className="truncate text-[11px]">{col.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Live Preview Summary */}
            <div className="p-4 rounded-[14px] bg-white/[0.02] border border-white/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#a09d93]" />
                  <span className="font-semibold text-white">Live Matching Inquiries</span>
                </div>
                {previewLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-[#a09d93]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Calculating...</span>
                  </div>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white font-mono font-bold text-xs">
                    {totalCount ?? 0} record{totalCount === 1 ? '' : 's'} found
                  </span>
                )}
              </div>

              {previewRows.length > 0 && (
                <div className="overflow-x-auto border border-white/[0.06] rounded-[10px]">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.04] text-[#a09d93] border-b border-white/[0.06]">
                        <th className="py-1.5 px-2.5 font-medium">Date</th>
                        <th className="py-1.5 px-2.5 font-medium">Client</th>
                        <th className="py-1.5 px-2.5 font-medium">Email</th>
                        <th className="py-1.5 px-2.5 font-medium">Service</th>
                        <th className="py-1.5 px-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {previewRows.map((row) => (
                        <tr key={row.id} className="hover:bg-white/[0.02]">
                          <td className="py-1.5 px-2.5 text-[#a09d93] whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-1.5 px-2.5 font-medium text-white whitespace-nowrap">
                            {row.firstName} {row.lastName}
                          </td>
                          <td className="py-1.5 px-2.5 text-[#a09d93] whitespace-nowrap font-mono text-[10px]">
                            {row.email}
                          </td>
                          <td className="py-1.5 px-2.5 text-white/90 whitespace-nowrap">
                            {row.category}
                          </td>
                          <td className="py-1.5 px-2.5 whitespace-nowrap">
                            <span className="capitalize px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-white">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Save as Preset Expandable */}
            <div>
              {!showSavePresetInput ? (
                <button
                  type="button"
                  onClick={() => setShowSavePresetInput(true)}
                  className="text-[11px] text-[#a09d93] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save this configuration as a preset</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-[10px] bg-white/[0.03] border border-white/[0.07]">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name (e.g. Sales Weekly)"
                    className="flex-1 h-8 px-3 rounded-[6px] bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#ff4f31]"
                  />
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    disabled={savingPreset || !presetName.trim()}
                    className="h-8 px-3 rounded-[6px] bg-[#ff4f31] text-white text-xs font-semibold hover:bg-[#ff4f31]/90 disabled:opacity-50 cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSavePresetInput(false)}
                    className="h-8 px-2 text-[#a09d93] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 border-t border-white/[0.08] bg-white/[0.01] flex items-center justify-between shrink-0">
            <div className="text-[11px] text-[#a09d93]">
              {selectedColumns.length === 0 ? (
                <span className="text-amber-400">Please select at least 1 column</span>
              ) : (
                <span>
                  Ready to compile {totalCount ?? 0} rows into{' '}
                  <strong className="text-white uppercase">.{format}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-[12px] bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeExport}
                disabled={exporting || selectedColumns.length === 0}
                className="h-9 px-5 rounded-[12px] bg-[#ff4f31] hover:bg-[#ff4f31]/90 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#ff4f31]/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Compiling...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download {format.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
