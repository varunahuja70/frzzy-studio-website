import { REQUIRED_SECRETS, secretProblem } from './secrets';
import { ADMIN_PATH } from './config';
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

  // 1. Verify every server-side secret is set and isn't one of the public values
  const pepper = process.env.ADMIN_PASSWORD_PEPPER;
  if (isProduction) {
    for (const name of REQUIRED_SECRETS) {
      const problem = secretProblem(name);
      if (problem) violations.push(`CRITICAL: ${problem}`);
    }
    if (pepper && FORBIDDEN_PEPPER_SUBSTRINGS.some((sub) => pepper.toLowerCase().includes(sub))) {
      violations.push('CRITICAL: ADMIN_PASSWORD_PEPPER contains an insecure default or predictable substring.');
    }
    if (ADMIN_PATH === 'studio-vault') {
      console.warn('SECURITY: ADMIN_PATH is still the public default. Set a private value.');
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
