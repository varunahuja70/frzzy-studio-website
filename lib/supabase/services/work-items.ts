import { createServerSupabaseClient } from '../server';
import type { WorkPriority, WorkStatus } from '../types';

export interface CreateWorkItemInput {
  itemNumber: string;
  leadId?: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  title: string;
  description: string;
  category: string;
  source?: string;
  priority?: WorkPriority;
  dueDate?: string;
  quotedPrice?: number;
  currency?: string;
  assignedTo?: string;
  assignedBy?: string;
  assignedByName?: string;
  assignedByRole?: string;
  sharedFields?: string[];
  assignmentInstructions?: string;
  createdBy: string;
}

/**
 * Create a new work item with atomic item_number.
 */
export async function createWorkItem(input: CreateWorkItemInput) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await (supabase as any).from('work_items').insert({
    item_number: input.itemNumber,
    lead_id: input.leadId,
    client_id: input.clientId,
    client_name: input.clientName,
    client_email: input.clientEmail,
    client_phone: input.clientPhone,
    client_company: input.clientCompany,
    title: input.title,
    description: input.description,
    category: input.category,
    source: input.source ?? 'Website',
    priority: input.priority ?? 'normal',
    due_date: input.dueDate,
    quoted_price: input.quotedPrice ?? 0,
    currency: input.currency ?? 'INR',
    assigned_to: input.assignedTo,
    assigned_by: input.assignedBy,
    assigned_by_name: input.assignedByName,
    assigned_by_role: input.assignedByRole,
    assigned_at: input.assignedTo ? new Date().toISOString() : null,
    shared_fields: input.sharedFields ?? [],
    assignment_instructions: input.assignmentInstructions,
    created_by: input.createdBy,
  }).select().single();

  if (error) {
    throw new Error(`Failed to create work item: ${error.message}`);
  }
  return data;
}

/**
 * Query work items with optional assignee or status filter.
 */
export async function getWorkItems(options?: {
  assignedTo?: string;
  status?: WorkStatus;
  limit?: number;
}) {
  const supabase = await createServerSupabaseClient();
  let query = (supabase as any).from('work_items').select('*');

  if (options?.assignedTo) {
    query = query.eq('assigned_to', options.assignedTo);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch work items: ${error.message}`);
  }
  return data ?? [];
}
