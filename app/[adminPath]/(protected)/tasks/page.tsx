'use client';

import React, { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Filter,
  Search,
  ChevronRight,
  Calendar,
  Kanban,
  ListFilter,
  CheckCircle2,
  Paperclip,
  MessageSquare,
  ArrowUpRight,
  User,
  Shield,
  Layers,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { getCachedData, setCachedData } from '@/lib/client-cache';

interface TaskItem {
  id: string;
  itemNumber: string;
  title: string;
  description?: string;
  status: string;
  progressPercent: number;
  priority?: string;
  dueDate?: number | null;
  category?: string;
  source?: string;
  clientName?: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientCompany?: string | null;
  assignedByName?: string | null;
  assignedByRole?: string | null;
  assignedAt?: number | null;
  assignmentInstructions?: string | null;
  tags?: string[] | null;
  links?: Array<{ id: string; label: string; url: string }> | null;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export default function MyTasksPage(props: { params: Promise<{ adminPath: string }> }) {
  const { adminPath } = use(props.params);

  const cached = typeof window !== 'undefined' ? getCachedData<TaskItem[]>('tasks_assigned_to_me') : null;
  const [tasks, setTasks] = useState<TaskItem[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState(false);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    if (!selectedTask) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTask(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTask]);

  const fetchTasks = async (silent = false) => {
    try {
      if (!silent && !cached) setLoading(true);
      const res = await fetch('/api/admin/work-items?scope=assigned_to_me');
      if (res.ok) {
        const data = await res.json();
        const items = data.workItems || [];
        setTasks(items);
        setCachedData('tasks_assigned_to_me', items);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(Boolean(cached));
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: string, forcedProgress?: number) => {
    try {
      setUpdating(true);
      const current = tasks.find((t) => t.id === taskId);
      const res = await fetch(`/api/admin/work-items/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          progressPercent: forcedProgress !== undefined ? forcedProgress : undefined,
          version: current?.version,
        }),
      });

      if (res.ok) {
        await fetchTasks();
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask((prev) =>
            prev ? { ...prev, status: newStatus, progressPercent: forcedProgress ?? prev.progressPercent } : null
          );
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleProgressChange = async (taskId: string, newProgress: number) => {
    try {
      const current = tasks.find((t) => t.id === taskId);
      const res = await fetch(`/api/admin/work-items/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progressPercent: newProgress,
          version: current?.version,
        }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, progressPercent: newProgress, version: t.version + 1 } : t))
        );
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask((prev) => (prev ? { ...prev, progressPercent: newProgress } : null));
        }
      }
    } catch {
      // Ignored
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.itemNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto w-full flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-[#12110b] dark:text-[#f4efea] flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-[#ff4f31]" />
            My Assigned Tasks
          </h1>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1">
            Personal production queue and assigned briefs with zero financial leakage.
          </p>
        </div>

        {/* View Switcher: List vs Kanban */}
        <div className="flex items-center gap-2 bg-black/[0.04] dark:bg-white/[0.05] p-1 rounded-full border border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-[#12110b] text-white dark:bg-[#f4efea] dark:text-[#12110b] shadow-xs'
                : 'text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-white'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-[#12110b] text-white dark:bg-[#f4efea] dark:text-[#12110b] shadow-xs'
                : 'text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-white'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6265] dark:text-[#a09d93]" />
          <input
            type="text"
            placeholder="Search my tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-[12px] bg-white dark:bg-[#181712] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'assigned', 'in_progress', 'in_review', 'completed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize shrink-0 transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#12110b] text-white dark:bg-[#f4efea] dark:text-[#12110b]'
                  : 'bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] text-[#5a6265] dark:text-[#a09d93]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] animate-pulse"
            />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 rounded-[24px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] text-center flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">All Caught Up!</h3>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1 max-w-sm">
            You have no active work items pending in this filter view.
          </p>
        </div>
      ) : activeTab === 'list' ? (
        /* List View */
        <div className="flex flex-col gap-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="p-4 sm:p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] hover:border-[#ff4f31]/40 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#ff4f31]">{task.itemNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      task.status === 'completed' || task.status === 'delivered'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : task.status === 'in_progress'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-black/5 dark:bg-white/10 text-[#5a6265] dark:text-[#a09d93]'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                  {task.priority && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                      [{task.priority}]
                    </span>
                  )}
                </div>
                <h3 className="text-[15px] font-semibold text-[#12110b] dark:text-[#f4efea]">{task.title}</h3>
                <div className="flex items-center gap-3 text-xs text-[#5a6265] dark:text-[#a09d93]">
                  <span>
                    Assigned by: <strong>{task.assignedByName || 'Studio'}</strong> ({task.assignedByRole || 'Admin'})
                  </span>
                  {task.dueDate && (
                    <span>
                      Due: <strong>{new Date(task.dueDate).toLocaleDateString()}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Slider */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex flex-col items-end gap-1 w-36">
                  <span className="text-xs font-semibold">{task.progressPercent}% Completed</span>
                  <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div
                      style={{ width: `${task.progressPercent}%` }}
                      className="h-full bg-gradient-to-r from-[#ff4f31] to-emerald-500 transition-all duration-300"
                    />
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#5a6265] dark:text-[#a09d93]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {['assigned', 'in_progress', 'in_review', 'completed'].map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col);
            return (
              <div
                key={col}
                className="p-4 rounded-[20px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex flex-col gap-3 min-h-[300px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-xs font-bold capitalize text-[#12110b] dark:text-[#f4efea]">
                    {col.replace('_', ' ')}
                  </span>
                  <span className="h-5 px-2 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-bold flex items-center justify-center">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-3.5 rounded-[14px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] shadow-xs hover:border-[#ff4f31] transition-all cursor-pointer flex flex-col gap-2"
                    >
                      <span className="font-mono text-[10px] font-semibold text-[#ff4f31]">{task.itemNumber}</span>
                      <h4 className="text-xs font-semibold leading-tight">{task.title}</h4>
                      <div className="flex items-center justify-between text-[11px] text-[#5a6265] dark:text-[#a09d93] pt-1">
                        <span>{task.progressPercent}%</span>
                        {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div
            onClick={() => setSelectedTask(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-[#181712] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col gap-5 text-[#f4efea]"
            >
              <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#ff4f31]">{selectedTask.itemNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff4f31]/10 text-[#ff4f31] uppercase">
                      {selectedTask.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-white">{selectedTask.title}</h2>
                  <p className="text-xs text-[#a09d93]">
                    Assigned by: <strong className="text-white">{selectedTask.assignedByName || 'Studio'}</strong> ({selectedTask.assignedByRole || 'Admin'})
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close task details"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedTask(null);
                  }}
                  className="h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
                >
                  <X className="h-4 w-4 pointer-events-none" />
                </button>
              </div>

              {/* Status Actions */}
              <div className="p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Change Status:</span>
                  {selectedTask.status === 'assigned' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange(selectedTask.id, 'accepted')}
                      className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold hover:bg-blue-500/20 cursor-pointer"
                    >
                      Accept Task
                    </button>
                  )}
                  {selectedTask.status === 'accepted' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange(selectedTask.id, 'in_progress')}
                      className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold hover:bg-amber-500/20 cursor-pointer"
                    >
                      Start Work
                    </button>
                  )}
                  {selectedTask.status === 'in_progress' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange(selectedTask.id, 'in_review')}
                      className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-xs font-semibold hover:bg-purple-500/20 cursor-pointer"
                    >
                      Submit for Review
                    </button>
                  )}
                  {selectedTask.status === 'in_review' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange(selectedTask.id, 'completed', 100)}
                      className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 cursor-pointer"
                    >
                      Mark Completed (100%)
                    </button>
                  )}
                </div>

                {/* Progress bar slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold">Progress:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedTask.progressPercent}
                    onChange={(e) => handleProgressChange(selectedTask.id, parseInt(e.target.value, 10))}
                    className="w-24 accent-[#ff4f31]"
                  />
                  <span className="text-xs font-mono font-bold w-8">{selectedTask.progressPercent}%</span>
                </div>
              </div>

              {/* Instructions */}
              {selectedTask.assignmentInstructions && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#5a6265] dark:text-[#a09d93]">ASSIGNMENT BRIEF</span>
                  <div className="p-3.5 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] text-xs leading-relaxed">
                    {selectedTask.assignmentInstructions}
                  </div>
                </div>
              )}

              {/* Shared Client Details (Only if shared) */}
              {(selectedTask.clientName || selectedTask.clientEmail || selectedTask.clientPhone) && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-[#5a6265] dark:text-[#a09d93]">SHARED CLIENT CONTEXT</span>
                  <div className="p-3.5 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] grid grid-cols-2 gap-2 text-xs">
                    {selectedTask.clientName && <div>Client: <strong>{selectedTask.clientName}</strong></div>}
                    {selectedTask.clientCompany && <div>Company: <strong>{selectedTask.clientCompany}</strong></div>}
                    {selectedTask.clientEmail && <div>Email: <strong>{selectedTask.clientEmail}</strong></div>}
                    {selectedTask.clientPhone && <div>Phone: <strong>{selectedTask.clientPhone}</strong></div>}
                  </div>
                </div>
              )}

              {/* Shared Links */}
              {selectedTask.links && selectedTask.links.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-[#5a6265] dark:text-[#a09d93]">RESOURCE LINKS</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-black/5 dark:bg-white/10 text-xs font-medium hover:text-[#ff4f31] transition-colors"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span>{link.label || 'Drive Link'}</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
