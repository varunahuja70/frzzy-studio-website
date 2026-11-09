import type { PermissionKey, ResolvedPermissions } from '@/lib/auth/permissions-constants';

/**
 * Who may reach a work item. Every route under /api/admin/work-items/[id] goes through these, so
 * a logged-in team member can't open someone else's item by guessing its ID.
 */
type AccessItem = { createdBy: string | null; assignedTo: string | null; isPersonal: boolean | null };
type Viewer = Pick<ResolvedPermissions, 'adminId' | 'isSuperAdmin' | 'permissions'>;

/** Personal items belong to their creator (and Super Admins) only. */
export function isHiddenPersonalItem(item: AccessItem, viewer: Viewer): boolean {
  return Boolean(item.isPersonal) && item.createdBy !== viewer.adminId && !viewer.isSuperAdmin;
}

export function canViewWorkItem(item: AccessItem, viewer: Viewer): boolean {
  if (isHiddenPersonalItem(item, viewer)) return false;
  return (
    viewer.isSuperAdmin ||
    item.createdBy === viewer.adminId ||
    item.assignedTo === viewer.adminId ||
    viewer.permissions.has('work_items:view_all')
  );
}

/** May change the item's working parts, such as its checklist. */
export function canWorkOnWorkItem(item: AccessItem, viewer: Viewer): boolean {
  if (!canViewWorkItem(item, viewer)) return false;
  return (
    viewer.isSuperAdmin ||
    item.createdBy === viewer.adminId ||
    item.assignedTo === viewer.adminId ||
    viewer.permissions.has('work_items:edit') ||
    viewer.permissions.has('work_items:update_progress')
  );
}

const ITEM_UPDATE_PERMISSIONS: PermissionKey[] = [
  'work_items:edit',
  'work_items:assign',
  'work_items:reassign',
  'work_items:change_status',
  'work_items:update_progress',
];

/** May send an update at all (which fields apply is then decided field by field). */
export function canUpdateWorkItem(item: AccessItem, viewer: Viewer): boolean {
  if (isHiddenPersonalItem(item, viewer)) return false;
  return canViewWorkItem(item, viewer) || ITEM_UPDATE_PERMISSIONS.some((p) => viewer.permissions.has(p));
}

/** Attachment row for the browser: the server's file path stays on the server. */
export function withoutStoragePath<T extends { storagePath: string }>(attachment: T): Omit<T, 'storagePath'> {
  const { storagePath, ...rest } = attachment;
  void storagePath;
  return rest;
}
