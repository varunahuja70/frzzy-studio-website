'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Download,
  Mail,
  Calendar,
  Globe,
  Smartphone,
  Trash2,
  X,
  MessageSquare,
  Sparkles,
  Send,
  ShieldAlert,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ReauthModal } from '@/components/admin/reauth-modal';

interface LeadItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  category: string;
  message: string;
  status: 'new' | 'contacted' | 'in_progress' | 'won' | 'lost' | 'spam';
  sourcePage?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  ipMasked?: string;
  createdAt: number;
  updatedAt: number;
  notes: Array<{ id: string; content: string; createdAt: number }>;
}

export default function AdminLeadsPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);
  const router = useRouter();

  const [leadsList, setLeadsList] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // New note input
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Reauth modal state
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'export' | 'delete' | null>(null);
  const [leadToDeleteId, setLeadToDeleteId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      if (res.status === 401) {
        // Redirect to login if unauthenticated
        router.push(`/${adminPath}/login`);
        return;
      }
      if (!res.ok) {
        throw new Error('Unable to fetch customer submissions');
      }
      const data = await res.json();
      setLeadsList(data.leads || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch leads';
      console.warn('Leads fetch notice:', msg);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [adminPath, router, searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 200);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  // Handle status update
  const handleUpdateStatus = async (leadId: string, newStatus: LeadItem['status']) => {
    // Optimistic UI update
    setLeadsList((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Add internal note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newNote.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedLead.id, note: newNote.trim() }),
      });

      if (res.ok) {
        const addedNoteItem = {
          id: `note-${Date.now()}`,
          content: newNote.trim(),
          createdAt: Date.now(),
        };

        setSelectedLead((prev) =>
          prev ? { ...prev, notes: [addedNoteItem, ...prev.notes] } : null
        );
        setLeadsList((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id
              ? { ...l, notes: [addedNoteItem, ...l.notes] }
              : l
          )
        );
        setNewNote('');
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  // Trigger high-privilege delete
  const triggerDelete = (leadId: string) => {
    setLeadToDeleteId(leadId);
    setPendingAction('delete');
    setReauthOpen(true);
  };

  // Trigger high-privilege CSV export
  const triggerExport = () => {
    setPendingAction('export');
    setReauthOpen(true);
  };

  const handleReauthSuccess = async () => {
    setReauthOpen(false);

    if (pendingAction === 'export') {
      window.location.href = '/api/admin/leads/export';
    } else if (pendingAction === 'delete' && leadToDeleteId) {
      try {
        const res = await fetch(`/api/admin/leads?id=${leadToDeleteId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setLeadsList((prev) => prev.filter((l) => l.id !== leadToDeleteId));
          if (selectedLead?.id === leadToDeleteId) {
            setSelectedLead(null);
          }
        }
      } catch (err) {
        console.error('Delete lead failed:', err);
      } finally {
        setLeadToDeleteId(null);
      }
    }
    setPendingAction(null);
  };

  const statusOptions: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Inquiries' },
    { id: 'new', label: 'New' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'won', label: 'Won' },
    { id: 'lost', label: 'Lost' },
    { id: 'spam', label: 'Spam' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <ReauthModal
        isOpen={reauthOpen}
        onClose={() => {
          setReauthOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleReauthSuccess}
        title={
          pendingAction === 'export'
            ? 'Confirm Vault Password to Export Inquiries'
            : 'Confirm Vault Password to Delete Client Record'
        }
        description={
          pendingAction === 'export'
            ? 'Exporting full customer submissions requires re-authentication to satisfy GDPR/privacy compliance.'
            : 'Deleting client lead history is permanent and removes all encrypted records and notes.'
        }
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
            Customer Inquiries Hub
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Decrypted client briefs, team collaboration notes, and response workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchLeads}
            disabled={loading}
            className="h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={triggerExport}
            className="h-9 px-4 rounded-[12px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6265] dark:text-[#a09d93]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, category, or email..."
            className="w-full h-10 pl-10 pr-4 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-[#12110b] dark:focus:border-[#f4efea] text-xs text-[#12110b] dark:text-[#f4efea] placeholder-[#5a6265]/60 dark:placeholder-[#a09d93]/60 outline-none transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
          {statusOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStatusFilter(opt.id)}
              className={`px-3 py-1.5 rounded-[9px] text-xs font-semibold capitalize transition-all cursor-pointer ${
                statusFilter === opt.id
                  ? 'bg-white dark:bg-[#25241d] text-[#12110b] dark:text-[#f4efea] shadow-xs'
                  : 'text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchLeads}
            className="px-3 py-1 rounded bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Leads Table / Responsive Cards */}
      <div className="rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5a6265] dark:text-[#a09d93] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-[#ff4f31]" />
            <span>Decrypting customer records from SQLite vault...</span>
          </div>
        ) : leadsList.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#5a6265] dark:text-[#a09d93] flex flex-col items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-lg">
              ✉️
            </div>
            <p className="font-semibold text-sm text-[#12110b] dark:text-[#f4efea]">No Inquiries Found</p>
            <p className="max-w-xs text-[#5a6265] dark:text-[#a09d93]">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Customer inquiries submitted via the homepage contact form will automatically arrive here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/[0.06] dark:border-white/[0.07] bg-black/[0.01] dark:bg-white/[0.02] text-[#5a6265] dark:text-[#a09d93] font-semibold">
                <tr>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                {leadsList.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] font-bold text-xs flex items-center justify-center shrink-0">
                          {lead.firstName?.[0] || 'L'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[13px] text-[#12110b] dark:text-[#f4efea]">
                            {lead.firstName} {lead.lastName}
                          </span>
                          <span className="text-[11px] text-[#5a6265] dark:text-[#a09d93] font-mono">
                            {lead.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-[12px]">
                      {lead.category || 'Full Production'}
                    </td>

                    <td className="py-3.5 px-4 text-[#5a6265] dark:text-[#a09d93]">
                      {new Date(lead.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value as LeadItem['status'])}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold outline-none cursor-pointer border ${
                          lead.status === 'new'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : lead.status === 'won'
                            ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                            : lead.status === 'contacted'
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : lead.status === 'spam'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            : 'bg-black/5 dark:bg-white/10 text-[#5a6265] dark:text-[#a09d93] border-transparent'
                        }`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="in_progress">In Progress</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="spam">Spam</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLead(lead)}
                        className="text-xs font-semibold text-[#12110b] dark:text-[#f4efea] group-hover:text-[#ff4f31] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Detail Drawer */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 bottom-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-[#181712] border-l border-black/[0.08] dark:border-white/[0.1] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] font-bold text-sm flex items-center justify-center">
                      {selectedLead.firstName?.[0] || 'L'}
                    </div>
                    <div>
                      <h3 className="font-bold text-base leading-tight">
                        {selectedLead.firstName} {selectedLead.lastName}
                      </h3>
                      <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">
                        Inquiry ID: {selectedLead.id.slice(0, 10)}...
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Lead Info */}
                <div className="mt-5 space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-[#5a6265] dark:text-[#a09d93] uppercase tracking-wider block mb-1">
                      Direct Email Contact
                    </label>
                    <a
                      href={`mailto:${selectedLead.email}?subject=Regarding%20your%20FRXCX%20Studio%20Inquiry`}
                      className="font-mono text-sm text-[#ff4f31] font-semibold hover:underline inline-flex items-center gap-1.5"
                    >
                      <span>{selectedLead.email}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#5a6265] dark:text-[#a09d93] uppercase tracking-wider block mb-1">
                      Service Category
                    </label>
                    <span className="inline-block px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs font-semibold">
                      {selectedLead.category || 'Full Production'}
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#5a6265] dark:text-[#a09d93] uppercase tracking-wider block mb-1">
                      Project Brief / Requirements (Decrypted)
                    </label>
                    <div className="p-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] leading-relaxed whitespace-pre-wrap text-[13px] border border-black/[0.04] dark:border-white/[0.05]">
                      {selectedLead.message}
                    </div>
                  </div>

                  {/* Device & Client Metadata */}
                  <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] grid grid-cols-2 gap-2 text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                    <div>
                      <span className="block font-semibold">Device / OS</span>
                      <span>{selectedLead.deviceType || 'Desktop'} · {selectedLead.os || 'macOS'}</span>
                    </div>
                    <div>
                      <span className="block font-semibold">Country</span>
                      <span>{selectedLead.country || 'Global (NL / US)'}</span>
                    </div>
                    <div>
                      <span className="block font-semibold">Browser</span>
                      <span>{selectedLead.browser || 'Chrome/Safari'}</span>
                    </div>
                    <div>
                      <span className="block font-semibold">Masked IP</span>
                      <span>{selectedLead.ipMasked || '192.168.*.*'}</span>
                    </div>
                  </div>

                  {/* Notes Timeline */}
                  <div className="pt-2">
                    <label className="text-[11px] font-semibold text-[#5a6265] dark:text-[#a09d93] uppercase tracking-wider block mb-2">
                      Internal Notes ({selectedLead.notes.length})
                    </label>

                    <form onSubmit={handleAddNote} className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add internal studio note..."
                        className="flex-1 h-9 px-3 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs outline-none focus:border-[#12110b] dark:focus:border-[#f4efea]"
                      />
                      <button
                        type="submit"
                        disabled={addingNote || !newNote.trim()}
                        className="h-9 px-3.5 rounded-[10px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-xs font-semibold hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    </form>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedLead.notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-2.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] text-xs"
                        >
                          <p>{note.content}</p>
                          <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93] mt-1 block">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.07] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => triggerDelete(selectedLead.id)}
                  className="h-9 px-3 rounded-[10px] text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Record</span>
                </button>

                <a
                  href={`mailto:${selectedLead.email}?subject=Regarding%20your%20FRXCX%20Studio%20Inquiry`}
                  className="h-9 px-4 rounded-[10px] bg-[#ff4f31] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#ff4f31]/90 shadow-xs cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Reply via Email</span>
                </a>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}