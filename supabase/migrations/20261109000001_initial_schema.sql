-- ============================================================================
-- FRZZY STUDIO — PRODUCTION SUPABASE MIGRATION 001: INITIAL SCHEMA
-- Tables, Relationships, Constraints, Enums, Indexes, Triggers
-- ============================================================================

-- 1. ENUMS
CREATE TYPE admin_status AS ENUM ('active', 'suspended', 'disabled');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'in_progress', 'won', 'lost', 'spam');
CREATE TYPE work_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE work_status AS ENUM ('assigned', 'accepted', 'in_progress', 'in_review', 'completed', 'delivered', 'on_hold', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'partially_paid', 'paid');
CREATE TYPE export_format AS ENUM ('xlsx', 'csv', 'pdf');

-- 2. ROLES TABLE (Built-in & Custom RBAC)
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_built_in BOOLEAN NOT NULL DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_lead_scope JSONB DEFAULT '{}'::jsonb,
    ip_allowlist TEXT,
    session_timeout_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- 3. PROFILES TABLE (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'viewer' REFERENCES public.roles(id) ON UPDATE CASCADE,
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    lead_scope JSONB DEFAULT '{}'::jsonb,
    status admin_status NOT NULL DEFAULT 'active',
    two_factor_enabled BOOLEAN NOT NULL DEFAULT true,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    must_setup_2fa BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. CLIENTS DIRECTORY
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    billing_address TEXT,
    gstin TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- 5. LEADS (PII Encrypted at Rest)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email_encrypted TEXT NOT NULL,
    email_blind_index TEXT NOT NULL,
    category TEXT NOT NULL,
    message_encrypted TEXT NOT NULL,
    status lead_status NOT NULL DEFAULT 'new',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    source_page TEXT DEFAULT '/',
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT DEFAULT 'Unknown',
    ip_masked TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_leads_blind_email ON public.leads(email_blind_index);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- 6. LEAD NOTES
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);

-- 7. WORK ITEMS (Agency OS Tasks & Jobs)
CREATE TABLE IF NOT EXISTS public.work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_number TEXT NOT NULL UNIQUE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    client_company TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'Website',
    is_personal BOOLEAN NOT NULL DEFAULT false,
    priority work_priority NOT NULL DEFAULT 'normal',
    status work_status NOT NULL DEFAULT 'assigned',
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    due_date TIMESTAMPTZ,
    tags JSONB DEFAULT '[]'::jsonb,
    links JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,

    -- Financial Isolation Layer
    quoted_price INTEGER DEFAULT 0,
    final_price INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    tax_percent INTEGER DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    amount_received INTEGER DEFAULT 0,
    balance_due INTEGER DEFAULT 0,
    payment_method TEXT,
    delivery_notes TEXT,
    delivered_at TIMESTAMPTZ,
    delivered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    invoice_reference TEXT,
    invoice_details JSONB DEFAULT '{}'::jsonb,

    -- Assignment & Shared Field Controls
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_by_name TEXT,
    assigned_by_role TEXT,
    assigned_at TIMESTAMPTZ,
    shared_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    assignment_instructions TEXT,

    -- Soft Deletion & Tracking
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_work_items_item_number ON public.work_items(item_number);
CREATE INDEX IF NOT EXISTS idx_work_items_assigned_to ON public.work_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON public.work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_priority ON public.work_items(priority);
CREATE INDEX IF NOT EXISTS idx_work_items_created_by ON public.work_items(created_by);
CREATE INDEX IF NOT EXISTS idx_work_items_deleted_at ON public.work_items(deleted_at);

-- 8. WORK ITEM SUBTASKS (Checklists)
CREATE TABLE IF NOT EXISTS public.work_item_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wi_subtasks_work_item_id ON public.work_item_subtasks(work_item_id);

-- 9. WORK ITEM COMMENTS
CREATE TABLE IF NOT EXISTS public.work_item_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    admin_name TEXT NOT NULL,
    admin_role TEXT NOT NULL,
    content TEXT NOT NULL,
    is_internal_only BOOLEAN NOT NULL DEFAULT false,
    mentions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wi_comments_work_item_id ON public.work_item_comments(work_item_id);

-- 10. WORK ITEM TIMELINE (Immutable Audit Stream)
CREATE TABLE IF NOT EXISTS public.work_item_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wi_timeline_work_item_id ON public.work_item_timeline(work_item_id);
CREATE INDEX IF NOT EXISTS idx_wi_timeline_created_at ON public.work_item_timeline(created_at);

-- 11. WORK ITEM ATTACHMENTS & DELIVERABLES
CREATE TABLE IF NOT EXISTS public.work_item_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    is_deliverable BOOLEAN NOT NULL DEFAULT false,
    revision INTEGER NOT NULL DEFAULT 1,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    approval_feedback TEXT,
    is_quarantined BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wi_attachments_work_item_id ON public.work_item_attachments(work_item_id);

-- 12. EXPORT PRESETS
CREATE TABLE IF NOT EXISTS public.export_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_export_presets_admin_id ON public.export_presets(admin_id);

-- 13. EXPORTS HISTORY
CREATE TABLE IF NOT EXISTS public.exports_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    admin_email TEXT NOT NULL,
    format export_format NOT NULL DEFAULT 'xlsx',
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    row_count INTEGER NOT NULL,
    file_path TEXT,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_exports_history_admin_id ON public.exports_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_exports_history_created_at ON public.exports_history(created_at);

-- 14. FIRST-PARTY ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_hash TEXT NOT NULL,
    visitor_id UUID,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    target TEXT,
    path TEXT NOT NULL DEFAULT '/',
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT DEFAULT 'Unknown',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor_hash ON public.analytics_events(visitor_hash);

-- 15. ANALYTICS DAILY ROLLUPS
CREATE TABLE IF NOT EXISTS public.analytics_daily_rollups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    pageviews INTEGER NOT NULL DEFAULT 0,
    visitors INTEGER NOT NULL DEFAULT 0,
    sessions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    leads_count INTEGER NOT NULL DEFAULT 0,
    avg_session_seconds INTEGER NOT NULL DEFAULT 0,
    bounce_rate_percent INTEGER NOT NULL DEFAULT 0,
    metrics_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rollups_date ON public.analytics_daily_rollups(date);

-- 16. AUDIT LOGS (Immutable System Activity)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 17. SETTINGS KEY-VALUE STORE
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
