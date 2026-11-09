'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
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
  Pencil,
  FileText,
  Mail,
  Phone,
  Building,
  Plus,
  Send,
  Check,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { getCachedData, setCachedData } from '@/lib/client-cache';
import { EditWorkItemModal } from '@/components/admin/edit-work-item-modal';

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
  links?: Array<{ id?: string; label: string; url: string }> | null;
  createdAt: number;
  updatedAt: number;
  version: number;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface CommentItem {
  id: string;
  adminName: string;
  adminRole: string;
  content: string;
  createdAt: number;
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

  // Current User Session
  const [currentUser, setCurrentUser] = useState<{ isSuperAdmin: boolean; permissions: string[] } | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Rich Task Details state
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailedTask, setDetailedTask] = useState<TaskItem | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [canEditItem, setCanEditItem] = useState(false);

  // New subtask / comment inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [subtaskSubmitting, setSubtaskSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Fetch current user permissions
  useEffect(() => {
    fetch('/api/admin/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setCurrentUser({
            isSuperAdmin: Boolean(data.isSuperAdmin),
            permissions: data.permissions || [],
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch full task details whenever a task is selected
  useEffect(() => {
    let isMounted = true;
    if (!selectedTask) {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        setDetailedTask(null);
        setSubtasks([]);
        setAttachments([]);
        setComments([]);
      }, 0);
      return () => { isMounted = false; clearTimeout(timer); };
    }

    const loadDetails = async () => {
      try {
        setDetailLoading(true);
        const res = await fetch(`/api/admin/work-items/${selectedTask.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.workItem) {
              setDetailedTask(data.workItem);
            }
            setSubtasks(data.subtasks || []);
            setAttachments(data.attachments || []);
            setComments(data.comments || []);
            setCanEditItem(Boolean(data.canEdit || data.isSuperAdmin));
          }
        }
      } catch {
        // Fallback to selectedTask
      } finally {
        if (isMounted) setDetailLoading(false);
      }
    };

    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedTask]);

  useEffect(() => {
    if (!selectedTask && !editModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editModalOpen) {
        setSelectedTask(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTask, editModalOpen]);

  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent && !cached) setLoading(true);
      const res = await fetch('/api/admin/work-items?scope=assigned_to_me');
      if (res.ok) {
        const data = await res.json();
        const items = data.workItems || [];
        setTasks(items);
        setCachedData('tasks_assigned_to_me', items);

        // Update selected task reference if open
        if (selectedTask) {
          const updated = items.find((t: TaskItem) => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [cached, selectedTask]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTasks(Boolean(cached));
    }, 0);
    return () => clearTimeout(timer);
  }, [cached, fetchTasks]);

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
          setDetailedTask((prev) =>
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
          setDetailedTask((prev) => (prev ? { ...prev, progressPercent: newProgress } : null));
        }
      }
    } catch {
      // Ignored
    }
  };

  // Toggle Subtask
  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    if (!selectedTask) return;
    try {
      const nextCompleted = !currentCompleted;
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, completed: nextCompleted } : s))
      );

      const res = await fetch(`/api/admin/work-items/${selectedTask.id}/subtasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, completed: nextCompleted }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.progressPercent !== undefined && data.progressPercent !== null) {
          handleProgressChange(selectedTask.id, data.progressPercent);
        }
        if (data.subtasks) setSubtasks(data.subtasks);
      }
    } catch {
      // Revert on error
    }
  };

  // Add Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTask) return;

    try {
      setSubtaskSubmitting(true);
      const res = await fetch(`/api/admin/work-items/${selectedTask.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.subtask) {
          setSubtasks((prev) => [...prev, data.subtask]);
        }
        setNewSubtaskTitle('');
      }
    } catch {
      // Ignored
    } finally {
      setSubtaskSubmitting(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    try {
      setCommentSubmitting(true);
      const res = await fetch(`/api/admin/work-items/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments((prev) => [...prev, data.comment]);
        }
        setCommentText('');
      }
    } catch {
      // Ignored
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Callback when Super Admin edits work item
  const handleWorkItemUpdated = (updatedItem: any) => {
    setSelectedTask(updatedItem);
    setDetailedTask(updatedItem);
    setTasks((prev) => prev.map((t) => (t.id === updatedItem.id ? { ...t, ...updatedItem } : t)));
    fetchTasks(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.itemNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeTask = detailedTask || selectedTask;
  const isSuperAdminOrEditor =
    canEditItem ||
    currentUser?.isSuperAdmin ||
    currentUser?.permissions.includes('work_items:edit');

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
            Personal production queue, active briefs, and shared client deliverables.
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
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        task.priority === 'urgent'
                          ? 'bg-rose-500/15 text-rose-500'
                          : task.priority === 'high'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-white/5 text-[#a09d93]'
                      }`}
                    >
                      {task.priority}
                    </span>
                  )}
                  {task.category && (
                    <span className="text-[10px] font-medium text-[#5a6265] dark:text-[#a09d93] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                      {task.category}
                    </span>
                  )}
                </div>
                <h3 className="text-[15px] font-semibold text-[#12110b] dark:text-[#f4efea]">{task.title}</h3>
                <div className="flex items-center gap-3 text-xs text-[#5a6265] dark:text-[#a09d93]">
                  <span>
                    Assigned by: <strong>{task.assignedByName || 'Studio'}</strong> ({task.assignedByRole || 'Admin'})
                  </span>
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#ff4f31]" />
                      <span>Due: <strong>{new Date(task.dueDate).toLocaleDateString()}</strong></span>
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
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold text-[#ff4f31]">{task.itemNumber}</span>
                        {task.priority && (
                          <span className="text-[9px] font-bold uppercase text-[#a09d93]">{task.priority}</span>
                        )}
                      </div>
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
        {selectedTask && activeTask && (
          <div
            onClick={() => setSelectedTask(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl my-auto max-h-[92vh] overflow-y-auto rounded-[28px] bg-[#14130e] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-[#f4efea]"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#ff4f31]">{activeTask.itemNumber}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ff4f31]/15 text-[#ff4f31] uppercase">
                      {activeTask.status.replace('_', ' ')}
                    </span>
                    {activeTask.priority && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          activeTask.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : activeTask.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-white/5 text-[#a09d93] border border-white/10'
                        }`}
                      >
                        {activeTask.priority}
                      </span>
                    )}
                    {activeTask.category && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-[#f4efea]">
                        {activeTask.category}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold tracking-tight text-white mt-1">{activeTask.title}</h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#a09d93]">
                    <span>
                      Assigned by: <strong className="text-white">{activeTask.assignedByName || 'Studio'}</strong> (
                      {activeTask.assignedByRole || 'Admin'})
                    </span>
                    {activeTask.dueDate && (
                      <span className="flex items-center gap-1.5 text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded-md">
                        <Calendar className="h-3 w-3" />
                        <span>Deadline: {new Date(activeTask.dueDate).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Super Admin / Manager Edit Button */}
                  {isSuperAdminOrEditor && (
                    <button
                      type="button"
                      onClick={() => setEditModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-full bg-[#ff4f31]/15 hover:bg-[#ff4f31] text-[#ff4f31] hover:text-white border border-[#ff4f31]/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Edit all fields as Super Admin"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit Task</span>
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label="Close task details"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedTask(null);
                    }}
                    className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-colors cursor-pointer z-30"
                  >
                    <X className="h-4 w-4 pointer-events-none" />
                  </button>
                </div>
              </div>

              {/* Status Actions & Progress Controls */}
              <div className="p-4 rounded-[18px] bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#a09d93]">Action:</span>
                  {activeTask.status === 'assigned' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange(activeTask.id, 'accepted')}
                      className="px-3.5 py-1.5 rounded-full bg-blue-500/15 text-blue-400 hover:bg-blue-500 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      Accept Task
                    </button>
                  )}
                  {activeTask.status === 'accepted' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange(activeTask.id, 'in_progress')}
                      className="px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      Start Work
                    </button>
                  )}
                  {activeTask.status === 'in_progress' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange(activeTask.id, 'in_review')}
                      className="px-3.5 py-1.5 rounded-full bg-purple-500/15 text-purple-400 hover:bg-purple-500 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      Submit for Review
                    </button>
                  )}
                  {activeTask.status === 'in_review' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange(activeTask.id, 'completed', 100)}
                      className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-all cursor-pointer"
                    >
                      Mark Completed (100%)
                    </button>
                  )}
                </div>

                {/* Progress bar slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#a09d93]">Progress:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeTask.progressPercent}
                    onChange={(e) => handleProgressChange(activeTask.id, parseInt(e.target.value, 10))}
                    className="w-28 accent-[#ff4f31] cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold w-10 text-white">{activeTask.progressPercent}%</span>
                </div>
              </div>

              {/* PROJECT SCOPE / BRIEF (Crucial: Rendered when description was ticked!) */}
              {activeTask.description ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#a09d93]">
                    <FileText className="h-4 w-4 text-[#ff4f31]" />
                    <span>Project Brief & Requirements</span>
                  </div>
                  <div className="p-4 rounded-[16px] bg-black/30 border border-white/[0.08] text-xs text-[#f4efea] leading-relaxed whitespace-pre-wrap font-sans">
                    {activeTask.description}
                  </div>
                </div>
              ) : null}

              {/* ASSIGNMENT INSTRUCTIONS */}
              {activeTask.assignmentInstructions ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#a09d93]">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>Special Instructions from Assigner</span>
                  </div>
                  <div className="p-4 rounded-[16px] bg-amber-400/[0.04] border border-amber-400/20 text-xs text-amber-100 leading-relaxed whitespace-pre-wrap">
                    {activeTask.assignmentInstructions}
                  </div>
                </div>
              ) : null}

              {/* SHARED CLIENT CONTEXT (If ticked / shared or Super Admin) */}
              {(activeTask.clientName || activeTask.clientCompany || activeTask.clientEmail || activeTask.clientPhone) && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#a09d93]">
                    <Shield className="h-4 w-4 text-[#ff4f31]" />
                    <span>Shared Client Information</span>
                  </div>
                  <div className="p-4 rounded-[16px] bg-white/[0.02] border border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {activeTask.clientName && (
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center font-bold text-xs shrink-0">
                          {activeTask.clientName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[10px] text-[#a09d93] block">Client Name</span>
                          <strong className="text-white">{activeTask.clientName}</strong>
                        </div>
                      </div>
                    )}

                    {activeTask.clientCompany && (
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-white/5 text-[#a09d93] flex items-center justify-center shrink-0">
                          <Building className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-[#a09d93] block">Company / Brand</span>
                          <strong className="text-white">{activeTask.clientCompany}</strong>
                        </div>
                      </div>
                    )}

                    {activeTask.clientEmail && (
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/20 border border-white/[0.04]">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-3.5 w-3.5 text-[#a09d93] shrink-0" />
                          <a
                            href={`mailto:${activeTask.clientEmail}`}
                            className="text-white hover:text-[#ff4f31] transition-colors truncate"
                          >
                            {activeTask.clientEmail}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeTask.clientEmail!)}
                          className="h-6 w-6 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#a09d93] hover:text-white transition-colors cursor-pointer shrink-0"
                          title="Copy Email"
                        >
                          {copiedLink === activeTask.clientEmail ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {activeTask.clientPhone && (
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/20 border border-white/[0.04]">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="h-3.5 w-3.5 text-[#a09d93] shrink-0" />
                          <a
                            href={`tel:${activeTask.clientPhone}`}
                            className="text-white hover:text-[#ff4f31] transition-colors truncate"
                          >
                            {activeTask.clientPhone}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeTask.clientPhone!)}
                          className="h-6 w-6 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#a09d93] hover:text-white transition-colors cursor-pointer shrink-0"
                          title="Copy Phone"
                        >
                          {copiedLink === activeTask.clientPhone ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CHECKLIST & SUBTASKS (Interactive Checklist!) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#a09d93]">
                    <CheckSquare className="h-4 w-4 text-[#ff4f31]" />
                    <span>Checklist & Subtasks</span>
                    {subtasks.length > 0 && (
                      <span className="text-[10px] text-[#ff4f31] bg-[#ff4f31]/10 px-2 py-0.5 rounded-full font-mono">
                        {subtasks.filter((s) => s.completed).length} / {subtasks.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-[16px] bg-white/[0.02] border border-white/[0.06] flex flex-col gap-3">
                  {subtasks.length === 0 ? (
                    <p className="text-xs text-[#a09d93] italic">No checklist items created yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {subtasks.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => handleToggleSubtask(st.id, st.completed)}
                          className={`flex items-center gap-3 p-2.5 rounded-[12px] border transition-all cursor-pointer ${
                            st.completed
                              ? 'bg-emerald-500/[0.06] border-emerald-500/20 text-[#a09d93] line-through'
                              : 'bg-black/30 border-white/[0.06] text-white hover:border-[#ff4f31]/30'
                          }`}
                        >
                          <div
                            className={`h-4 w-4 rounded-[6px] border flex items-center justify-center transition-colors shrink-0 ${
                              st.completed
                                ? 'bg-emerald-500 border-emerald-500 text-black'
                                : 'border-white/20 bg-white/5'
                            }`}
                          >
                            {st.completed && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-medium flex-1">{st.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Subtask Input */}
                  <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                    <input
                      type="text"
                      placeholder="Add a checklist item (e.g. Color grade sequence, Export rough cut)..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-[10px] bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-[#ff4f31]"
                    />
                    <button
                      type="submit"
                      disabled={subtaskSubmitting || !newSubtaskTitle.trim()}
                      className="h-9 px-3.5 rounded-[10px] bg-white/5 hover:bg-[#ff4f31] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* RESOURCE LINKS */}
              {activeTask.links && activeTask.links.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#a09d93]">
                    <Paperclip className="h-4 w-4 text-[#ff4f31]" />
                    <span>Project Assets & Cloud Storage Links</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeTask.links.map((link, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-[12px] bg-black/30 border border-white/[0.08] text-xs font-medium"
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#ff4f31] text-white transition-colors flex items-center gap-1.5"
                        >
                          <span>{link.label || 'Project Link'}</span>
                          <ExternalLink className="h-3 w-3 text-[#a09d93]" />
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(link.url)}
                          className="h-6 w-6 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#a09d93] hover:text-white transition-colors cursor-pointer"
                          title="Copy Link URL"
                        >
                          {copiedLink === link.url ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PROJECT TAGS */}
              {activeTask.tags && activeTask.tags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#a09d93]">
                    <Layers className="h-4 w-4 text-[#ff4f31]" />
                    <span>Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeTask.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-[#a09d93] font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* DISCUSSION / NOTES BOX */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#a09d93]">
                  <MessageSquare className="h-4 w-4 text-[#ff4f31]" />
                  <span>Internal Discussion & Production Notes</span>
                </div>

                <div className="p-4 rounded-[16px] bg-white/[0.02] border border-white/[0.06] flex flex-col gap-3">
                  {comments.length === 0 ? (
                    <p className="text-xs text-[#a09d93] italic">No discussion notes yet. Send a quick update below.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {comments.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-[12px] bg-black/30 border border-white/[0.04] text-xs">
                          <div className="flex items-center justify-between text-[10px] text-[#a09d93] mb-1">
                            <span className="font-bold text-white">
                              {c.adminName} ({c.adminRole})
                            </span>
                            <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[#f4efea] leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                    <input
                      type="text"
                      placeholder="Write an internal update or question..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-[10px] bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-[#ff4f31]"
                    />
                    <button
                      type="submit"
                      disabled={commentSubmitting || !commentText.trim()}
                      className="h-9 px-4 rounded-[10px] bg-[#ff4f31] hover:bg-[#e03d21] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Send className="h-3 w-3" />
                      <span>Post</span>
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Super Admin Edit Work Item Modal */}
      {selectedTask && (
        <EditWorkItemModal
          workItemId={selectedTask.id}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onUpdated={handleWorkItemUpdated}
        />
      )}
    </div>
  );
}
