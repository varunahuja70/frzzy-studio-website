import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins, recoveryCodes } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/password';
import { generateTotpSetup, generateRecoveryCodes, generateTotpToken } from '../lib/auth/totp';
import { POST as loginPost } from '../app/api/admin/login/route';
import { POST as twoFactorPost } from '../app/api/admin/2fa/route';
import { GET as meGet } from '../app/api/admin/me/route';
import { runStartupSecurityGuard } from '../lib/auth/startup-guard';
import { NextRequest } from 'next/server';

describe('Problem 1: Mandatory TOTP 2FA Enforcement & Security Invariants', () => {
  const testEmail = `sec-test-${crypto.randomBytes(4).toString('hex')}@studio.test`;
  const strongPassword = `SecPass!${crypto.randomBytes(8).toString('hex')}A1#`;
  let adminId: string;
  let totpSecret: string;
  let singleUseRecoveryCode: string;
  let ipCounter = 10;
  const nextIp = () => `10.99.1.${ipCounter++}`;

  before(async () => {
    await ensureDatabaseReady();
    adminId = crypto.randomUUID();
    const { hash, salt } = await hashPassword(strongPassword);
    const totp = await generateTotpSetup(testEmail);
    totpSecret = totp.secret;

    const { plaintextCodes, hashedCodes } = generateRecoveryCodes(5);
    singleUseRecoveryCode = plaintextCodes[0];

    const now = Date.now();
    await db.insert(admins).values({
      id: adminId,
      name: 'Security Tester',
      email: testEmail,
      passwordHash: hash,
      salt,
      twoFactorSecret: totpSecret,
      twoFactorEnabled: true,
      mustSetup2Fa: false,
      role: 'superadmin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    for (const codeHash of hashedCodes) {
      await db.insert(recoveryCodes).values({
        id: crypto.randomUUID(),
        adminId,
        codeHash,
        used: false,
        createdAt: now,
      });
    }
  });

  test('Step 1 (Password Login) ALWAYS mandates 2FA and never logs in directly', async () => {
    const ip = nextIp();
    const req = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ email: testEmail, password: strongPassword }),
    });

    const res = await loginPost(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.requires2Fa, true, 'requires2Fa MUST be true');

    const cookieHeader = res.headers.get('set-cookie');
    assert.ok(cookieHeader && cookieHeader.includes('admin_session='), 'Sets temporary step-1 session cookie');

    const match = cookieHeader.match(/admin_session=([^;]+)/);
    assert.ok(match, 'Cookie must exist');
    const sessionToken = match[1];

    const meReq = new NextRequest('http://localhost:3000/api/admin/me', {
      method: 'GET',
      headers: {
        cookie: `admin_session=${sessionToken}`,
      },
    });

    const meRes = await meGet(meReq);
    assert.equal(meRes.status, 401, 'Unverified session cannot access protected routes');
    const meBody = await meRes.json();
    assert.equal(meBody.reason, 'requires_2fa', 'Access denied because 2FA is pending');
  });

  test('Wrong 2FA code fails with 401', async () => {
    const ip = nextIp();
    const loginReq = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ email: testEmail, password: strongPassword }),
    });
    const loginRes = await loginPost(loginReq);
    const cookieHeader = loginRes.headers.get('set-cookie')!;
    const match = cookieHeader.match(/admin_session=([^;]+)/)!;
    const sessionToken = match[1];

    const twoFaReq = new NextRequest('http://localhost:3000/api/admin/2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
        cookie: `admin_session=${sessionToken}`,
      },
      body: JSON.stringify({ code: '000000', isRecoveryCode: false }),
    });

    const twoFaRes = await twoFactorPost(twoFaReq);
    assert.equal(twoFaRes.status, 401);
    const body = await twoFaRes.json();
    assert.ok(body.error.toLowerCase().includes('invalid 2fa code'));
  });

  test('Valid TOTP code succeeds and grants full verified session', async () => {
    const ip = nextIp();
    const loginReq = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify({ email: testEmail, password: strongPassword }),
    });
    const loginRes = await loginPost(loginReq);
    const cookieHeader = loginRes.headers.get('set-cookie')!;
    const match = cookieHeader.match(/admin_session=([^;]+)/)!;
    const sessionToken = match[1];

    const validCode = generateTotpToken(totpSecret);

    const twoFaReq = new NextRequest('http://localhost:3000/api/admin/2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
        cookie: `admin_session=${sessionToken}`,
      },
      body: JSON.stringify({ code: validCode, isRecoveryCode: false }),
    });

    const twoFaRes = await twoFactorPost(twoFaReq);
    assert.equal(twoFaRes.status, 200);

    const verifiedCookie = twoFaRes.headers.get('set-cookie')!;
    const verifiedMatch = verifiedCookie.match(/admin_session=([^;]+)/)!;
    const verifiedToken = verifiedMatch[1];

    const meReq = new NextRequest('http://localhost:3000/api/admin/me', {
      method: 'GET',
      headers: {
        cookie: `admin_session=${verifiedToken}`,
      },
    });

    const meRes = await meGet(meReq);
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.email, testEmail);
  });

  test('Recovery codes are strictly SINGLE-USE', async () => {
    const ip1 = nextIp();
    const loginReq = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip1 },
      body: JSON.stringify({ email: testEmail, password: strongPassword }),
    });
    const loginRes = await loginPost(loginReq);
    const cookieHeader = loginRes.headers.get('set-cookie')!;
    const sessionToken1 = cookieHeader.match(/admin_session=([^;]+)/)![1];

    const twoFaReq1 = new NextRequest('http://localhost:3000/api/admin/2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip1,
        cookie: `admin_session=${sessionToken1}`,
      },
      body: JSON.stringify({ code: singleUseRecoveryCode, isRecoveryCode: true }),
    });

    const twoFaRes1 = await twoFactorPost(twoFaReq1);
    assert.equal(twoFaRes1.status, 200, 'First recovery code use must succeed');

    const ip2 = nextIp();
    const loginReq2 = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip2 },
      body: JSON.stringify({ email: testEmail, password: strongPassword }),
    });
    const loginRes2 = await loginPost(loginReq2);
    const sessionToken2 = loginRes2.headers.get('set-cookie')!.match(/admin_session=([^;]+)/)![1];

    const twoFaReq2 = new NextRequest('http://localhost:3000/api/admin/2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip2,
        cookie: `admin_session=${sessionToken2}`,
      },
      body: JSON.stringify({ code: singleUseRecoveryCode, isRecoveryCode: true }),
    });

    const twoFaRes2 = await twoFactorPost(twoFaReq2);
    assert.equal(twoFaRes2.status, 401, 'Reusing the same recovery code MUST fail');
    const body2 = await twoFaRes2.json();
    assert.ok(body2.error.toLowerCase().includes('already used') || body2.error.toLowerCase().includes('invalid'));
  });

  test('No bypass flag exists (bypass params/headers are completely rejected)', async () => {
    const bypassAttempts = [
      { email: testEmail, password: strongPassword, skip2Fa: true },
      { email: testEmail, password: strongPassword, bypass2fa: '1' },
      { email: testEmail, password: strongPassword, directAccess: true },
    ];

    for (const bodyData of bypassAttempts) {
      const req = new NextRequest('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': nextIp(),
          'X-Bypass-2FA': 'true',
        },
        body: JSON.stringify(bodyData),
      });

      const res = await loginPost(req);
      assert.equal(res.status, 200);
      const resBody = await res.json();
      assert.equal(resBody.requires2Fa, true, 'Bypass attempt must still require 2FA');
    }
  });

  test('Invalid password returns generic "Invalid credentials"', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': nextIp(),
      },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword999!' }),
    });

    const res = await loginPost(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Invalid credentials');
  });

  test('Startup security guard enforces 2FA invariant', async () => {
    const audit = await runStartupSecurityGuard();
    assert.equal(audit.passed, true);
  });
});
