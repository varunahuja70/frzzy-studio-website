import fs from 'fs';
import path from 'path';

// Automatically load .env.local if present in CLI environment
try {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envLocalPath);
  }
} catch {}

import readline from 'readline';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins, recoveryCodes, sessions } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, validatePasswordPolicy } from '../lib/auth/password';
import { destroyAllAdminSessions } from '../lib/auth/session';
import { logAuditEvent } from '../lib/auth/audit';

function askQuestion(query: string, hideInput = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (!hideInput) {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    } else {
      process.stdout.write(query);
      let input = '';
      const onData = (char: Buffer) => {
        const str = char.toString('utf8');
        if (str === '\r' || str === '\n') {
          process.stdin.removeListener('data', onData);
          rl.close();
          process.stdout.write('\n');
          resolve(input.trim());
        } else if (str === '\u0003') {
          process.exit();
        } else if (str === '\b' || str === '\x7f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += str;
          process.stdout.write('*');
        }
      };
      process.stdin.on('data', onData);
    }
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('    FRXCX STUDIO — ADMIN PASSWORD RESET CLI           ');
  console.log('======================================================\n');

  await ensureDatabaseReady();

  const args = process.argv.slice(2);
  let email = '';
  let password = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
    }
    if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
    }
  }

  if (!email) {
    email = await askQuestion('Admin Email: ');
  }

  const existing = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing.length === 0) {
    console.error(`Error: No admin found with email "${email}".`);
    process.exit(1);
  }

  const admin = existing[0];

  if (!password) {
    password = await askQuestion('New Strong Password: ', true);
  }

  console.log('\nValidating new password against breach database (HIBP)...');
  const policy = await validatePasswordPolicy(password);
  if (!policy.valid) {
    console.error('\n❌ Password rejected by policy:');
    policy.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  const { hash, salt } = await hashPassword(password);

  // Invalidate old recovery codes
  await db.delete(recoveryCodes).where(eq(recoveryCodes.adminId, admin.id));

  await db
    .update(admins)
    .set({
      passwordHash: hash,
      salt,
      twoFactorEnabled: false,
      mustSetup2Fa: false,
      twoFactorSecret: null,
      mustChangePassword: false,
      updatedAt: Date.now(),
    })
    .where(eq(admins.id, admin.id));

  // Invalidate all active sessions for security across all devices
  await destroyAllAdminSessions(admin.id);

  await logAuditEvent({
    adminId: admin.id,
    action: 'PASSWORD_RESET_FORCED_2FA',
    resource: email,
    ipAddress: '127.0.0.1 (CLI)',
    userAgent: 'CLI admin:reset-password',
  });

  console.log(`\n✅ Password successfully reset for "${email}".`);
  console.log('🔒 Mandatory TOTP 2FA re-enrollment will be enforced at next login.');
  console.log('🗑️  All active sessions and previous recovery codes revoked.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Reset error:', err);
  process.exit(1);
});
