'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  UserCheck,
  Calendar,
  AlertTriangle,
  Check,
  Shield,
  FileText,
  Sliders,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { SHAREABLE_FIELDS, DEFAULT_SHARE_TEMPLATES } from '@/lib/auth/permissions-constants';
import { dispatchAssignedTaskNotification } from '@/lib/client-notifications';

interface AssigneeCandidate {
  id: string;
  name: string;
  email: string;
  role: string;
  activeCount: number;
  totalAssigned: number;
  completedCount: number;
  onTimePercent: number;
}

interface AssignWorkModalProps {
  workItemId: string;
  itemTitle: string;
  itemNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignWorkModal({
  workItemId,
  itemTitle,
  itemNumber,
  isOpen,
  onClose,
  onAssigned,
}: AssignWorkModalProps) {
  const [candidates, setCandidates] = useState<AssigneeCandidate[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [dueDate, setDueDate] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/team/performance');
        if (res.ok) {
          const data = await res.json();
          setCandidates(data.performance || []);
          if (data.performance?.length > 0) {
            setSelectedAssignee(data.performance[0].id);
          }
        }
      } catch {
        // Ignored
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [isOpen]);

  if (!isOpen) return null;

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

  const selectAll = () => {
    setSelectedFields(new Set(SHAREABLE_FIELDS.map((f) => f.id)));
  };

  const selectNone = () => {
    setSelectedFields(new Set());
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignee) {
      setError('Please select an assignee.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/admin/work-items/${workItemId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: selectedAssignee,
          priority,
          dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
          instructions,
          sharedFields: Array.from(selectedFields),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Assignment failed');
      }

      // Dispatch real-time targeted notification to the assigned person
      dispatchAssignedTaskNotification({
        targetAdminId: selectedAssignee,
        targetEmail: selectedCandidate?.email,
        taskTitle: itemTitle || 'Creative Deliverable',
        itemNumber: itemNumber || 'Task',
        assignerName: 'Creative Director',
        priority,
        resourceId: workItemId,
      });

      onAssigned();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCandidate = candidates.find((c) => c.id === selectedAssignee);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[28px] bg-[#181712] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-[#f4efea]"
      >
        <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#ff4f31]">{itemNumber}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff4f31]/10 text-[#ff4f31] uppercase">
                Assign Work
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight mt-1 text-white">{itemTitle}</h2>
          </div>
          <button
            type="button"
            aria-label="Close modal"
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

        {error && (
          <div className="p-3.5 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAssignSubmit} className="flex flex-col gap-5">
          {/* Candidate Picker & Workload Card */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#12110b] dark:text-[#f4efea]">
              Select Assignee (Specialist / Team Member)
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full h-11 px-4 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium outline-none focus:border-[#ff4f31]"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.role.toUpperCase()} ({c.activeCount} active tasks, {c.onTimePercent}% on-time)
                </option>
              ))}
            </select>

            {selectedCandidate && (
              <div className="p-3.5 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="block text-[10px] text-[#5a6265] dark:text-[#a09d93]">Current Tasks</span>
                  <strong className="text-sm font-semibold text-[#ff4f31]">{selectedCandidate.activeCount}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-[#5a6265] dark:text-[#a09d93]">Completed</span>
                  <strong className="text-sm font-semibold">{selectedCandidate.completedCount}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-[#5a6265] dark:text-[#a09d93]">On-Time Rate</span>
                  <strong className="text-sm font-semibold text-emerald-500">{selectedCandidate.onTimePercent}%</strong>
                </div>
              </div>
            )}
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high' | 'urgent')}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">Assignment Instructions & Brief</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Provide clear scope and production requirements for the specialist..."
              className="w-full p-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31] resize-none leading-relaxed"
            />
          </div>

          {/* Share Fields Checklist (Zero-Trust Projection) */}
          <div className="p-4 rounded-[18px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-[#ff4f31]" />
                <span className="text-xs font-bold">Share Fields Checklist (Zero Financial Leakage)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] text-[#ff4f31] font-semibold hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-black/20 dark:text-white/20">|</span>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-[11px] text-[#5a6265] dark:text-[#a09d93] hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93] mr-1">Presets:</span>
              {DEFAULT_SHARE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => applyTemplate(tpl.fields)}
                  className="px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-[#ff4f31] hover:text-white text-[10px] font-medium transition-colors cursor-pointer"
                >
                  {tpl.name}
                </button>
              ))}
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
              {SHAREABLE_FIELDS.map((f) => {
                const isTicked = selectedFields.has(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleField(f.id)}
                    className={`flex items-center gap-2 p-2 rounded-[10px] text-xs font-medium transition-all text-left cursor-pointer border ${
                      isTicked
                        ? 'bg-[#12110b] text-white dark:bg-[#f4efea] dark:text-[#12110b] border-[#12110b] dark:border-[#f4efea]'
                        : 'bg-white dark:bg-[#181712] text-[#5a6265] dark:text-[#a09d93] border-black/[0.06] dark:border-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded flex items-center justify-center shrink-0 border ${
                        isTicked
                          ? 'bg-[#ff4f31] border-[#ff4f31] text-white'
                          : 'border-black/20 dark:border-white/20'
                      }`}
                    >
                      {isTicked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </span>
                    <span className="truncate">{f.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] flex items-center gap-1.5 pt-1">
              <Info className="h-3.5 w-3.5 text-[#ff4f31] shrink-0" />
              <span>
                Default is <strong>share nothing</strong>. Financial data (quotes, final prices) is strictly locked and cannot be shared.
              </span>
            </p>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedAssignee}
              className="flex-1 h-11 rounded-full bg-[#ff4f31] text-white hover:bg-[#e03d21] text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="h-4 w-4" />
              <span>{submitting ? 'Assigning...' : 'Assign Work Item'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
