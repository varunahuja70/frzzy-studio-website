import crypto from 'crypto';
import { createServerSupabaseClient } from '../server';
import type { LeadStatus } from '../types';

export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  emailEncrypted: string;
  emailBlindIndex: string;
  category: string;
  messageEncrypted: string;
  sourcePage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  ipMasked?: string;
}

/**
 * Public insert-only lead creation via anonymous Supabase client.
 * Enforces RLS: anon users can only INSERT leads (no reading/selection).
 */
export async function createPublicLead(input: CreateLeadInput) {
  const supabase = await createServerSupabaseClient();
  const leadId = crypto.randomUUID();

  const { error } = await (supabase as any).from('leads').insert({
    id: leadId,
    first_name: input.firstName,
    last_name: input.lastName,
    email_encrypted: input.emailEncrypted,
    email_blind_index: input.emailBlindIndex,
    category: input.category,
    message_encrypted: input.messageEncrypted,
    source_page: input.sourcePage ?? '/',
    referrer: input.referrer,
    utm_source: input.utmSource,
    utm_medium: input.utmMedium,
    utm_campaign: input.utmCampaign,
    device_type: input.deviceType,
    browser: input.browser,
    os: input.os,
    country: input.country ?? 'Unknown',
    ip_masked: input.ipMasked,
  });

  if (error) {
    throw new Error(`Failed to submit inquiry: ${error.message}`);
  }
  return { id: leadId };
}

/**
 * Admin lead query with role-based scoping and RLS enforcement.
 */
export async function getAdminLeads(options?: {
  status?: LeadStatus;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerSupabaseClient();
  let query = (supabase as any).from('leads').select('*', { count: 'exact' });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.assignedTo) {
    query = query.eq('assigned_to', options.assignedTo);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, count, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }
  return { leads: data ?? [], total: count ?? 0 };
}
