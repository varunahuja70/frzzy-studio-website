-- ============================================================================
-- FRZZY STUDIO — PRODUCTION SUPABASE MIGRATION 004: SEED REFERENCE DATA
-- Built-in Roles, Initial Settings, Auth User Sync Trigger (NO Fake Users)
-- ============================================================================

-- 1. BUILT-IN ROLES
INSERT INTO public.roles (id, name, description, is_built_in, permissions, default_lead_scope, session_timeout_minutes)
VALUES
    (
        'superadmin',
        'Super Admin',
        'Full operational, security, and administrative access over all studio resources.',
        true,
        '["*"]'::jsonb,
        '{"assignedToMe": false, "statuses": [], "excludeSpam": false}'::jsonb,
        120
    ),
    (
        'manager',
        'Studio Manager',
        'Operational lead managing jobs, staff task allocation, client relations, and deliverables.',
        true,
        '["leads:read", "leads:write", "leads:export", "work_items:read_all", "work_items:write_all", "work_items:create", "work_items:deliver", "clients:read", "clients:write", "analytics:read", "reviews:write", "settings:write"]'::jsonb,
        '{"assignedToMe": false, "statuses": [], "excludeSpam": true}'::jsonb,
        60
    ),
    (
        'sales_executive',
        'Sales Executive',
        'Lead qualification and intake specialist focusing on incoming inquiries and outreach.',
        true,
        '["leads:read", "leads:write", "leads:export", "clients:read", "work_items:create", "work_items:read_all"]'::jsonb,
        '{"assignedToMe": false, "statuses": ["new", "contacted", "in_progress"], "excludeSpam": true}'::jsonb,
        60
    ),
    (
        'viewer',
        'Creator / Team Member',
        'Production artist viewing assigned briefs, updating task subtasks, and uploading delivery drafts.',
        true,
        '["leads:read_assigned", "work_items:read_assigned", "work_items:write_assigned"]'::jsonb,
        '{"assignedToMe": true, "statuses": [], "excludeSpam": true}'::jsonb,
        30
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    default_lead_scope = EXCLUDED.default_lead_scope;

-- 2. INITIAL SYSTEM SETTINGS (Default Theme & Studio Appearance)
INSERT INTO public.settings (key, value)
VALUES
    (
        'site_appearance',
        '{"palette": "volt", "look": "mac", "effects": "liquid", "liquidMetal": false}'::jsonb
    ),
    (
        'site_reviews',
        '{"version": 1, "reviews": []}'::jsonb
    )
ON CONFLICT (key) DO NOTHING;

-- 3. AUTOMATIC PROFILE CREATION TRIGGER ON auth.users SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
