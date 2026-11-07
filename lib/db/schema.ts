import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// ================= ROLES (BUILT-IN & CUSTOM RBAC) =================
export const roles = sqliteTable(
  'roles',
  {
    id: text('id').primaryKey(), // 'superadmin' | 'manager' | 'sales_executive' | 'viewer' | custom-uuid
    name: text('name').notNull().unique(),
    description: text('description'),
    isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
    permissions: text('permissions').notNull(), // JSON string array of permission keys
    defaultLeadScope: text('default_lead_scope'), // JSON string of LeadScopeConfig
    ipAllowlist: text('ip_allowlist'), // Comma-separated IP addresses or CIDRs
    sessionTimeoutMinutes: integer('session_timeout_minutes').default(60),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    nameIdx: index('idx_roles_name').on(table.name),
  })
);

// ================= ADMINS =================
export const admins = sqliteTable(
  'admins',
  {
    id: text('id').primaryKey(),
    name: text('name'), // Display name e.g. "Varun"
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    salt: text('salt').notNull(),
    twoFactorSecret: text('two_factor_secret'), // Base32 TOTP secret (encrypted)
    twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(true),
    mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
    mustSetup2Fa: integer('must_setup_2fa', { mode: 'boolean' }).notNull().default(false),
    role: text('role').notNull().default('superadmin'), // References roles.id
    customPermissions: text('custom_permissions'), // JSON string array of explicit permission overrides
    leadScope: text('lead_scope'), // JSON string of LeadScopeConfig
    status: text('status').notNull().default('active'), // 'active' | 'suspended' | 'disabled'
    expiresAt: integer('expires_at'), // Optional account expiry timestamp
    deletedAt: integer('deleted_at'), // Soft-delete support
    lastLoginAt: integer('last_login_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    emailIdx: index('idx_admins_email').on(table.email),
    statusIdx: index('idx_admins_status').on(table.status),
    roleIdx: index('idx_admins_role').on(table.role),
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

// ================= PASSWORD HISTORY (PREVENTS REUSING LAST 5) =================
export const passwordHistory = sqliteTable(
  'password_history',
  {
    id: text('id').primaryKey(),
    adminId: text('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
    passwordHash: text('password_hash').notNull(),
    salt: text('salt').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    adminIdIdx: index('idx_password_history_admin_id').on(table.adminId),
    createdAtIdx: index('idx_password_history_created_at').on(table.createdAt),
  })
);

// ================= INVITES (ONE-TIME SECURE LINKS, 24HR EXPIRY) =================
export const invites = sqliteTable(
  'invites',
  {
    id: text('id').primaryKey(),
    adminId: text('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(), // SHA-256 of invite secret
    expiresAt: integer('expires_at').notNull(), // 24 hours expiry
    used: integer('used', { mode: 'boolean' }).notNull().default(false),
    usedAt: integer('used_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    adminIdIdx: index('idx_invites_admin_id').on(table.adminId),
    tokenHashIdx: index('idx_invites_token_hash').on(table.tokenHash),
  })
);

// ================= AUDIT LOGS =================
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    adminId: text('admin_id'),
    action: text('action').notNull(), // 'LOGIN_SUCCESS', 'USER_CREATED', 'ROLE_MODIFIED', 'EXPORT_LEADS', etc.
    resource: text('resource'),
    details: text('details'), // JSON string with before/after state
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
    assignedTo: text('assigned_to'), // References admins.id for "assigned-to-me" scope
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
    assignedToIdx: index('idx_leads_assigned_to').on(table.assignedTo),
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

// ================= EXPORT PRESETS =================
export const exportPresets = sqliteTable(
  'export_presets',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    adminId: text('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
    columns: text('columns').notNull(), // JSON array of column keys
    filters: text('filters').notNull(), // JSON string of filter parameters
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    adminIdIdx: index('idx_export_presets_admin_id').on(table.adminId),
  })
);

// ================= EXPORTS HISTORY =================
export const exportsHistory = sqliteTable(
  'exports_history',
  {
    id: text('id').primaryKey(),
    adminId: text('admin_id').notNull().references(() => admins.id),
    adminEmail: text('admin_email').notNull(),
    format: text('format').notNull(), // 'xlsx' | 'csv' | 'pdf'
    filters: text('filters').notNull(), // JSON string
    columns: text('columns').notNull(), // JSON string array
    rowCount: integer('row_count').notNull(),
    filePath: text('file_path'),
    fileName: text('file_name').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    adminIdIdx: index('idx_exports_history_admin_id').on(table.adminId),
    createdAtIdx: index('idx_exports_history_created_at').on(table.createdAt),
  })
);

// ================= SCHEDULED EXPORTS =================
export const scheduledExports = sqliteTable(
  'scheduled_exports',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    scheduleCron: text('schedule_cron').notNull().default('0 8 * * *'), // Default 8:00 AM
    timezone: text('timezone').notNull().default('Asia/Kolkata'),
    format: text('format').notNull().default('xlsx'),
    recipients: text('recipients').notNull(), // JSON string array of email addresses
    filters: text('filters'), // JSON string of filters (e.g. status, presets)
    columns: text('columns'), // JSON string array of columns
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    lastRunAt: integer('last_run_at'),
    nextRunAt: integer('next_run_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    enabledIdx: index('idx_scheduled_exports_enabled').on(table.enabled),
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

// ================= CLIENTS DIRECTORY =================
export const clients = sqliteTable(
  'clients',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    company: text('company'),
    billingAddress: text('billing_address'),
    gstin: text('gstin'),
    notes: text('notes'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    nameIdx: index('idx_clients_name').on(table.name),
    emailIdx: index('idx_clients_email').on(table.email),
  })
);

// ================= WORK ITEMS (JOBS / TASKS / DELIVERIES) =================
export const workItems = sqliteTable(
  'work_items',
  {
    id: text('id').primaryKey(),
    itemNumber: text('item_number').notNull().unique(), // e.g. AEV-2026-0001
    leadId: text('lead_id').references(() => leads.id),
    clientId: text('client_id').references(() => clients.id),
    clientName: text('client_name').notNull(),
    clientEmail: text('client_email'),
    clientPhone: text('client_phone'),
    clientCompany: text('client_company'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    source: text('source').notNull().default('Website'),
    isPersonal: integer('is_personal', { mode: 'boolean' }).notNull().default(false),
    priority: text('priority').notNull().default('normal'), // 'low' | 'normal' | 'high' | 'urgent'
    status: text('status').notNull().default('assigned'), // 'assigned' | 'accepted' | 'in_progress' | 'in_review' | 'completed' | 'delivered' | 'on_hold' | 'cancelled'
    progressPercent: integer('progress_percent').notNull().default(0), // 0 to 100
    dueDate: integer('due_date'),
    tags: text('tags'), // JSON string array
    links: text('links'), // JSON string array of { id, label, url, domain, addedBy, addedAt }
    customFields: text('custom_fields'), // JSON object
    version: integer('version').notNull().default(1), // Optimistic concurrency control

    // Financial Layer (Strict isolation, non-assignee)
    quotedPrice: integer('quoted_price').default(0),
    finalPrice: integer('final_price').default(0),
    discount: integer('discount').default(0),
    taxPercent: integer('tax_percent').default(0),
    currency: text('currency').notNull().default('INR'),
    paymentStatus: text('payment_status').notNull().default('unpaid'), // 'unpaid' | 'partially_paid' | 'paid'
    amountReceived: integer('amount_received').default(0),
    balanceDue: integer('balance_due').default(0),
    paymentMethod: text('payment_method'),
    deliveryNotes: text('delivery_notes'),
    deliveredAt: integer('delivered_at'),
    deliveredBy: text('delivered_by').references(() => admins.id),
    completedAt: integer('completed_at'),
    invoiceReference: text('invoice_reference'), // Sequential reference e.g. AEV-2026-0001
    invoiceDetails: text('invoice_details'), // JSON object

    // Assignment & Shared Fields
    assignedTo: text('assigned_to').references(() => admins.id),
    assignedBy: text('assigned_by').references(() => admins.id),
    assignedByName: text('assigned_by_name'),
    assignedByRole: text('assigned_by_role'),
    assignedAt: integer('assigned_at'),
    sharedFields: text('shared_fields').notNull().default('[]'), // JSON array of field keys
    assignmentInstructions: text('assignment_instructions'),

    // Soft delete & tracking
    deletedAt: integer('deleted_at'),
    deletedBy: text('deleted_by').references(() => admins.id),
    createdBy: text('created_by').notNull().references(() => admins.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    itemNumberIdx: index('idx_work_items_item_number').on(table.itemNumber),
    assignedToIdx: index('idx_work_items_assigned_to').on(table.assignedTo),
    statusIdx: index('idx_work_items_status').on(table.status),
    priorityIdx: index('idx_work_items_priority').on(table.priority),
    isPersonalIdx: index('idx_work_items_is_personal').on(table.isPersonal),
    createdByIdx: index('idx_work_items_created_by').on(table.createdBy),
    dueDateIdx: index('idx_work_items_due_date').on(table.dueDate),
    deletedAtIdx: index('idx_work_items_deleted_at').on(table.deletedAt),
  })
);

// ================= WORK ITEM ASSIGNMENTS HISTORY =================
export const workItemAssignments = sqliteTable(
  'work_item_assignments',
  {
    id: text('id').primaryKey(),
    workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
    assignedTo: text('assigned_to').notNull().references(() => admins.id),
    assignedBy: text('assigned_by').notNull().references(() => admins.id),
    assignedByName: text('assigned_by_name').notNull(),
    assignedByRole: text('assigned_by_role').notNull(),
    sharedFields: text('shared_fields').notNull(),
    instructions: text('instructions'),
    priority: text('priority').notNull(),
    dueDate: integer('due_date'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    workItemIdIdx: index('idx_wi_assignments_work_item_id').on(table.workItemId),
    assignedToIdx: index('idx_wi_assignments_assigned_to').on(table.assignedTo),
  })
);

// ================= WORK ITEM SUBTASKS (CHECKLIST) =================
export const workItemSubtasks = sqliteTable(
  'work_item_subtasks',
  {
    id: text('id').primaryKey(),
    workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    workItemIdIdx: index('idx_wi_subtasks_work_item_id').on(table.workItemId),
  })
);

// ================= WORK ITEM COMMENTS =================
export const workItemComments = sqliteTable(
  'work_item_comments',
  {
    id: text('id').primaryKey(),
    workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
    adminId: text('admin_id').notNull().references(() => admins.id),
    adminName: text('admin_name').notNull(),
    adminRole: text('admin_role').notNull(),
    content: text('content').notNull(),
    isInternalOnly: integer('is_internal_only', { mode: 'boolean' }).notNull().default(false),
    mentions: text('mentions'), // JSON array of admin IDs
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    workItemIdIdx: index('idx_wi_comments_work_item_id').on(table.workItemId),
  })
);

// ================= WORK ITEM TIMELINE (AUDIT / ACTIVITY STREAM) =================
export const workItemTimeline = sqliteTable(
  'work_item_timeline',
  {
    id: text('id').primaryKey(),
    workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').notNull().references(() => admins.id),
    actorName: text('actor_name').notNull(),
    actorRole: text('actor_role').notNull(),
    action: text('action').notNull(), // 'assigned' | 'status_changed' | 'progress_updated' | 'delivered' | etc.
    details: text('details'), // JSON string with before/after state
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    workItemIdIdx: index('idx_wi_timeline_work_item_id').on(table.workItemId),
    createdAtIdx: index('idx_wi_timeline_created_at').on(table.createdAt),
  })
);

// ================= WORK ITEM ATTACHMENTS & DELIVERABLES =================
export const workItemAttachments = sqliteTable(
  'work_item_attachments',
  {
    id: text('id').primaryKey(),
    workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
    uploaderId: text('uploader_id').notNull().references(() => admins.id),
    fileName: text('file_name').notNull(),
    storagePath: text('storage_path').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    mimeType: text('mime_type').notNull(),
    isDeliverable: integer('is_deliverable', { mode: 'boolean' }).notNull().default(false),
    revision: integer('revision').notNull().default(1),
    approvalStatus: text('approval_status').notNull().default('pending'), // 'pending' | 'approved' | 'changes_requested'
    approvalFeedback: text('approval_feedback'),
    isQuarantined: integer('is_quarantined', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    workItemIdIdx: index('idx_wi_attachments_work_item_id').on(table.workItemId),
  })
);

// ================= SHARE TEMPLATES =================
export const shareTemplates = sqliteTable(
  'share_templates',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    createdBy: text('created_by').notNull().references(() => admins.id),
    fields: text('fields').notNull(), // JSON string array of field keys
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    nameIdx: index('idx_share_templates_name').on(table.name),
  })
);

// ================= TIME LOGS (TIME TRACKING) =================
export const workItemTimeLogs = sqliteTable(
  'work_item_time_logs',
  {
    id: text('id').primaryKey(),
    workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
    adminId: text('admin_id').notNull().references(() => admins.id),
    durationSeconds: integer('duration_seconds').notNull(),
    description: text('description'),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    workItemIdIdx: index('idx_wi_time_logs_work_item_id').on(table.workItemId),
    adminIdIdx: index('idx_wi_time_logs_admin_id').on(table.adminId),
  })
);

// ================= NOTIFICATIONS CENTER =================
export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    recipientId: text('recipient_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => admins.id),
    actorName: text('actor_name'),
    type: text('type').notNull(), // 'assignment' | 'status_change' | 'progress_update' | 'delivered' | 'mention' | 'due_soon' | 'overdue'
    title: text('title').notNull(),
    message: text('message').notNull(),
    resourceType: text('resource_type').notNull().default('work_item'),
    resourceId: text('resource_id'),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    recipientIdIdx: index('idx_notifications_recipient_id').on(table.recipientId),
    isReadIdx: index('idx_notifications_is_read').on(table.isRead),
    createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
  })
);
