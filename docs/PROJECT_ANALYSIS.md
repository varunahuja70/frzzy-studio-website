# FRZZY Studio Website — Comprehensive Project Analysis & Architectural Audit
**Date**: November 2026  
**Auditor**: Senior Full-Stack Engineer & Security Architect  
**Project**: `frzzy-studio-website` (ai-studio-applet)  
**Status**: Phase 1 Complete (Read-Only Analysis)

---

## 1. Tech Stack, Framework, Versions, Build Tooling & Structure

### 1.1 Core Framework & Runtime
- **Framework**: Next.js 15.4.9 (active runtime build: Next.js 15.5.29), using the App Router architecture.
- **React**: React 19.2.1 and React-DOM 19.2.1.
- **Language & Compiler**: TypeScript 5.9.3, strictly typed with `tsconfig.json` target ES2017 and strict mode enabled.
- **Package Manager**: npm with `package-lock.json` v3.

### 1.2 Styling & Presentation
- **Styling**: Tailwind CSS v4.1.11, `@tailwindcss/postcss` 4.1.11, PostCSS 8.5.6, `tw-animate-css` 1.4.0.
- **Motion & Interaction**: Motion (Framer Motion v12.23.24) for spring physics, scroll-linked animations, and route transition wipes.
- **3D Graphics & Canvas Engine**: Three.js 0.187.0 with custom GLSL fragment/vertex shaders, ACESFilmic tone mapping, and Canvas 2D electrical particle simulation.
- **Typography**: Google Fonts via `next/font/google` (`Geist`, `Geist_Mono`, `Inter_Tight`, `Plus_Jakarta_Sans`).

### 1.3 State Management & Data Layer (Current)
- **Database Engine**: Local SQLite database located at `data/frxcx.db`.
- **ORM / Driver**: Drizzle ORM 0.45.4 with `@libsql/client` 0.18.0.
- **Data Model**: 26 relational tables defined in `lib/db/schema.ts` covering RBAC, authentication, sessions, brute-force logs, leads, notes, clients, work items, assignments, subtasks, comments, timeline, deliverables, time tracking, notifications, export presets, analytics, and settings.

### 1.4 Security, Cryptography & Validation
- **Password Hashing**: Argon2id via `hash-wasm` 4.12.0 (64MB memory, 3 iterations, 4 parallelism, server pepper).
- **Two-Factor Authentication**: TOTP via `otplib` 13.6.0 with encrypted Base32 secrets and QR code generation (`qrcode` 1.5.4).
- **PII Encryption at Rest**: AES-256-GCM authenticated encryption with deterministic HMAC-SHA256 blind indexing for queryable fields.
- **Input Validation**: Zod 4.6.7 for client and server schemas.
- **Password Strength Evaluation**: `@zxcvbn-ts/core` 4.2.0 and `@zxcvbn-ts/language-en` 4.1.1.

### 1.5 Reporting, Visualization & Utilities
- **Excel & CSV Engine**: ExcelJS 4.4.0 (multi-sheet workbook generator) and RFC 4180 CSV builder with formula injection defense.
- **Visualization**: Recharts 3.10.1 and custom SVG sparkline charts.
- **Icons**: Lucide React 0.553.0.

### 1.6 Directory Structure
```
frzzy-studio-website/
├── app/                              # Next.js App Router root
│   ├── layout.tsx                    # Root layout (dynamic theme & palette boot)
│   ├── page.tsx                      # Public Home ("/")
│   ├── about/page.tsx                # Public About ("/about")
│   ├── work/page.tsx                 # Public Work Index ("/work")
│   ├── work/[slug]/page.tsx          # Public Case Study ("/work/[slug]")
│   ├── services/page.tsx             # Public Services ("/services")
│   ├── contact/page.tsx              # Public Contact ("/contact")
│   ├── book/page.tsx                 # Public Scheduling ("/book")
│   ├── [adminPath]/                  # Studio Vault (Dynamic Admin Route)
│   │   ├── layout.tsx                # Vault root layout & theme wrapper
│   │   ├── login/page.tsx            # 2FA Admin Login portal
│   │   ├── invite/page.tsx           # Single-use invite redemption
│   │   ├── 403/page.tsx              # Forbidden / Privilege violation
│   │   └── (protected)/              # Authenticated Admin Zone (14 views)
│   │       ├── layout.tsx            # Protected shell with navigation & session check
│   │       ├── page.tsx              # Dashboard KPI overview
│   │       ├── leads/page.tsx        # Leads CRM & pipeline
│   │       ├── intake/page.tsx       # Work item intake converter
│   │       ├── clients/page.tsx      # Client directory & billing
│   │       ├── work-items/page.tsx   # Agency OS work items master board
│   │       ├── tasks/page.tsx        # Personal tasks & deliverables
│   │       ├── exports/page.tsx      # Lead export center
│   │       ├── reviews/page.tsx      # Testimonials manager
│   │       ├── appearance/page.tsx   # Palette & theme switcher
│   │       ├── users/page.tsx        # Team & admin management
│   │       ├── roles/page.tsx        # RBAC permissions matrix
│   │       ├── security/page.tsx     # Session & credential security
│   │       ├── audit/page.tsx        # Immutable audit log
│   │       └── settings/page.tsx     # Global studio settings
│   └── api/                          # Backend API endpoints (28 routes)
├── components/                       # React UI Components
│   ├── frzzy/                        # Active Public Site Components
│   ├── liquid/                       # Liquid effects & WebGL shaders
│   ├── admin/                        # Admin layout & modal dialogs
│   └── [11 legacy components]        # Unused components to be cleaned up
├── data/                             # Local SQLite database (frxcx.db)
├── lib/                              # Core business logic, db, auth, exports, security
├── public/                           # Static public media, videos, images
├── scripts/                          # Administrative CLI scripts
├── tests/                            # Node test runner suite (127 tests)
└── docs/                             # Engineering documentation
```

---

## 2. Public Website: Complete Section Inventory

The public website operates as an interactive single-page application with hash-based route switching and synchronized browser history, accompanied by standalone static entrypoints (`/`, `/about`, `/work`, `/work/[slug]`, `/services`, `/contact`, `/book`).

### Inventory of 7 Public Views & Sections

| View / Section | Purpose & Content | Components Used | Data Displayed | Forms & Buttons | Dynamic vs Static |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Home: Hero** | Studio introduction, animated wordmark, 3D bolt backdrop | `FrzzySite`, `HeroBackdrop`, `HeroStrandsCanvas`, `SvgSymbols` | Studio tagline, dynamic brand palette | "Explore Work", "Start a Project", Wordmark Zap click | Dynamic (WebGL / Canvas) |
| **2. Home: Showreel** | Continuous video reel showcase with custom player | `ShowreelPlayer`, `ShowreelStaticCanvas` | Video asset `/media/frzzy-showreel.mp4`, timecode | Mute/unmute toggle, fullscreen expand, loop | Dynamic (HTML5 video + canvas) |
| **3. Home: Selected Works** | Top client showcase with category tags | `ProjectCard`, `RevealOnScroll` | Featured project metadata (client, year, role) | Card click navigation to case studies | Dynamic (data-driven from `work-data.ts`) |
| **4. Home: Process** | 4-stage creative pipeline (Concept to Grade) | `ProcessSteps` | Step number, title, description, timeframes | Interactive tab selectors | Static content with interactive state |
| **5. Home: Capabilities** | Studio service disciplines & tech stack | `FrzzySite`, `ImageBand` | CGI, Motion, Brand Systems, Web | Category selection pills | Static metadata |
| **6. Home: Reviews** | Client testimonials & ratings | `StudioReviews` | Client quotes, authors, roles, ratings, badges | Filter buttons, platform links | Dynamic (fetched from `/api/reviews`) |
| **7. Home: FAQ** | Frequently asked client questions | `StudioFaq` | 6 accordion Q&As on budget, timeline, IP | Accordion expand/collapse buttons | Static content with interactive state |
| **8. Home: CTA & Footer** | Project inquiry invitation & studio links | `LiquidGradient`, `CookieConsent` | Copyright, status beacon, social links | "Book a Call", "Cookie Preferences" | Dynamic (shader + consent state) |
| **9. Work Index** | Full portfolio grid with category filtering | `FrzzySite`, `ProjectCard` | 6 case studies, tags, deliverables | Filter pills (All, 3D, Motion, Brand, Web) | Dynamic filtering |
| **10. Case Study Detail** | Deep dive into a specific client engagement | `FrzzySite`, `Viewport3D`, `WorkCardArt` | Client brief, art direction, 3D canvas, results | Next / Previous project navigators | Dynamic (slug-driven) |
| **11. Services Page** | Comprehensive deliverables, pricing, and process | `FrzzySite`, `StudioFaq` | 4 pillars: Motion, CGI, Brand Worlds, Web | "Start a Project", "Book Discovery" | Static metadata with interactive forms |
| **12. About Page** | Creative manifesto and team spotlight | `FrzzySite`, `RevealOnScroll` | Studio history, creative values, disciplines | Direct email inquiry buttons | Static content |
| **13. Contact Page** | Project intake form and studio coordinates | `FrzzySite` | Studio address, phone, email | First/Last Name, Email, Service, Message, Honeypot | Dynamic form (submits to `/api/contact`) |
| **14. Book Call Page** | Discovery call booking widget | `CalendlyEmbed` | Call preparation checklist, duration | Embedded Calendly iframe | Dynamic third-party embed |

---

## 3. Dashboard & Admin Panel: Module Inventory

The Studio Vault (`app/[adminPath]/`) is a secure operations platform for managing inquiries, clients, work production, and access control.

| Module | Route | Functionality | Data Read/Written | Working State | Deficiencies / Vulnerabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `login/page.tsx` | 2-step login: Argon2id password + TOTP 2FA | `admins`, `sessions`, `login_attempts` | Fully working | Local SQLite ephemeral storage |
| **Invite Portal** | `invite/page.tsx` | 24-hr single-use invite redemption | `invites`, `admins` | Working | ESLint `set-state-in-effect` warning |
| **Dashboard** | `page.tsx` | KPI summary, revenue metrics, recent leads | `leads`, `work_items`, `rollups` | Fully working | Depends on SQLite rollups |
| **Leads CRM** | `leads/page.tsx` | Lead management, status pipelines, search | `leads`, `lead_notes` | Fully working | Blind index search relies on local DB |
| **Intake Studio** | `intake/page.tsx` | Convert lead to work item (`AEV-2026-XXXX`) | `leads`, `work_items`, `clients` | Fully working | ESLint `set-state-in-effect` warning |
| **Client Directory**| `clients/page.tsx`| Client profile, GSTIN, billing, spend | `clients`, `work_items` | Fully working | ESLint `set-state-in-effect` warning |
| **Work Items** | `work-items/page.tsx` | Production master board with financial isolation | `work_items`, `admins` | Fully working | Missing cloud real-time updates |
| **Tasks & Kanban** | `tasks/page.tsx` | Assignee task list, subtasks, deliverables | `work_item_subtasks`, `comments` | Fully working | File uploads saved locally |
| **Export Center** | `exports/page.tsx` | ExcelJS 2-sheet workbook & CSV generator | `leads`, `exports_history` | Fully working | Export files stored on local disk |
| **Reviews Manager**| `reviews/page.tsx`| Testimonials CRUD with image compression | `settings` (`site_reviews`) | Fully working | Photos stored as base64 in JSON |
| **Appearance** | `appearance/page.tsx` | Palette switcher & liquid shader toggle | `settings` (`site_appearance`) | Fully working | Hydration token styling warning |
| **User Admin** | `users/page.tsx` | User management, invite, suspend, reset 2FA | `admins`, `roles`, `sessions` | Fully working | ESLint `set-state-in-effect` warning |
| **Roles & RBAC** | `roles/page.tsx` | Permission matrix & lead scope editor | `roles`, `admins` | Fully working | ESLint `set-state-in-effect` warning |
| **Security Center**| `security/page.tsx` | Session kill, password change (5 history), 2FA | `sessions`, `password_history` | Fully working | Session invalidation local only |
| **Audit Log** | `audit/page.tsx` | Immutable audit trail with JSON diff | `audit_logs` | Fully working | Local storage vulnerable to loss |
| **Settings** | `settings/page.tsx` | Studio metadata, notifications, webhooks | `settings` | Fully working | Standard key-value storage |

---

## 4. End-to-End Data Flows

```
[Public Visitor]
   │
   ├── (Contact Form) ──> POST /api/contact ──> Honeypot & Zod Check ──> AES-256-GCM Encrypt ──> DB: leads
   │
   ├── (Cookie Banner) ──> POST /api/analytics/consent ──> Set Cookie: frzzy_consent
   │
   └── (Telemetry) ──> POST /api/analytics/collect ──> Daily Salted Hash ──> DB: analytics_events
                                                                                     │
                                                                            (Nightly Rollup)
                                                                                     ▼
                                                                           DB: analytics_daily_rollups

[Admin User]
   │
   ├── (Login Step 1) ──> POST /api/admin/login ──> Brute-Force Check ──> Argon2id Verify ──> Prompt 2FA
   │
   ├── (Login Step 2) ──> POST /api/admin/2fa ──> Verify TOTP ──> Create Session ──> Set-Cookie: frzzy_admin_session
   │
   ├── (CRM Actions) ──> Session & RBAC Auth Check ──> DB Query with Scoping ──> Mask PII if Unauthorized
   │
   ├── (Work Intake) ──> Generate Atomic Ref (AEV-2026-XXXX) ──> DB: work_items ──> DB: work_item_assignments
   │
   └── (Export Leads) ──> Formula Sanitization ──> ExcelJS / CSV Stream ──> DB: exports_history
```

---

## 5. Problems & Vulnerabilities Identified

### 5.1 Architecture & Persistence (Critical)
- **Local SQLite File Vulnerability**: The application currently persists data to `data/frxcx.db` via `@libsql/client`. When deployed to serverless or container platforms (Firebase Hosting, Cloud Run, Vercel), the container filesystem is ephemeral; all leads, users, and work items will be lost on container restart or scale-out.
- **Database Locking under Concurrency**: `SQLITE_BUSY: database is locked` occurs during concurrent write operations (verified in test runs when multiple suites write in parallel).
- **No Native Cloud Row Level Security (RLS)**: Access control is enforced solely in the application layer. Direct database access lacks hardware-enforced isolation.

### 5.2 Build & Hydration Errors
- **Webpack Runtime Prerender Error**: `next build` fails with `TypeError: Cannot read properties of undefined (reading 'call')` at `webpack-runtime.js` when prerendering `/`. Caused by client-only canvas and WebGL components attempting to be evaluated synchronously during static generation.
- **Hydration Mismatch in Root Layout**: `<style id="palette-tokens">` generated in `app/layout.tsx` previously caused hydration mismatch warnings.

### 5.3 Code Quality & Linter Issues (17 Problems: 12 Errors, 5 Warnings)
- **React 19 / eslint-plugin-react-hooks v5 `react-hooks/set-state-in-effect`**:
  Calling `setState` synchronously within `useEffect` causes cascading renders in:
  - `app/[adminPath]/(protected)/clients/page.tsx:87:5`
  - `app/[adminPath]/(protected)/exports/page.tsx:105:5`
  - `app/[adminPath]/(protected)/intake/page.tsx:41:28`
  - `app/[adminPath]/(protected)/roles/page.tsx:87:5`
  - `app/[adminPath]/(protected)/tasks/page.tsx:130:7` & `202:5`
  - `app/[adminPath]/(protected)/users/page.tsx:148:5`
  - `app/[adminPath]/(protected)/work-items/page.tsx:85:5`
  - `app/[adminPath]/invite/page.tsx:40:7`
  - `components/admin/admin-layout-shell.tsx:65:5`
- **Unescaped HTML Entities**:
  `components/admin/edit-work-item-modal.tsx:455:79` contains unescaped quotes (`"`).
- **Missing Hook Dependencies (`react-hooks/exhaustive-deps`)**:
  Warnings in `leads`, `clients`, `tasks`, and `work-items` pages.

### 5.4 Dead Code & Redundant Data
- **11 Unused Template Components**: Identified in `components/`, completely disconnected from the application with zero imports.
- **Duplicate Testimonials**: `lib/hero-config.ts` contains hardcoded mock reviews (`HERO_REVIEWS`) that duplicate the dynamic database-backed review system in `lib/site-reviews.ts`.

---

## 6. Proposed Target Architecture & Deletion Plan

### 6.1 Target Supabase Architecture
- **Database**: Supabase PostgreSQL with versioned migrations in `supabase/migrations/`.
- **Row Level Security (RLS)**: Enforced on EVERY table. Default deny.
  - **Anon Key**: Insert-only for `leads` and `analytics_events`. Select-only for public `settings` and published `reviews`. No read access to private data.
  - **Authenticated Roles**: Full RBAC based on Supabase Auth JWT claims (`role = 'superadmin' | 'manager' | 'sales_executive' | 'viewer'`).
- **Data Access Layer**: Typed service client in `lib/supabase/` (`client.ts`, `server.ts`, `admin.ts`, `types.ts`).
- **Storage**: Private buckets for work deliverables (`deliverables`, `work-attachments`) and public bucket for `review-avatars`.

### 6.2 Target Deployment Architecture
- **Firebase Hosting**: Framework-aware Next.js SSR deployment.
- **Configuration**: `firebase.json`, `.firebaserc`, and custom build scripts.
- **Security Headers**: Strict CSP allowing Supabase, Calendly, and Google Fonts; HSTS, X-Frame-Options, X-Content-Type-Options.

### 6.3 Deletion List (11 Files, Verified 0 External Imports)
1. `components/hero-section.tsx` — Legacy hero, superseded by `components/frzzy/frzzy-site.tsx`.
2. `components/weichie-navbar.tsx` — Legacy navbar, superseded by `frzzy-site` navigation.
3. `components/creative-impact-section.tsx` — Legacy section, superseded by Capabilities.
4. `components/faq-section.tsx` — Legacy FAQ, superseded by `components/frzzy/studio-faq.tsx`.
5. `components/latest-works-section.tsx` — Legacy works, superseded by `project-card.tsx`.
6. `components/partnerships-section.tsx` — Legacy logos, superseded by brand assets.
7. `components/reviews-section.tsx` — Legacy reviews, superseded by `studio-reviews.tsx`.
8. `components/contact-booking-section.tsx` — Legacy contact, superseded by `frzzy-site` contact.
9. `components/inline-video-card.tsx` — Legacy card, superseded by `showreel-player.tsx`.
10. `components/smooth-scroll-provider.tsx` — Legacy scroll, superseded by native CSS scroll.
11. `components/studio-footer.tsx` — Legacy footer, superseded by `frzzy-site` footer.

---
*End of Phase 1 Analysis. Proceeding to Phase 2: Cleanup and Code Quality.*
