import fs from 'fs';
import path from 'path';

// Automatically load .env.local
try {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envLocalPath);
  }
} catch {}

import { db, ensureDatabaseReady } from '../lib/db';
import { admins } from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from '../lib/auth/password';
import { getAdminSupabaseClient } from '../lib/supabase/admin';
import crypto from 'crypto';

const PRIMARY_EMAIL = 'vk679028@gmail.com';
const PRIMARY_PASSWORD = 'Varun@018149';

async function main() {
  console.log('--- 1. Ensuring Database Ready ---');
  await ensureDatabaseReady();

  console.log('--- 2. Checking Supabase Connection ---');
  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase Admin client could not be initialized! Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  // 1. Purge all test users in Supabase Auth
  console.log('--- 3. Cleaning Supabase Auth Users ---');
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing Supabase users:', listError);
  } else if (userList?.users) {
    for (const u of userList.users) {
      if (u.email?.toLowerCase() !== PRIMARY_EMAIL.toLowerCase()) {
        console.log(`Deleting non-primary user from Supabase Auth: ${u.email} (${u.id})`);
        await supabase.auth.admin.deleteUser(u.id);
      }
    }
  }

  // 2. Purge all test profiles in Supabase public.profiles
  console.log('--- 4. Cleaning Supabase public.profiles ---');
  const { data: profiles, error: pError } = await (supabase.from('profiles') as any).select('id, email');
  if (pError) {
    console.error('Error listing Supabase profiles:', pError);
  } else if (profiles) {
    for (const p of profiles) {
      if (p.email?.toLowerCase() !== PRIMARY_EMAIL.toLowerCase()) {
        console.log(`Deleting non-primary profile from Supabase: ${p.email} (${p.id})`);
        await (supabase.from('profiles') as any).delete().eq('id', p.id);
      }
    }
  }

  // 3. Ensure Primary Owner exists in Supabase Auth
  console.log('--- 5. Ensuring Primary Owner in Supabase Auth ---');
  const { data: currentUsers } = await supabase.auth.admin.listUsers();
  let supabaseUserId = currentUsers?.users?.find(u => u.email?.toLowerCase() === PRIMARY_EMAIL.toLowerCase())?.id;

  if (supabaseUserId) {
    console.log(`Found existing Supabase Auth user (${supabaseUserId}). Updating password...`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(supabaseUserId, {
      password: PRIMARY_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: 'Varun Kumar',
        role: 'superadmin',
        is_primary_owner: true,
      },
    });
    if (updateErr) console.error('Error updating Supabase user:', updateErr);
    else console.log('✓ Supabase Auth user updated with password.');
  } else {
    console.log('Creating primary owner in Supabase Auth...');
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: PRIMARY_EMAIL,
      password: PRIMARY_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: 'Varun Kumar',
        role: 'superadmin',
        is_primary_owner: true,
      },
    });
    if (createErr) {
      console.error('Error creating Supabase user:', createErr);
    } else {
      supabaseUserId = newUser.user.id;
      console.log('✓ Supabase Auth user created:', supabaseUserId);
    }
  }

  // 4. Ensure Primary Owner exists in Supabase public.profiles
  if (supabaseUserId) {
    console.log('--- 6. Syncing to Supabase public.profiles ---');
    const { error: profileErr } = await (supabase.from('profiles') as any).upsert({
      id: supabaseUserId,
      email: PRIMARY_EMAIL,
      name: 'Varun Kumar',
      role: 'superadmin',
      status: 'active',
      custom_permissions: ['all'],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (profileErr) {
      console.error('Error upserting Supabase profile:', profileErr);
    } else {
      console.log('✓ Supabase public.profiles synced.');
    }
  }

  // 5. Clean local SQLite: remove all non-primary admins
  console.log('--- 7. Cleaning local SQLite database ---');
  await db.run(sql`PRAGMA foreign_keys = OFF;`);

  const allLocalAdmins = await db.select().from(admins);
  for (const a of allLocalAdmins) {
    if (a.email.toLowerCase() !== PRIMARY_EMAIL.toLowerCase()) {
      console.log(`Removing non-primary admin from local DB: ${a.email} (${a.id})`);
      await db.run(sql`DELETE FROM sessions WHERE admin_id = ${a.id}`);
      await db.run(sql`DELETE FROM recovery_codes WHERE admin_id = ${a.id}`);
      await db.run(sql`DELETE FROM password_history WHERE admin_id = ${a.id}`);
      await db.run(sql`DELETE FROM invites WHERE admin_id = ${a.id}`);
      await db.run(sql`DELETE FROM admins WHERE id = ${a.id}`);
    }
  }

  await db.run(sql`PRAGMA foreign_keys = ON;`);

  // 6. Ensure Primary Owner in local SQLite with exact password hash
  console.log('--- 8. Hashing password and setting up Primary Owner locally ---');
  const { hash, salt } = await hashPassword(PRIMARY_PASSWORD);
  const now = Date.now();

  const existingLocal = await db.select().from(admins).where(eq(admins.email, PRIMARY_EMAIL.toLowerCase())).limit(1);
  if (existingLocal.length > 0) {
    if (supabaseUserId && existingLocal[0].id !== supabaseUserId) {
      await db.run(sql`PRAGMA foreign_keys = OFF;`);
      await db.run(sql`UPDATE admins SET id = ${supabaseUserId} WHERE email = ${PRIMARY_EMAIL.toLowerCase()}`);
      await db.run(sql`UPDATE sessions SET admin_id = ${supabaseUserId} WHERE admin_id = ${existingLocal[0].id}`);
      await db.run(sql`PRAGMA foreign_keys = ON;`);
    }
    await db.update(admins).set({
      passwordHash: hash,
      salt: salt,
      role: 'superadmin',
      status: 'active',
      name: 'Varun Kumar',
      twoFactorEnabled: false,
      twoFactorSecret: null,
      mustSetup2Fa: false,
      mustChangePassword: false,
      updatedAt: now,
    }).where(eq(admins.id, existingLocal[0].id));
    console.log('✓ Local SQLite primary owner updated.');
  } else {
    await db.insert(admins).values({
      id: supabaseUserId || crypto.randomUUID(),
      email: PRIMARY_EMAIL.toLowerCase(),
      name: 'Varun Kumar',
      passwordHash: hash,
      salt: salt,
      role: 'superadmin',
      status: 'active',
      twoFactorEnabled: false,
      twoFactorSecret: null,
      mustSetup2Fa: false,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log('✓ Local SQLite primary owner inserted.');
  }

  console.log('\n=============================================');
  console.log('✅ ALL SYSTEMS CLEANED AND SYNCHRONIZED!');
  console.log(`Primary Owner: ${PRIMARY_EMAIL}`);
  console.log(`Password:      ${PRIMARY_PASSWORD}`);
  console.log(`Supabase UID:  ${supabaseUserId}`);
  console.log('=============================================\n');
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
