import readline from 'readline';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { destroyAllAdminSessions } from '../lib/auth/session';
import { logAuditEvent } from '../lib/auth/audit';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('       FRXCX STUDIO — DISABLE ADMIN CLI               ');
  console.log('======================================================\n');

  await ensureDatabaseReady();

  const args = process.argv.slice(2);
  let email = args[0];

  if (!email) {
    email = await askQuestion('Admin Email to disable: ');
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

  await db
    .update(admins)
    .set({
      status: 'disabled',
      updatedAt: Date.now(),
    })
    .where(eq(admins.id, admin.id));

  // Invalidate all active sessions immediately
  await destroyAllAdminSessions(admin.id);

  await logAuditEvent({
    adminId: admin.id,
    action: 'ADMIN_DISABLED',
    resource: email,
    ipAddress: '127.0.0.1 (CLI)',
    userAgent: 'CLI admin:disable',
  });

  console.log(`\n🔒 Admin account "${email}" has been disabled and all sessions terminated.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Disable error:', err);
  process.exit(1);
});
