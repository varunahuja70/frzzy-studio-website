import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// ================= ADMINS =================
export const admins = sqliteTable(
  'admins',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    salt: text('salt').notNull(),
    twoFactorSecret: text('two_factor_secret'), // Base32 TOTP secret (encrypted)
    twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false),
    role: text('role').notNull().default('superadmin'), // 'superadmin' | 'editor'
    status: text('status').notNull().default('active'), // 'active' | 'suspended' | 'disabled'
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    emailIdx: index('idx_admins_email').on(table.email),
    statusIdx: index('idx_admins_status').on(table.status),
  })
);

// ================= SESSIONS =================
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(), // Session ID
    adminId: text('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(), // SHA-256 of session secret
    ipAddress: text('ip_address').notNull(),
    userAgent: text('user_agent').notNull(),
    expiresAt: integer('expires_at').notNull(), // Absolute expiry (8 hours)
    lastActiveAt: integer('last_active_at').notNull(), // Idle expiry tracking (15 minutes)
    twoFactorVerified: integer('two_factor_verified', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    adminIdIdx: index('idx_sessions_admin_id').on(table.adminId),
    tokenHashIdx: index('idx_sessions_token_hash').on(table.tokenHash),
    expiresAtIdx: index('idx_sessions_expires_at').on(table.expiresAt),
  })
);

// ================= LOGIN ATTEMPTS (BRUTE-FORCE PROTECTION) =================
export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    ipAddress: text('ip_address').notNull(),
    success: integer('success', { mode: 'boolean' }).notNull(),
    reason: text('reason'), // 'invalid_password' | 'invalid_2fa' | 'locked_out' | 'success'
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    ipIdx: index('idx_login_attempts_ip').on(table.ipAddress),
    emailIdx: index('idx_login_attempts_email').on(table.email),
    createdAtIdx: index('idx_login_attempts_created_at').on(table.createdAt),
  })
);

// ================= RECOVERY CODES =================
export const recoveryCodes = sqliteTable(
  'recovery_codes',
  {
    id: text('id').primaryKey(),
    adminId: text('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(), // SHA-256 of recovery code
    used: integer('used', { mode: 'boolean' }).notNull().default(false),
    usedAt: integer('used_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    adminIdIdx: index('idx_recovery_codes_admin_id').on(table.adminId),
    codeHashIdx: index('idx_recovery_codes_hash').on(table.codeHash),
  })
);

// ================= AUDIT LOGS =================
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    adminId: text('admin_id'),
    action: text('action').notNull(), // 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'EXPORT_LEADS', etc.
    resource: text('resource'),
    details: text('details'), // JSON string
    ipAddress: text('ip_address').notNull(),
    userAgent: text('user_agent'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    adminIdIdx: index('idx_audit_logs_admin_id').on(table.adminId),
    actionIdx: index('idx_audit_logs_action').on(table.action),
    createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
  })
);

// ================= LEADS (ENCRYPTED PII AT REST) =================
export const leads = sqliteTable(
  'leads',
  {
    id: text('id').primaryKey(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    emailEncrypted: text('email_encrypted').notNull(), // AES-256-GCM
    emailBlindIndex: text('email_blind_index').notNull(), // HMAC-SHA256 for fast indexed searching
    category: text('category').notNull(), // 'Web Design & Dev', etc.
    messageEncrypted: text('message_encrypted').notNull(), // AES-256-GCM
    status: text('status').notNull().default('new'), // 'new' | 'contacted' | 'in_progress' | 'won' | 'lost' | 'spam'
    sourcePage: text('source_page').default('/'),
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    deviceType: text('device_type'),
    browser: text('browser'),
    os: text('os'),
    country: text('country').default('Unknown'),
    ipMasked: text('ip_masked'), // Masked IP e.g. "192.168.xxx.xxx"
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    emailIndexIdx: index('idx_leads_blind_email').on(table.emailBlindIndex),
    statusIdx: index('idx_leads_status').on(table.status),
    createdAtIdx: index('idx_leads_created_at').on(table.createdAt),
  })
);

// ================= LEAD NOTES =================
export const leadNotes = sqliteTable(
  'lead_notes',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    adminId: text('admin_id').notNull().references(() => admins.id),
    content: text('content').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    leadIdIdx: index('idx_lead_notes_lead_id').on(table.leadId),
  })
);

// ================= ANALYTICS EVENTS (FIRST-PARTY, PRIVACY-FRIENDLY) =================
export const analyticsEvents = sqliteTable(
  'analytics_events',
  {
    id: text('id').primaryKey(),
    visitorHash: text('visitor_hash').notNull(), // Daily salted rotating hash
    sessionId: text('session_id').notNull(),
    eventType: text('event_type').notNull(), // 'pageview' | 'click' | 'scroll' | 'time'
    target: text('target'), // Target CTA or element name (data-track attribute)
    path: text('path').notNull().default('/'),
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    deviceType: text('device_type'),
    browser: text('browser'),
    os: text('os'),
    country: text('country').default('Unknown'),
    metadata: text('metadata'), // JSON string (scroll depth %, time on page, etc.)
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    eventTypeIdx: index('idx_analytics_event_type').on(table.eventType),
    createdAtIdx: index('idx_analytics_created_at').on(table.createdAt),
    visitorHashIdx: index('idx_analytics_visitor_hash').on(table.visitorHash),
  })
);

// ================= ANALYTICS DAILY ROLLUPS =================
export const analyticsDailyRollups = sqliteTable(
  'analytics_daily_rollups',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull().unique(), // YYYY-MM-DD
    pageviews: integer('pageviews').notNull().default(0),
    visitors: integer('visitors').notNull().default(0),
    sessions: integer('sessions').notNull().default(0),
    clicks: integer('clicks').notNull().default(0),
    leadsCount: integer('leads_count').notNull().default(0),
    avgSessionSeconds: integer('avg_session_seconds').notNull().default(0),
    bounceRatePercent: integer('bounce_rate_percent').notNull().default(0),
    metricsJson: text('metrics_json'), // Breakdown by device, top clicks, traffic sources
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    dateIdx: index('idx_rollups_date').on(table.date),
  })
);

// ================= SETTINGS =================
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
