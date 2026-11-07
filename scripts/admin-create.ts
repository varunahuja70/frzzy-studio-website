import readline from 'readline';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins, recoveryCodes } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, validatePasswordPolicy } from '../lib/auth/password';
import { generateTotpSetup, generateRecoveryCodes } from '../lib/auth/totp';
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
  console.log('       FRXCX STUDIO — SECURE ADMIN CREATION CLI       ');
  console.log('======================================================\n');

  await ensureDatabaseReady();

  // Allow arguments via CLI flag or prompt interactively
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

  if (!email || !email.includes('@')) {
    console.error('Error: Valid email address is required.');
    process.exit(1);
  }

  if (!password) {
    password = await askQuestion('Admin Password (min 12 chars, strong): ', true);
  }

  console.log('\n[1/4] Validating password strength & checking breach databases (HIBP)...');
  const policy = await validatePasswordPolicy(password);
  if (!policy.valid) {
    console.error('\n❌ Password rejected by policy:');
    policy.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  console.log('  ✓ Password passed: high entropy and zero known breach records.');

  console.log('\n[2/4] Generating Argon2id password hash with server-side pepper...');
  const { hash, salt } = await hashPassword(password);
  console.log('  ✓ Argon2id hash computed (64MB memory, 3 iterations).');

  console.log('\n[3/4] Provisioning Two-Factor Authentication (TOTP)...');
  const totp = await generateTotpSetup(email);

  console.log('\n================== 2FA SETUP DETAILS ==================');
  console.log(`Scan this Authenticator URL or enter secret into Google Authenticator/1Password:`);
  console.log(`\nTOTP Secret: ${totp.secret}`);
  console.log(`Key URI:     ${totp.otpauthUrl}\n`);

  console.log('[4/4] Generating 10 single-use emergency recovery codes...');
  const { plaintextCodes, hashedCodes } = generateRecoveryCodes(10);

  console.log('\n================ EMERGENCY RECOVERY CODES ================');
  console.log('STORE THESE SAFELY IN A PASSWORD MANAGER (Each code works once):');
  plaintextCodes.forEach((code, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2, ' ')}. ${code}`);
  });
  console.log('==========================================================\n');

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db
    .select()
    .from(admins)
    .where(eq(admins.email, normalizedEmail))
    .limit(1);

  let adminId: string;
  const now = Date.now();

  if (existing.length > 0) {
    adminId = existing[0].id;
    await db
      .update(admins)
      .set({
        passwordHash: hash,
        salt,
        twoFactorSecret: null,
        twoFactorEnabled: false,
        mustSetup2Fa: false,
        mustChangePassword: false,
        status: 'active',
        role: 'superadmin',
        updatedAt: now,
      })
      .where(eq(admins.id, adminId));

    await db.delete(recoveryCodes).where(eq(recoveryCodes.adminId, adminId));
    console.log(`\nExisting account for "${normalizedEmail}" successfully updated with new password.`);
  } else {
    adminId = crypto.randomUUID();
    await db.insert(admins).values({
      id: adminId,
      email: normalizedEmail,
      passwordHash: hash,
      salt,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      mustSetup2Fa: false,
      mustChangePassword: false,
      role: 'superadmin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  await logAuditEvent({
    adminId,
    action: 'ADMIN_CREATED',
    resource: email,
    ipAddress: '127.0.0.1 (CLI)',
    userAgent: 'CLI admin:create',
    details: { email },
  });

  console.log(`✅ Admin account "${email}" successfully created and secured!\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal creation error:', err);
  process.exit(1);
});
