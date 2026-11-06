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
  | 'SETTINGS_UPDATED';

/**
 * Creates an immutable audit log entry.
 */
export async function logAuditEvent(params: {
  adminId?: string | null;
  action: AuditAction;
  resource?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await ensureDatabaseReady();

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      adminId: params.adminId || null,
      action: params.action,
      resource: params.resource || null,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent || null,
      createdAt: Date.now(),
    });
  } catch (err) {
    // Non-blocking catch to ensure core flows don't crash if logging fails
    console.error('Failed to log audit event:', err);
  }
}
