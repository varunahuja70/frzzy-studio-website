import { db, ensureDatabaseReady } from '../db';
import { auditLogs } from '../db/schema';
import crypto from 'crypto';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_LOCKOUT'
  | 'LOGOUT'
  | 'LOGOUT_ALL'
  | 'TWO_FACTOR_VERIFIED'
  | 'TWO_FACTOR_FAILED'
  | 'RECOVERY_CODE_USED'
  | 'PASSWORD_CHANGED'
  | 'ADMIN_CREATED'
  | 'ADMIN_DISABLED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_NOTE_ADDED'
  | 'LEAD_DELETED'
  | 'EXPORT_LEADS'
  | 'EXPORT_ANALYTICS'
  | 'SETTINGS_UPDATED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'PASSWORD_RESET_BY_ADMIN'
  | '2FA_RESET_BY_ADMIN'
  | 'SESSIONS_REVOKED_BY_ADMIN'
  | 'INVITE_LINK_GENERATED'
  | 'INVITE_ACCEPTED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'LEADS_EXPORTED'
  | 'EXPORT_WORK_ITEMS'
  | 'PASSWORD_RESET_FORCED_2FA'
  | 'SCHEDULED_EXPORT_CONFIGURED'
  | 'LEAD_CREATED_MANUAL'
  | 'LEAD_UPDATED';

interface QueuedAuditLog {
  id: string;
  adminId: string | null;
  action: AuditAction;
  resource: string | null;
  details: string | null;
  ipAddress: string;
  userAgent: string | null;
  createdAt: number;
}

const auditQueue: QueuedAuditLog[] = [];
let isFlushing = false;

async function flushAuditQueue() {
  if (isFlushing || auditQueue.length === 0) return;
  isFlushing = true;
  try {
    await ensureDatabaseReady();
    while (auditQueue.length > 0) {
      const batch = auditQueue.splice(0, 50);
      for (const item of batch) {
        await db.insert(auditLogs).values(item);
      }
    }
  } catch (err) {
    console.error('Failed to flush audit logs:', err);
  } finally {
    isFlushing = false;
  }
}

/**
 * Creates an immutable audit log entry asynchronously and non-blockingly.
 */
export async function logAuditEvent(params: {
  adminId?: string | null;
  action: AuditAction;
  resource?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
}): Promise<void> {
  auditQueue.push({
    id: crypto.randomUUID(),
    adminId: params.adminId || null,
    action: params.action,
    resource: params.resource || null,
    details: params.details ? JSON.stringify(params.details) : null,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent || null,
    createdAt: Date.now(),
  });

  queueMicrotask(() => {
    flushAuditQueue().catch(() => {});
  });
}
