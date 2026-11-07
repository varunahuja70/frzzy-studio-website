import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '../lib/db';
import { leads, admins } from '../lib/db/schema';
import { buildLeadScopeConditions, LeadScopeConfig } from '../lib/auth/permissions';
import { and, eq } from 'drizzle-orm';
import { encryptPii, createBlindIndex } from '../lib/auth/encryption';

describe('MODULE 1: Granular Lead Scope Enforcement (Database SQL Layer)', () => {
  const testAdminAId = 'admin-scoping-A-' + crypto.randomUUID().slice(0, 8);
  const testAdminBId = 'admin-scoping-B-' + crypto.randomUUID().slice(0, 8);

  const testLead1Id = 'lead-scope-1-' + crypto.randomUUID().slice(0, 8);
  const testLead2Id = 'lead-scope-2-' + crypto.randomUUID().slice(0, 8);
  const testLead3Id = 'lead-scope-3-' + crypto.randomUUID().slice(0, 8);

  before(async () => {
    await ensureDatabaseReady();

    // Create 3 test leads with different statuses and assignees
    await db.insert(leads).values([
      {
        id: testLead1Id,
        firstName: 'Alice',
        lastName: 'Wonder',
        emailEncrypted: encryptPii('alice@company.com'),
        emailBlindIndex: createBlindIndex('alice@company.com'),
        category: 'Web Design & Dev',
        messageEncrypted: encryptPii('Need web redesign'),
        status: 'new',
        assignedTo: testAdminAId,
        createdAt: Date.now() - 10000,
        updatedAt: Date.now(),
      },
      {
        id: testLead2Id,
        firstName: 'Bob',
        lastName: 'Builder',
        emailEncrypted: encryptPii('bob@builder.com'),
        emailBlindIndex: createBlindIndex('bob@builder.com'),
        category: 'Brand Identity',
        messageEncrypted: encryptPii('Brand overhaul'),
        status: 'won',
        assignedTo: testAdminBId,
        createdAt: Date.now() - 20000,
        updatedAt: Date.now(),
      },
      {
        id: testLead3Id,
        firstName: 'Charlie',
        lastName: 'Chaplin',
        emailEncrypted: encryptPii('charlie@silent.com'),
        emailBlindIndex: createBlindIndex('charlie@silent.com'),
        category: '3D & Motion',
        messageEncrypted: encryptPii('3D animation clip'),
        status: 'spam',
        assignedTo: null,
        createdAt: Date.now() - 30000,
        updatedAt: Date.now(),
      },
    ]);
  });

  test('Scope: assignedToMe=true restricts SQL query to only leads assigned to current admin', async () => {
    const scope: LeadScopeConfig = {
      assignedToMe: true,
    };

    const conditions = buildLeadScopeConditions(scope, testAdminAId, leads);
    assert.ok(conditions.length > 0);

    const rows = await db
      .select()
      .from(leads)
      .where(and(...conditions));

    const foundTarget = rows.find((r) => r.id === testLead1Id);
    const foundOther = rows.find((r) => r.id === testLead2Id);

    assert.ok(foundTarget, 'Should include lead assigned to Admin A');
    assert.equal(foundOther, undefined, 'Should NOT include lead assigned to Admin B');
  });

  test('Scope: statuses restriction filters out unallowed statuses at database layer', async () => {
    const scope: LeadScopeConfig = {
      statuses: ['won'],
    };

    const conditions = buildLeadScopeConditions(scope, testAdminAId, leads);
    assert.ok(conditions.length > 0);

    const rows = await db
      .select()
      .from(leads)
      .where(and(...conditions));

    // Must only have 'won' status
    const nonWon = rows.filter((r) => r.id === testLead1Id || r.id === testLead3Id);
    assert.equal(nonWon.length, 0, 'No leads outside allowed statuses can return');

    const won = rows.find((r) => r.id === testLead2Id);
    assert.ok(won, 'Should find won lead');
  });

  test('IDOR Protection: Directly querying a lead outside scope yields 0 rows', async () => {
    const scope: LeadScopeConfig = {
      assignedToMe: true,
    };

    // Admin A tries to access Lead 2 (assigned to Admin B) directly by ID
    const conditions = buildLeadScopeConditions(scope, testAdminAId, leads);
    conditions.push(eq(leads.id, testLead2Id));

    const rows = await db
      .select()
      .from(leads)
      .where(and(...conditions));

    assert.equal(rows.length, 0, 'Direct ID lookup MUST be blocked when out of scope');
  });

  test('Clean up test leads', async () => {
    await db.delete(leads).where(eq(leads.id, testLead1Id));
    await db.delete(leads).where(eq(leads.id, testLead2Id));
    await db.delete(leads).where(eq(leads.id, testLead3Id));
  });
});
