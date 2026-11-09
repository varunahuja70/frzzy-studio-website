import { getAdminSupabaseClient } from './admin';

/**
 * 1. SITE APPEARANCE SYNC
 */
export async function syncAppearanceToSupabase(appearance: any) {
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('settings') as any).upsert(
      {
        key: 'site_appearance',
        value: appearance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn('[Supabase Sync] Failed to sync site appearance:', err);
  }
}

export async function fetchAppearanceFromSupabase(): Promise<any | null> {
  try {
    const supabase = getAdminSupabaseClient();
    const { data } = await (supabase.from('settings') as any)
      .select('value, updated_at')
      .eq('key', 'site_appearance')
      .maybeSingle();
    return data;
  } catch (err) {
    console.warn('[Supabase Sync] Failed to fetch site appearance:', err);
    return null;
  }
}

/**
 * 2. SITE REVIEWS SYNC
 */
export async function syncReviewsToSupabase(reviewsStore: any) {
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('settings') as any).upsert(
      {
        key: 'site_reviews',
        value: reviewsStore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn('[Supabase Sync] Failed to sync reviews:', err);
  }
}

export async function fetchReviewsFromSupabase(): Promise<any | null> {
  try {
    const supabase = getAdminSupabaseClient();
    const { data } = await (supabase.from('settings') as any)
      .select('value, updated_at')
      .eq('key', 'site_reviews')
      .maybeSingle();
    return data;
  } catch (err) {
    console.warn('[Supabase Sync] Failed to fetch reviews:', err);
    return null;
  }
}

/**
 * 3. LEADS SYNC
 */
export async function syncLeadToSupabase(lead: {
  id: string;
  firstName: string;
  lastName: string;
  emailEncrypted: string;
  emailBlindIndex: string;
  category: string;
  messageEncrypted: string;
  status?: string;
  assignedTo?: string | null;
  sourcePage?: string | null;
  referrer?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  ipMasked?: string | null;
  createdAt?: number;
  updatedAt?: number;
}) {
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('leads') as any).upsert(
      {
        id: lead.id,
        first_name: lead.firstName,
        last_name: lead.lastName,
        email_encrypted: lead.emailEncrypted,
        email_blind_index: lead.emailBlindIndex,
        category: lead.category,
        message_encrypted: lead.messageEncrypted,
        status: lead.status || 'new',
        assigned_to: lead.assignedTo || null,
        source_page: lead.sourcePage || '/',
        referrer: lead.referrer || null,
        device_type: lead.deviceType || 'desktop',
        browser: lead.browser || null,
        os: lead.os || null,
        country: lead.country || 'Unknown',
        ip_masked: lead.ipMasked || null,
        created_at: lead.createdAt ? new Date(lead.createdAt).toISOString() : new Date().toISOString(),
        updated_at: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('[Supabase Sync] Failed to sync lead:', err);
  }
}

export async function updateLeadInSupabase(id: string, updates: Record<string, any>) {
  try {
    const supabase = getAdminSupabaseClient();
    const sbPayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) sbPayload.status = updates.status;
    if (updates.assignedTo !== undefined) sbPayload.assigned_to = updates.assignedTo;
    await (supabase.from('leads') as any).update(sbPayload).eq('id', id);
  } catch (err) {
    console.warn('[Supabase Sync] Failed to update lead:', err);
  }
}

export async function deleteLeadFromSupabase(id: string) {
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('leads') as any).delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase Sync] Failed to delete lead:', err);
  }
}

/**
 * 4. CLIENTS SYNC
 */
export async function syncClientToSupabase(client: {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  billingAddress?: string | null;
  gstin?: string | null;
  notes?: string | null;
  createdAt?: number;
  updatedAt?: number;
}) {
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('clients') as any).upsert(
      {
        id: client.id,
        name: client.name,
        email: client.email || null,
        phone: client.phone || null,
        company: client.company || null,
        billing_address: client.billingAddress || null,
        gstin: client.gstin || null,
        notes: client.notes || null,
        created_at: client.createdAt ? new Date(client.createdAt).toISOString() : new Date().toISOString(),
        updated_at: client.updatedAt ? new Date(client.updatedAt).toISOString() : new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('[Supabase Sync] Failed to sync client:', err);
  }
}

export async function deleteClientFromSupabase(id: string) {
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('clients') as any).delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase Sync] Failed to delete client:', err);
  }
}

/**
 * 5. WORK ITEMS SYNC
 */
export async function syncWorkItemToSupabase(item: {
  id: string;
  itemNumber: string;
  title: string;
  description: string;
  category: string;
  source?: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientCompany?: string | null;
  priority?: string;
  status?: string;
  progressPercent?: number;
  quotedPrice?: number;
  finalPrice?: number;
  currency?: string;
  paymentStatus?: string;
  assignedTo?: string | null;
  dueDate?: number | null;
  tags?: any;
  links?: any;
  createdAt?: number;
  updatedAt?: number;
}) {
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('work_items') as any).upsert(
      {
        id: item.id,
        item_number: item.itemNumber,
        title: item.title,
        description: item.description,
        category: item.category,
        source: item.source || 'Website',
        client_name: item.clientName,
        client_email: item.clientEmail || null,
        client_phone: item.clientPhone || null,
        client_company: item.clientCompany || null,
        priority: item.priority || 'normal',
        status: item.status || 'assigned',
        progress_percent: item.progressPercent ?? 0,
        quoted_price: item.quotedPrice ?? 0,
        final_price: item.finalPrice ?? 0,
        currency: item.currency || 'INR',
        payment_status: item.paymentStatus || 'unpaid',
        assigned_to: item.assignedTo || null,
        due_date: item.dueDate ? new Date(item.dueDate).toISOString() : null,
        tags: item.tags || [],
        links: item.links || [],
        created_at: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
        updated_at: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('[Supabase Sync] Failed to sync work item:', err);
  }
}

export async function deleteWorkItemFromSupabase(id: string) {
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('work_items') as any).delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase Sync] Failed to delete work item:', err);
  }
}

/**
 * 6. AUDIT LOGS SYNC
 */
export async function syncAuditLogToSupabase(log: {
  id: string;
  adminId?: string | null;
  action: string;
  resource?: string | null;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: number;
}) {
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('audit_logs') as any).insert({
      id: log.id,
      admin_id: log.adminId || null,
      action: log.action,
      resource: log.resource || null,
      details: log.details || {},
      ip_address: log.ipAddress || null,
      user_agent: log.userAgent || null,
      created_at: new Date(log.createdAt).toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase Sync] Failed to sync audit log:', err);
  }
}
