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
  Plus,
  UserCheck,
  Lock,
  User,
} from 'lucide-react';
import { ReauthModal } from '@/components/admin/reauth-modal';
import { LeadExportModal } from '@/components/admin/lead-export-modal';
import { getCachedData, setCachedData } from '@/lib/client-cache';

interface LeadItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  category: string;
  message: string;
  status: 'new' | 'contacted' | 'in_progress' | 'won' | 'lost' | 'spam';
  assignedTo?: string | null;
  assignedToName?: string | null;
  sourcePage?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  ipMasked?: string;
  isMasked?: boolean;
  createdAt: number;
  updatedAt: number;
  notes: Array<{ id: string; content: string; createdAt: number }>;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminLeadsPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);
  const router = useRouter();

  const cachedLeads = typeof window !== 'undefined' ? getCachedData<LeadItem[]>('leads_list') : null;
  const [leadsList, setLeadsList] = useState<LeadItem[]>(cachedLeads || []);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(!cachedLeads);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // Export Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Manual New Lead Modal state
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCategory, setNewCategory] = useState('Full Production');
  const [newMessage, setNewMessage] = useState('');
  const [creatingLead, setCreatingLead] = useState(false);

  // New note input
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Assigning state
  const [assigningLead, setAssigningLead] = useState(false);

  // Reauth modal state
  const [reauthOpen, setReauthOpen] = useState(false);
  const [leadToDeleteId, setLeadToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (newLeadModalOpen) setNewLeadModalOpen(false);
        if (selectedLead) setSelectedLead(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newLeadModalOpen, selectedLead]);

  const fetchLeads = useCallback(async (silent = false) => {
    try {
      if (!silent && !cachedLeads) setLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      if (res.status === 401) {
        router.push(`/${adminPath}/login`);
        return;
      }
      if (!res.ok) {
        throw new Error('Unable to fetch customer submissions');
      }
      const data = await res.json();
      const list = data.leads || [];
      setLeadsList(list);
      if (!searchQuery && statusFilter === 'all') {
        setCachedData('leads_list', list);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch leads';
      console.warn('Leads fetch notice:', msg);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [adminPath, cachedLeads, router, searchQuery, statusFilter]);

  // Load team members for assignee dropdown
  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.users) {
          setTeamMembers(
            d.users.map((u: any) => ({
              id: u.id,
              name: u.name || u.email.split('@')[0],
              email: u.email,
              role: u.role,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 200);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  // Handle status update
  const handleUpdateStatus = async (leadId: string, nextStatus: LeadItem['status']) => {
    try {
      setLeadsList((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l))
      );
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }

      await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: nextStatus }),
      });
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  // Handle lead assignment
  const handleAssignLead = async (leadId: string, assignedToId: string | null) => {
    try {
      setAssigningLead(true);
      const assignedUser = teamMembers.find((m) => m.id === assignedToId);
      const assignedToName = assignedUser ? assignedUser.name : null;

      setLeadsList((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, assignedTo: assignedToId, assignedToName }
            : l
        )
      );

      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) =>
          prev ? { ...prev, assignedTo: assignedToId, assignedToName } : null
        );
      }

      await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, assignedTo: assignedToId }),
      });
    } catch (err) {
      console.error('Failed to assign lead:', err);
    } finally {
      setAssigningLead(false);
    }
  };

  // Add note to lead
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newNote.trim()) return;

    try {
      setAddingNote(true);
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          note: newNote.trim(),
        }),
      });

      if (res.ok) {
        const addedNoteItem = {
          id: 'temp-' + Date.now(),
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

  // Create Manual Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newEmail.trim() || !newMessage.trim()) return;

    try {
      setCreatingLead(true);
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newFirstName.trim(),
          lastName: newLastName.trim() || 'Client',
          email: newEmail.trim(),
          category: newCategory,
          message: newMessage.trim(),
          status: 'new',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create inquiry');
      }

      setNewLeadModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewMessage('');
      fetchLeads();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating lead';
      alert(msg);
    } finally {
      setCreatingLead(false);
    }
  };

  // Trigger high-privilege delete
  const triggerDelete = (leadId: string) => {
    setLeadToDeleteId(leadId);
    setReauthOpen(true);
  };

  const handleReauthSuccess = async () => {
    setReauthOpen(false);
    if (leadToDeleteId) {
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
          setLeadToDeleteId(null);
        }}
        onSuccess={handleReauthSuccess}
        title="Confirm Vault Password to Delete Client Record"
        description="Deleting client lead history is permanent and removes all encrypted records and notes."
      />

      <LeadExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        adminPath={adminPath}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
            Customer Inquiries Hub
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Decrypted client briefs, team collaboration notes, assignment routing, and response workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchLeads()}
            disabled={loading}
            className="h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setNewLeadModalOpen(true)}
            className="h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-[#ff4f31]" />
            <span>New Inquiry</span>
          </button>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="h-9 px-4 rounded-[12px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Leads</span>
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
            onClick={() => fetchLeads()}
            className="px-3 py-1 rounded bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Leads Table */}
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
                  <th className="py-3 px-4">Assigned To</th>
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[#5a6265] dark:text-[#a09d93] font-mono">
                              {lead.email}
                            </span>
                            {lead.isMasked && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 font-medium">
                                <Lock className="h-2.5 w-2.5" /> Masked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-[12px]">
                      {lead.category || 'Full Production'}
                    </td>

                    <td className="py-3.5 px-4 text-[#5a6265] dark:text-[#a09d93]">
                      {lead.assignedToName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-medium text-[11px]">
                          <User className="h-3 w-3 text-[#ff4f31]" />
                          <span>{lead.assignedToName}</span>
                        </span>
                      ) : (
                        <span className="text-[#a09d93]/60 italic text-[11px]">Unassigned</span>
                      )}
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

      {/* Manual New Inquiry Modal */}
      {newLeadModalOpen && (
        <div
          onClick={() => setNewLeadModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[20px] bg-[#12110b] border border-white/[0.1] p-6 shadow-2xl text-[#f4efea] space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#ff4f31]" />
                <span>Create New Client Inquiry</span>
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNewLeadModalOpen(false);
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
              >
                <X className="h-4 w-4 pointer-events-none" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="e.g. Liam"
                    className="w-full h-9 px-3 rounded-[8px] bg-white/[0.04] border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="e.g. Vance"
                    className="w-full h-9 px-3 rounded-[8px] bg-white/[0.04] border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                  Client Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="w-full h-9 px-3 rounded-[8px] bg-white/[0.04] border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                  Requested Service
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-[8px] bg-[#181712] border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                >
                  <option value="Web Design & Dev">Web Design & Dev</option>
                  <option value="Brand Identity">Brand Identity</option>
                  <option value="3D & Motion">3D & Motion</option>
                  <option value="Creative Direction">Creative Direction</option>
                  <option value="Full Production">Full Production</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#a09d93] mb-1">
                  Project Brief / Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Client requirements, scope, timeline, deliverables..."
                  className="w-full p-3 rounded-[8px] bg-white/[0.04] border border-white/10 text-white outline-none focus:border-[#ff4f31] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setNewLeadModalOpen(false)}
                  className="h-8 px-3.5 rounded-[8px] bg-white/[0.05] text-white text-xs font-semibold hover:bg-white/[0.1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLead}
                  className="h-8 px-4 rounded-[8px] bg-[#ff4f31] text-white text-xs font-bold hover:bg-[#ff4f31]/90 disabled:opacity-50 cursor-pointer"
                >
                  {creatingLead ? 'Saving...' : 'Add Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    aria-label="Close details"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedLead(null);
                    }}
                    className="h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
                  >
                    <X className="h-4 w-4 pointer-events-none" />
                  </button>
                </div>

                {/* Lead Info */}
                <div className="mt-5 space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-[#5a6265] dark:text-[#a09d93] uppercase tracking-wider block mb-1">
                      Direct Email Contact
                    </label>
                    {selectedLead.isMasked ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-[#a09d93]">{selectedLead.email}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                          Field Masked
                        </span>
                      </div>
                    ) : (
                      <a
                        href={`mailto:${selectedLead.email}?subject=Regarding%20your%20FRXCX%20Studio%20Inquiry`}
                        className="font-mono text-sm text-[#ff4f31] font-semibold hover:underline inline-flex items-center gap-1.5"
                      >
                        <span>{selectedLead.email}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Assignee Selection */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#5a6265] dark:text-[#a09d93] uppercase tracking-wider block mb-1">
                      Assigned Specialist
                    </label>
                    <select
                      value={selectedLead.assignedTo || ''}
                      onChange={(e) => handleAssignLead(selectedLead.id, e.target.value || null)}
                      disabled={assigningLead}
                      className="w-full h-9 px-3 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-white outline-none focus:border-[#ff4f31]"
                    >
                      <option value="">-- Unassigned --</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
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
                      <span>{selectedLead.country || 'Global'}</span>
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
              <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.07] flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => triggerDelete(selectedLead.id)}
                  className="h-9 px-3 rounded-[10px] text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams({
                        clientName: `${selectedLead.firstName} ${selectedLead.lastName}`.trim(),
                        clientEmail: selectedLead.isMasked ? '' : selectedLead.email,
                        title: `${selectedLead.firstName}'s ${selectedLead.category} Project`,
                        category: selectedLead.category || 'Web Design & Dev',
                        description: selectedLead.message || '',
                        source: 'Website Lead',
                      });
                      router.push(`/${adminPath}/intake?${params.toString()}`);
                    }}
                    className="h-9 px-3.5 rounded-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Convert to Task</span>
                  </button>

                  {!selectedLead.isMasked && (
                    <a
                      href={`mailto:${selectedLead.email}?subject=Regarding%20your%20FRXCX%20Studio%20Inquiry`}
                      className="h-9 px-3.5 rounded-[10px] bg-[#ff4f31] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#ff4f31]/90 shadow-xs cursor-pointer"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Reply</span>
                    </a>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
