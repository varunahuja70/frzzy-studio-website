-- ============================================================================
-- FRZZY STUDIO — PRODUCTION SUPABASE MIGRATION 002: ROW LEVEL SECURITY (RLS)
-- Default Deny, Explicit Policies, Security Definer Functions with Fixed Search Path
-- ============================================================================

-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 2. SECURITY DEFINER HELPER FUNCTIONS (Strict search_path = public)
CREATE OR REPLACE FUNCTION public.get_current_profile_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND status = 'active' AND deleted_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin' AND status = 'active' AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
  role_perms JSONB;
  custom_perms JSONB;
BEGIN
  SELECT p.role, r.permissions, p.custom_permissions
  INTO user_role, role_perms, custom_perms
  FROM public.profiles p
  JOIN public.roles r ON p.role = r.id
  WHERE p.id = auth.uid() AND p.status = 'active' AND p.deleted_at IS NULL;

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  IF user_role = 'superadmin' THEN
    RETURN TRUE;
  END IF;

  -- Check custom override first
  IF custom_perms IS NOT NULL AND custom_perms ? required_permission THEN
    RETURN TRUE;
  END IF;

  -- Check role base permissions
  IF role_perms IS NOT NULL AND role_perms ? required_permission THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 3. PUBLIC / GUEST ACCESS POLICIES (Anon Key)
-- Leads: Public users may ONLY insert inquiries (no reading, no editing, no deleting)
CREATE POLICY "Public anonymous visitors can submit leads"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Analytics: Public users may record telemetry events
CREATE POLICY "Public anonymous visitors can record analytics"
ON public.analytics_events
FOR INSERT
TO anon
WITH CHECK (true);

-- Settings: Public visitors may only read public site appearance and reviews
CREATE POLICY "Public visitors can read public settings"
ON public.settings
FOR SELECT
TO anon
USING (key IN ('site_appearance', 'site_reviews'));

-- 4. AUTHENTICATED STAFF POLICIES (Role-Based Access Control)

-- PROFILES
CREATE POLICY "Staff can view active colleague profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Users can update their own profile name and avatar"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Superadmins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_superadmin());

-- ROLES
CREATE POLICY "Authenticated users can view roles"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only superadmins can manage roles"
ON public.roles
FOR ALL
TO authenticated
USING (public.is_superadmin());

-- LEADS CRM
CREATE POLICY "Staff with leads:read permission can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.has_permission('leads:read') OR
  (public.has_permission('leads:read_assigned') AND assigned_to = auth.uid())
);

CREATE POLICY "Staff with leads:write permission can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  public.has_permission('leads:write') OR
  (public.has_permission('leads:write_assigned') AND assigned_to = auth.uid())
);

CREATE POLICY "Staff with leads:delete permission can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (public.has_permission('leads:delete'));

-- LEAD NOTES
CREATE POLICY "Staff can view notes for accessible leads"
ON public.lead_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_notes.lead_id AND (
      public.has_permission('leads:read') OR
      (public.has_permission('leads:read_assigned') AND l.assigned_to = auth.uid())
    )
  )
);

CREATE POLICY "Staff can insert notes for accessible leads"
ON public.lead_notes
FOR INSERT
TO authenticated
WITH CHECK (
  admin_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_notes.lead_id AND (
      public.has_permission('leads:write') OR
      (public.has_permission('leads:write_assigned') AND l.assigned_to = auth.uid())
    )
  )
);

-- CLIENTS
CREATE POLICY "Staff with clients:read can view clients"
ON public.clients
FOR SELECT
TO authenticated
USING (public.has_permission('clients:read'));

CREATE POLICY "Staff with clients:write can manage clients"
ON public.clients
FOR ALL
TO authenticated
USING (public.has_permission('clients:write'));

-- WORK ITEMS
CREATE POLICY "Staff can view assigned or team work items"
ON public.work_items
FOR SELECT
TO authenticated
USING (
  public.is_superadmin() OR
  public.has_permission('work_items:read_all') OR
  assigned_to = auth.uid() OR
  created_by = auth.uid()
);

CREATE POLICY "Staff can update accessible work items"
ON public.work_items
FOR UPDATE
TO authenticated
USING (
  public.is_superadmin() OR
  public.has_permission('work_items:write_all') OR
  (assigned_to = auth.uid() AND status NOT IN ('delivered', 'cancelled'))
);

CREATE POLICY "Staff with work_items:create can insert work items"
ON public.work_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_superadmin() OR
  public.has_permission('work_items:create')
);

CREATE POLICY "Only managers/superadmins can delete work items"
ON public.work_items
FOR DELETE
TO authenticated
USING (public.is_superadmin() OR public.has_permission('work_items:delete'));

-- SUBTASKS
CREATE POLICY "Staff can view and update subtasks for accessible work items"
ON public.work_item_subtasks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_items w
    WHERE w.id = work_item_subtasks.work_item_id AND (
      public.is_superadmin() OR
      public.has_permission('work_items:read_all') OR
      w.assigned_to = auth.uid()
    )
  )
);

-- COMMENTS
CREATE POLICY "Staff can view comments for accessible work items"
ON public.work_item_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_items w
    WHERE w.id = work_item_comments.work_item_id AND (
      public.is_superadmin() OR
      public.has_permission('work_items:read_all') OR
      w.assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "Staff can add comments to accessible work items"
ON public.work_item_comments
FOR INSERT
TO authenticated
WITH CHECK (
  admin_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.work_items w
    WHERE w.id = work_item_comments.work_item_id AND (
      public.is_superadmin() OR
      public.has_permission('work_items:read_all') OR
      w.assigned_to = auth.uid()
    )
  )
);

-- TIMELINE
CREATE POLICY "Staff can view timeline for accessible work items"
ON public.work_item_timeline
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_items w
    WHERE w.id = work_item_timeline.work_item_id AND (
      public.is_superadmin() OR
      public.has_permission('work_items:read_all') OR
      w.assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "Staff can append timeline entries"
ON public.work_item_timeline
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

-- ATTACHMENTS
CREATE POLICY "Staff can access attachments for their work items"
ON public.work_item_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_items w
    WHERE w.id = work_item_attachments.work_item_id AND (
      public.is_superadmin() OR
      public.has_permission('work_items:read_all') OR
      w.assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "Staff can upload attachments for their work items"
ON public.work_item_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploader_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.work_items w
    WHERE w.id = work_item_attachments.work_item_id AND (
      public.is_superadmin() OR
      public.has_permission('work_items:read_all') OR
      w.assigned_to = auth.uid()
    )
  )
);

-- EXPORT PRESETS & HISTORY
CREATE POLICY "Users can manage their own export presets"
ON public.export_presets
FOR ALL
TO authenticated
USING (admin_id = auth.uid())
WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Users with export permissions can view export history"
ON public.exports_history
FOR SELECT
TO authenticated
USING (public.has_permission('leads:export') OR admin_id = auth.uid());

CREATE POLICY "Users can log their exports"
ON public.exports_history
FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid());

-- ANALYTICS & AUDIT LOGS
CREATE POLICY "Staff with analytics:read can view analytics and rollups"
ON public.analytics_daily_rollups
FOR SELECT
TO authenticated
USING (public.has_permission('analytics:read'));

CREATE POLICY "Staff with audit:read can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_permission('audit:read'));

CREATE POLICY "System can record audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid() OR admin_id IS NULL);

-- SETTINGS
CREATE POLICY "Staff with settings:write can modify settings"
ON public.settings
FOR ALL
TO authenticated
USING (public.has_permission('settings:write'));
