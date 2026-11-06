'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
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

  const [leadsList, setLeadsList] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
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
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      setLeadsList(data.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 250);
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

    await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, status: newStatus }),
    });
  };

  // Handle adding internal note
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
        const noteObj = {
          id: Math.random().toString(),
          content: newNote.trim(),
          createdAt: Date.now(),
        };
        setSelectedLead((prev) =>
          prev ? { ...prev, notes: [noteObj, ...prev.notes] } : null
        );
        setNewNote('');
      }
    } finally {
      setAddingNote(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    const res = await fetch('/api/admin/leads/export');
    if (res.status === 403) {
      setPendingAction('export');
      setReauthOpen(true);
      return;
    }
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frxcx-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete Lead
  const handleDeleteLead = async (leadId: string) => {
    setLeadToDeleteId(leadId);
    const res = await fetch(`/api/admin/leads?id=${leadId}`, { method: 'DELETE' });
    if (res.status === 403) {
      setPendingAction('delete');
      setReauthOpen(true);
      return;
    }

    if (res.ok) {
      setLeadsList((prev) => prev.filter((l) => l.id !== leadId));
      if (selectedLead?.id === leadId) {
        setSelectedLead(null);
      }
    }
  };

  const handleReauthSuccess = () => {
    if (pendingAction === 'export') {
      handleExportCsv();
    } else if (pendingAction === 'delete' && leadToDeleteId) {
      handleDeleteLead(leadToDeleteId);
    }
    setPendingAction(null);
    setLeadToDeleteId(null);
  };

  const statusColors: Record<LeadItem['status'], string> = {
    new: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    contacted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    won: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    lost: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
    spam: 'bg-red-950/30 text-red-400 border-red-500/30',
  };

  return (
    <div className="flex flex-col gap-6 pb-12 select-none">
      {/* Reauth Modal */}
      <ReauthModal
        isOpen={reauthOpen}
        onClose={() => {
          setReauthOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleReauthSuccess}
        title="Admin Re-Authentication"
        description="Please confirm your credentials to proceed with this high-privilege action."
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">
            Client <span className="text-[#ff4f31]">Leads & Inquiries</span>
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Decrypted client inquiries received from homepage contact forms
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="h-[38px] px-4 rounded-full bg-white dark:bg-[#1a1914] border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-[#ff4f31]" />
          <span>Export Encrypted Vault</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, email, or category..."
            className="w-full h-[40px] rounded-[12px] bg-[#f4f3f0] dark:bg-white/[0.04] px-4 pl-9 text-xs text-[#12110b] dark:text-[#f4efea] border border-transparent focus:border-[#ff4f31] outline-none transition-all placeholder-[#a09d93]"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#a09d93]" />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none]">
          {(['all', 'new', 'contacted', 'in_progress', 'won', 'lost', 'spam'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] shadow-xs'
                    : 'text-[#5a6265] dark:text-[#a09d93] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                }`}
              >
                {st === 'in_progress' ? 'In Progress' : st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="rounded-[22px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#a09d93]">Loading leads from vault...</div>
        ) : leadsList.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#a09d93]">
            No leads match current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f3f0]/70 dark:bg-white/[0.02] text-[#5a6265] dark:text-[#a09d93] border-b border-black/[0.05] dark:border-white/[0.06] font-semibold">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Client Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {leadsList.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 sm:px-6 font-semibold text-[13px] text-[#12110b] dark:text-[#f4efea]">
                      {lead.firstName} {lead.lastName}
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                      {lead.email}
                    </td>
                    <td className="py-4 px-4 font-medium">{lead.category}</td>
                    <td className="py-4 px-4">
                      <select
                        value={lead.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleUpdateStatus(lead.id, e.target.value as LeadItem['status'])
                        }
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border outline-none cursor-pointer ${
                          statusColors[lead.status]
                        }`}
                      >
                        <option value="new">NEW</option>
                        <option value="contacted">CONTACTED</option>
                        <option value="in_progress">IN PROGRESS</option>
                        <option value="won">WON</option>
                        <option value="lost">LOST</option>
                        <option value="spam">SPAM</option>
                      </select>
                    </td>
                    <td className="py-4 px-4 text-[#a09d93]">
                      {new Date(lead.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1.5 rounded-full hover:bg-rose-500/10 text-neutral-400 hover:text-rose-500 transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail Drawer */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1a1914] h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto border-l border-black/[0.08] dark:border-white/[0.08]"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.07] mb-6">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight">
                      {selectedLead.firstName} {selectedLead.lastName}
                    </h2>
                    <span className="text-xs text-[#a09d93]">{selectedLead.category}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Email Action */}
                <div className="mb-6 flex items-center justify-between p-3.5 rounded-[14px] bg-[#f4f3f0] dark:bg-white/[0.03]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#a09d93] block">
                      Client Email
                    </span>
                    <span className="text-xs font-mono font-medium">{selectedLead.email}</span>
                  </div>
                  <a
                    href={`mailto:${selectedLead.email}?subject=FRXCX%20Studio%20—%20Your%20Project%20Inquiry`}
                    className="h-8 px-3 rounded-full bg-[#ff4f31] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-[#e03d21] transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Reply</span>
                  </a>
                </div>

                {/* Message Body */}
                <div className="mb-6">
                  <span className="text-xs font-semibold block mb-2 text-[#5a6265] dark:text-[#a09d93]">
                    Project Requirements / Inquiry Message
                  </span>
                  <div className="p-4 rounded-[16px] bg-[#f4f3f0] dark:bg-white/[0.03] text-xs leading-relaxed whitespace-pre-wrap select-text">
                    {selectedLead.message}
                  </div>
                </div>

                {/* Metadata Tags */}
                <div className="grid grid-cols-2 gap-3 mb-6 text-xs text-[#5a6265] dark:text-[#a09d93]">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-[#ff4f31]" />
                    <span>Country: {selectedLead.country || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 text-[#ff4f31]" />
                    <span>Device: {selectedLead.deviceType || 'Desktop'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-[#ff4f31]" />
                    <span>
                      {new Date(selectedLead.createdAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px]">IP: {selectedLead.ipMasked}</span>
                  </div>
                </div>

                {/* Internal Notes Section */}
                <div className="border-t border-black/[0.06] dark:border-white/[0.07] pt-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#a09d93] mb-3">
                    Internal Studio Notes
                  </h3>

                  <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add an internal follow-up note..."
                      className="flex-1 h-[38px] rounded-[10px] bg-[#f4f3f0] dark:bg-white/[0.04] px-3 text-xs outline-none focus:border-[#ff4f31] border border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={addingNote || !newNote.trim()}
                      className="h-[38px] px-3.5 rounded-[10px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-xs font-semibold disabled:opacity-50 flex items-center justify-center cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  </form>

                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {selectedLead.notes.length > 0 ? (
                      selectedLead.notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-[10px] bg-[#f4f3f0] dark:bg-white/[0.03] text-xs flex flex-col gap-1"
                        >
                          <span className="text-[#12110b] dark:text-[#f4efea]">{n.content}</span>
                          <span className="text-[10px] text-[#a09d93] font-mono">
                            {new Date(n.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-[#a09d93] italic">No notes added yet.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.07] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Lead</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
