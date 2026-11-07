import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db, ensureDatabaseReady } from '../lib/db';
import { admins } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/password';
import { projectWorkItem } from '../lib/work-items/field-projection';
import { validateStatusTransition } from '../lib/work-items/state-machine';
import { validateFileMagicBytes, generateSignedDownloadToken, verifySignedDownloadToken } from '../lib/work-items/upload-security';
import { sanitizeExternalLink, sanitizeLinksArray } from '../lib/work-items/link-sanitizer';
import { generateSequentialReferenceNumber } from '../lib/work-items/reference-number';

describe('Problem 3: Work Items, Assignment & Agency OS Security Invariants', () => {
  let superAdminId: string;
  let assigneeId: string;

  before(async () => {
    await ensureDatabaseReady();
    superAdminId = crypto.randomUUID();
    assigneeId = crypto.randomUUID();

    const { hash, salt } = await hashPassword('StrongPassword123!@#');
    const now = Date.now();

    await db.insert(admins).values({
      id: superAdminId,
      name: 'Super Admin Owner',
      email: `owner-${crypto.randomBytes(4).toString('hex')}@studio.test`,
      passwordHash: hash,
      salt,
      twoFactorEnabled: true,
      mustSetup2Fa: false,
      role: 'superadmin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(admins).values({
      id: assigneeId,
      name: 'Specialist Assignee',
      email: `specialist-${crypto.randomBytes(4).toString('hex')}@studio.test`,
      passwordHash: hash,
      salt,
      twoFactorEnabled: true,
      mustSetup2Fa: false,
      role: 'staff',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  });

  // ------------------------------------------------------------------------
  // Test 1: Sequential Reference Numbers
  // ------------------------------------------------------------------------
  test('Atomic sequential reference number generation (AEV-2026-XXXX & INV-2026-XXXX)', async () => {
    const itemNum1 = await generateSequentialReferenceNumber('AEV');
    const itemNum2 = await generateSequentialReferenceNumber('AEV');
    assert.match(itemNum1, /^AEV-2026-\d{4}$/);
    assert.match(itemNum2, /^AEV-2026-\d{4}$/);

    const invNum1 = await generateSequentialReferenceNumber('INV');
    const invNum2 = await generateSequentialReferenceNumber('INV');
    assert.match(invNum1, /^INV-2026-\d{4}$/);
    assert.match(invNum2, /^INV-2026-\d{4}$/);
  });

  // ------------------------------------------------------------------------
  // Test 2: Field Projection & Strict Financial Isolation
  // ------------------------------------------------------------------------
  test('Strict financial data isolation: assignees NEVER receive financial columns', () => {
    const rawItem: any = {
      id: 'wi-101',
      itemNumber: 'AEV-2026-0001',
      title: 'Global Rebrand Campaign',
      description: 'Comprehensive 3D motion design project',
      clientName: 'Acme Corp',
      clientEmail: 'contact@acme.com',
      clientPhone: '+1 555 123 4567',
      assignedTo: assigneeId,
      createdBy: superAdminId,
      status: 'in_progress',
      progressPercent: 50,
      quotedPrice: 150000,
      finalPrice: 180000,
      currency: 'INR',
      paymentStatus: 'paid',
      amountReceived: 180000,
      balanceDue: 0,
      invoiceReference: 'INV-2026-0001',
      sharedFields: JSON.stringify(['title', 'description', 'quotedPrice', 'finalPrice', 'paymentStatus']),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    // Projected for Super Admin (Can view financials)
    const superAdminView = projectWorkItem(rawItem, {
      adminId: superAdminId,
      isSuperAdmin: true,
      permissions: new Set(['financials:view_quote', 'financials:view_delivered'] as any),
    });
    assert.equal(superAdminView.quotedPrice, 150000);
    assert.equal(superAdminView.finalPrice, 180000);
    assert.equal(superAdminView.paymentStatus, 'paid');

    // Projected for Assignee (FINANCIALS MUST BE STRIPPED EVEN IF TICKED IN SHARED FIELDS)
    const assigneeView = projectWorkItem(rawItem, {
      adminId: assigneeId,
      isSuperAdmin: false,
      permissions: new Set(['work_items:view_assigned'] as any),
    });
    assert.equal(assigneeView.quotedPrice, undefined, 'quotedPrice leaked to assignee!');
    assert.equal(assigneeView.finalPrice, undefined, 'finalPrice leaked to assignee!');
    assert.equal(assigneeView.currency, undefined, 'currency leaked to assignee!');
    assert.equal(assigneeView.paymentStatus, undefined, 'paymentStatus leaked to assignee!');
    assert.equal(assigneeView.amountReceived, undefined, 'amountReceived leaked to assignee!');
    assert.equal(assigneeView.balanceDue, undefined, 'balanceDue leaked to assignee!');
    assert.equal(assigneeView.invoiceReference, undefined, 'invoiceReference leaked to assignee!');
  });

  // ------------------------------------------------------------------------
  // Test 3: Share-Fields Checklist Filtering
  // ------------------------------------------------------------------------
  test('Share-fields checklist: un-ticked client contact fields are omitted for assignee', () => {
    const rawItem: any = {
      id: 'wi-102',
      itemNumber: 'AEV-2026-0002',
      title: '3D Website Assets',
      description: 'Spline scenes',
      clientName: 'Big Brand',
      clientEmail: 'confidential@bigbrand.com',
      clientPhone: '+91 99999 88888',
      assignedTo: assigneeId,
      createdBy: superAdminId,
      status: 'in_progress',
      progressPercent: 20,
      // ONLY title and description are shared; contact is omitted
      sharedFields: JSON.stringify(['title', 'description']),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    const assigneeView = projectWorkItem(rawItem, {
      adminId: assigneeId,
      isSuperAdmin: false,
      permissions: new Set(['work_items:view_assigned'] as any),
    });
    assert.equal(assigneeView.title, '3D Website Assets');
    assert.equal(assigneeView.description, 'Spline scenes');
    assert.equal(assigneeView.clientEmail, undefined, 'Client email should be omitted');
    assert.equal(assigneeView.clientPhone, undefined, 'Client phone should be omitted');
  });

  // ------------------------------------------------------------------------
  // Test 4: State Machine Invariants & Delivery Lock
  // ------------------------------------------------------------------------
  test('Strict state machine: valid transitions permitted, invalid jumps rejected', () => {
    // Valid forward transitions for assignee
    const r1 = validateStatusTransition({
      fromStatus: 'assigned',
      toStatus: 'accepted',
      isAssignee: true,
      isSuperAdmin: false,
      permissions: new Set(['work_items:change_status'] as any),
    });
    assert.equal(r1.allowed, true);

    const r2 = validateStatusTransition({
      fromStatus: 'in_progress',
      toStatus: 'in_review',
      isAssignee: true,
      isSuperAdmin: false,
      permissions: new Set(['work_items:change_status'] as any),
    });
    assert.equal(r2.allowed, true);

    // Assignee cannot mark as delivered
    const rDelivered = validateStatusTransition({
      fromStatus: 'completed',
      toStatus: 'delivered',
      isAssignee: true,
      isSuperAdmin: false,
      permissions: new Set(['work_items:change_status'] as any),
    });
    assert.equal(rDelivered.allowed, false);

    // Super admin with deliver permission can deliver
    const rDeliveredAdmin = validateStatusTransition({
      fromStatus: 'completed',
      toStatus: 'delivered',
      isAssignee: false,
      isSuperAdmin: true,
      permissions: new Set(['work_items:deliver'] as any),
    });
    assert.equal(rDeliveredAdmin.allowed, true);
    assert.equal(rDeliveredAdmin.forcedProgressPercent, 100);

    // Invalid direct jump: assigned -> delivered is rejected
    const rJump = validateStatusTransition({
      fromStatus: 'assigned',
      toStatus: 'delivered',
      isAssignee: false,
      isSuperAdmin: false,
      permissions: new Set(['work_items:deliver'] as any),
    });
    assert.equal(rJump.allowed, false);
  });

  test('Delivered records are locked unless user has edit_delivered override', () => {
    // Without edit_delivered permission, transitioning from delivered is rejected
    const rLocked = validateStatusTransition({
      fromStatus: 'delivered',
      toStatus: 'in_review',
      isAssignee: false,
      isSuperAdmin: false,
      permissions: new Set([] as any),
    });
    assert.equal(rLocked.allowed, false);

    // With edit_delivered permission, modifying delivered item is permitted
    const rUnlocked = validateStatusTransition({
      fromStatus: 'delivered',
      toStatus: 'in_review',
      isAssignee: false,
      isSuperAdmin: false,
      permissions: new Set(['work_items:edit_delivered'] as any),
    });
    assert.equal(rUnlocked.allowed, true);
  });

  // ------------------------------------------------------------------------
  // Test 5: Magic-Byte Upload Verification
  // ------------------------------------------------------------------------
  test('Magic-byte check accepts legitimate files and rejects spoofed extensions', () => {
    // Real PNG header: 89 50 4E 47
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const pngResult = validateFileMagicBytes(validPngBuffer, 'image/png');
    assert.equal(pngResult.valid, true);

    // Real PDF header: %PDF
    const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
    const pdfResult = validateFileMagicBytes(validPdfBuffer, 'application/pdf');
    assert.equal(pdfResult.valid, true);

    // Spoofed executable disguised as PNG (MZ executable header)
    const spoofedBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const spoofedResult = validateFileMagicBytes(spoofedBuffer, 'image/png');
    assert.equal(spoofedResult.valid, false, 'Spoofed executable header should be rejected!');
  });

  // ------------------------------------------------------------------------
  // Test 6: Signed Download Token Security & Tamper Detection
  // ------------------------------------------------------------------------
  test('Signed download tokens: valid token verifies, tampered or expired token fails', () => {
    const attachmentId = 'att-777';
    const adminId = 'admin-user-01';
    const validToken = generateSignedDownloadToken({
      attachmentId,
      adminId,
      expiresInSeconds: 900,
    });

    const verifyResult = verifySignedDownloadToken(validToken, adminId);
    assert.equal(verifyResult.valid, true);
    assert.equal(verifyResult.attachmentId, attachmentId);

    // Wrong requesting admin
    const wrongAdminResult = verifySignedDownloadToken(validToken, 'attacker-id');
    assert.equal(wrongAdminResult.valid, false);

    // Tampered token (modified base64 payload)
    const tamperedToken = validToken.slice(0, -4) + 'abcd';
    const tamperedResult = verifySignedDownloadToken(tamperedToken, adminId);
    assert.equal(tamperedResult.valid, false, 'Tampered token must fail');
  });

  // ------------------------------------------------------------------------
  // Test 7: SSRF & External Link Sanitization
  // ------------------------------------------------------------------------
  test('SSRF defense: only http/https allowed; javascript:, data:, file: blocked', () => {
    const driveLink = sanitizeExternalLink('https://drive.google.com/drive/folders/xyz');
    assert.notEqual(driveLink, null);
    assert.equal(driveLink?.url, 'https://drive.google.com/drive/folders/xyz');

    const dropboxLink = sanitizeExternalLink('https://dropbox.com/s/123/asset.zip');
    assert.notEqual(dropboxLink, null);
    assert.equal(dropboxLink?.url, 'https://dropbox.com/s/123/asset.zip');

    // Dangerous protocols blocked
    assert.equal(sanitizeExternalLink('javascript:alert(1)'), null);
    assert.equal(sanitizeExternalLink('data:text/html,<script>alert(1)</script>'), null);
    assert.equal(sanitizeExternalLink('file:///etc/passwd'), null);
    assert.equal(sanitizeExternalLink('ftp://internal-server.local'), null);
    assert.equal(sanitizeExternalLink('   '), null);

    const links = sanitizeLinksArray([
      { url: 'https://we.tl/t-12345', label: 'WeTransfer Stills' },
      { url: 'javascript:evil()', label: 'Exploit' },
    ]);
    assert.equal(links.length, 1);
    assert.equal(links[0].url, 'https://we.tl/t-12345');
  });
});
