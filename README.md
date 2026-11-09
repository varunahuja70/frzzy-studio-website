# FRZZY Studio Website — Production Digital Experience & Agency OS

Premium digital production, brand design, motion, and visual studio website built with Next.js 15 (App Router), React 19, Tailwind CSS v4, Motion, Three.js, Supabase, and Firebase Hosting.

---

## ⚡ Highlights

- **Kinetic Studio Experience**: Continuous looping video showreel, real-time 3D Three.js wordmark backdrop, reactive Canvas 2D electrical strand simulation, and GLSL liquid-metal shader gradients.
- **Studio Vault (Agency OS)**: High-performance administrative panel with full CRM lead pipelines, atomic work item intake (`AEV-2026-XXXX`), team task checklists, client directory with GSTIN/billing tracking, and multi-sheet ExcelJS/CSV executive exports.
- **Bank-Grade Hardened Security**:
  - Argon2id password hashing (64MB memory, server pepper).
  - Mandatory TOTP 2FA (Base32 encryption, QR code onboarding, single-use hashed recovery codes).
  - AES-256-GCM encryption at rest for customer PII with deterministic HMAC-SHA256 blind indexing.
  - Role-Based Access Control (RBAC) with granular permissions matrix and field-level masking for unauthorized viewers.
  - Comprehensive Row Level Security (RLS) policies on every PostgreSQL table.
- **Production Architecture**:
  - Cloud Database: Supabase PostgreSQL with versioned migrations and typed client service layer.
  - Deployment: Firebase Hosting with framework-aware Next.js Cloud Run SSR backend.
  - Testing: 132 automated tests across 21 suites passing with 100% verification.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 15.5 (App Router), React 19.2, TypeScript 5.9 |
| **Styling & Motion** | Tailwind CSS v4.1, PostCSS, Motion (Framer Motion v12) |
| **3D & Graphics** | Three.js 0.187, Custom GLSL Shaders, 2D Canvas Physics Engine |
| **Cloud Database** | Supabase (PostgreSQL 15+, Row Level Security, Storage Buckets) |
| **Authentication** | Supabase Auth + Argon2id / TOTP 2FA Security Layer |
| **Validation & Cryptography** | Zod 4.6, hash-wasm (Argon2id), otplib (TOTP), zxcvbn |
| **Export Engine** | ExcelJS (Executive 2-sheet workbooks), RFC 4180 CSV with formula injection defense |
| **Testing** | Node.js Test Runner (`node:test`) executed via `tsx` |
| **Deployment** | Firebase Hosting (Framework-aware SSR + Cloud Run) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (recommended LTS)
- npm or pnpm
- Supabase project account ([supabase.com](https://supabase.com))
- Firebase account with Blaze plan ([console.firebase.google.com](https://console.firebase.google.com))

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd frzzy-studio-website
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   *(See `docs/MANUAL_STEPS.md` for exact key generation instructions)*.

4. **Run Database Migrations**:
   Execute the migration files in `supabase/migrations/` in order within your Supabase SQL Editor:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_storage_buckets.sql`
   - `004_seed_data.sql`

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `next dev` | Start local development server on port 3000 |
| `npm run build` | `next build` | Compile optimized production build |
| `npm run start` | `next start` | Run production server |
| `npm run lint` | `eslint .` | Run ESLint check (0 errors, 0 warnings enforced) |
| `npm test` | `tsx --test --test-concurrency=1 "tests/*.test.ts"` | Run all 132 automated test suites |
| `npm run build:firebase` | `next build` | Prepare build for Firebase deployment |
| `npm run preview:firebase` | `firebase hosting:channel:deploy preview` | Deploy to a temporary Firebase preview channel |
| `npm run deploy:firebase` | `firebase deploy --only hosting` | Deploy live to Firebase Hosting CDN + Cloud Run |
| `npm run admin:create` | `tsx scripts/admin-create.ts` | Bootstrap a new administrative user |
| `npm run admin:reset-password`| `tsx scripts/admin-reset-password.ts` | Reset an admin user password |
| `npm run admin:disable` | `tsx scripts/admin-disable.ts` | Suspend or disable an admin account |

---

## 📂 Project Architecture

```
frzzy-studio-website/
├── app/                          # Next.js App Router root
│   ├── [adminPath]/              # Studio Vault admin operations portal
│   ├── api/                      # 28 Secure API Route Handlers
│   ├── about/, work/, services/  # Public site routes with dynamic SSR
│   ├── contact/, book/           # Inquiry & scheduling pages
│   └── layout.tsx                # Global layout with theme hydration boot
├── components/
│   ├── frzzy/                    # Production public site UI & 3D canvases
│   ├── liquid/                   # Liquid-metal and WebGL shader effects
│   └── admin/                    # Studio Vault admin modals & layout shell
├── lib/
│   ├── auth/                     # Argon2id, TOTP, session, encryption, RBAC
│   ├── supabase/                 # Supabase client, admin client & typed services
│   ├── export/                   # ExcelJS and CSV export engines
│   └── work-items/               # Agency OS state machines & upload security
├── supabase/
│   └── migrations/               # Versioned PostgreSQL DDL & RLS migrations
├── tests/                        # 21 test suites with 132 automated tests
├── docs/                         # Audit reports & deployment documentation
│   ├── PROJECT_ANALYSIS.md       # Phase 1 deep-dive analysis
│   ├── CLEANUP_LOG.md            # Phase 2 cleanup log & deletions
│   ├── SUPABASE_SETUP.md         # Supabase setup & RLS architecture
│   ├── DEPLOYMENT_FIREBASE.md    # Firebase Hosting deployment guide
│   └── MANUAL_STEPS.md           # User manual checklist & key generation
└── firebase.json                 # Firebase Hosting configuration & security headers
```

---

## 🛡️ Documentation & Architecture Guides
- [Full Project Analysis](file:///docs/PROJECT_ANALYSIS.md)
- [Cleanup & Code Quality Log](file:///docs/CLEANUP_LOG.md)
- [Supabase Setup & RLS Guide](file:///docs/SUPABASE_SETUP.md)
- [Firebase Hosting Deployment Guide](file:///docs/DEPLOYMENT_FIREBASE.md)
- [User Manual Steps Checklist](file:///docs/MANUAL_STEPS.md)
