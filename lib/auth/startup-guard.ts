import { db, ensureDatabaseReady } from '../db';
import { admins } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface StartupSecurityAuditResult {
  passed: boolean;
  violations: string[];
}

const FORBIDDEN_PEPPER_SUBSTRINGS = [
  'default',
  'changeme',
  'secret',
  '12345',
  'test',
  'placeholder',
];

/**
 * Validates security invariants at server / app initialization.
 * Refuses to allow application boot in production if critical security controls are compromised.
 */
export async function runStartupSecurityGuard(): Promise<StartupSecurityAuditResult> {
  const violations: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Verify Server-Side Pepper Configuration
  const pepper = (process.env.ADMIN_PASSWORD_PEPPER || process.env.ADMIN_PEPPER || '').trim();
  if (isProduction) {
    if (!pepper || pepper.length < 32) {
      violations.push('CRITICAL: ADMIN_PASSWORD_PEPPER is missing or shorter than 32 characters in production.');
    } else {
      const lower = pepper.toLowerCase();
      if (FORBIDDEN_PEPPER_SUBSTRINGS.some((sub) => lower.includes(sub))) {
        violations.push('CRITICAL: ADMIN_PASSWORD_PEPPER contains an insecure default or predictable substring.');
      }
    }
  }

  // 2. Database tables are already ready when this guard is invoked

  // 3. Mandatory 2FA Enforcement Check: Check all admin accounts in DB
  const allAdmins = await db.select().from(admins);

  for (const admin of allAdmins) {
    // If admin has configured 2FA secret, ensure twoFactorEnabled is active
    if (admin.twoFactorSecret && !admin.twoFactorEnabled) {
      await db
        .update(admins)
        .set({
          twoFactorEnabled: true,
          updatedAt: Date.now(),
        })
        .where(eq(admins.id, admin.id));
    }
  }

  const passed = violations.length === 0;

  if (!passed && isProduction) {
    const errorMsg = [
      '=================================================================',
      '🚨 SECURITY STARTUP GUARD: APPLICATION BOOT PREVENTED 🚨',
      '=================================================================',
      ...violations.map((v) => `  - ${v}`),
      '=================================================================',
      'Startup halted. Fix the above security violations to boot in production.',
    ].join('\n');
    console.error(errorMsg);
    throw new Error(`Production boot blocked by Security Startup Guard: ${violations.join('; ')}`);
  }

  return { passed, violations };
}
