'use client';

export interface VaultNotification {
  id: string;
  recipientId?: string;
  recipientEmail?: string;
  actorId?: string | null;
  actorName?: string | null;
  type: 'assignment' | 'status_change' | 'progress_update' | 'delivered' | 'mention' | 'due_soon' | 'overdue' | 'system';
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string | null;
  isRead: boolean;
  createdAt: number;
}

const STORAGE_PREFIX = 'vault_notifs_v2_';
export const NOTIF_EVENT_NAME = 'vault:notification:update';

/**
 * Derives a clean cache key per logged-in user so notifications don't leak between accounts
 */
export function getNotifStorageKey(userEmailOrId?: string): string {
  const clean = (userEmailOrId || 'default').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
  return `${STORAGE_PREFIX}${clean}`;
}

/**
 * Get notifications stored in localStorage for the specific user
 */
export function getLocalNotifications(userEmailOrId?: string): VaultNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getNotifStorageKey(userEmailOrId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.createdAt - a.createdAt);
    }
  } catch (err) {
    console.warn('Failed to parse local notifications:', err);
  }
  return [];
}

/**
 * Save notifications list to localStorage and broadcast change event
 */
export function saveLocalNotifications(userEmailOrId: string | undefined, list: VaultNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getNotifStorageKey(userEmailOrId);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(NOTIF_EVENT_NAME, { detail: { userEmailOrId, list } }));
  } catch (err) {
    console.warn('Failed to save local notifications:', err);
  }
}

/**
 * Merge local notifications with server notifications (dedup by id, preserving latest read state)
 */
export function mergeNotifications(local: VaultNotification[], remote: VaultNotification[]): VaultNotification[] {
  const map = new Map<string, VaultNotification>();

  // Insert remote first
  for (const n of remote) {
    map.set(n.id, n);
  }

  // Overlay local notifications
  for (const l of local) {
    const existing = map.get(l.id);
    if (!existing) {
      // Local-only notification (e.g. freshly created or offline)
      map.set(l.id, l);
    } else {
      // If local marked as read, prefer local read state
      if (l.isRead && !existing.isRead) {
        map.set(l.id, { ...existing, isRead: true });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Fetch notifications from server and sync with localStorage
 */
export async function syncVaultNotifications(
  userEmailOrId?: string,
  options?: { viewAll?: boolean }
): Promise<{ notifications: VaultNotification[]; unreadCount: number }> {
  const local = getLocalNotifications(userEmailOrId);

  try {
    const query = options?.viewAll ? '?all=true' : '';
    const res = await fetch(`/api/admin/notifications${query}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      const remote = Array.isArray(data.notifications) ? data.notifications : [];
      const merged = mergeNotifications(local, remote);
      saveLocalNotifications(userEmailOrId, merged);
      const unreadCount = merged.filter((n) => !n.isRead).length;
      return { notifications: merged, unreadCount };
    }
  } catch (err) {
    console.warn('Network sync failed for notifications, using local store:', err);
  }

  const unreadCount = local.filter((n) => !n.isRead).length;
  return { notifications: local, unreadCount };
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(id: string, userEmailOrId?: string): Promise<void> {
  const current = getLocalNotifications(userEmailOrId);
  const updated = current.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  saveLocalNotifications(userEmailOrId, updated);

  try {
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch {
    // Non-fatal, local is already updated
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsRead(userEmailOrId?: string): Promise<void> {
  const current = getLocalNotifications(userEmailOrId);
  const updated = current.map((n) => ({ ...n, isRead: true }));
  saveLocalNotifications(userEmailOrId, updated);

  try {
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Clean / Clear all notifications completely
 */
export async function clearAllNotifications(userEmailOrId?: string): Promise<void> {
  saveLocalNotifications(userEmailOrId, []);

  try {
    await fetch('/api/admin/notifications?all=true', {
      method: 'DELETE',
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Delete a single notification
 */
export async function deleteNotification(id: string, userEmailOrId?: string): Promise<void> {
  const current = getLocalNotifications(userEmailOrId);
  const updated = current.filter((n) => n.id !== id);
  saveLocalNotifications(userEmailOrId, updated);

  try {
    await fetch(`/api/admin/notifications?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Add a local notification targeted to a specific assignee or user
 */
export function dispatchAssignedTaskNotification(payload: {
  targetAdminId: string;
  targetEmail?: string;
  taskTitle: string;
  itemNumber: string;
  assignerName: string;
  priority?: string;
  resourceId?: string;
}): void {
  const now = Date.now();
  const notif: VaultNotification = {
    id: `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipientId: payload.targetAdminId,
    recipientEmail: payload.targetEmail,
    actorName: payload.assignerName,
    type: 'assignment',
    title: `New Task Assigned: ${payload.itemNumber}`,
    message: `${payload.assignerName} assigned you "${payload.taskTitle}". Priority: ${(payload.priority || 'NORMAL').toUpperCase()}.`,
    resourceType: 'work_item',
    resourceId: payload.resourceId || null,
    isRead: false,
    createdAt: now,
  };

  // Save to target admin's storage key
  if (payload.targetEmail) {
    const targetList = getLocalNotifications(payload.targetEmail);
    saveLocalNotifications(payload.targetEmail, [notif, ...targetList]);
  }
  if (payload.targetAdminId) {
    const targetList = getLocalNotifications(payload.targetAdminId);
    saveLocalNotifications(payload.targetAdminId, [notif, ...targetList]);
  }

  // Also broadcast across open tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(NOTIF_EVENT_NAME, {
        detail: {
          notif,
          targetAdminId: payload.targetAdminId,
          targetEmail: payload.targetEmail,
        },
      })
    );
  }
}
