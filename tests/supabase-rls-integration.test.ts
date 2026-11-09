import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { encryptPii, decryptPii, createBlindIndex } from '../lib/auth/encryption';

describe('PHASE 3 & 5: Supabase RLS Policies & Architecture Invariants', () => {
  it('Verifies migration 001 defines all required core tables and constraints', () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261109000001_initial_schema.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 001 exists physically');

    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.roles/, 'Defines roles table');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.profiles/, 'Defines profiles table linked to auth.users');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.leads/, 'Defines leads table with encrypted PII');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.work_items/, 'Defines work_items table');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.clients/, 'Defines clients directory');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.audit_logs/, 'Defines audit_logs table');
    assert.match(sql, /idx_leads_blind_email/, 'Indexes blind index for deterministic search');
  });

  it('Verifies migration 002 enables RLS on EVERY table with explicit policies', () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261109000002_rls_policies.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 002 exists physically');

    const sql = fs.readFileSync(migrationPath, 'utf8');
    const requiredTables = [
      'roles',
      'profiles',
      'clients',
      'leads',
      'lead_notes',
      'work_items',
      'work_item_subtasks',
      'work_item_comments',
      'work_item_timeline',
      'work_item_attachments',
      'export_presets',
      'exports_history',
      'analytics_events',
      'analytics_daily_rollups',
      'audit_logs',
      'settings'
    ];

    for (const table of requiredTables) {
      assert.match(
        sql,
        new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`),
        `RLS explicitly enabled on public.${table}`
      );
    }

    // Verify security-definer helper functions use strict search_path = public
    assert.match(sql, /SET search_path = public/, 'Security-definer functions enforce search_path');
    assert.match(sql, /FUNCTION public\.is_superadmin\(\)/, 'Defines is_superadmin helper');
    assert.match(sql, /FUNCTION public\.has_permission/, 'Defines has_permission helper');

    // Verify Guest/Anon insert-only policy for leads
    assert.match(sql, /CREATE POLICY "Public anonymous visitors can submit leads"/, 'Anon insert policy defined');
    assert.match(sql, /FOR INSERT\s+TO anon/, 'Policy is strictly FOR INSERT TO anon');
    assert.doesNotMatch(sql, /FOR SELECT\s+TO anon\s+USING \(true\);.*public\.leads/, 'No anon select policy on leads');

    // Verify Settings read policy restricts to public keys
    assert.match(sql, /key IN \('site_appearance', 'site_reviews'\)/, 'Anon settings policy strictly limited to public keys');
  });

  it('Verifies migration 003 creates private and public storage buckets with strict MIME types', () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261109000003_storage_buckets.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 003 exists physically');

    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.match(sql, /'work-attachments'[\s\S]*false/, 'work-attachments bucket is private');
    assert.match(sql, /'deliverables'[\s\S]*false/, 'deliverables bucket is private');
    assert.match(sql, /'review-avatars'[\s\S]*true/, 'review-avatars bucket is public');
  });

  it('Verifies migration 004 seeds reference roles and sets up auto-profile trigger', () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261109000004_seed_data.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 004 exists physically');

    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.match(sql, /'superadmin'/, 'Seeds superadmin role');
    assert.match(sql, /'manager'/, 'Seeds manager role');
    assert.match(sql, /'sales_executive'/, 'Seeds sales_executive role');
    assert.match(sql, /'viewer'/, 'Seeds viewer role');
    assert.match(sql, /CREATE TRIGGER on_auth_user_created/, 'Sets up auth.users trigger to create profiles');
  });

  it('Proves PII Encryption and Blind Indexing work consistently for Supabase lead service', () => {
    const email = 'client.inquiry@luxurybrand.com';
    const message = 'Confidential 3D CGI campaign details.';

    const encryptedEmail = encryptPii(email);
    const encryptedMessage = encryptPii(message);
    const blindIndex = createBlindIndex(email);

    // Assert encryption is non-deterministic (different IVs)
    const secondEncryptedEmail = encryptPii(email);
    assert.notEqual(encryptedEmail, secondEncryptedEmail, 'AES-256-GCM produces unique ciphertext with fresh IV');

    // Assert decryption restores original plaintext
    assert.equal(decryptPii(encryptedEmail), email);
    assert.equal(decryptPii(encryptedMessage), message);

    // Assert blind index is deterministic for exact indexed searching
    const secondBlindIndex = createBlindIndex(email);
    assert.equal(blindIndex, secondBlindIndex, 'HMAC blind index is deterministic');
  });
});
