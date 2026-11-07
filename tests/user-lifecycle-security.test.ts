import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins, passwordHistory, invites } from '../lib/db/schema';
import {
  generateTemporaryPassword,
  checkPasswordHistory,
  recordPasswordHistory,
  hashPassword,
} from '../lib/auth/password';
import {
  createAdminInvite,
  verifyAdminInvite,
  consumeAdminInvite,
} from '../lib/auth/invites';
import { eq } from 'drizzle-orm';

describe('MODULE 1: User Lifecycle & Credential Security', () => {
  const testAdminId = 'user-lifecycle-' + crypto.randomUUID().slice(0, 8);

  before(async () => {
    await ensureDatabaseReady();
    const now = Date.now();
    await db.insert(admins).values({
      id: testAdminId,
      email: `lifecycle-${now}@frxcxstudio.com`,
      passwordHash: 'dummy',
      salt: 'dummy',
      role: 'sales_executive',
      createdAt: now,
      updatedAt: now,
      status: 'active',
    });
  });

  test('generateTemporaryPassword returns high-entropy cryptographically secure string', () => {
    const pw1 = generateTemporaryPassword();
    const pw2 = generateTemporaryPassword();

    assert.equal(pw1.length, 18);
    assert.equal(pw2.length, 18);
    assert.notEqual(pw1, pw2);
    // Must contain uppercase, lowercase, numbers, and symbols
    assert.match(pw1, /[A-Z]/);
    assert.match(pw1, /[a-z]/);
    assert.match(pw1, /[0-9]/);
    assert.match(pw1, /[!@#$%^&*()_+~`|}{[\]:;?><,./-=]/);
  });

  test('Password History: Blocks reuse of last 5 passwords', async () => {
    const passwords = [
      'AlphaSecret123!',
      'BetaSecret456!',
      'GammaSecret789!',
      'DeltaSecret012!',
      'EpsilonSecret345!',
    ];

    for (const pw of passwords) {
      const { hash, salt } = await hashPassword(pw);
      await recordPasswordHistory(testAdminId, hash, salt);
    }

    // Checking reuse of AlphaSecret123! should be rejected (found in history)
    const isReused = await checkPasswordHistory(testAdminId, 'AlphaSecret123!');
    assert.equal(isReused, true, 'AlphaSecret123! should be blocked from reuse');

    // Checking brand new password should be allowed
    const isBrandNewReused = await checkPasswordHistory(testAdminId, 'ZetaCompletelyNew999!');
    assert.equal(isBrandNewReused, false, 'New password should not be in history');

    // Adding a 6th password prunes the 1st one (FIFO history window of 5)
    const sixth = 'ZetaCompletelyNew999!';
    const { hash: h6, salt: s6 } = await hashPassword(sixth);
    await recordPasswordHistory(testAdminId, h6, s6);

    const isFirstStillReused = await checkPasswordHistory(testAdminId, 'AlphaSecret123!');
    assert.equal(isFirstStillReused, false, 'Oldest password should have been pruned beyond 5');
  });

  test('24-Hour Single-Use Invites: Token generation, validation, and single-use consumption', async () => {
    const invite = await createAdminInvite(testAdminId);
    assert.ok(invite.token);
    assert.equal(invite.token.length >= 32, true);

    // Verify valid invite
    const verified = await verifyAdminInvite(invite.token);
    assert.equal(verified.valid, true);
    assert.equal(verified.admin?.id, testAdminId);

    // Consume invite
    const consumed = await consumeAdminInvite(invite.token);
    assert.equal(consumed, true);

    // Verify after consumption MUST fail (single-use)
    const reVerified = await verifyAdminInvite(invite.token);
    assert.equal(reVerified.valid, false);
    assert.equal(reVerified.reason, 'already_used');
  });

  test('Cleanup test records', async () => {
    await db.delete(passwordHistory).where(eq(passwordHistory.adminId, testAdminId));
    await db.delete(invites).where(eq(invites.adminId, testAdminId));
    await db.delete(admins).where(eq(admins.id, testAdminId));
  });
});
