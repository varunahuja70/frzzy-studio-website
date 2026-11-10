'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  CheckSquare,
  Sparkles,
  Layers,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronRight,
  PlusCircle,
  Inbox,
  Filter,
} from 'lucide-react';
import {
  VaultNotification,
  getLocalNotifications,
  syncVaultNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
  deleteNotification,
  NOTIF_EVENT_NAME,
  dispatchAssignedTaskNotification,
} from '@/lib/client-notifications';

interface VaultNotificationsPopoverProps {
  adminPath: string;
  userEmail: string;
  adminId?: string;
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function VaultNotificationsPopover({
  adminPath,
  userEmail,
  adminId,
  isOpen,
  onClose,
  onUnreadChange,
}: VaultNotificationsPopoverProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<VaultNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'tasks'>('all');
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const userKey = adminId || userEmail || 'me';

  // Load and sync notifications
  const reloadNotifications = useCallback(async () => {
    // 1. Initial instant load from localStorage
    const local = getLocalNotifications(userKey);
    setNotifications(local);
    const unread = local.filter((n) => !n.isRead).length;
    onUnreadChange?.(unread);

    // 2. Background sync with database API
    try {
      const synced = await syncVaultNotifications(userKey);
      setNotifications(synced.notifications);
      onUnreadChange?.(synced.unreadCount);
    } catch {
      // Offline or network error: local list is kept
    }
  }, [userKey, onUnreadChange]);

  useEffect(() => {
    reloadNotifications();
  }, [reloadNotifications]);

  // Listen to cross-tab / local dispatch events
  useEffect(() => {
    const handleUpdate = () => {
      reloadNotifications();
    };

    window.addEventListener(NOTIF_EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(NOTIF_EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [reloadNotifications]);

  // Click outside listener for desktop
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clear notice after 3 seconds
  useEffect(() => {
    if (!actionNotice) return;
    const t = setTimeout(() => setActionNotice(null), 3000);
    return () => clearTimeout(t);
  }, [actionNotice]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(userKey);
    await reloadNotifications();
    setActionNotice('All marked as read');
  };

  const handleClearAll = async () => {
    await clearAllNotifications(userKey);
    await reloadNotifications();
    setActionNotice('Notifications cleared');
  };

  const handleItemClick = async (notif: VaultNotification) => {
    if (!notif.isRead) {
      await markNotificationRead(notif.id, userKey);
      await reloadNotifications();
    }
    onClose();

    if (notif.resourceType === 'work_item') {
      router.push(`/${adminPath}/tasks`);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id, userKey);
    await reloadNotifications();
  };

  // Test simulation helper: assigns a demo task alert directly to the logged in user
  const handleTriggerTestTaskNotification = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    dispatchAssignedTaskNotification({
      targetAdminId: adminId || userEmail,
      targetEmail: userEmail,
      taskTitle: `Luxury 3D Kinetic Visuals FX-${randomNum}`,
      itemNumber: `FX-2026-${randomNum}`,
      assignerName: 'Creative Director',
      priority: 'high',
      resourceId: `sample-${randomNum}`,
    });
    reloadNotifications();
    setActionNotice('New task assigned notification triggered!');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const taskCount = notifications.filter((n) => n.type === 'assignment').length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'tasks') return n.type === 'assignment';
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay (only on small screens for comfortable touch dismissal) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 sm:hidden"
          />

          {/* Main Popover Container: All devices responsive */}
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed top-16 left-3 right-3 sm:left-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[410px] max-w-[calc(100vw-24px)] rounded-[24px] bg-[#161510]/98 dark:bg-[#161510]/98 backdrop-blur-2xl border border-white/[0.1] shadow-[0_24px_64px_rgba(0,0,0,0.85)] z-50 flex flex-col overflow-hidden text-left"
          >
            {/* Header: Title + Badges + Action Buttons */}
            <div className="p-4 sm:p-4.5 border-b border-white/[0.08] flex items-center justify-between gap-2 select-none">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#26D67C]/15 text-[#26D67C] flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#26D67C] text-[#080808] shadow-xs">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#a09d93] leading-none mt-0.5 truncate max-w-[190px] sm:max-w-[220px]">
                    {userEmail || 'Assigned Specialist'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Mark all read + Clean / Clear All */}
              <div className="flex items-center gap-1.5 shrink-0">
                {notifications.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="h-8 px-2.5 rounded-lg text-[11px] font-semibold text-[#a09d93] hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5 text-[#26D67C]" />
                      <span className="hidden sm:inline">Read all</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="h-8 px-2.5 rounded-lg text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Clear all notifications"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clean</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="h-8 w-8 rounded-lg text-[#a09d93] hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs: All / Unread / Tasks */}
            <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between gap-2 text-xs">
              <div className="inline-flex items-center p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-[10px] text-[11px] font-semibold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#26D67C] text-[#080808] shadow-xs'
                      : 'text-[#a09d93] hover:text-white'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('unread')}
                  className={`px-3 py-1 rounded-[10px] text-[11px] font-semibold transition-all cursor-pointer ${
                    activeTab === 'unread'
                      ? 'bg-[#26D67C] text-[#080808] shadow-xs'
                      : 'text-[#a09d93] hover:text-white'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`px-3 py-1 rounded-[10px] text-[11px] font-semibold transition-all cursor-pointer ${
                    activeTab === 'tasks'
                      ? 'bg-[#26D67C] text-[#080808] shadow-xs'
                      : 'text-[#a09d93] hover:text-white'
                  }`}
                >
                  Tasks ({taskCount})
                </button>
              </div>

              {actionNotice && (
                <span className="text-[10.5px] font-medium text-[#26D67C] animate-pulse">
                  {actionNotice}
                </span>
              )}
            </div>

            {/* Notifications Scrollable Body */}
            <div className="p-3 max-h-[60vh] sm:max-h-[380px] overflow-y-auto space-y-2 select-none [scrollbar-width:thin]">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                  <div className="h-12 w-12 rounded-2xl bg-[#26D67C]/10 text-[#26D67C] flex items-center justify-center mb-3">
                    <Check className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">All caught up</h4>
                  <p className="text-xs text-[#a09d93] mt-1 max-w-[240px]">
                    {activeTab === 'tasks'
                      ? 'No pending task assignments right now.'
                      : activeTab === 'unread'
                      ? 'You have zero unread notifications.'
                      : 'No notifications. When a task is assigned to you, it will appear here.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerTestTaskNotification}
                    className="mt-4 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-[#26D67C]/20 text-[#26D67C] text-xs font-semibold border border-[#26D67C]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Simulate Task Assignment
                  </button>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isTask = item.type === 'assignment';
                  const isDelivered = item.type === 'delivered';
                  const isStatus = item.type === 'status_change';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`group relative p-3 sm:p-3.5 rounded-[18px] transition-all cursor-pointer border ${
                        !item.isRead
                          ? 'bg-gradient-to-r from-[#26D67C]/[0.08] via-white/[0.03] to-transparent border-[#26D67C]/25 shadow-xs'
                          : 'bg-white/[0.03] hover:bg-white/[0.05] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isTask
                              ? 'bg-[#26D67C]/15 text-[#26D67C]'
                              : isDelivered
                              ? 'bg-amber-400/15 text-amber-400'
                              : isStatus
                              ? 'bg-sky-400/15 text-sky-400'
                              : 'bg-purple-400/15 text-purple-400'
                          }`}
                        >
                          {isTask ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : isDelivered ? (
                            <Sparkles className="h-4 w-4" />
                          ) : isStatus ? (
                            <Layers className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                isTask
                                  ? 'bg-[#26D67C]/20 text-[#26D67C]'
                                  : isDelivered
                                  ? 'bg-amber-400/20 text-amber-400'
                                  : 'bg-white/10 text-[#a09d93]'
                              }`}
                            >
                              {isTask ? 'Task Assigned' : item.type.replace('_', ' ')}
                            </span>
                            {!item.isRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#26D67C] animate-pulse" />
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-white mt-1 leading-snug line-clamp-1">
                            {item.title}
                          </h4>

                          <p className="text-[11.5px] text-[#a09d93] mt-0.5 leading-relaxed line-clamp-2">
                            {item.message}
                          </p>

                          <div className="flex items-center gap-2 mt-2 text-[10px] text-[#a09d93]/70">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeAgo(item.createdAt)}</span>
                            {item.actorName && (
                              <>
                                <span>•</span>
                                <span className="text-[#a09d93]">By {item.actorName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Delete Single Item Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          title="Delete notification"
                          className="absolute top-3 right-3 h-7 w-7 rounded-lg text-[#a09d93]/50 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 pointer-events-none" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: Quick status & trigger simulated task alert */}
            <div className="p-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#a09d93] select-none">
              <span className="flex items-center gap-1.5 text-[10.5px]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#26D67C]" />
                Live Notification Stream
              </span>

              <button
                type="button"
                onClick={handleTriggerTestTaskNotification}
                className="text-[10.5px] font-semibold text-[#26D67C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="h-3 w-3" />
                <span>+ Assign Test Task</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
