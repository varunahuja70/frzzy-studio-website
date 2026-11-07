# FRXCX Studio — Admin Vault, RBAC & Intelligence Guide

## 1. Overview
The **FRXCX Studio Vault** is an enterprise-grade administrative platform designed for luxury digital studios. It combines:
1. **Multi-Layer Zero-Trust Security**: Multi-factor authentication, progressive rate limiting, Argon2id with server pepper, AES-256-GCM encryption at rest, and audit logging.
2. **Granular Role-Based Access Control (RBAC)**: 19 resource-action permissions, custom role builder, database-enforced lead scoping, and field-level PII masking.
3. **Executive Lead Export Engine**: Branded 2-sheet Excel (.xlsx) workbooks via ExcelJS, RFC-compliant CSV with UTF-8 BOM, formula injection defense, live count preview, 1-click daily exports, and automated cron digests.
4. **Privacy-Preserving Analytics**: Real-time heartbeat telemetry, daily rotating hash anonymization, visitor timelines, scroll depth funnels, and conversion tracking.

Default Path: `http://localhost:3000/studio-vault` (Configured via `ADMIN_PATH` in `.env`).

---

## 2. Environment Configuration

```bash
# Path for the Admin Panel (default: 'studio-vault')
ADMIN_PATH="studio-vault"

# Server-Side Pepper for Argon2id Password Hashing (64-character secret)
ADMIN_PASSWORD_PEPPER="generate-a-strong-random-64-character-hex-secret-here"
# Optional: Graceful Zero-Downtime Pepper Rotation Support
PREVIOUS_ADMIN_PASSWORD_PEPPER=""

# Master Encryption Key for Client PII (AES-256-GCM - 32 bytes)
LEADS_ENCRYPTION_KEY="generate-a-strong-random-32-character-secret-here"

# Rotating Daily Salt Secret for Privacy-Friendly Analytics Visitor Hashes
ANALYTICS_SALT="generate-a-random-32-character-salt-here"

# Media Protection HMAC Signing Key
MEDIA_SIGNING_SECRET="generate-a-strong-hmac-sha256-media-signing-secret"

# Relational Database Location (Defaults to SQLite at data/frxcx.db)
DATABASE_URL="file:data/frxcx.db"
```

---

## 3. Module 1: User & Role Management (RBAC)

### 3.1 Permission Matrix (19 Granular Keys)

| Permission Key | Category | Description | Built-In Super Admin | Built-In Manager | Built-In Sales Exec | Built-In Viewer |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `dashboard:view_analytics` | Dashboard | View timeline traffic charts & engagement | Yes | Yes | No | Yes |
| `dashboard:view_kpis` | Dashboard | Inspect conversion rates, visits, inquiry totals | Yes | Yes | Yes | Yes |
| `dashboard:view_live` | Dashboard | Real-time active visitor telemetry | Yes | Yes | No | No |
| `leads:view` | Leads & CRM | Browse client inquiries & cards | Yes | Yes | Yes | Yes |
| `leads:view_contact` | Leads & CRM | View unmasked client email & full message | Yes | Yes | Yes | **No (Masked)** |
| `leads:create` | Leads & CRM | Manually add customer inquiries to pipeline | Yes | Yes | No | No |
| `leads:edit` | Leads & CRM | Modify inquiry service category & attributes | Yes | Yes | No | No |
| `leads:change_status` | Leads & CRM | Transition status (New, Won, Lost, etc.) | Yes | Yes | Yes | No |
| `leads:add_notes` | Leads & CRM | Append collaboration notes to inquiries | Yes | Yes | Yes | No |
| `leads:assign` | Leads & CRM | Delegate inquiries to team specialists | Yes | Yes | No | No |
| `leads:delete` | Leads & CRM | Permanently remove customer inquiries | Yes | No | No | No |
| `leads:bulk_actions` | Leads & CRM | Execute bulk status transitions / assignments | Yes | Yes | No | No |
| `leads:export` | Leads & CRM | Download workbooks & configure digests | Yes | Yes | No | No |
| `analytics:view` | Analytics | Inspect device, OS, sources, geo data | Yes | Yes | No | Yes |
| `analytics:export` | Analytics | Download raw analytics aggregate streams | Yes | Yes | No | No |
| `audit:view` | Security | Inspect tamper-evident administrative audit logs | Yes | Yes | No | No |
| `users:manage` | Security | Manage admins, roles, invites, credentials | **Super Admin Only** | No | No | No |
| `settings:view` | Settings | View studio integration links & parameters | Yes | Yes | No | No |
| `settings:edit` | Settings | Modify studio security flags & thresholds | Yes | No | No | No |

### 3.2 Database-Enforced Lead Scoping
Lead scoping is enforced directly in the database SQL `where` clause (`buildLeadScopeConditions`), guaranteeing that out-of-scope records are never leaked in counts, search, list, or direct ID lookups (IDOR protection):
- `assignedToMe`: When enabled (e.g. for Sales Executives), queries restrict `leads.assignedTo = currentAdmin.id`.
- `statuses`: Constrains returned records to an approved subset (e.g. `['new', 'contacted', 'in_progress']`).
- `sources`: Restricts inquiries to specific service categories (e.g. `['3D & Motion']`).
- `maxAgeDays`: Excludes stale inquiries older than $N$ days.

### 3.3 Field-Level Data Minimization
For roles without `leads:view_contact` (such as Viewers and external Analysts):
- **Email Masking**: Obfuscated as `j****e@c****y.com` using first and last character boundaries.
- **Message Masking**: Replaced with `Inquiry content protected: contact details masked due to role permissions [Restricted]`.
- Direct `mailto:` action buttons are disabled in the UI.

### 3.4 User Lifecycle & Credential Protections
1. **1-Time Cryptographic Temporary Password**: Generated via `crypto.randomBytes(18)` ensuring uppercase, lowercase, numbers, and symbols. Displayed exactly once in a modal with copy-to-clipboard, never logged, and hashed immediately with Argon2id.
2. **24-Hour Single-Use Invite Links**: Generates a high-entropy 32-byte hex token. Verification validates non-expiration and consumes the token atomically upon acceptance.
3. **Password History (FIFO Window of 5)**: Hashes of the previous 5 passwords are preserved in `password_history`. Attempting to reuse any of the last 5 passwords is rejected.
4. **Forced Password Change & 2FA Setup on First Login**: Flags `mustChangePassword` and `mustSetup2Fa` redirect first-time users to set their permanent credentials before dashboard access is permitted.
5. **Last Super Admin Lock**: The system checks active, non-deleted Super Admins. Demoting, disabling, or deleting the final Super Admin is blocked at the database engine level.

---

## 4. Module 2: Premium Lead Export Engine

### 4.1 Excel (.xlsx) Two-Sheet Architecture
Compiled with `ExcelJS` featuring professional executive formatting:
- **Sheet 1 ("Summary")**:
  - Branded Studio header bar (`#12110b` dark fill with white typography).
  - Generation metadata: Timestamp, generating admin email, active date range.
  - 4 KPI metric cards: Total Inquiries, Converted (Won), Win Rate %, and In Progress count.
  - Status Breakdown Table with alternating banded rows and percentage shares.
  - Category / Service breakdown table.
- **Sheet 2 ("Leads")**:
  - Frozen header row (`ySplit: 1`) allowing scrolling while column headers remain sticky.
  - Native Excel auto-filter enabled across all active columns.
  - Auto-calculated column widths preventing text truncation.
  - Clickable `mailto:` hyperlinks on client email cells.
  - Colored status pills matching studio theme (New = Blue, Won = Green, Contacted = Amber, Lost = Red).
  - Formula Injection Sanitization: Any cell starting with `=`, `+`, `-`, or `@` is prefixed with a single quote (`'`).

### 4.2 Universal CSV (.csv) Architecture
- RFC 4180 compliant with UTF-8 Byte Order Mark (`\uFEFF`) ensuring Microsoft Excel, Apple Numbers, and Google Sheets correctly parse symbols without character corruption.
- Complete formula injection escaping on all text cells.

### 4.3 Export Workflows
- **1-Click Quick Exports**: Dedicated buttons on the Exports Hub (`/studio-vault/exports`) to download "Today's Inquiries" or "Yesterday's Full Day Batch" in one click.
- **Custom Export Builder**: Interactive modal with format toggle, date range filters (All time, Today, Yesterday, 7D, 30D, Custom), status multi-select, column picker with select/deselect all, and live matching row count preview.
- **Export Presets**: Save recurring filter/column combinations for instant re-use.
- **Scheduled Daily Digests**: Configure automated morning reports (default time: `08:00 AM`, default timezone: `Asia/Kolkata`), delivered to management recipients.
- **Historical Archive**: Local retention of compiled exports with re-download capabilities and file integrity checks.

---

## 5. Module 3: UI Design System & Component Refinement

Consistent with the studio's luxury aesthetic:
- **Color Discipline**: Strict `#12110b` dark background, `#181712` card surface, `#f4efea` neutral typography, with `#ff4f31` electric coral accent.
- **Strict 8px Grid**: Spacing, margins, and padding follow exact 8px increments (8, 16, 24, 32, 48px).
- **Subtle Glassmorphism**: High-performance backdrop blurs with low-opacity borders (`border-white/[0.08]`), avoiding excessive glows or cartoonish AI elements.
- **Custom 403 Forbidden Screen**: Polished studio-themed error state at `/[adminPath]/403` with return navigation and security context.
- **Accessible Interactions**: High-contrast active rings, keyboard escape dismissal on modals and drawers, and native screen-reader accessible elements.

### Site Appearance (public website look)

`/studio-vault/appearance` (sidebar: **Site Appearance**) controls how the public website looks for **every visitor**:

| Setting | Options |
|---|---|
| Look | Mac (rounded, glassy) · Studio (original hard-edged FRZZY) |
| Scroll | Stack (sections slide over each other) · Normal |
| Hero strands | Off · On |
| Colour palette | 12 complete themes (9 dark, 3 light), all contrast-checked |

- **Permissions**: `settings:view` opens the page (read-only); `settings:edit` is required to save.
- **Live preview**: shows the real site with your selection (desktop or mobile) before anything is saved. Previews are not counted in analytics.
- **Save & publish**: stored in the `settings` table (key `site_appearance`) and live within ~10 seconds; every change is written to the audit log as `SETTINGS_UPDATED` with before/after values.
- **Defaults** (used until something is saved, or via *Reset to defaults*): Volt · Mac · Stack · Strands off — defined in `lib/palette.ts`, where new palettes can also be added.
- **Preview links**: any page URL accepts `?palette=…&look=…&scroll=…&strands=…` for a one-off preview; it is never saved and visitors cannot change the live appearance.

### Client Reviews (home page "What clients say")

`/studio-vault/reviews` (sidebar: **Reviews**) manages the reviews shown on the home page:

- **Add review**: name, role, company/brand, review text (10–800 characters), 1–5 star rating, where it was posted (X, Instagram, LinkedIn, website or no icon) with an optional link, an optional photo, and *Show on the website*. A live preview shows the card exactly as it will look on the site.
- **Photos** are cropped to a square and compressed in the browser (320×320 WebP, typically 20–40 KB), then stored with the review. Without a photo, the person's initials are shown.
- **Per review**: *Edit*, *Hide* / *Show on site*, *Delete* (asks for confirmation), and ↑ ↓ to change the order on the site. Up to 30 reviews.
- **On the site**: only reviews marked *Show on site* appear; the whole section is hidden while none are shown. Changes appear within ~15 seconds.
- **Permissions**: `settings:view` to see the page, `settings:edit` to change anything. Every change is written to the audit log (`SETTINGS_UPDATED`, resource `site_reviews`).
- **Storage**: `settings` table, key `site_reviews`. Public API: `GET /api/reviews` (published only) and `GET /api/reviews/{id}/photo`.
- Only publish genuine reviews the client has agreed to share.

---

## 6. Secret Rotation & Zero-Downtime Key Lifecycle

### 6.1 Server-Side Password Pepper (`ADMIN_PASSWORD_PEPPER`) Rotation
When rotating the server-side password pepper:
1. Copy the current `ADMIN_PASSWORD_PEPPER` value into `PREVIOUS_ADMIN_PASSWORD_PEPPER` in the production environment.
2. Generate a new high-entropy 64-character hex secret and set it as `ADMIN_PASSWORD_PEPPER`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Deploy the application. `verifyPassword()` checks the new pepper first, and seamlessly falls back to `PREVIOUS_ADMIN_PASSWORD_PEPPER` if an existing hash was computed with the prior pepper.
4. When users log in or change their passwords, their hashes are automatically re-computed with the new active pepper.
5. Once all active credentials have migrated or after a maintenance window, unset `PREVIOUS_ADMIN_PASSWORD_PEPPER`.

### 6.2 Mandatory TOTP 2FA Enforcement & Emergency Recovery
- 2FA is strictly non-bypassable across all accounts.
- Emergency recovery codes are single-use SHA-256 hashed tokens.
- To revoke all active sessions and mandate fresh password & 2FA enrollment:
  ```bash
  npm run admin:reset-password -- --email <admin-email>
  ```

### 6.3 Security Startup Guard
The application enforces strict runtime invariants on boot via `runStartupSecurityGuard()` in `lib/auth/startup-guard.ts`:
- Refuses to boot in production if `ADMIN_PASSWORD_PEPPER` is shorter than 32 characters or uses insecure substrings.
- Refuses to boot if any admin account has 2FA disabled (`two_factor_enabled = 0`).
- Validates database schema integrity and role hierarchies.

---

## 7. Verification & Automated Test Suites

Run the complete test suite:
```bash
npx tsx --test --test-concurrency=1 tests/*.test.ts
```

| Test Suite | Description | Status |
| :--- | :--- | :---: |
| `tests/security-2fa-enforcement.test.ts` | Mandatory TOTP 2FA, single-use recovery codes, bypass attempt rejection, startup guard | Passed (7/7) |
| `tests/rbac-permissions.test.ts` | Role inheritance, custom +/- overrides, privilege escalation defense, last Super Admin lock | Passed (4/4) |
| `tests/lead-scope-enforcement.test.ts` | Status filtering, assigned-to-me scoping, date bounding, IDOR protection | Passed (4/4) |
| `tests/field-masking.test.ts` | Email redaction, inquiry message redaction | Passed (2/2) |
| `tests/user-lifecycle-security.test.ts` | Temporary password entropy, password history (window of 5), single-use invites | Passed (4/4) |
| `tests/excel-lead-export.test.ts` | ExcelJS 2-sheet validation, frozen panes, mailto links, formula injection defense, CSV UTF-8 BOM | Passed (3/3) |
| `tests/admin-security-full.test.ts` | Argon2id 64MB memory, TOTP, recovery codes, progressive lockout, AES-256-GCM | Passed (20/20) |
| `tests/security-performance.test.ts` | Honeypot anti-bot shield, media token crypto, mathematical transforms | Passed (8/8) |
| **Total Automated Tests** | **Comprehensive End-to-End Suite** | **52 / 52 Passed** |

Type checking:
```bash
npx tsc --noEmit
# Result: 0 errors
```

Production build:
```bash
npm run build
# Result: 26/26 routes compiled successfully
```
