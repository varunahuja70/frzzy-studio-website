import type { PermissionKey } from '@/lib/auth/permissions-constants';
import type { workItems } from '@/lib/db/schema';

type RawWorkItem = typeof workItems.$inferSelect;

export interface ProjectedWorkItem {
  id: string;
  itemNumber: string;
  title: string;
  status: string;
  progressPercent: number;
  priority?: string;
  dueDate?: number | null;
  category?: string;
  source?: string;
  description?: string;
  clientName?: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientCompany?: string | null;
  links?: Array<{ id: string; label: string; url: string; domain?: string }> | null;
  tags?: string[] | null;
  customFields?: Record<string, unknown> | null;
  assignedTo?: string | null;
  assignedBy?: string | null;
  assignedByName?: string | null;
  assignedByRole?: string | null;
  assignedAt?: number | null;
  assignmentInstructions?: string | null;
  sharedFields?: string[];
  createdAt: number;
  updatedAt: number;
  version: number;

  // Financial fields: Strictly isolated!
  quotedPrice?: number | null;
  finalPrice?: number | null;
  discount?: number | null;
  taxPercent?: number | null;
  currency?: string;
  paymentStatus?: string;
  amountReceived?: number | null;
  balanceDue?: number | null;
  paymentMethod?: string | null;
  deliveryNotes?: string | null;
  deliveredAt?: number | null;
  deliveredBy?: string | null;
  invoiceReference?: string | null;
  invoiceDetails?: Record<string, unknown> | null;
}

/**
 * Server-side projection engine.
 * Strips unticked fields for assignees and guarantees ZERO financial leakage.
 */
export function projectWorkItem(
  item: RawWorkItem,
  viewer: {
    adminId: string;
    isSuperAdmin: boolean;
    permissions: Set<PermissionKey>;
  }
): ProjectedWorkItem {
  const isOwnerOrCreator = item.createdBy === viewer.adminId || viewer.isSuperAdmin;
  const isAssignee = item.assignedTo === viewer.adminId && !isOwnerOrCreator;

  // 1. Core fields ALWAYS accessible to assignee and managers
  const projected: ProjectedWorkItem = {
    id: item.id,
    itemNumber: item.itemNumber,
    title: item.title,
    status: item.status,
    progressPercent: item.progressPercent,
    assignedTo: item.assignedTo,
    assignedBy: item.assignedBy,
    assignedByName: item.assignedByName,
    assignedByRole: item.assignedByRole,
    assignedAt: item.assignedAt,
    assignmentInstructions: item.assignmentInstructions,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    version: item.version,
  };

  // Parse sharedFields array
  let sharedFieldsSet: Set<string> = new Set();
  try {
    const parsed = JSON.parse(item.sharedFields || '[]');
    if (Array.isArray(parsed)) {
      sharedFieldsSet = new Set(parsed);
    }
  } catch {
    sharedFieldsSet = new Set();
  }

  // Helper: Can viewer see this field?
  const canSeeField = (fieldKey: string): boolean => {
    if (isOwnerOrCreator || viewer.permissions.has('work_items:view_all')) {
      return true;
    }
    // For assignees: default is share NOTHING until explicitly ticked in sharedFields
    return sharedFieldsSet.has(fieldKey);
  };

  // Client Details
  if (canSeeField('clientName')) projected.clientName = item.clientName;
  if (canSeeField('clientEmail')) projected.clientEmail = item.clientEmail;
  if (canSeeField('clientPhone')) projected.clientPhone = item.clientPhone;
  if (canSeeField('clientCompany')) projected.clientCompany = item.clientCompany;

  // Task Details
  if (canSeeField('description')) projected.description = item.description;
  if (canSeeField('category')) projected.category = item.category;
  if (canSeeField('source')) projected.source = item.source;
  if (canSeeField('priority')) projected.priority = item.priority;
  if (canSeeField('dueDate')) projected.dueDate = item.dueDate;

  // Tags
  if (canSeeField('tags') && item.tags) {
    try {
      projected.tags = JSON.parse(item.tags);
    } catch {
      projected.tags = [];
    }
  }

  // Links
  if (canSeeField('links') && item.links) {
    try {
      projected.links = JSON.parse(item.links);
    } catch {
      projected.links = [];
    }
  }

  // Custom Fields
  if (canSeeField('customFields') && item.customFields) {
    try {
      projected.customFields = JSON.parse(item.customFields);
    } catch {
      projected.customFields = {};
    }
  }

  // Shared fields list (only visible to assigners/creators/managers)
  if (isOwnerOrCreator || viewer.permissions.has('work_items:assign')) {
    projected.sharedFields = Array.from(sharedFieldsSet);
  }

  // ================= FINANCIAL ISOLATION LAYER =================
  // Rule: Assignees NEVER receive price, budget, discount, or payment data, regardless of ticks!
  const hasQuotePerm = viewer.isSuperAdmin || viewer.permissions.has('financials:view_quote');
  const hasDeliveredPerm = viewer.isSuperAdmin || viewer.permissions.has('financials:view_delivered');

  if (!isAssignee && hasQuotePerm) {
    projected.quotedPrice = item.quotedPrice;
    projected.currency = item.currency;
  }

  if (!isAssignee && hasDeliveredPerm) {
    projected.finalPrice = item.finalPrice;
    projected.discount = item.discount;
    projected.taxPercent = item.taxPercent;
    projected.paymentStatus = item.paymentStatus;
    projected.amountReceived = item.amountReceived;
    projected.balanceDue = item.balanceDue;
    projected.paymentMethod = item.paymentMethod;
    projected.deliveryNotes = item.deliveryNotes;
    projected.deliveredAt = item.deliveredAt;
    projected.deliveredBy = item.deliveredBy;
    projected.invoiceReference = item.invoiceReference;

    if (item.invoiceDetails) {
      try {
        projected.invoiceDetails = JSON.parse(item.invoiceDetails);
      } catch {
        projected.invoiceDetails = {};
      }
    }
  }

  return projected;
}
