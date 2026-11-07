import type { PermissionKey } from '@/lib/auth/permissions-constants';

export type WorkItemStatus =
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'in_review'
  | 'completed'
  | 'delivered'
  | 'on_hold'
  | 'cancelled';

export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
  forcedProgressPercent?: number;
}

// Valid transitions dictionary
const ALLOWED_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  assigned: ['accepted', 'in_progress', 'on_hold', 'cancelled'],
  accepted: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['in_review', 'completed', 'on_hold', 'cancelled'],
  in_review: ['in_progress', 'completed', 'on_hold', 'cancelled'],
  completed: ['in_review', 'delivered', 'on_hold'],
  delivered: [], // Delivered records are locked by default
  on_hold: ['in_progress', 'assigned', 'cancelled'],
  cancelled: ['assigned', 'in_progress'],
};

/**
 * Validates a work item status transition based on RBAC permissions and assignee roles.
 */
export function validateStatusTransition(params: {
  fromStatus: WorkItemStatus;
  toStatus: WorkItemStatus;
  isAssignee: boolean;
  isSuperAdmin: boolean;
  permissions: Set<PermissionKey>;
  isDeliveredLocked?: boolean;
}): TransitionValidationResult {
  const { fromStatus, toStatus, isAssignee, isSuperAdmin, permissions, isDeliveredLocked } = params;

  if (fromStatus === toStatus) {
    return { allowed: true };
  }

  // Delivered records are immutable unless the user possesses explicit edit_delivered permission
  if (fromStatus === 'delivered') {
    if (!isSuperAdmin && !permissions.has('work_items:edit_delivered')) {
      return {
        allowed: false,
        reason: 'Delivered items are permanently locked. Requires "work_items:edit_delivered" permission to modify.',
      };
    }
  }

  // Transitioning TO delivered strictly requires work_items:deliver permission
  if (toStatus === 'delivered') {
    if (!isSuperAdmin && !permissions.has('work_items:deliver')) {
      return {
        allowed: false,
        reason: 'Marking as Delivered requires administrative "work_items:deliver" permission.',
      };
    }
  }

  // Assignee role limits: Assignees can only advance items up to 'completed', never 'delivered'
  if (isAssignee && !isSuperAdmin && !permissions.has('work_items:deliver')) {
    if (toStatus === 'delivered') {
      return {
        allowed: false,
        reason: 'Production specialists and assignees cannot deliver items directly.',
      };
    }
  }

  // Check state machine valid path
  const allowedNext = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (!isSuperAdmin && !allowedNext.includes(toStatus)) {
    // If user has edit_delivered, they can reopen from delivered to in_review/in_progress
    if (fromStatus === 'delivered' && permissions.has('work_items:edit_delivered')) {
      // Allowed override
    } else {
      return {
        allowed: false,
        reason: `Cannot transition status directly from "${fromStatus}" to "${toStatus}".`,
      };
    }
  }

  // If transitioning to completed, force progress to 100%
  let forcedProgressPercent: number | undefined;
  if (toStatus === 'completed' || toStatus === 'delivered') {
    forcedProgressPercent = 100;
  }

  return {
    allowed: true,
    forcedProgressPercent,
  };
}
