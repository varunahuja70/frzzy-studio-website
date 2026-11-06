import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { signMediaToken, verifyMediaToken } from '../lib/media-crypto';
import { MEDIA_MANIFEST, getMediaEntry, getMediaByCategory } from '../lib/media-manifest';
import {
  computeMagneticOffset,
  computeResponsiveStageScale,
  format3DCardTransform,
} from '../lib/hero-config';

describe('PHASE 4: Media Crypto & Token Security', () => {
  test('signMediaToken creates valid base64url signed token with payload', () => {
    const token = signMediaToken('work-1', 600);
    assert.ok(typeof token === 'string');
    assert.ok(token.includes('.'));

    const parts = token.split('.');
    assert.equal(parts.length, 2);
  });

  test('verifyMediaToken accepts valid non-expired signed token', () => {
    const token = signMediaToken('work-2', 300);
    const verified = verifyMediaToken(token);

    assert.ok(verified !== null);
    assert.equal(verified?.slot, 'work-2');
    assert.ok((verified?.exp ?? 0) > Date.now());
  });

  test('verifyMediaToken rejects tampered signature', () => {
    const token = signMediaToken('hero-card-1', 300);
    const parts = token.split('.');
    const tampered = `${parts[0]}.invalidSignatureHexOrBase64`;

    const verified = verifyMediaToken(tampered);
    assert.equal(verified, null);
  });

  test('verifyMediaToken rejects expired token', () => {
    // Generate token with negative TTL (already expired)
    const expiredToken = signMediaToken('work-1', -10);
    const verified = verifyMediaToken(expiredToken);

    assert.equal(verified, null);
  });

  test('verifyMediaToken rejects null, empty string, or garbage inputs', () => {
    assert.equal(verifyMediaToken(''), null);
    assert.equal(verifyMediaToken('not-a-token'), null);
    assert.equal(verifyMediaToken('..'), null);
    assert.equal(verifyMediaToken('part1.part2.part3'), null);
  });
});

describe('PHASE 5: Media Manifest & File Integrity', () => {
  const publicDir = path.resolve(process.cwd(), 'public');

  test('All registered media entries exist physically on disk', () => {
    for (const [id, entry] of Object.entries(MEDIA_MANIFEST)) {
      const fullPath = path.resolve(publicDir, entry.filePath);
      assert.ok(
        fs.existsSync(fullPath),
        `Slot "${id}" file missing on disk: ${entry.filePath}`
      );
      if (entry.posterPath) {
        const fullPosterPath = path.resolve(publicDir, entry.posterPath);
        assert.ok(
          fs.existsSync(fullPosterPath),
          `Slot "${id}" poster missing on disk: ${entry.posterPath}`
        );
      }
    }
  });

  test('getMediaEntry returns slot by ID', () => {
    const entry = getMediaEntry('work-1');
    assert.ok(entry !== undefined);
    assert.equal(entry?.category, 'latest-works');
    assert.equal(entry?.mediaType, 'video');
  });

  test('getMediaByCategory filters correctly', () => {
    const heroEntries = getMediaByCategory('hero');
    assert.equal(heroEntries.length, 4);

    const workEntries = getMediaByCategory('latest-works');
    assert.equal(workEntries.length, 5);

    const faqEntries = getMediaByCategory('faq');
    assert.equal(faqEntries.length, 3);
  });
});

describe('PHASE 4: Contact Form Validation & Anti-Bot Shield', () => {
  const Schema = z.object({
    firstName: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .transform((str) => str.replace(/[<>]/g, '')),
    lastName: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .transform((str) => str.replace(/[<>]/g, '')),
    email: z.string().trim().email().max(100).toLowerCase(),
    category: z.enum([
      'Web Design & Dev',
      'Brand Identity',
      '3D & Motion',
      'Creative Direction',
      'Full Production',
    ]),
    message: z
      .string()
      .trim()
      .min(5)
      .max(2000)
      .transform((str) => str.replace(/[<>]/g, '')),
    agreeToTerms: z.literal(true),
    companyWebsite: z.string().max(0).optional().or(z.literal('')),
  });

  test('Valid contact inquiry passes validation', () => {
    const valid = {
      firstName: 'Alex',
      lastName: 'Vance',
      email: 'alex@example.com',
      category: 'Full Production',
      message: 'We would love to discuss a complete brand and website redesign.',
      agreeToTerms: true,
      companyWebsite: '',
    };

    const result = Schema.safeParse(valid);
    assert.ok(result.success);
  });

  test('Honeypot field catches automated spam bots', () => {
    const botPayload = {
      firstName: 'Bot',
      lastName: 'Spammer',
      email: 'spam@botnet.ru',
      category: 'Web Design & Dev',
      message: 'Cheap SEO backlinks service for your brand.',
      agreeToTerms: true,
      companyWebsite: 'https://spam-link.example.com', // Bot filled honeypot!
    };

    const result = Schema.safeParse(botPayload);
    assert.equal(result.success, false);
  });

  test('HTML tags are sanitized and stripped from input fields', () => {
    const xssPayload = {
      firstName: '<script>alert(1)</script>Sophie',
      lastName: '<b>Laurent</b>',
      email: 'sophie@studio.com',
      category: 'Brand Identity',
      message: '<img src=x onerror=alert(1)>Project requirements here.',
      agreeToTerms: true,
      companyWebsite: '',
    };

    const result = Schema.safeParse(xssPayload);
    assert.ok(result.success);
    if (result.success) {
      assert.ok(!result.data.firstName.includes('<'));
      assert.ok(!result.data.firstName.includes('>'));
      assert.ok(!result.data.message.includes('<'));
    }
  });

  test('Invalid email is rejected', () => {
    const invalidEmail = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'not-an-email',
      category: 'Creative Direction',
      message: 'Hello studio team.',
      agreeToTerms: true,
    };

    const result = Schema.safeParse(invalidEmail);
    assert.equal(result.success, false);
  });
});

describe('PHASE 2 & 3: Performance, Mathematical Limits & Responsiveness', () => {
  test('computeMagneticOffset stays within maxOffset bounding box', () => {
    const rect = { left: 100, top: 100, width: 200, height: 100 } as DOMRect;
    // Pointer far away
    const offset = computeMagneticOffset(500, 500, rect, 4);

    assert.ok(Math.abs(offset.x) <= 4);
    assert.ok(Math.abs(offset.y) <= 4);
  });

  test('computeResponsiveStageScale scales smoothly across viewports', () => {
    assert.equal(computeResponsiveStageScale(1440), 1);
    assert.ok(computeResponsiveStageScale(1024) <= 1);
    assert.ok(computeResponsiveStageScale(640) <= 0.85);
    assert.ok(computeResponsiveStageScale(360) >= 0.35);
  });

  test('format3DCardTransform generates valid GPU 3D transform strings', () => {
    const transform = format3DCardTransform({
      x: 120,
      y: 0,
      scale: 1,
      rotateY: 25,
    });

    assert.ok(transform.includes('translate3d(120.00px, 0.00px, 0px)'));
    assert.ok(transform.includes('rotateY(25.00deg)'));
    assert.ok(transform.includes('scale(1)'));
  });
});
