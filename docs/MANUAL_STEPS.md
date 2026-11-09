# FRZZY Studio Website — User Manual Setup Checklist
**Auditor**: Senior Full-Stack Engineer & Security Architect  
**Purpose**: Complete checklist of manual operations required to connect external cloud services (Supabase & Firebase) to your local workspace.

---

## 1. Create Accounts & External Projects
- [ ] **Supabase Account**: Sign up at [supabase.com](https://supabase.com). Create a new project named `frzzy-studio` in your preferred geographic region.
- [ ] **Firebase / GCP Account**: Go to [console.firebase.google.com](https://console.firebase.google.com). Create a new Firebase project and upgrade to the **Blaze (Pay-as-you-go) Plan** to enable Next.js server-side execution.

---

## 2. Apply Database Migrations to Supabase
In your Supabase project dashboard:
1. Navigate to the **SQL Editor** on the left menu.
2. Open each migration file from `supabase/migrations/` and click **Run**:
   - `supabase/migrations/20261109000001_initial_schema.sql` (Creates all tables and indexes)
   - `supabase/migrations/20261109000002_rls_policies.sql` (Enables Row Level Security on all 16 tables)
   - `supabase/migrations/20261109000003_storage_buckets.sql` (Creates private deliverables & public review avatar buckets)
   - `supabase/migrations/20261109000004_seed_data.sql` (Seeds built-in roles and appearance theme)

---

## 3. Fill In Environment Variables (`.env.local`)
Create a `.env.local` file in the project root based on `.env.example`:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-public-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-secret-service-role-key>

# Studio Security Secrets (Generate 32-byte / 64-character hex strings)
ADMIN_ENCRYPTION_KEY=<random-64-character-hex>
ADMIN_PEPPER=<random-64-character-hex>
ADMIN_SESSION_SECRET=<random-64-character-hex>
MEDIA_SIGNING_SECRET=<random-64-character-hex>
```

> **Security Tip**: You can generate secure 64-character random hex keys by running:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 4. Set Up Firebase Project ID
Open `.firebaserc` in the project root and replace `"frzzy-studio-placeholder"` with your exact Firebase Project ID:
```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

---

## 5. Bootstrap Initial Super Admin
Run the CLI onboarding script in your terminal to create your first administrative user:
```bash
npm run admin:create
```
Follow the interactive prompts to set:
1. Email address (e.g. `admin@frzzy.studio`).
2. Display Name (e.g. `Varun`).
3. Secure Password (must meet high entropy criteria: minimum 12 chars, upper, lower, number, symbol).

Once created, log in at `http://localhost:3000/studio-vault/login` and scan the TOTP QR code with Google Authenticator or 1Password to complete your 2FA setup.

---

## 6. Production Deployment
When ready to deploy:
```bash
# 1. Login to Firebase CLI
npx firebase login

# 2. Deploy live
npm run deploy:firebase
```
