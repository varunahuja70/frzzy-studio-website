import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { maskEmail, maskMessage } from '../lib/auth/permissions';

describe('MODULE 1: Field-Level Data Minimization & Masking', () => {
  test('maskEmail obfuscates email addresses for unauthorized viewers', () => {
    const masked = maskEmail('john.doe@company.com');
    assert.match(masked, /^j\*+e@c\*+y\.com$/);

    const shortMasked = maskEmail('a@b.com');
    assert.ok(shortMasked.includes('***'));

    assert.equal(maskEmail(''), '***@***.com');
    assert.equal(maskEmail(null as any), '***@***.com');
  });

  test('maskMessage preserves privacy by truncating and redacting details', () => {
    const longMessage = 'Here are our internal budget numbers and phone numbers 555-0199 for project X.';
    const masked = maskMessage(longMessage);
    assert.ok(masked.includes('Inquiry content protected: contact details masked due to role permissions'));
  });
});
