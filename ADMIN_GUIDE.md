# FRXCX Studio — Admin Vault, Analytics & Security Guide

## 1. Overview
The **FRXCX Studio Vault** is an enterprise-grade, multi-layer administrative panel with a real-time privacy-friendly analytics dashboard and an encrypted client leads management system. It is housed under a non-obvious, configurable route (default: `/studio-vault`), hidden from search crawlers (`noindex, nofollow`, robots exclusion), and styled with the exact design system of the public website.

---

## 2. Environment Variables & Secret Configuration

Copy `.env.example` to `.env` and configure the following keys:

```bash
# Path for the Admin Panel (default is 'studio-vault', never obvious like '/admin')
ADMIN_PATH="studio-vault"

# Server-Side Pepper for Argon2id Password Hashing (64-character secret)
ADMIN_PASSWORD_PEPPER="generate-a-strong-random-64-character-hex-secret-here"

# Master Encryption Key for Client PII (AES-256-GCM)
LEADS_ENCRYPTION_KEY="generate-a-strong-random-32-character-secret-here"

# Rotating Daily Salt Secret for Privacy-Friendly Analytics Visitor Hashes
ANALYTICS_SALT="generate-a-random-32-character-salt-here"

# Media Protection HMAC Signing Key
MEDIA_SIGNING_SECRET="generate-a-strong-hmac-sha256-media-signing-secret"

# Relational Database Location (Defaults to SQLite at data/frxcx.db)
DATABASE_URL="file:data/frxcx.db"
```

---

## 3. Creating the First Admin & Enrolling 2FA

In accordance with strict security architecture, there are **no default credentials** and public registration is disabled. You must create the initial administrator via the authenticated CLI tool:

```bash
npm run admin:create
```

You will be prompted for:
1. **Admin Email** (e.g. `admin@frxcxstudio.com`)
2. **Admin Password** (minimum 12 characters, checked against `zxcvbn` entropy and the HaveIBeenPwned breach database)

The tool will output:
- **TOTP Authenticator Secret & Key URI**: Scan the QR code or enter the secret into Google Authenticator, Apple Passwords, or 1Password.
- **10 Emergency Single-Use Recovery Codes**: Formatted as `XXXX-XXXX-XXXX`. Save these securely in a password manager. Each code can be used exactly once.

---

## 4. Administrative CLI Commands

- **Create New Administrator**:
  ```bash
  npm run admin:create
  # or non-interactive:
  npm run admin:create -- --email admin@frxcxstudio.com --password "YourStrongPassword2026!"
  ```

- **Reset Administrator Password**:
  ```bash
  npm run admin:reset-password -- --email admin@frxcxstudio.com
  ```
  *(Invalidates all existing sessions immediately across all devices).*

- **Disable Administrator Account**:
  ```bash
  npm run admin:disable -- admin@frxcxstudio.com
  ```

---

## 5. Security Architecture & Multi-Layer Defense

1. **Argon2id Key Derivation**:
   - Memory cost: 64 MB (`m=65536`)
   - Time cost: 3 iterations
   - Parallelism: 4 threads
   - Server-side pepper from environment variables + unique cryptographically secure per-user salt.

2. **Breached Password Protection**:
   - Enforces k-Anonymity checks via HaveIBeenPwned API (only first 5 chars of SHA-1 are ever transmitted; full password is never sent).

3. **Mandatory Two-Factor Authentication (TOTP)**:
   - RFC 6238 standard TOTP (30-second window drift allowance).
   - Single-use SHA-256 hashed recovery codes.
   - Login is mathematically impossible without completing Step 2.

4. **Progressive Brute-Force Lockout**:
   - 5 failed attempts within 1 hour: 5-minute lockout.
   - 8 failed attempts: 15-minute lockout.
   - 10+ failed attempts: 60-minute lockout.
   - Equalized response timing (~450ms) to prevent user-enumeration timing attacks.

5. **Session Fixation & Timeout Protections**:
   - Session ID is regenerated upon completing 2FA.
   - Idle timeout: 15 minutes of user inactivity terminates the session.
   - Warning modal appears at 13 minutes with countdown timer.
   - Absolute timeout: 8 hours maximum session life.
   - `HttpOnly`, `SameSite=Strict`, `Secure` cookies (`__Host-` standard compatible).

6. **AES-256-GCM Encryption at Rest**:
   - Client lead emails and inquiry messages are encrypted at rest with unique 12-byte IVs and authentication tags.
   - Blind Index (HMAC-SHA256) enables instant indexed lookup without decrypting the entire database.

7. **CSV Formula Injection Mitigation**:
   - All exported cells beginning with formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically prefixed with a single quote (`'`), neutralizing spreadsheet code execution.

8. **Tamper-Evident Audit Trail**:
   - Every login, failed attempt, lockout, recovery code use, status change, and data export is immutably logged with masked IP and user agent.

---

## 6. How to Read the Analytics Dashboard

Navigate to `http://localhost:3000/studio-vault`:
- **KPI Row**: Displays Total Visitors, Unique Visitors, Page Views, Total Clicks, CTA Conversion Rate, Total Inquiries, Unread Leads, and Avg Session Duration with percentage change indicators.
- **Time Filter**: Toggle between `Today`, `7D`, `30D`, and `90D` to view historical performance trends without page reloads.
- **Live Visitors Now**: Displays real-time active users over the last 5 minutes and a streaming live activity feed.
- **Device & Country Breakdown**: Visualizes mobile vs. desktop visitor ratios.
- **Scroll Funnel**: Tracks the drop-off from 25% down to 100% completion of the page.

---

## 7. How to Manage Client Leads

Navigate to `http://localhost:3000/studio-vault/leads`:
- **Search & Filter**: Search by client name, email, or category; filter by status (`New`, `Contacted`, `In Progress`, `Won`, `Lost`, `Spam`).
- **Status Change**: Click the status badge to switch statuses optimistically.
- **Lead Drawer**: Click any row to view decrypted client project requirements, sender device metadata, and internal notes history.
- **One-Click Reply**: Click "Reply" to launch a pre-populated email client (`mailto:`) directed to the client.
- **Export CSV**: Securely downloads all inquiries. Requires confirming your admin password via the Re-Authentication modal.
