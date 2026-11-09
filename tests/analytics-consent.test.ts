import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  CONSENT_VERSION,
  encodeConsent,
  isValidVisitorId,
  parseConsent,
} from '../lib/analytics/consent';

describe('Analytics cookie consent', () => {
  test('consent round-trips and unknown values count as "not answered"', () => {
    assert.equal(parseConsent(encodeConsent('granted')), 'granted');
    assert.equal(parseConsent(encodeConsent('denied')), 'denied');
    assert.equal(parseConsent(undefined), null);
    assert.equal(parseConsent(''), null);
    assert.equal(parseConsent('granted'), null);
    assert.equal(parseConsent(`${CONSENT_VERSION}.maybe`), null);
  });

  test('bumping CONSENT_VERSION re-asks everyone', () => {
    assert.equal(parseConsent(`${CONSENT_VERSION - 1}.granted`), null);
    assert.equal(parseConsent(`${CONSENT_VERSION + 1}.granted`), null);
  });

  test('only server-issued UUIDs are accepted as visitor IDs', () => {
    assert.ok(isValidVisitorId(crypto.randomUUID()));
    assert.equal(isValidVisitorId(undefined), false);
    assert.equal(isValidVisitorId('not-a-uuid'), false);
    assert.equal(isValidVisitorId("' OR 1=1 --"), false);
    assert.equal(isValidVisitorId(crypto.randomUUID() + 'x'), false);
  });
});
