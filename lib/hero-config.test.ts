import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HERO_CARDS,
  WEICHIE_NAV_ITEMS,
  splitCharacters,
  computeMagneticOffset,
  getRevealDelaySeconds,
  getActiveHeroMedia,
  toggleLanguage,
  WORK_ITEMS,
  WORKS_SLOTS,
  getVisibleWorkItems,
  get3DCarouselCards,
  get3DCarouselStageCards,
  computeResponsiveStageScale,
  format3DCardTransform,
  DEFAULT_CREATIVE_IMPACT_METRICS,
  formatAnimatedMetric,
  FAQ_ITEMS,
  toggleFaqItem,
  formatVideoTimecode,
  REVIEW_ITEMS,
  shouldAutoScrollReviews,
  distributeReviewsIntoColumns,
} from './hero-config';

test('HERO_CARDS contains all 4 inline media cards with fixed horizontal or vertical shape per card', () => {
  assert.equal(HERO_CARDS.length, 4);
  assert.equal(HERO_CARDS[0].widthPx, 140);
  assert.equal(HERO_CARDS[0].heightPx, 204);
  assert.equal(HERO_CARDS[1].widthPx, 206);
  assert.equal(HERO_CARDS[1].heightPx, 110);
  assert.equal(HERO_CARDS[2].widthPx, 570);
  assert.equal(HERO_CARDS[2].heightPx, 140);
  assert.equal(HERO_CARDS[3].widthPx, 244);
  assert.equal(HERO_CARDS[3].heightPx, 142);

  // Card 1 stays vertical with constant dimensions across all steps
  const c1Step0 = getActiveHeroMedia(HERO_CARDS[0], 0, 'desktop');
  const c1Step1 = getActiveHeroMedia(HERO_CARDS[0], 1, 'desktop');
  assert.equal(c1Step0.item.orientation, 'vertical');
  assert.equal(c1Step1.item.orientation, 'vertical');
  assert.deepEqual(c1Step0.dimensions, c1Step1.dimensions);

  // Card 2 stays horizontal with constant dimensions across all steps
  const c2Step0 = getActiveHeroMedia(HERO_CARDS[1], 0, 'desktop');
  const c2Step1 = getActiveHeroMedia(HERO_CARDS[1], 1, 'desktop');
  assert.equal(c2Step0.item.orientation, 'horizontal');
  assert.equal(c2Step1.item.orientation, 'horizontal');
  assert.deepEqual(c2Step0.dimensions, c2Step1.dimensions);
});

test('WEICHIE_NAV_ITEMS matches exact 4 Weichie navigation links', () => {
  assert.deepEqual(
    WEICHIE_NAV_ITEMS.map((item) => item.labelEn),
    ['Work', 'Services', 'About', 'Insights']
  );
  assert.deepEqual(splitCharacters('Work'), ['W', 'o', 'r', 'k']);
});

test('computeMagneticOffset clamps and calculates center-relative displacement', () => {
  const rect = { left: 100, top: 100, width: 200, height: 100 };
  assert.deepEqual(computeMagneticOffset(200, 150, rect, 6), { x: 0, y: 0 });
  assert.deepEqual(computeMagneticOffset(300, 200, rect, 6), { x: 6, y: 6 });
  assert.deepEqual(computeMagneticOffset(0, 0, rect, 6), { x: -6, y: -6 });
});

test('getRevealDelaySeconds produces strictly increasing delays per row and item', () => {
  const r0i0 = getRevealDelaySeconds(0, 0);
  const r0i1 = getRevealDelaySeconds(0, 1);
  const r1i0 = getRevealDelaySeconds(1, 0);
  assert.ok(r0i1 > r0i0);
  assert.ok(r1i0 > r0i1);
});

test('toggleLanguage switches between EN and NL', () => {
  assert.equal(toggleLanguage('EN'), 'NL');
  assert.equal(toggleLanguage('NL'), 'EN');
});

test('WORK_ITEMS and WORKS_SLOTS define 5 9:16 video cards and symmetric 3D angles', () => {
  assert.equal(WORK_ITEMS.length, 5);
  assert.equal(WORKS_SLOTS.length, 5);
  assert.equal(WORKS_SLOTS[0].rotateYDeg, -WORKS_SLOTS[4].rotateYDeg);
  assert.equal(WORKS_SLOTS[1].rotateYDeg, -WORKS_SLOTS[3].rotateYDeg);
  assert.equal(WORKS_SLOTS[2].isCenter, true);
  assert.equal(WORK_ITEMS[2].title, 'THE Hibiscus Ring II');
});

test('getVisibleWorkItems cycles items cleanly across positive and negative offsets', () => {
  const step0 = getVisibleWorkItems(0);
  assert.equal(step0[2].id, 'work-3');
  const step1 = getVisibleWorkItems(1);
  assert.equal(step1[2].id, 'work-4');
  const stepNeg1 = getVisibleWorkItems(-1);
  assert.equal(stepNeg1[2].id, 'work-2');
});

test('get3DCarouselCards preserves virtualKey as cards un-tilt into center and tilt onto sides', () => {
  const step0 = get3DCarouselCards(0);
  const step1 = get3DCarouselCards(1);

  // virtualKey 1 starts at relativePos +1 (tilted -22deg) and moves to relativePos 0 (straight 0deg)
  const cardKey1At0 = step0.find((c) => c.virtualKey === 1)!;
  const cardKey1At1 = step1.find((c) => c.virtualKey === 1)!;
  assert.equal(cardKey1At0.rotateYDeg, -22);
  assert.equal(cardKey1At1.rotateYDeg, 0);
  assert.equal(cardKey1At1.isCenter, true);

  // virtualKey 0 starts at relativePos 0 (straight 0deg) and moves to relativePos -1 (tilted +22deg)
  const cardKey0At0 = step0.find((c) => c.virtualKey === 0)!;
  const cardKey0At1 = step1.find((c) => c.virtualKey === 0)!;
  assert.equal(cardKey0At0.rotateYDeg, 0);
  assert.equal(cardKey0At1.rotateYDeg, 22);
});

test('get3DCarouselStageCards includes pre-warmed wing buffers and format3DCardTransform preserves units', () => {
  const stageCards = get3DCarouselStageCards(0);
  assert.equal(stageCards.length, 7);
  assert.equal(stageCards[0].isWing, true);
  assert.equal(stageCards[6].isWing, true);
  assert.equal(stageCards[3].isCenter, true);
  assert.equal(
    format3DCardTransform({ x: 0, y: 18, scale: 1, rotateY: 0 }),
    'translate3d(0.00px, 18.00px, 0px) perspective(820px) scale(1) rotateY(0.00deg)'
  );
  assert.equal(computeResponsiveStageScale(1400), 1);
  assert.ok(computeResponsiveStageScale(1024) < 1);
});

test('DEFAULT_CREATIVE_IMPACT_METRICS and formatAnimatedMetric format FRXCX Studio stats accurately', () => {
  assert.equal(DEFAULT_CREATIVE_IMPACT_METRICS.studioName, 'FRXCX Studio');
  assert.equal(DEFAULT_CREATIVE_IMPACT_METRICS.sectionSubtitle, 'Creative Impact.');
  assert.equal(DEFAULT_CREATIVE_IMPACT_METRICS.mainLabel, 'Projects Delivered.');
  assert.equal(DEFAULT_CREATIVE_IMPACT_METRICS.completedTitle, 'Projects Completed.');
  assert.equal(DEFAULT_CREATIVE_IMPACT_METRICS.brandsTitle, 'Brands Collaborated.');
  assert.equal(DEFAULT_CREATIVE_IMPACT_METRICS.campaignsTitle, 'Creative Campaigns.');
  assert.equal(formatAnimatedMetric(230, 0, 'M'), '230M');
  assert.equal(formatAnimatedMetric(68, 0, '%'), '68%');
  assert.equal(formatAnimatedMetric(14.2, 1, 'M'), '14.2M');
  assert.equal(formatAnimatedMetric(150, 0, '+'), '150+');
});

test('FAQ_ITEMS contains all 6 FRXCX Studio FAQ items and helpers toggle/format cleanly', () => {
  assert.equal(FAQ_ITEMS.length, 6);
  assert.equal(FAQ_ITEMS[0].number, '01');
  assert.equal(FAQ_ITEMS[0].questionEn, 'What does FRXCX Studio create?');
  assert.equal(FAQ_ITEMS[5].number, '06');
  assert.equal(FAQ_ITEMS[5].questionEn, 'How do we get started?');
  assert.equal(toggleFaqItem('faq-01', 'faq-02'), 'faq-02');
  assert.equal(toggleFaqItem('faq-01', 'faq-01'), null);
  assert.equal(formatVideoTimecode(0), '0:00');
  assert.equal(formatVideoTimecode(24), '0:24');
});

test('REVIEW_ITEMS and review helpers auto-scroll when abundant (>6) and stay fixed when <=6', () => {
  assert.equal(REVIEW_ITEMS.length, 12);
  assert.equal(shouldAutoScrollReviews(REVIEW_ITEMS.length, 6), true);
  assert.equal(shouldAutoScrollReviews(6, 6), false);

  const scrollingCols = distributeReviewsIntoColumns(REVIEW_ITEMS, true);
  assert.equal(scrollingCols[0].length, 8);
  assert.equal(scrollingCols[1].length, 8);
  assert.equal(scrollingCols[2].length, 8);

  const staticSubset = REVIEW_ITEMS.filter((_, idx) => idx % 2 === 0);
  assert.equal(staticSubset.length, 6);
  const staticCols = distributeReviewsIntoColumns(staticSubset, false);
  assert.equal(staticCols[0].length, 2);
  assert.equal(staticCols[1].length, 2);
  assert.equal(staticCols[2].length, 2);
});

test('Contact & Booking configuration validates inputs and builds themed Calendly embed parameters', () => {
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  assert.equal(isValidEmail('hello@frxcx.studio'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail(''), false);

  const buildCalendlyParams = (isDark: boolean, duration: '15' | '30') => {
    const bg = isDark ? '1e1d17' : 'f4efea';
    const text = isDark ? 'f4efea' : '12110b';
    const suffix = duration === '30' ? '-30min' : '';
    return { bg, text, suffix };
  };

  const light15 = buildCalendlyParams(false, '15');
  assert.equal(light15.bg, 'f4efea');
  assert.equal(light15.text, '12110b');
  assert.equal(light15.suffix, '');

  const dark30 = buildCalendlyParams(true, '30');
  assert.equal(dark30.bg, '1e1d17');
  assert.equal(dark30.text, 'f4efea');
  assert.equal(dark30.suffix, '-30min');
});

