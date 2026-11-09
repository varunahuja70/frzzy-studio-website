'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pencil,
  X,
  UserCheck,
  Calendar,
  AlertTriangle,
  Check,
  Shield,
  FileText,
  Sliders,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  Save,
  CheckSquare,
  Square,
} from 'lucide-react';
import { SHAREABLE_FIELDS, DEFAULT_SHARE_TEMPLATES } from '@/lib/auth/permissions-constants';

interface AssigneeCandidate {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface EditWorkItemModalProps {
  workItemId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedItem: any) => void;
}

export function EditWorkItemModal({
  workItemId,
  isOpen,
  onClose,
  onUpdated,
}: EditWorkItemModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Candidates for assignment
  const [candidates, setCandidates] = useState<AssigneeCandidate[]>([]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [status, setStatus] = useState<string>('assigned');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [assignmentInstructions, setAssignmentInstructions] = useState<string>('');

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Shared Fields
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  // Financials (if permitted)
  const [quotedPrice, setQuotedPrice] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [currency, setCurrency] = useState('INR');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [canSeeFinancials, setCanSeeFinancials] = useState(false);

  // Version for concurrency control
  const [version, setVersion] = useState<number>(1);
  const [itemNumber, setItemNumber] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !workItemId) return;

    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Fetch team members
        const teamRes = await fetch('/api/admin/team/performance');
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          if (isMounted) setCandidates(teamData.performance || []);
        }

        // Fetch work item
        const res = await fetch(`/api/admin/work-items/${workItemId}`);
        if (!res.ok) throw new Error('Failed to load work item details');

        const data = await res.json();
        const item = data.workItem;
        if (!item || !isMounted) return;

        setItemNumber(item.itemNumber || '');
        setTitle(item.title || '');
        setCategory(item.category || '');
        setDescription(item.description || '');
        setPriority((item.priority as any) || 'normal');
        setStatus(item.status || 'assigned');
        setProgressPercent(item.progressPercent ?? 0);
        setDueDate(item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '');
        setAssignedTo(item.assignedTo || '');
        setAssignmentInstructions(item.assignmentInstructions || '');

        setClientName(item.clientName || '');
        setClientCompany(item.clientCompany || '');
        setClientEmail(item.clientEmail || '');
        setClientPhone(item.clientPhone || '');

        if (Array.isArray(item.sharedFields)) {
          setSelectedFields(new Set(item.sharedFields));
        } else {
          try {
            const parsed = JSON.parse(item.sharedFields || '[]');
            setSelectedFields(new Set(Array.isArray(parsed) ? parsed : []));
          } catch {
            setSelectedFields(new Set());
          }
        }

        if (item.quotedPrice !== undefined) {
          setCanSeeFinancials(true);
          setQuotedPrice(item.quotedPrice || 0);
          setFinalPrice(item.finalPrice || 0);
          setCurrency(item.currency || 'INR');
          setPaymentStatus(item.paymentStatus || 'unpaid');
        }

        setVersion(item.version || 1);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error loading work item');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, workItemId]);

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const applyTemplate = (fields: string[]) => {
    setSelectedFields(new Set(fields));
  };

  const selectAllFields = () => {
    setSelectedFields(new Set(SHAREABLE_FIELDS.map((f) => f.id)));
  };

  const clearAllFields = () => {
    setSelectedFields(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload: Record<string, any> = {
        title,
        category,
        description,
        priority,
        status,
        progressPercent,
        dueDate: dueDate ? new Date(dueDate).getTime() : null,
        assignedTo: assignedTo || null,
        assignmentInstructions: assignmentInstructions || null,
        clientName,
        clientCompany: clientCompany || null,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        sharedFields: Array.from(selectedFields),
        version,
      };

      if (canSeeFinancials) {
        payload.quotedPrice = quotedPrice;
        payload.finalPrice = finalPrice;
        payload.currency = currency;
        payload.paymentStatus = paymentStatus;
      }

      const res = await fetch(`/api/admin/work-items/${workItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update work item');
      }

      setSuccess(true);
      if (data.workItem) {
        onUpdated(data.workItem);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to update work item');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl my-auto max-h-[92vh] overflow-y-auto rounded-[28px] bg-[#14130e] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-[#f4efea]"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#ff4f31]">{itemNumber}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff4f31]/10 text-[#ff4f31] uppercase">
                Super Admin Editor
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-[#ff4f31]" />
              <span>Edit Work Item & Permissions</span>
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close edit modal"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-colors cursor-pointer z-30"
          >
            <X className="h-4 w-4 pointer-events-none" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-[#ff4f31] border-t-transparent animate-spin" />
            <p className="text-xs text-[#a09d93]">Loading complete project details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-xs">
            {error && (
              <div className="p-3.5 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3.5 rounded-[14px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span>Changes saved successfully! Updating view...</span>
              </div>
            )}

            {/* Section 1: Core Project Details */}
            <div className="p-4 rounded-[18px] bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Briefcase className="h-4 w-4 text-[#ff4f31]" />
                <span>Core Project Scope</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Project Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Service Category *</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Full Production, 3D Motion, Brand Identity"
                    className="w-full h-10 px-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">
                  Project Brief / Full Description (Shared with Assignee when ticked)
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Comprehensive project brief, deliverables, video specs, moodboard notes..."
                  className="w-full p-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31] leading-relaxed resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  >
                    <option value="assigned">Assigned</option>
                    <option value="accepted">Accepted</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                    <option value="delivered">Delivered (Locked)</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#a09d93]">Overall Progress</label>
                  <span className="font-mono font-bold text-white">{progressPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(parseInt(e.target.value, 10))}
                  className="w-full accent-[#ff4f31] cursor-pointer"
                />
              </div>
            </div>

            {/* Section 2: Team Assignment & Instructions */}
            <div className="p-4 rounded-[18px] bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <UserCheck className="h-4 w-4 text-[#ff4f31]" />
                <span>Assignment & Instructions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Assigned Team Member</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full h-10 px-3 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  >
                    <option value="">— Unassigned —</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.email} ({c.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Private Assigner Instructions</label>
                  <input
                    type="text"
                    value={assignmentInstructions}
                    onChange={(e) => setAssignmentInstructions(e.target.value)}
                    placeholder="Specific direction for the assigned creator..."
                    className="w-full h-10 px-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>
              </div>

              {/* Shared Fields Permissions (Crucial for assignee visibility!) */}
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="font-semibold text-white block">Ticked Fields Shared with Assignee</span>
                    <span className="text-[11px] text-[#a09d93]">
                      The assignee only sees the fields ticked below in their &quot;My Tasks&quot; portal.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFields}
                      className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-white transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllFields}
                      className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-[#a09d93] transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Template Quick Actions */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {DEFAULT_SHARE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl.fields)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#ff4f31]/20 text-[#a09d93] hover:text-[#ff4f31] text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>

                {/* Field Checkboxes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-[14px] bg-black/30 border border-white/[0.06]">
                  {SHAREABLE_FIELDS.map((field) => {
                    const isChecked = selectedFields.has(field.id);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => toggleField(field.id)}
                        className={`flex items-center gap-2 p-2 rounded-[10px] text-left transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#ff4f31]/15 text-white border border-[#ff4f31]/30 font-semibold'
                            : 'bg-white/[0.02] text-[#a09d93] border border-transparent hover:bg-white/[0.05]'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-[#ff4f31] shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-[#a09d93]/40 shrink-0" />
                        )}
                        <span className="truncate text-[11px]">{field.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 3: Client Details */}
            <div className="p-4 rounded-[18px] bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Shield className="h-4 w-4 text-[#ff4f31]" />
                <span>Client Contact Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Company / Brand</label>
                  <input
                    type="text"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Client Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Client Phone</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Financials (Super Admin / Financials Manager only) */}
            {canSeeFinancials && (
              <div className="p-4 rounded-[18px] bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span>Financial Ledger (Strictly Isolated from Assignees)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-10 px-3 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Quoted Price</label>
                    <input
                      type="number"
                      min="0"
                      value={quotedPrice}
                      onChange={(e) => setQuotedPrice(parseInt(e.target.value, 10) || 0)}
                      className="w-full h-10 px-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Final Settled Price</label>
                    <input
                      type="number"
                      min="0"
                      value={finalPrice}
                      onChange={(e) => setFinalPrice(parseInt(e.target.value, 10) || 0)}
                      className="w-full h-10 px-3.5 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full h-10 px-3 rounded-[12px] bg-black/40 border border-white/10 text-white outline-none focus:border-[#ff4f31]"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partially_paid">Partially Paid</option>
                      <option value="paid">Fully Paid</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-10 px-5 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-6 rounded-full bg-[#ff4f31] hover:bg-[#e03d21] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save All Changes</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
