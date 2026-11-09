# FRZZY Studio Website — Supabase Setup Guide
**Author**: Senior Full-Stack Engineer & Security Architect  
**Architecture**: Cloud PostgreSQL, Hardware Row Level Security (RLS), Supabase Auth & Storage

---

## 1. Create Your Supabase Project
1. Log in to [supabase.com](https://supabase.com) and click **"New Project"**.
2. Set your Project Name (e.g., `frzzy-studio-production`).
3. Set a strong database password and select the region closest to your primary audience (e.g. `ap-south-1` Mumbai or `eu-central-1` Frankfurt).
4. Wait ~2 minutes for the database cluster to provision.

---

## 2. Execute SQL Migrations in Order
Open the **SQL Editor** in your Supabase dashboard and execute the 4 migration scripts in exact numerical sequence:

### Migration 1: Core Schema & Enums
- File: `supabase/migrations/20261109000001_initial_schema.sql`
- Creates:
  - Custom PostgreSQL enums (`admin_status`, `lead_status`, `work_priority`, `work_status`, `payment_status`, `export_format`).
  - Core tables (`roles`, `profiles`, `clients`, `leads`, `lead_notes`, `work_items`, `work_item_subtasks`, `work_item_comments`, `work_item_timeline`, `work_item_attachments`, `export_presets`, `exports_history`, `analytics_events`, `analytics_daily_rollups`, `audit_logs`, `settings`).
  - High-performance B-tree indexes including deterministic blind index for encrypted lead searches.

### Migration 2: Row Level Security (RLS) & Security Functions
- File: `supabase/migrations/20261109000002_rls_policies.sql`
- Enables RLS across EVERY table with default deny.
- Creates security-definer helper functions with strict `search_path = public`:
  - `get_current_profile_role()`
  - `is_superadmin()`
  - `has_permission(perm)`
- Implements explicit role-budgeted policies:
  - `anon`: INSERT-only on `leads` and `analytics_events`; SELECT-only on public `settings`.
  - `authenticated`: RBAC rules for `profiles`, `roles`, `leads`, `clients`, `work_items`, and `exports`.

### Migration 3: Storage Buckets & Policies
- File: `supabase/migrations/20261109000003_storage_buckets.sql`
- Creates 3 storage buckets:
  1. `work-attachments` (private, 100MB limit, allowed MIME types for design/code/assets).
  2. `deliverables` (private, 500MB limit, zip/video/pdf).
  3. `review-avatars` (public, 2MB limit, webp/png/jpeg).
- Configures RLS policies governing object uploads and downloads.

### Migration 4: Seed Data & Profile Trigger
- File: `supabase/migrations/20261109000004_seed_data.sql`
- Seeds built-in roles: `superadmin`, `manager`, `sales_executive`, `viewer`.
- Seeds initial studio appearance theme (`volt`, `mac`, `liquid`).
- Attaches PostgreSQL trigger `on_auth_user_created` to `auth.users` to automatically synchronize new users into `public.profiles`.

---

## 3. Configure Supabase Authentication
1. In the Supabase Dashboard, go to **Authentication** → **Providers** → **Email**.
2. Ensure **Enable Email provider** is turned ON.
3. Toggle **Confirm email** as per your studio policy (for internal admin vaults, turning off email confirmation allows immediate login after manual invite).
4. Go to **Authentication** → **URL Configuration**:
   - **Site URL**: `https://your-domain.web.app` (or `http://localhost:3000` for local testing).
   - **Redirect URLs**: Add `https://your-domain.web.app/**` and `http://localhost:3000/**`.

---

## 4. Retrieve Environment Variables
Navigate to **Project Settings** → **API**:
1. Copy **Project URL** (`https://xyzcompany.supabase.co`).
2. Copy **Project API Keys** → `anon` `public` key.
3. Copy **Project API Keys** → `service_role` `secret` key.

Add these into your production `.env` (or Firebase Hosting environment config):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... # NEVER EXPOSE TO CLIENT
```

---

## 5. Bootstrap the First Super Admin
Run the CLI script to create your initial super administrator:
```bash
npm run admin:create
```
Enter your studio email, strong password, and display name. Your account will receive the `superadmin` role with full system access.
