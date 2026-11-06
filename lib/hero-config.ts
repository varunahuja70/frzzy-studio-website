export type HeroMediaOrientation = 'horizontal' | 'vertical' | 'panoramic';
export type ViewportTier = 'mobile' | 'tablet' | 'desktop';

export interface HeroMediaDimensions {
  width: number;
  height: number;
}

export interface HeroMediaItem {
  id: string;
  mediaType: 'video' | 'image';
  orientation: HeroMediaOrientation;
  src: string;
  posterSrc: string;
  alt: string;
  durationMs: number;
  desktop: HeroMediaDimensions;
  tablet: HeroMediaDimensions;
  mobile: HeroMediaDimensions;
}

export interface HeroCardConfig {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  posterSrc: string;
  videoSrc: string;
  widthPx: number;
  heightPx: number;
  aspectRatio: string;
  borderRadiusPx: number;
  rowNumber: 1 | 2 | 3 | 4;
  alt: string;
  mediaSequence: HeroMediaItem[];
}

export interface NavItemConfig {
  id: string;
  labelEn: string;
  labelNl: string;
  href: string;
  charactersEn: string[];
  charactersNl: string[];
}

export type LanguageCode = 'EN' | 'NL';
export type ThemeMode = 'light' | 'dark';

export const HERO_CARDS: HeroCardConfig[] = [
  {
    id: 'card-1',
    index: 0,
    title: 'We Build Worlds',
    subtitle: 'Editorial Direction & Visual Identity',
    posterSrc: '/assets/cards/card-1.png',
    videoSrc: '/assets/videos/card-1.mp4',
    widthPx: 140,
    heightPx: 204,
    aspectRatio: '140 / 204',
    borderRadiusPx: 16,
    rowNumber: 1,
    alt: 'Creative studio direction portrait reel',
    mediaSequence: [
      {
        id: 'c1-m1',
        mediaType: 'video',
        orientation: 'vertical',
        src: '/assets/videos/card-1.mp4',
        posterSrc: '/assets/cards/card-1.png',
        alt: 'Vertical portrait reel',
        durationMs: 4200,
        desktop: { width: 92, height: 126 },
        tablet: { width: 72, height: 100 },
        mobile: { width: 42, height: 58 },
      },
      {
        id: 'c1-m2',
        mediaType: 'video',
        orientation: 'vertical',
        src: '/assets/videos/works/work-1.mp4',
        posterSrc: '/assets/works/work-1.png',
        alt: 'Vertical campaign reel',
        durationMs: 4200,
        desktop: { width: 92, height: 126 },
        tablet: { width: 72, height: 100 },
        mobile: { width: 42, height: 58 },
      },
      {
        id: 'c1-m3',
        mediaType: 'image',
        orientation: 'vertical',
        src: '/assets/works/work-3.png',
        posterSrc: '/assets/works/work-3.png',
        alt: 'Vertical editorial still',
        durationMs: 3600,
        desktop: { width: 92, height: 126 },
        tablet: { width: 72, height: 100 },
        mobile: { width: 42, height: 58 },
      },
    ],
  },
  {
    id: 'card-2',
    index: 1,
    title: 'Launch Ideas',
    subtitle: 'Strategy & Live Direction Session',
    posterSrc: '/assets/cards/card-2.png',
    videoSrc: '/assets/videos/card-2.mp4',
    widthPx: 206,
    heightPx: 110,
    aspectRatio: '206 / 110',
    borderRadiusPx: 16,
    rowNumber: 2,
    alt: 'Creative speaker presenting to audience in workshop room',
    mediaSequence: [
      {
        id: 'c2-m1',
        mediaType: 'video',
        orientation: 'horizontal',
        src: '/assets/videos/card-2.mp4',
        posterSrc: '/assets/cards/card-2.png',
        alt: 'Horizontal workshop video',
        durationMs: 4500,
        desktop: { width: 184, height: 96 },
        tablet: { width: 136, height: 74 },
        mobile: { width: 74, height: 42 },
      },
      {
        id: 'c2-m2',
        mediaType: 'video',
        orientation: 'horizontal',
        src: '/assets/videos/card-4.mp4',
        posterSrc: '/assets/cards/card-4.png',
        alt: 'Horizontal studio direction video',
        durationMs: 4500,
        desktop: { width: 184, height: 96 },
        tablet: { width: 136, height: 74 },
        mobile: { width: 74, height: 42 },
      },
      {
        id: 'c2-m3',
        mediaType: 'image',
        orientation: 'horizontal',
        src: '/assets/cards/card-4.png',
        posterSrc: '/assets/cards/card-4.png',
        alt: 'Horizontal studio craft showcase',
        durationMs: 3600,
        desktop: { width: 184, height: 96 },
        tablet: { width: 136, height: 74 },
        mobile: { width: 74, height: 42 },
      },
    ],
  },
  {
    id: 'card-3',
    index: 2,
    title: 'Shape Brands',
    subtitle: 'Real-Time Mobile Cinematography',
    posterSrc: '/assets/cards/card-3.png',
    videoSrc: '/assets/videos/card-3.mp4',
    widthPx: 570,
    heightPx: 140,
    aspectRatio: '570 / 140',
    borderRadiusPx: 16,
    rowNumber: 3,
    alt: 'Creator smiling outdoors capturing footage on red phone',
    mediaSequence: [
      {
        id: 'c3-m1',
        mediaType: 'video',
        orientation: 'panoramic',
        src: '/assets/videos/card-3.mp4',
        posterSrc: '/assets/cards/card-3.png',
        alt: 'Panoramic cinematography reel',
        durationMs: 4800,
        desktop: { width: 296, height: 96 },
        tablet: { width: 220, height: 74 },
        mobile: { width: 112, height: 42 },
      },
      {
        id: 'c3-m2',
        mediaType: 'video',
        orientation: 'panoramic',
        src: '/assets/videos/card-2.mp4',
        posterSrc: '/assets/cards/card-2.png',
        alt: 'Panoramic brand identity film',
        durationMs: 4600,
        desktop: { width: 296, height: 96 },
        tablet: { width: 220, height: 74 },
        mobile: { width: 112, height: 42 },
      },
      {
        id: 'c3-m3',
        mediaType: 'image',
        orientation: 'panoramic',
        src: '/assets/cards/card-3.png',
        posterSrc: '/assets/cards/card-3.png',
        alt: 'Panoramic brand session still',
        durationMs: 3600,
        desktop: { width: 296, height: 96 },
        tablet: { width: 220, height: 74 },
        mobile: { width: 112, height: 42 },
      },
    ],
  },
  {
    id: 'card-4',
    index: 3,
    title: 'Create Impact',
    subtitle: 'Craft & Post-Production Studio',
    posterSrc: '/assets/cards/card-4.png',
    videoSrc: '/assets/videos/card-4.mp4',
    widthPx: 244,
    heightPx: 142,
    aspectRatio: '244 / 142',
    borderRadiusPx: 16,
    rowNumber: 4,
    alt: 'Designer working thoughtfully in front of Offline on the ground wall',
    mediaSequence: [
      {
        id: 'c4-m1',
        mediaType: 'video',
        orientation: 'horizontal',
        src: '/assets/videos/card-4.mp4',
        posterSrc: '/assets/cards/card-4.png',
        alt: 'Horizontal studio production reel',
        durationMs: 5000,
        desktop: { width: 188, height: 98 },
        tablet: { width: 140, height: 74 },
        mobile: { width: 76, height: 42 },
      },
      {
        id: 'c4-m2',
        mediaType: 'video',
        orientation: 'horizontal',
        src: '/assets/videos/card-3.mp4',
        posterSrc: '/assets/cards/card-3.png',
        alt: 'Horizontal campaign reel',
        durationMs: 4600,
        desktop: { width: 188, height: 98 },
        tablet: { width: 140, height: 74 },
        mobile: { width: 76, height: 42 },
      },
      {
        id: 'c4-m3',
        mediaType: 'image',
        orientation: 'horizontal',
        src: '/assets/cards/card-2.png',
        posterSrc: '/assets/cards/card-2.png',
        alt: 'Horizontal brand impact still',
        durationMs: 3600,
        desktop: { width: 188, height: 98 },
        tablet: { width: 140, height: 74 },
        mobile: { width: 76, height: 42 },
      },
    ],
  },
];

export function getActiveHeroMedia(
  card: HeroCardConfig,
  sequenceIndex: number,
  tier: ViewportTier = 'desktop'
): { item: HeroMediaItem; dimensions: HeroMediaDimensions } {
  const seq = card.mediaSequence;
  const normalizedIdx =
    ((sequenceIndex % seq.length) + seq.length) % seq.length;
  const item = seq[normalizedIdx];
  return {
    item,
    dimensions: item[tier],
  };
}

export function splitCharacters(word: string): string[] {
  return Array.from(word);
}

export const WEICHIE_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'work',
    labelEn: 'Work',
    labelNl: 'Werk',
    href: '#work',
    charactersEn: splitCharacters('Work'),
    charactersNl: splitCharacters('Werk'),
  },
  {
    id: 'services',
    labelEn: 'Services',
    labelNl: 'Diensten',
    href: '#services',
    charactersEn: splitCharacters('Services'),
    charactersNl: splitCharacters('Diensten'),
  },
  {
    id: 'about',
    labelEn: 'About',
    labelNl: 'Over ons',
    href: '#about',
    charactersEn: splitCharacters('About'),
    charactersNl: splitCharacters('Over ons'),
  },
  {
    id: 'insights',
    labelEn: 'Insights',
    labelNl: 'Inzichten',
    href: '#insights',
    charactersEn: splitCharacters('Insights'),
    charactersNl: splitCharacters('Inzichten'),
  },
];

/**
 * Calculates magnetic subtle offset for hover interaction on inline video cards.
 */
export function computeMagneticOffset(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  maxShiftPx = 6
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  const relX = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
  const relY = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
  const clampedX = Math.max(-1, Math.min(1, relX));
  const clampedY = Math.max(-1, Math.min(1, relY));
  return {
    x: Number((clampedX * maxShiftPx).toFixed(2)),
    y: Number((clampedY * maxShiftPx).toFixed(2)),
  };
}

/**
 * Computes staggered entrance delay in seconds for bottom-up reveal animation.
 */
export function getRevealDelaySeconds(rowIndex: number, itemOffset = 0): number {
  const baseDelay = 0.02;
  const rowStep = 0.055;
  const itemStep = 0.025;
  return Number((baseDelay + rowIndex * rowStep + itemOffset * itemStep).toFixed(3));
}

/**
 * Toggles language code between EN and NL as in Weichie header.
 */
export function toggleLanguage(current: LanguageCode): LanguageCode {
  return current === 'EN' ? 'NL' : 'EN';
}

export interface WorkItemConfig {
  id: string;
  title: string;
  category: string;
  client: string;
  posterSrc: string;
  videoSrc: string;
  aspectRatio: '9 / 16';
}

export interface WorksSlotGeometry {
  slotIndex: 0 | 1 | 2 | 3 | 4;
  rotateYDeg: number;
  translateYPx: number;
  captionTiltDeg: number;
  isCenter: boolean;
}

export const WORK_ITEMS: WorkItemConfig[] = [
  {
    id: 'work-1',
    title: 'THE ROSELINE RING',
    category: 'Bracelets',
    client: 'Zales Fine Jewelry',
    posterSrc: '/assets/works/work-1.png',
    videoSrc: '/assets/videos/works/work-1.mp4',
    aspectRatio: '9 / 16',
  },
  {
    id: 'work-2',
    title: 'THE ZOË EARRINGS',
    category: 'Earrings',
    client: 'Zales Fine Jewelry',
    posterSrc: '/assets/works/work-2.png',
    videoSrc: '/assets/videos/works/work-2.mp4',
    aspectRatio: '9 / 16',
  },
  {
    id: 'work-3',
    title: 'THE Hibiscus Ring II',
    category: 'Rings',
    client: 'Zales Fine Jewelry',
    posterSrc: '/assets/works/work-3.png',
    videoSrc: '/assets/videos/works/work-3.mp4',
    aspectRatio: '9 / 16',
  },
  {
    id: 'work-4',
    title: 'THE CHUBBY HOOPS',
    category: 'Hoops',
    client: 'Zales Fine Jewelry',
    posterSrc: '/assets/works/work-4.png',
    videoSrc: '/assets/videos/works/work-4.mp4',
    aspectRatio: '9 / 16',
  },
  {
    id: 'work-5',
    title: 'THE CHUBBY HOOPS',
    category: 'Necklaces',
    client: 'Zales Fine Jewelry',
    posterSrc: '/assets/works/work-5.png',
    videoSrc: '/assets/videos/works/work-5.mp4',
    aspectRatio: '9 / 16',
  },
];

export const WORKS_SLOTS: WorksSlotGeometry[] = [
  {
    slotIndex: 0,
    rotateYDeg: 28,
    translateYPx: -36,
    captionTiltDeg: -10.5,
    isCenter: false,
  },
  {
    slotIndex: 1,
    rotateYDeg: 22,
    translateYPx: -22,
    captionTiltDeg: -9.5,
    isCenter: false,
  },
  {
    slotIndex: 2,
    rotateYDeg: 0,
    translateYPx: 28,
    captionTiltDeg: 0,
    isCenter: true,
  },
  {
    slotIndex: 3,
    rotateYDeg: -22,
    translateYPx: -22,
    captionTiltDeg: 7.5,
    isCenter: false,
  },
  {
    slotIndex: 4,
    rotateYDeg: -28,
    translateYPx: -36,
    captionTiltDeg: 8.5,
    isCenter: false,
  },
];

/**
 * Returns the 5 work items ordered for the 5 fixed perspective slots given an active step offset.
 * At stepOffset = 0, Slot 0..4 map to WORK_ITEMS[0..4] (so Slot 2 center is "THE Hibiscus Ring II").
 */
export function getVisibleWorkItems(
  stepOffset: number,
  items: WorkItemConfig[] = WORK_ITEMS
): WorkItemConfig[] {
  const count = items.length;
  if (count === 0) return [];
  return [0, 1, 2, 3, 4].map((slotIdx) => {
    const normalizedIdx =
      (((slotIdx + stepOffset) % count) + count) % count;
    return items[normalizedIdx];
  });
}

export interface Carousel3DCardInstance {
  virtualKey: number;
  relativePos: -3 | -2 | -1 | 0 | 1 | 2 | 3;
  slotIndex: 0 | 1 | 2 | 3 | 4;
  item: WorkItemConfig;
  xPx: number;
  yPx: number;
  scale: number;
  rotateYDeg: number;
  captionTiltDeg: number;
  zIndex: number;
  opacity: number;
  isCenter: boolean;
  isWing?: boolean;
}

/**
 * Ensures x, y, scale, and rotateY always have explicit CSS units (px / deg)
 * on every interpolation frame so browser 3D perspective never drops a frame.
 */
export function format3DCardTransform(values: {
  x: number | string;
  y: number | string;
  scale: number | string;
  rotateY: number | string;
}): string {
  const toPx = (v: number | string) => {
    if (typeof v === 'number') return `${v.toFixed(2)}px`;
    const s = String(v).trim();
    return s.endsWith('px') || s.endsWith('%') ? s : `${s}px`;
  };
  const toDeg = (v: number | string) => {
    if (typeof v === 'number') return `${v.toFixed(2)}deg`;
    const s = String(v).trim();
    return s.endsWith('deg') ? s : `${s}deg`;
  };
  return `translate3d(${toPx(values.x)}, ${toPx(values.y)}, 0px) perspective(820px) scale(${values.scale}) rotateY(${toDeg(values.rotateY)})`;
}

/**
 * Computes responsive horizontal distance factor so all 5 9:16 cards remain
 * 100% visible inside the stage without clipping at the left or right borders.
 */
export function computeResponsiveStageScale(stageWidthPx: number): number {
  if (!Number.isFinite(stageWidthPx) || stageWidthPx <= 0) return 1;
  if (stageWidthPx < 640) {
    return Number(Math.max(0.38, Math.min(0.56, (stageWidthPx - 24) / 1180)).toFixed(3));
  }
  // Full 5-card span is ~1230px; scale down smoothly when stageWidthPx < 1260px
  return Number(Math.max(0.58, Math.min(1, (stageWidthPx - 36) / 1230)).toFixed(3));
}

/**
 * Computes the 5 active 3D card instances for a given stepOffset so each card
 * keeps a persistent virtualKey as it moves across slots (-2, -1, 0, +1, +2),
 * straightening to 0deg at center and tilting to +/-22deg and +/-28deg on the sides.
 */
export function get3DCarouselCards(
  stepOffset: number,
  items: WorkItemConfig[] = WORK_ITEMS
): Carousel3DCardInstance[] {
  const count = items.length;
  if (count === 0) return [];

  const relativePositions: Array<-2 | -1 | 0 | 1 | 2> = [-2, -1, 0, 1, 2];

  return relativePositions.map((relPos) => {
    const slotIndex = (relPos + 2) as 0 | 1 | 2 | 3 | 4;
    const virtualKey = stepOffset + relPos;
    // At stepOffset = 0, relPos = 0 (slotIndex = 2) maps to index 2 ("THE Hibiscus Ring II")
    const itemIndex = (((virtualKey + 2) % count) + count) % count;
    const item = items[itemIndex];

    const xMap: Record<-2 | -1 | 0 | 1 | 2, number> = {
      [-2]: -504,
      [-1]: -274,
      [0]: 0,
      [1]: 274,
      [2]: 504,
    };
    const yMap: Record<-2 | -1 | 0 | 1 | 2, number> = {
      [-2]: -26,
      [-1]: -14,
      [0]: 18,
      [1]: -14,
      [2]: -26,
    };
    const scaleMap: Record<-2 | -1 | 0 | 1 | 2, number> = {
      [-2]: 0.78,
      [-1]: 0.88,
      [0]: 1,
      [1]: 0.88,
      [2]: 0.78,
    };
    const rotateYMap: Record<-2 | -1 | 0 | 1 | 2, number> = {
      [-2]: 28,
      [-1]: 22,
      [0]: 0,
      [1]: -22,
      [2]: -28,
    };
    const captionTiltMap: Record<-2 | -1 | 0 | 1 | 2, number> = {
      [-2]: -10.5,
      [-1]: -9.5,
      [0]: 0,
      [1]: 7.5,
      [2]: 8.5,
    };
    const zIndexMap: Record<-2 | -1 | 0 | 1 | 2, number> = {
      [-2]: 10,
      [-1]: 20,
      [0]: 30,
      [1]: 20,
      [2]: 10,
    };

    return {
      virtualKey,
      relativePos: relPos,
      slotIndex,
      item,
      xPx: xMap[relPos],
      yPx: yMap[relPos],
      scale: scaleMap[relPos],
      rotateYDeg: rotateYMap[relPos],
      captionTiltDeg: captionTiltMap[relPos],
      zIndex: zIndexMap[relPos],
      opacity: 1,
      isCenter: relPos === 0,
      isWing: false,
    };
  });
}

/**
 * Returns 7 card instances ([-3, -2, -1, 0, +1, +2, +3]) where -3 and +3 are
 * pre-mounted off-stage wing buffers (opacity 0). This eliminates DOM video
 * mount/unmount jitter when cards enter or leave the 5 visible slots.
 */
export function get3DCarouselStageCards(
  stepOffset: number,
  items: WorkItemConfig[] = WORK_ITEMS
): Carousel3DCardInstance[] {
  const count = items.length;
  if (count === 0) return [];

  const visible = get3DCarouselCards(stepOffset, items);
  const makeWing = (relPos: -3 | 3): Carousel3DCardInstance => {
    const virtualKey = stepOffset + relPos;
    const itemIndex = (((virtualKey + 2) % count) + count) % count;
    const item = items[itemIndex];
    return {
      virtualKey,
      relativePos: relPos,
      slotIndex: relPos < 0 ? 0 : 4,
      item,
      xPx: relPos < 0 ? -700 : 700,
      yPx: -38,
      scale: 0.66,
      rotateYDeg: relPos < 0 ? 34 : -34,
      captionTiltDeg: relPos < 0 ? -12 : 12,
      zIndex: 5,
      opacity: 0,
      isCenter: false,
      isWing: true,
    };
  };

  return [makeWing(-3), ...visible, makeWing(3)];
}

export interface CreativeImpactMetrics {
  studioName: string;
  sectionSubtitle: string;
  mainLabel: string;
  mainValue: number;
  mainSuffix: string;
  mainDecimals: number;
  badge1Text: string;
  badge2Text: string;
  mainDescription: string;
  completedTitle: string;
  completedTargetLabel: string;
  completedPercentage: number;
  brandsTitle: string;
  brandsValue: number;
  brandsSuffix: string;
  brandsDecimals: number;
  brandsCaption: string;
  campaignsTitle: string;
  campaignsValue: number;
  campaignsSuffix: string;
  campaignsDecimals: number;
  campaignsCaption: string;
  reportFooterLeft: string;
  reportFooterRight: string;
}

export const DEFAULT_CREATIVE_IMPACT_METRICS: CreativeImpactMetrics = {
  studioName: 'FRXCX Studio',
  sectionSubtitle: 'Creative Impact.',
  mainLabel: 'Projects Delivered.',
  mainValue: 230,
  mainSuffix: 'M',
  mainDecimals: 0,
  badge1Text: '74% Digital',
  badge2Text: '26% Brand',
  mainDescription:
    'Global audiences reached and brands elevated through high-impact digital products, visual storytelling, and design systems.',
  completedTitle: 'Projects Completed.',
  completedTargetLabel: 'Target 2030.',
  completedPercentage: 68,
  brandsTitle: 'Brands Collaborated.',
  brandsValue: 14.2,
  brandsSuffix: 'M',
  brandsDecimals: 1,
  brandsCaption: 'BRANDS COLLABORATED',
  campaignsTitle: 'Creative Campaigns.',
  campaignsValue: 150,
  campaignsSuffix: '+',
  campaignsDecimals: 0,
  campaignsCaption: 'CREATIVE CAMPAIGNS',
  reportFooterLeft: 'Q4 2024 REPORT',
  reportFooterRight: '01 / 12',
};

/**
 * Formats an interpolated counter number with fixed decimals and suffix.
 */
export function formatAnimatedMetric(
  currentValue: number,
  decimals = 0,
  suffix = ''
): string {
  const safeVal = Number.isFinite(currentValue) ? Math.max(0, currentValue) : 0;
  const formatted =
    decimals > 0 ? safeVal.toFixed(decimals) : Math.round(safeVal).toString();
  return `${formatted}${suffix}`;
}

export interface FaqItemConfig {
  id: string;
  number: string;
  questionEn: string;
  questionNl: string;
  answerEn: string;
  answerNl: string;
}

export const FAQ_ITEMS: FaqItemConfig[] = [
  {
    id: 'faq-01',
    number: '01',
    questionEn: 'What does FRXCX Studio create?',
    questionNl: 'Wat creëert FRXCX Studio?',
    answerEn:
      'We create brand launches, CGI worlds, campaigns, and visual identities that make brands stand out.',
    answerNl:
      'Wij creëren merklanceringen, CGI-werelden, campagnes en visuele identiteiten waarmee merken opvallen.',
  },
  {
    id: 'faq-02',
    number: '02',
    questionEn: 'Can you handle everything from start to finish?',
    questionNl: 'Kunnen jullie alles van begin tot eind verzorgen?',
    answerEn:
      'Yes. From creative concepts to final production, we bring your vision to life.',
    answerNl:
      'Ja. Van creatieve concepten tot de uiteindelijke productie brengen wij jouw visie tot leven.',
  },
  {
    id: 'faq-03',
    number: '03',
    questionEn: 'Do you work with international brands?',
    questionNl: 'Werken jullie met internationale merken?',
    answerEn:
      'Absolutely. We collaborate with brands and creative teams worldwide.',
    answerNl:
      'Absoluut. Wij werken wereldwijd samen met merken en creatieve teams.',
  },
  {
    id: 'faq-04',
    number: '04',
    questionEn: 'How much does a project cost?',
    questionNl: 'Hoeveel kost een project?',
    answerEn:
      'Every project is unique. Pricing depends on the scope, complexity, and deliverables.',
    answerNl:
      'Elk project is uniek. De prijs hangt af van de omvang, complexiteit en opleveringen.',
  },
  {
    id: 'faq-05',
    number: '05',
    questionEn: 'How long does a project take?',
    questionNl: 'Hoe lang duurt een project?',
    answerEn:
      'Timelines vary by project. We agree on clear deadlines before getting started.',
    answerNl:
      'Doorlooptijden verschillen per project. Wij spreken duidelijke deadlines af voordat we starten.',
  },
  {
    id: 'faq-06',
    number: '06',
    questionEn: 'How do we get started?',
    questionNl: 'Hoe gaan we van start?',
    answerEn:
      "Share your idea, goals, and timeline. We'll take it from there.",
    answerNl:
      'Deel je idee, doelen en tijdlijn. Wij pakken het vanaf daar verder op.',
  },
];

export function toggleFaqItem(
  currentOpenId: string | null,
  clickedId: string
): string | null {
  return currentOpenId === clickedId ? null : clickedId;
}

export function formatVideoTimecode(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface ReviewItemConfig {
  id: string;
  author: string;
  avatarSrc: string;
  rating: number;
  textEn: string;
  textNl: string;
  column: 0 | 1 | 2;
}

export const REVIEW_ITEMS: ReviewItemConfig[] = [
  // Column 0 (Left)
  {
    id: 'rev-1',
    author: 'Steven F',
    avatarSrc: '/assets/cards/card-1.png',
    rating: 5,
    textEn:
      'The branded website and interactive launch platform is perfect for our audience and growing our business.',
    textNl:
      'De merkwebsite en het interactieve lanceringsplatform zijn perfect voor ons publiek en de groei van ons bedrijf.',
    column: 0,
  },
  {
    id: 'rev-2',
    author: 'Tara B',
    avatarSrc: '/assets/works/work-2.png',
    rating: 5,
    textEn:
      'FRXCX Studio has been an absolute lifesaver when it comes to elevating our brand identity and driving direct conversions.',
    textNl:
      'FRXCX Studio is van onschatbare waarde geweest bij het versterken van onze merkidentiteit en directe conversies.',
    column: 0,
  },
  {
    id: 'rev-3',
    author: 'Elena R',
    avatarSrc: '/assets/works/work-3.png',
    rating: 5,
    textEn:
      'From CGI world-building to our global product launch film, every frame felt like a cinema release.',
    textNl:
      'Van CGI-werelden tot onze wereldwijde productfilm, elk frame voelde als een bioscooprelease.',
    column: 0,
  },
  {
    id: 'rev-4',
    author: 'Marcus V',
    avatarSrc: '/assets/cards/card-4.png',
    rating: 5,
    textEn:
      'Our engagement doubled within weeks of launching the new design system. Truly unmatched attention to detail.',
    textNl:
      'Onze betrokkenheid verdubbelde binnen enkele weken na de lancering van het nieuwe designsysteem.',
    column: 0,
  },

  // Column 1 (Center — Offset Higher)
  {
    id: 'rev-5',
    author: 'Mohammad A',
    avatarSrc: '/assets/cards/card-2.png',
    rating: 5,
    textEn:
      'With FRXCX Studio we keep full creative ownership across every channel and see immediate impact on brand equity.',
    textNl:
      'Met FRXCX Studio behouden we volledige creatieve controle over elk kanaal met directe impact op onze merkwaarde.',
    column: 1,
  },
  {
    id: 'rev-6',
    author: 'Daryl E',
    avatarSrc: '/assets/works/work-1.png',
    rating: 5,
    textEn:
      'Our global campaigns run on tight schedules, yet FRXCX Creative Direction has ALWAYS been active and able to help us with any concerns!',
    textNl:
      'Onze campagnes draaien op strakke schema’s, maar FRXCX stond ALTIJD klaar om ons direct te helpen!',
    column: 1,
  },
  {
    id: 'rev-7',
    author: 'Sophia L',
    avatarSrc: '/assets/cards/card-3.png',
    rating: 5,
    textEn:
      'Why isn’t every ambitious brand working with this studio? They turned our vision into an iconic visual identity.',
    textNl:
      'Waarom werkt niet elk ambitieus merk met deze studio? Ze maakten van onze visie een iconische identiteit.',
    column: 1,
  },
  {
    id: 'rev-8',
    author: 'Liam K',
    avatarSrc: '/assets/works/work-4.png',
    rating: 5,
    textEn:
      'Seamless workflow from initial concept sketches to final 3D motion assets and web deployment.',
    textNl:
      'Naadloze workflow van eerste conceptschetsen tot uiteindelijke 3D-motion assets en webimplementatie.',
    column: 1,
  },

  // Column 2 (Right)
  {
    id: 'rev-9',
    author: 'Jake A',
    avatarSrc: '/assets/works/work-5.png',
    rating: 5,
    textEn:
      'FRXCX Studio has everything you need to launch and scale your brand online. An awesome creative partner to have.',
    textNl:
      'FRXCX Studio heeft alles wat je nodig hebt om je merk online te lanceren en op te schalen. Een geweldige partner.',
    column: 2,
  },
  {
    id: 'rev-10',
    author: 'Michael B',
    avatarSrc: '/assets/cards/card-4.png',
    rating: 5,
    textEn:
      'They are helping us take back control of our brand narrative and compete with larger companies because the craft is great!',
    textNl:
      'Ze helpen ons de regie over ons merkverhaal terug te pakken en te concurreren met grotere bedrijven!',
    column: 2,
  },
  {
    id: 'rev-11',
    author: 'Chloe M',
    avatarSrc: '/assets/cards/card-1.png',
    rating: 5,
    textEn:
      'Every micro-interaction, transition, and typographic detail was engineered to perfection.',
    textNl:
      'Elke micro-interactie, overgang en typografisch detail is tot in de puntjes uitgewerkt.',
    column: 2,
  },
  {
    id: 'rev-12',
    author: 'Noah D',
    avatarSrc: '/assets/works/work-2.png',
    rating: 5,
    textEn:
      'Best creative agency experience we have ever had. Clear timelines, bold ideas, and world-class execution.',
    textNl:
      'Beste creatieve bureau-ervaring die we ooit hebben gehad. Duidelijke tijdlijnen en uitvoering van wereldklasse.',
    column: 2,
  },
];

/**
 * Returns true when there are enough reviews to continuously auto-scroll downward
 * and loop back to the top; returns false when reviews are few so they stay fixed.
 */
export function shouldAutoScrollReviews(
  totalReviews: number,
  maxStaticCount = 6
): boolean {
  return totalReviews > maxStaticCount;
}

/**
 * Distributes review items across 3 columns. When autoScroll is enabled,
 * duplicates each column's items so a -50% -> 0% vertical translation loops seamlessly.
 */
export function distributeReviewsIntoColumns(
  reviews: ReviewItemConfig[],
  autoScroll: boolean
): [ReviewItemConfig[], ReviewItemConfig[], ReviewItemConfig[]] {
  const col0 = reviews.filter((r) => r.column === 0);
  const col1 = reviews.filter((r) => r.column === 1);
  const col2 = reviews.filter((r) => r.column === 2);

  if (!autoScroll) {
    return [col0, col1, col2];
  }

  return [
    [...col0, ...col0],
    [...col1, ...col1],
    [...col2, ...col2],
  ];
}
