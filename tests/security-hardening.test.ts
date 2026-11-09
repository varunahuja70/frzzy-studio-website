import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins, workItems, sessions } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../lib/auth/password';
import { createAdminSession } from '../lib/auth/session';
import { checkLoginLockout, recordLoginAttempt } from '../lib/auth/rate-limit';
import { encryptPii } from '../lib/auth/encryption';
import { generateTotpToken } from '../lib/auth/totp';
import { getSecret, secretProblem } from '../lib/auth/secrets';
import { getClientIp, isSameHost } from '../lib/client-ip';
import { isOverLimit } from '../lib/request-limit';
import * as subtasks from '../app/api/admin/work-items/[id]/subtasks/route';
import * as comments from '../app/api/admin/work-items/[id]/comments/route';
import * as attachments from '../app/api/admin/work-items/[id]/attachments/route';
import * as item from '../app/api/admin/work-items/[id]/route';
import * as team from '../app/api/admin/team/performance/route';
import { POST as twoFactorPost } from '../app/api/admin/2fa/route';

const uniq = () => crypto.randomBytes(5).toString('hex');
const env = process.env as Record<string, string | undefined>;

async function makeAdmin(role: string, customPermissions: string[] = [], extra: Record<string, unknown> = {}) {
  const id = crypto.randomUUID();
  const email = `sec-${uniq()}@studio.test`;
  const { hash, salt } = await hashPassword('StrongPassword123!@#');
  const now = Date.now();
  await db.insert(admins).values({
    id, name: role, email, passwordHash: hash, salt, role, status: 'active',
    twoFactorEnabled: true, mustSetup2Fa: false, mustChangePassword: false,
    customPermissions: JSON.stringify(customPermissions), createdAt: now, updatedAt: now, ...extra,
  });
  const { token } = await createAdminSession({ adminId: id, ipAddress: '10.0.0.1', userAgent: 'test', twoFactorVerified: true });
  return { id, email, token };
}

async function makeItem(createdBy: string, assignedTo: string | null, isPersonal = false) {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.insert(workItems).values({
    id, itemNumber: `SEC-${uniq()}`, clientName: 'Client', title: 'Secret project', description: 'Details',
    category: 'Motion', source: 'Website', priority: 'normal', status: 'assigned', isPersonal,
    createdBy, assignedTo, createdAt: now, updatedAt: now, version: 1,
  });
  return id;
}

const call = (token: string, url: string, method = 'GET', body?: unknown) =>
  new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: { cookie: `admin_session=${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('Security hardening', () => {
  let owner: Awaited<ReturnType<typeof makeAdmin>>;
  let assignee: Awaited<ReturnType<typeof makeAdmin>>;
  let stranger: Awaited<ReturnType<typeof makeAdmin>>;
  let viewAll: Awaited<ReturnType<typeof makeAdmin>>;
  let itemId: string;
  let personalId: string;

  before(async () => {
    await ensureDatabaseReady();
    owner = await makeAdmin('sec-role');
    assignee = await makeAdmin('sec-role');
    stranger = await makeAdmin('sec-role');
    viewAll = await makeAdmin('sec-role', ['work_items:view_all']);
    itemId = await makeItem(owner.id, assignee.id);
    personalId = await makeItem(owner.id, null, true);
  });

  test('a stranger cannot read or change another person\'s work item parts', async () => {
    const base = `/api/admin/work-items/${itemId}`;
    const attempts: Array<[string, Promise<Response>]> = [
      ['subtasks GET', subtasks.GET(call(stranger.token, `${base}/subtasks`), ctx(itemId))],
      ['subtasks POST', subtasks.POST(call(stranger.token, `${base}/subtasks`, 'POST', { title: 'x' }), ctx(itemId))],
      ['subtasks PATCH', subtasks.PATCH(call(stranger.token, `${base}/subtasks`, 'PATCH', { subtaskId: 'a', completed: true }), ctx(itemId))],
      ['subtasks DELETE', subtasks.DELETE(call(stranger.token, `${base}/subtasks?subtaskId=a`, 'DELETE'), ctx(itemId))],
      ['comments GET', comments.GET(call(stranger.token, `${base}/comments`), ctx(itemId))],
      ['comments POST', comments.POST(call(stranger.token, `${base}/comments`, 'POST', { content: 'hi' }), ctx(itemId))],
      ['attachments GET', attachments.GET(call(stranger.token, `${base}/attachments`), ctx(itemId))],
      ['item PATCH', item.PATCH(call(stranger.token, base, 'PATCH', { progressPercent: 50 }), ctx(itemId))],
    ];
    for (const [name, pending] of attempts) assert.equal((await pending).status, 403, name);
  });

  test('the people on a work item still have access', async () => {
    const base = `/api/admin/work-items/${itemId}`;
    assert.equal((await subtasks.POST(call(assignee.token, `${base}/subtasks`, 'POST', { title: 'step' }), ctx(itemId))).status, 200);
    assert.equal((await subtasks.GET(call(owner.token, `${base}/subtasks`), ctx(itemId))).status, 200);
    assert.equal((await comments.POST(call(assignee.token, `${base}/comments`, 'POST', { content: 'hello' }), ctx(itemId))).status, 200);
    assert.equal((await comments.GET(call(viewAll.token, `${base}/comments`), ctx(itemId))).status, 200);
    assert.equal((await attachments.GET(call(owner.token, `${base}/attachments`), ctx(itemId))).status, 200);
  });

  test('personal items stay private even from people who can view all', async () => {
    const res = await comments.GET(call(viewAll.token, `/api/admin/work-items/${personalId}/comments`), ctx(personalId));
    assert.equal(res.status, 403);
    assert.equal((await comments.GET(call(owner.token, `/api/admin/work-items/${personalId}/comments`), ctx(personalId))).status, 200);
  });

  test('javascript: links are dropped when a work item is edited', async () => {
    const res = await item.PATCH(
      call(owner.token, `/api/admin/work-items/${itemId}`, 'PATCH', {
        links: [{ url: 'javascript:alert(document.cookie)', label: 'evil' }, { url: 'https://example.com/brief', label: 'ok' }],
      }),
      ctx(itemId)
    );
    assert.equal(res.status, 200);
    const [row] = await db.select().from(workItems).where(eq(workItems.id, itemId)).limit(1);
    assert.deepEqual(JSON.parse(row.links || '[]').map((l: { url: string }) => l.url), ['https://example.com/brief']);
  });

  test('the team list is not open to every logged-in user', async () => {
    assert.equal((await team.GET(call(stranger.token, '/api/admin/team/performance'))).status, 403);
  });

  test('a flood of failures for other accounts cannot lift an account lockout', async () => {
    const email = `locked-${uniq()}@studio.test`;
    for (let i = 0; i < 6; i++) await recordLoginAttempt(email, `10.1.${i}.1`, false, 'invalid_password');
    for (let i = 0; i < 30; i++) await recordLoginAttempt(`noise-${uniq()}@studio.test`, `10.2.${i}.1`, false, 'invalid_password');
    assert.equal((await checkLoginLockout(email, '10.3.3.3')).isLocked, true);
  });

  test('the 2FA code cannot be guessed endlessly, and accepts an encrypted secret', async () => {
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const admin = await makeAdmin('sec-role', [], { twoFactorSecret: encryptPii(secret) });
    const stepOne = async () => (await createAdminSession({ adminId: admin.id, ipAddress: '10.4.0.1', userAgent: 't', twoFactorVerified: false })).token;
    const send = (token: string, code: string) =>
      twoFactorPost(new NextRequest('http://localhost:3000/api/admin/2fa', {
        method: 'POST',
        headers: { cookie: `admin_session=${token}`, 'content-type': 'application/json', 'x-forwarded-for': `10.5.${uniq().length}.9` },
        body: JSON.stringify({ code }),
      }));

    assert.equal((await send(await stepOne(), generateTotpToken(secret))).status, 200, 'correct code works');

    const token = await stepOne();
    for (let i = 0; i < 5; i++) assert.equal((await send(token, '000000')).status, 401);
    assert.equal((await send(token, generateTotpToken(secret))).status, 429, 'locked after repeated failures');
  });

  test('the password step expires on the server after 10 minutes', async () => {
    const admin = await makeAdmin('sec-role', [], { twoFactorSecret: encryptPii('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP') });
    const { token, sessionId } = await createAdminSession({ adminId: admin.id, ipAddress: '10.6.0.1', userAgent: 't', twoFactorVerified: false });
    await db.update(sessions).set({ createdAt: Date.now() - 11 * 60 * 1000 }).where(eq(sessions.id, sessionId));
    const res = await twoFactorPost(new NextRequest('http://localhost:3000/api/admin/2fa', {
      method: 'POST',
      headers: { cookie: `admin_session=${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ code: generateTotpToken('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP') }),
    }));
    assert.equal(res.status, 401);
  });

  describe('production secrets', () => {
    const saved = { ...process.env };
    after(() => { Object.assign(env, { NODE_ENV: saved.NODE_ENV, LEADS_ENCRYPTION_KEY: saved.LEADS_ENCRYPTION_KEY }); if (!saved.LEADS_ENCRYPTION_KEY) delete env.LEADS_ENCRYPTION_KEY; });

    test('production refuses a missing, short or publicly known secret and accepts a real one', () => {
      env.NODE_ENV = 'production';
      delete env.LEADS_ENCRYPTION_KEY;
      assert.throws(() => getSecret('LEADS_ENCRYPTION_KEY'), /Refusing to run/);
      env.LEADS_ENCRYPTION_KEY = 'short';
      assert.ok(secretProblem('LEADS_ENCRYPTION_KEY'));
      env.LEADS_ENCRYPTION_KEY = 'frxcx-studio-pii-aes-256-gcm-master-key-production-hardened-2026';
      assert.match(secretProblem('LEADS_ENCRYPTION_KEY') ?? '', /publicly known/);
      env.LEADS_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      assert.equal(secretProblem('LEADS_ENCRYPTION_KEY'), null);
    });
  });

  test('a faked X-Forwarded-For value cannot choose the client IP', () => {
    const req = { headers: new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }) };
    assert.equal(getClientIp(req), '203.0.113.7');
  });

  test('look-alike hosts are not treated as this site', () => {
    assert.equal(isSameHost('https://frzzy.com.evil.net/x', 'frzzy.com'), false);
    assert.equal(isSameHost('https://frzzy.com/x', 'frzzy.com'), true);
  });

  test('the request limiter blocks after the limit', () => {
    const key = uniq();
    for (let i = 0; i < 3; i++) assert.equal(isOverLimit('t', key, 3, 60_000), false);
    assert.equal(isOverLimit('t', key, 3, 60_000), true);
  });
});
