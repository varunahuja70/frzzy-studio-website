import { createClient, Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';
import path from 'path';
import * as schema from './schema';
import { BUILT_IN_ROLES, DEFAULT_SHARE_TEMPLATES } from '@/lib/auth/permissions-constants';
import { runStartupSecurityGuard } from '@/lib/auth/startup-guard';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'frxcx.db');
const dbUrl = process.env.DATABASE_URL || `file:${dbPath}`;

let clientInstance: Client | null = null;

function getClient(): Client {
  if (!clientInstance) {
    clientInstance = createClient({
      url: dbUrl,
    });
  }
  return clientInstance;
}

export const db = drizzle(getClient(), { schema });

/**
 * Safely adds a column to an existing SQLite table if it does not already exist.
 */
async function addColumnIfNotExists(client: Client, table: string, columnDef: string): Promise<void> {
  const colName = columnDef.trim().split(/\s+/)[0];
  try {
    const tableInfo = await client.execute(`PRAGMA table_info(${table});`);
    const existingColumns = tableInfo.rows.map((row) => String(row.name).toLowerCase());
    if (!existingColumns.includes(colName.toLowerCase())) {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`);
    }
  } catch {
    // Silently continue if column already exists
  }
}

/**
 * Ensures all relational tables, primary keys, and indexes are created.
 * Parameterized and idempotent.
 */
export async function initDatabase(): Promise<void> {
  const client = getClient();

  // Enable WAL mode for high concurrency
  await client.execute('PRAGMA journal_mode = WAL;');
  await client.execute('PRAGMA foreign_keys = ON;');

  // 1. Roles (RBAC)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_built_in INTEGER NOT NULL DEFAULT 0,
      permissions TEXT NOT NULL,
      default_lead_scope TEXT,
      ip_allowlist TEXT,
      session_timeout_minutes INTEGER DEFAULT 60,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);`);

  // 2. Admins
  await client.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      two_factor_secret TEXT,
      two_factor_enabled INTEGER NOT NULL DEFAULT 0,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      must_setup_2fa INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'superadmin',
      custom_permissions TEXT,
      lead_scope TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at INTEGER,
      deleted_at INTEGER,
      last_login_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);`);

  // Ensure new columns exist on admins
  await addColumnIfNotExists(client, 'admins', 'name TEXT');
  await addColumnIfNotExists(client, 'admins', 'must_change_password INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists(client, 'admins', 'must_setup_2fa INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists(client, 'admins', 'custom_permissions TEXT');
  await addColumnIfNotExists(client, 'admins', 'lead_scope TEXT');
  await addColumnIfNotExists(client, 'admins', 'expires_at INTEGER');
  await addColumnIfNotExists(client, 'admins', 'deleted_at INTEGER');
  await addColumnIfNotExists(client, 'admins', 'last_login_at INTEGER');

  // 3. Sessions
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      ip_address TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL,
      two_factor_verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON sessions(admin_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);`);

  // 4. Login Attempts
  await client.execute(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      success INTEGER NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);`);

  // 5. Recovery Codes
  await client.execute(`
    CREATE TABLE IF NOT EXISTS recovery_codes (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_recovery_codes_admin_id ON recovery_codes(admin_id);`);

  // 6. Password History
  await client.execute(`
    CREATE TABLE IF NOT EXISTS password_history (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_password_history_admin_id ON password_history(admin_id);`);

  // 7. Invites
  await client.execute(`
    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_invites_admin_id ON invites(admin_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_invites_token_hash ON invites(token_hash);`);

  // 8. Audit Logs
  await client.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      details TEXT,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);`);

  // 9. Leads
  await client.execute(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email_encrypted TEXT NOT NULL,
      email_blind_index TEXT NOT NULL,
      category TEXT NOT NULL,
      message_encrypted TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      assigned_to TEXT,
      source_page TEXT DEFAULT '/',
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      country TEXT DEFAULT 'Unknown',
      ip_masked TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_leads_blind_email ON leads(email_blind_index);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);`);

  // Ensure assigned_to exists on leads
  await addColumnIfNotExists(client, 'leads', 'assigned_to TEXT');
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);`);

  // 10. Lead Notes
  await client.execute(`
    CREATE TABLE IF NOT EXISTS lead_notes (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      admin_id TEXT NOT NULL REFERENCES admins(id),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);`);

  // 11. Export Presets
  await client.execute(`
    CREATE TABLE IF NOT EXISTS export_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      columns TEXT NOT NULL,
      filters TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_export_presets_admin_id ON export_presets(admin_id);`);

  // 12. Exports History
  await client.execute(`
    CREATE TABLE IF NOT EXISTS exports_history (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES admins(id),
      admin_email TEXT NOT NULL,
      format TEXT NOT NULL,
      filters TEXT NOT NULL,
      columns TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      file_path TEXT,
      file_name TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_exports_history_admin_id ON exports_history(admin_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_exports_history_created_at ON exports_history(created_at);`);

  // 13. Scheduled Exports
  await client.execute(`
    CREATE TABLE IF NOT EXISTS scheduled_exports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule_cron TEXT NOT NULL DEFAULT '0 8 * * *',
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      format TEXT NOT NULL DEFAULT 'xlsx',
      recipients TEXT NOT NULL,
      filters TEXT,
      columns TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at INTEGER,
      next_run_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 14. Analytics Events
  await client.execute(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      visitor_hash TEXT NOT NULL,
      visitor_id TEXT,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      target TEXT,
      path TEXT NOT NULL DEFAULT '/',
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      country TEXT DEFAULT 'Unknown',
      metadata TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);`);
  // Cookie-consented visitor ID (lib/analytics/consent.ts); added after launch, so migrate older DBs.
  await addColumnIfNotExists(client, 'analytics_events', 'visitor_id TEXT');
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_analytics_visitor_id ON analytics_events(visitor_id);`);

  // 15. Analytics Daily Rollups
  await client.execute(`
    CREATE TABLE IF NOT EXISTS analytics_daily_rollups (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      pageviews INTEGER NOT NULL DEFAULT 0,
      visitors INTEGER NOT NULL DEFAULT 0,
      sessions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      leads_count INTEGER NOT NULL DEFAULT 0,
      avg_session_seconds INTEGER NOT NULL DEFAULT 0,
      bounce_rate_percent INTEGER NOT NULL DEFAULT 0,
      metrics_json TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_rollups_date ON analytics_daily_rollups(date);`);

  // 16. Settings
  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 17. Clients Directory
  await client.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      billing_address TEXT,
      gstin TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);`);

  // 18. Work Items
  await client.execute(`
    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      item_number TEXT NOT NULL UNIQUE,
      lead_id TEXT REFERENCES leads(id),
      client_id TEXT REFERENCES clients(id),
      client_name TEXT NOT NULL,
      client_email TEXT,
      client_phone TEXT,
      client_company TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'Website',
      is_personal INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'assigned',
      progress_percent INTEGER NOT NULL DEFAULT 0,
      due_date INTEGER,
      tags TEXT,
      links TEXT,
      custom_fields TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      quoted_price INTEGER DEFAULT 0,
      final_price INTEGER DEFAULT 0,
      discount INTEGER DEFAULT 0,
      tax_percent INTEGER DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'INR',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      amount_received INTEGER DEFAULT 0,
      balance_due INTEGER DEFAULT 0,
      payment_method TEXT,
      delivery_notes TEXT,
      delivered_at INTEGER,
      delivered_by TEXT REFERENCES admins(id),
      completed_at INTEGER,
      invoice_reference TEXT,
      invoice_details TEXT,
      assigned_to TEXT REFERENCES admins(id),
      assigned_by TEXT REFERENCES admins(id),
      assigned_by_name TEXT,
      assigned_by_role TEXT,
      assigned_at INTEGER,
      shared_fields TEXT NOT NULL DEFAULT '[]',
      assignment_instructions TEXT,
      deleted_at INTEGER,
      deleted_by TEXT REFERENCES admins(id),
      created_by TEXT NOT NULL REFERENCES admins(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_work_items_item_number ON work_items(item_number);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_work_items_assigned_to ON work_items(assigned_to);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_work_items_priority ON work_items(priority);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_work_items_created_by ON work_items(created_by);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_work_items_deleted_at ON work_items(deleted_at);`);

  // 19. Work Item Assignments History
  await client.execute(`
    CREATE TABLE IF NOT EXISTS work_item_assignments (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      assigned_to TEXT NOT NULL REFERENCES admins(id),
      assigned_by TEXT NOT NULL REFERENCES admins(id),
      assigned_by_name TEXT NOT NULL,
      assigned_by_role TEXT NOT NULL,
      shared_fields TEXT NOT NULL,
      instructions TEXT,
      priority TEXT NOT NULL,
      due_date INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_wi_assignments_work_item_id ON work_item_assignments(work_item_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_wi_assignments_assigned_to ON work_item_assignments(assigned_to);`);

  // 20. Work Item Subtasks (Checklist)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS work_item_subtasks (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_wi_subtasks_work_item_id ON work_item_subtasks(work_item_id);`);

  // 21. Work Item Comments
  await client.execute(`
    CREATE TABLE IF NOT EXISTS work_item_comments (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      admin_id TEXT NOT NULL REFERENCES admins(id),
      admin_name TEXT NOT NULL,
      admin_role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_internal_only INTEGER NOT NULL DEFAULT 0,
      mentions TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_wi_comments_work_item_id ON work_item_comments(work_item_id);`);

  // 22. Work Item Timeline
  await client.execute(`
    CREATE TABLE IF NOT EXISTS work_item_timeline (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      actor_id TEXT NOT NULL REFERENCES admins(id),
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_wi_timeline_work_item_id ON work_item_timeline(work_item_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_wi_timeline_created_at ON work_item_timeline(created_at);`);

  // 23. Work Item Attachments & Deliverables
  await client.execute(`
    CREATE TABLE IF NOT EXISTS work_item_attachments (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      uploader_id TEXT NOT NULL REFERENCES admins(id),
      file_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      is_deliverable INTEGER NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 1,
      approval_status TEXT NOT NULL DEFAULT 'pending',
      approval_feedback TEXT,
      is_quarantined INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_wi_attachments_work_item_id ON work_item_attachments(work_item_id);`);

  // 24. Share Templates
  await client.execute(`
    CREATE TABLE IF NOT EXISTS share_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL REFERENCES admins(id),
      fields TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_share_templates_name ON share_templates(name);`);

  // 25. Time Logs
  await client.execute(`
    CREATE TABLE IF NOT EXISTS work_item_time_logs (
      id TEXT PRIMARY KEY,
      work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      admin_id TEXT NOT NULL REFERENCES admins(id),
      duration_seconds INTEGER NOT NULL,
      description TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_wi_time_logs_work_item_id ON work_item_time_logs(work_item_id);`);

  // 26. Notifications
  await client.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      actor_id TEXT REFERENCES admins(id),
      actor_name TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      resource_type TEXT NOT NULL DEFAULT 'work_item',
      resource_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);`);

  // Force mandatory 2FA on any legacy admins
  await client.execute(`UPDATE admins SET two_factor_enabled = 1 WHERE two_factor_enabled = 0;`);

  // Seed default built-in roles
  const now = Date.now();
  for (const roleDef of BUILT_IN_ROLES) {
    const existing = await client.execute({
      sql: `SELECT id FROM roles WHERE id = ? LIMIT 1`,
      args: [roleDef.id],
    });
    if (existing.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO roles (id, name, description, is_built_in, permissions, default_lead_scope, created_at, updated_at)
              VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
        args: [
          roleDef.id,
          roleDef.name,
          roleDef.description,
          JSON.stringify(roleDef.permissions),
          JSON.stringify(roleDef.defaultLeadScope),
          now,
          now,
        ],
      });
    }
  }

  // Seed default share templates.
  // created_by is a foreign key to admins(id), so on a fresh database with no superadmin yet
  // there is no valid creator: skip seeding (it runs on the next boot once an admin exists)
  // instead of inserting a fake 'system' id that fails the FK and aborts the whole init.
  const superAdminRow = await client.execute(`SELECT id FROM admins WHERE role = 'superadmin' LIMIT 1;`);
  const creatorId = superAdminRow.rows[0]?.id ? String(superAdminRow.rows[0].id) : null;
  for (const tpl of creatorId ? DEFAULT_SHARE_TEMPLATES : []) {
    const existing = await client.execute({
      sql: `SELECT id FROM share_templates WHERE name = ? LIMIT 1`,
      args: [tpl.name],
    });
    if (existing.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO share_templates (id, name, description, created_by, fields, is_default, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
          `tpl-${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          tpl.name,
          tpl.description,
          creatorId,
          JSON.stringify(tpl.fields),
          now,
          now,
        ],
      });
    }
  }

  // Run Startup Security Invariants Guard
  await runStartupSecurityGuard();
}

// Auto-run initialization promise
let initPromise: Promise<void> | null = null;
export function ensureDatabaseReady(): Promise<void> {
  if (!initPromise) {
    initPromise = initDatabase().catch((err) => {
      console.error('Failed to initialize database:', err);
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}
