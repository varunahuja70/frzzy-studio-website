import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins, sessions, leads, recoveryCodes, loginAttempts, auditLogs, analyticsEvents } from '../lib/db/schema';
import { hashPassword, verifyPassword, validatePasswordPolicy } from '../lib/auth/password';
import { generateTotpSetup, verifyTotpToken, generateRecoveryCodes, verifyRecoveryCode } from '../lib/auth/totp';
import { encryptPii, decryptPii, createBlindIndex } from '../lib/auth/encryption';
import { checkLoginLockout, recordLoginAttempt } from '../lib/auth/rate-limit';
import { createAdminSession, validateAdminSession, destroySession, destroyAllAdminSessions } from '../lib/auth/session';
import { getDashboardData } from '../lib/analytics/rollups';
import { generateSync } from 'otplib';

describe('PHASE 1 & 2: Argon2id, HIBP Policy & Multi-Factor Auth', () => {
  before(async () => {
    await ensureDatabaseReady();
  });

  test('Argon2id produces verifiable hash with 64MB memory and server pepper', async () => {
    const password = 'CorrectHorseBatteryStaple2026!';
    const { hash, salt } = await hashPassword(password);

    assert.ok(hash.startsWith('$argon2id$'));
    assert.ok(hash.includes('m=65536')); // 64 MB memory
    assert.ok(salt.length >= 16);

    const valid = await verifyPassword(password, hash, salt);
    assert.equal(valid, true);

    const wrong = await verifyPassword('WrongPassword123!', hash, salt);
    assert.equal(wrong, false);
  });

  test('validatePasswordPolicy rejects weak or short passwords', async () => {
    const short = await validatePasswordPolicy('Short1!');
    assert.equal(short.valid, false);
    assert.ok(short.errors.some((e) => e.includes('at least 12 characters')));

    const common = await validatePasswordPolicy('password123456');
    assert.equal(common.valid, false);
  });

  test('validatePasswordPolicy approves strong entropy passwords', async () => {
    const strong = await validatePasswordPolicy('V@ult_Str0ng_Pr0duct1on_2026!#');
    assert.equal(strong.valid, true);
    assert.ok(strong.score >= 3);
  });

  test('TOTP provisions valid secret and verifies generated token', async () => {
    const email = 'studio-security@frxcxstudio.com';
    const { secret, otpauthUrl, qrCodeDataUrl } = await generateTotpSetup(email);

    assert.ok(secret.length >= 16);
    assert.ok(otpauthUrl.includes('otpauth://totp/'));
    assert.ok(qrCodeDataUrl.startsWith('data:image/png;base64,'));

    // Generate real RFC 6238 token using current timestamp
    const token = generateSync({ secret });
    assert.equal(typeof token, 'string');
    assert.equal(token.length, 6);

    const valid = verifyTotpToken(token, secret);
    assert.equal(valid, true);

    const invalid = verifyTotpToken('000000', secret);
    assert.equal(invalid, false);
  });

  test('Recovery codes generate 10 hashed entries and verify with constant-time check', () => {
    const { plaintextCodes, hashedCodes } = generateRecoveryCodes(10);

    assert.equal(plaintextCodes.length, 10);
    assert.equal(hashedCodes.length, 10);

    // Verify first code
    const valid = verifyRecoveryCode(plaintextCodes[0], hashedCodes[0]);
    assert.equal(valid, true);

    // Tampered code must fail
    const invalid = verifyRecoveryCode('XXXX-XXXX-XXXX', hashedCodes[0]);
    assert.equal(invalid, false);
  });
});

describe('PHASE 2: Brute-Force Rate Limiting & Progressive Lockout', () => {
  const testEmail = `test-lockout-${Date.now()}@example.com`;
  const testIp = `198.51.100.${Math.floor(Math.random() * 200)}`;

  test('Initial state is not locked out', async () => {
    const status = await checkLoginLockout(testEmail, testIp);
    assert.equal(status.isLocked, false);
  });

  test('Lockout activates after 10 failed attempts within window', async () => {
    for (let i = 0; i < 10; i++) {
      await recordLoginAttempt(testEmail, testIp, false, 'bad_password');
    }

    const status = await checkLoginLockout(testEmail, testIp);
    assert.equal(status.isLocked, true);
    assert.ok(status.remainingSeconds > 0);
  });
});

describe('PHASE 2 & 5: AES-256-GCM Encryption at Rest & Blind Indexing', () => {
  test('encryptPii creates authenticated ciphertext and decryptPii restores original string', () => {
    const rawEmail = 'client.confidential@enterprise-brand.co.uk';
    const rawMessage = 'We need a full 3D visual production and website redesign budget: $75,000.';

    const encEmail = encryptPii(rawEmail);
    const encMessage = encryptPii(rawMessage);

    assert.notEqual(encEmail, rawEmail);
    assert.notEqual(encMessage, rawMessage);
    assert.equal(encEmail.split(':').length, 3); // iv:tag:data

    const decEmail = decryptPii(encEmail);
    const decMessage = decryptPii(encMessage);

    assert.equal(decEmail, rawEmail);
    assert.equal(decMessage, rawMessage);
  });

  test('Tampered ciphertext fails authentication tag validation', () => {
    const raw = 'confidential message';
    const enc = encryptPii(raw);
    const parts = enc.split(':');

    // Tamper with ciphertext
    const tamperedCipher = parts[2].slice(0, -2) + 'ff';
    const tampered = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

    const res = decryptPii(tampered);
    assert.ok(res.includes('Integrity Check Failed'));
  });

  test('Blind index allows deterministic indexing without leaking plaintext', () => {
    const emailA = 'Hello@Studio.com';
    const emailB = 'hello@studio.com '; // trailing space & uppercase

    const indexA = createBlindIndex(emailA);
    const indexB = createBlindIndex(emailB);

    assert.equal(indexA, indexB);
    assert.equal(indexA.length, 64); // SHA-256 hex
  });
});

describe('PHASE 3 & 4: Analytics Collection & Rollup Intelligence', () => {
  test('getDashboardData calculates KPI metrics and timelines accurately', async () => {
    const sessionId = 'test_session_' + Date.now();
    const visitorHash = 'visitor_hash_' + Date.now();

    // Insert mock test events
    await db.insert(analyticsEvents).values([
      {
        id: crypto.randomUUID(),
        visitorHash,
        sessionId,
        eventType: 'pageview',
        path: '/',
        createdAt: Date.now(),
      },
      {
        id: crypto.randomUUID(),
        visitorHash,
        sessionId,
        eventType: 'click',
        target: 'cta_send_message',
        path: '/',
        createdAt: Date.now(),
      },
      {
        id: crypto.randomUUID(),
        visitorHash,
        sessionId,
        eventType: 'scroll',
        target: 'scroll_50%',
        path: '/',
        createdAt: Date.now(),
      },
    ]);

    const data = await getDashboardData({ range: 'today' });

    assert.ok(data.kpis.pageViews >= 1);
    assert.ok(data.kpis.totalClicks >= 1);
    assert.ok(Array.isArray(data.charts.topClicked));
    assert.ok(data.charts.topClicked.some((c) => c.target === 'cta_send_message'));
    assert.ok(Array.isArray(data.charts.scrollFunnel));
  });
});

describe('PHASE 8: CSV Injection Mitigation', () => {
  function sanitizeCsvCell(val: string): string {
    let str = String(val).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }

  test('Prefixes dangerous formula characters (=, +, -, @) with apostrophe', () => {
    const malicious1 = '=cmd|"/C calc"!A0';
    const malicious2 = '+SUM(1+1)';
    const malicious3 = '-10*20';
    const malicious4 = '@SUM(A1:A10)';

    assert.equal(sanitizeCsvCell(malicious1), `"'=cmd|""/C calc""!A0"`);
    assert.equal(sanitizeCsvCell(malicious2), `"'` + `+SUM(1+1)"`);
    assert.equal(sanitizeCsvCell(malicious3), `"'` + `-10*20"`);
    assert.equal(sanitizeCsvCell(malicious4), `"'@SUM(A1:A10)"`);
  });

  test('Safe strings are wrapped normally without formula prefix', () => {
    const safe = 'Acme Creative Studio';
    assert.equal(sanitizeCsvCell(safe), `"Acme Creative Studio"`);
  });
});
