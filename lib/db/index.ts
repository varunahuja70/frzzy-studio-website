import { createClient, Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';
import path from 'path';
import * as schema from './schema';

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
 * Ensures all relational tables, primary keys, and indexes are created.
 * Parameterized and idempotent.
 */
export async function initDatabase(): Promise<void> {
  const client = getClient();

  // Enable WAL mode for high concurrency
  await client.execute('PRAGMA journal_mode = WAL;');
  await client.execute('PRAGMA foreign_keys = ON;');

  // 1. Admins
  await client.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      two_factor_secret TEXT,
      two_factor_enabled INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'superadmin',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);`);

  // 2. Sessions
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

  // 3. Login Attempts
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

  // 4. Recovery Codes
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

  // 5. Audit Logs
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

  // 6. Leads
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

  // 7. Lead Notes
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

  // 8. Analytics Events
  await client.execute(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      visitor_hash TEXT NOT NULL,
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

  // 9. Analytics Daily Rollups
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

  // 10. Settings
  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
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
