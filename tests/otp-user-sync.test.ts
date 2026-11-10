import fs from 'fs';
import path from 'path';

// Automatically load .env.local
try {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envLocalPath);
  }
} catch {}
(process.env as any).NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { createAdminSession } from '../lib/auth/session';
import { POST as usersPost, GET as usersGet } from '../app/api/admin/users/route';
import { POST as verifyOtpPost } from '../app/api/admin/users/verify-otp/route';
import { DELETE as usersDelete, PATCH as usersPatch } from '../app/api/admin/users/[id]/route';
import { getAdminSupabaseClient } from '../lib/supabase/admin';

describe('ULTRA-SECURE USER CREATION WITH OTP & BACKEND SYNC', () => {
  let sessionToken: string;
  let reauthCookie: string;
  let primaryAdminId: string;
  const PRIMARY_EMAIL = 'vk679028@gmail.com';

  before(async () => {
    await ensureDatabaseReady();

    // Ensure primary owner exists in DB
    const rows = await db
      .select()
      .from(admins)
      .where(eq(admins.email, PRIMARY_EMAIL.toLowerCase()))
      .limit(1);

    assert.ok(rows.length > 0, 'Primary admin must exist');
    primaryAdminId = rows[0].id;

    // Create verified session for primary admin
    const sess = await createAdminSession({
      adminId: primaryAdminId,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      twoFactorVerified: true,
    });
    sessionToken = sess.token;

    // Create valid reauth grant cookie
    const { createReauthGrant } = await import('../lib/auth/reauth');
    const token = createReauthGrant(primaryAdminId);
    reauthCookie = `admin_reauth_grant=${token}`;
  });

  test('Primary Owner account is immutable and CANNOT be deleted or disabled', async () => {
    const cookies = `admin_session=${sessionToken}; ${reauthCookie}`;

    // Attempt DELETE on primary owner
    const delReq = new NextRequest(`http://localhost:3000/api/admin/users/${primaryAdminId}`, {
      method: 'DELETE',
      headers: { cookie: cookies },
    });
    const delRes = await usersDelete(delReq, { params: Promise.resolve({ id: primaryAdminId }) });
    assert.equal(delRes.status, 403, 'DELETE on primary owner must be rejected with 403 Forbidden');
    const delJson = await delRes.json();
    assert.match(delJson.error, /protected and cannot be deleted/i);

    // Attempt PATCH disable on primary owner
    const patchReq = new NextRequest(`http://localhost:3000/api/admin/users/${primaryAdminId}`, {
      method: 'PATCH',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'disabled' }),
    });
    const patchRes = await usersPatch(patchReq, { params: Promise.resolve({ id: primaryAdminId }) });
    assert.equal(patchRes.status, 403, 'PATCH disable on primary owner must be rejected with 403 Forbidden');
    const patchJson = await patchRes.json();
    assert.match(patchJson.error, /protected and cannot be disabled/i);
  });

  test('OTP User Creation Flow: initiates OTP, verifies code, provisions in Supabase and Vault', async () => {
    const cookies = `admin_session=${sessionToken}; ${reauthCookie}`;
    const testEmail = `agent_${Date.now()}@frzzy.test`;

    // 1. Initiate User Creation
    const initReq = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Agent Test User',
        email: testEmail,
        role: 'manager',
        passwordType: 'custom',
        customPassword: 'SecureAgentPassword@123',
        status: 'active',
      }),
    });

    const initRes = await usersPost(initReq);
    assert.equal(initRes.status, 200, 'Initiating user creation returns 200');
    const initData = await initRes.json();
    assert.equal(initData.requiresOtp, true, 'Response requires OTP');
    assert.ok(initData.verificationId, 'Verification ID returned');
    assert.ok(initData.debugOtp, 'Debug OTP available in test environment');

    // 2. Reject wrong OTP
    const wrongReq = new NextRequest('http://localhost:3000/api/admin/users/verify-otp', {
      method: 'POST',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      body: JSON.stringify({
        verificationId: initData.verificationId,
        otp: '000000',
      }),
    });
    const wrongRes = await verifyOtpPost(wrongReq);
    assert.equal(wrongRes.status, 400, 'Invalid OTP is rejected');

    // 3. Confirm with valid OTP
    const validReq = new NextRequest('http://localhost:3000/api/admin/users/verify-otp', {
      method: 'POST',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      body: JSON.stringify({
        verificationId: initData.verificationId,
        otp: initData.debugOtp,
      }),
    });
    const validRes = await verifyOtpPost(validReq);
    assert.equal(validRes.status, 200, 'Valid OTP verifies successfully');
    const validData = await validRes.json();
    assert.ok(validData.user?.id, 'User created with ID');
    const createdUserId = validData.user.id;

    // 4. Verify user exists in Supabase Auth and profiles
    const sb = getAdminSupabaseClient();
    const { data: sbUser } = await sb.auth.admin.getUserById(createdUserId);
    assert.ok(sbUser?.user, 'User exists in Supabase Auth');
    assert.equal(sbUser.user.email?.toLowerCase(), testEmail.toLowerCase());

    const { data: sbProfile } = await (sb.from('profiles') as any).select('*').eq('id', createdUserId).single();
    assert.ok(sbProfile, 'Profile exists in Supabase public.profiles');
    assert.equal(sbProfile.role, 'manager');

    // 5. Verify user appears in GET /api/admin/users
    const getReq = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'GET',
      headers: { cookie: cookies },
    });
    const getRes = await usersGet(getReq);
    const getData = await getRes.json();
    const found = getData.users?.find((u: any) => u.email.toLowerCase() === testEmail.toLowerCase());
    assert.ok(found, 'Created user appears in users list');

    // 6. Delete created user from dashboard API
    const delReq = new NextRequest(`http://localhost:3000/api/admin/users/${createdUserId}`, {
      method: 'DELETE',
      headers: { cookie: cookies },
    });
    const delRes = await usersDelete(delReq, { params: Promise.resolve({ id: createdUserId }) });
    assert.equal(delRes.status, 200, 'DELETE user returns 200');

    // 7. Verify user is permanently purged from Supabase Auth & profiles
    const { data: sbUserAfter } = await sb.auth.admin.getUserById(createdUserId);
    assert.equal(sbUserAfter?.user, null, 'User purged from Supabase Auth');
    const { data: sbProfileAfter } = await (sb.from('profiles') as any).select('*').eq('id', createdUserId).maybeSingle();
    assert.equal(sbProfileAfter, null, 'User purged from Supabase public.profiles');
  });

  test('Backend Sync: if user is deleted directly in Supabase, GET /api/admin/users immediately purges local cache', async () => {
    const cookies = `admin_session=${sessionToken}; ${reauthCookie}`;
    const syncEmail = `direct_sb_${Date.now()}@frzzy.test`;

    // 1. Create a user via OTP flow
    const initReq = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Direct Supabase Test',
        email: syncEmail,
        role: 'manager',
        passwordType: 'random',
      }),
    });
    const initData = await (await usersPost(initReq)).json();

    const verifyReq = new NextRequest('http://localhost:3000/api/admin/users/verify-otp', {
      method: 'POST',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      body: JSON.stringify({
        verificationId: initData.verificationId,
        otp: initData.debugOtp,
      }),
    });
    const verifyData = await (await verifyOtpPost(verifyReq)).json();
    const testUserId = verifyData.user.id;

    // 2. Simulate direct deletion from Supabase backend
    const sb = getAdminSupabaseClient();
    await sb.auth.admin.deleteUser(testUserId);
    await (sb.from('profiles') as any).delete().eq('id', testUserId);

    // 3. Request user list from Vault: must detect deletion and purge local cache
    const getReq = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'GET',
      headers: { cookie: cookies },
    });
    const getRes = await usersGet(getReq);
    const getData = await getRes.json();
    const ghost = getData.users?.find((u: any) => u.email.toLowerCase() === syncEmail.toLowerCase());
    assert.equal(ghost, undefined, 'User deleted directly in Supabase must NOT appear in Vault dashboard');

    // Also check local database row
    const localRow = await db.select().from(admins).where(eq(admins.id, testUserId));
    assert.equal(localRow.length, 0, 'Local cache must be purged automatically');
  });
});
