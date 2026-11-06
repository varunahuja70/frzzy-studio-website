export type MediaCategory =
  | 'hero'
  | 'latest-works'
  | 'faq'
  | 'partners'
  | 'branding';

export type MediaType = 'video' | 'image';

export interface MediaManifestEntry {
  id: string; // Unique slot ID (e.g. 'hero-card-1', 'work-1')
  title: string;
  category: MediaCategory;
  mediaType: MediaType;
  filePath: string; // Relative to project root public folder (e.g. 'assets/videos/card-1.mp4')
  mimeType: string;
  posterPath?: string;
  aspectRatio: string;
  width?: number;
  height?: number;
  alt: string;
  tags?: string[];
  active: boolean;
  updatedAt: string;
}

export const MEDIA_MANIFEST: Record<string, MediaManifestEntry> = {
  // ================= HERO CARDS =================
  'hero-card-1': {
    id: 'hero-card-1',
    title: 'Editorial Motion Showcase 1',
    category: 'hero',
    mediaType: 'video',
    filePath: 'assets/videos/card-1.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/cards/card-1.png',
    aspectRatio: '16:9',
    width: 640,
    height: 360,
    alt: 'FRXCX Editorial hero interactive video card 1',
    tags: ['hero', 'interactive', 'editorial'],
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
  'hero-card-2': {
    id: 'hero-card-2',
    title: 'Editorial Motion Showcase 2',
    category: 'hero',
    mediaType: 'video',
    filePath: 'assets/videos/card-2.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/cards/card-2.png',
    aspectRatio: '9:16',
    width: 360,
    height: 640,
    alt: 'FRXCX Editorial hero interactive video card 2',
    tags: ['hero', 'interactive', 'vertical'],
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
  'hero-card-3': {
    id: 'hero-card-3',
    title: 'Editorial Motion Showcase 3',
    category: 'hero',
    mediaType: 'video',
    filePath: 'assets/videos/card-3.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/cards/card-3.png',
    aspectRatio: '16:9',
    width: 640,
    height: 360,
    alt: 'FRXCX Editorial hero interactive video card 3',
    tags: ['hero', 'interactive', 'editorial'],
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
  'hero-card-4': {
    id: 'hero-card-4',
    title: 'Editorial Motion Showcase 4',
    category: 'hero',
    mediaType: 'video',
    filePath: 'assets/videos/card-4.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/cards/card-4.png',
    aspectRatio: '9:16',
    width: 360,
    height: 640,
    alt: 'FRXCX Editorial hero interactive video card 4',
    tags: ['hero', 'interactive', 'vertical'],
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },

  // ================= LATEST WORKS (3D STAGE) =================
  'work-1': {
    id: 'work-1',
    title: 'Architectural Vision Reel',
    category: 'latest-works',
    mediaType: 'video',
    filePath: 'assets/videos/works/work-1.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/works/work-1.png',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    alt: 'Architectural modern house design vertical reel',
    tags: ['works', '3d', 'reel'],
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
  'work-2': {
    id: 'work-2',
    title: 'Bali Mastermind Cinematic Pace',
    category: 'latest-works',
    mediaType: 'video',
    filePath: 'assets/videos/works/work-2.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/works/work-2.png',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    alt: 'Bali Mastermind luxury villa aerial pool cinematic',
    tags: ['works', 'cinematic', 'pace'],
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
  'work-3': {
    id: 'work-3',
    title: 'Dynamic Motion Typography',
    category: 'latest-works',
    mediaType: 'video',
    filePath: 'assets/videos/works/work-3.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/works/work-3.png',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    alt: 'Studio dialogue dynamic kinetic motion',
    tags: ['works', 'motion', 'typography'],
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
  'work-4': {
    id: 'work-4',
    title: 'Luxury Brand Identity Spot',
    category: 'latest-works',
    mediaType: 'video',
    filePath: 'assets/videos/works/work-4.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/works/work-4.png',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    alt: 'High aesthetic brand editorial motion showcase',
    tags: ['works', 'luxury', 'branding'],
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
  'work-5': {
    id: 'work-5',
    title: 'Editorial 3D Spatial Experience',
    category: 'latest-works',
    mediaType: 'video',
    filePath: 'assets/videos/works/work-5.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/works/work-5.png',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    alt: 'Immersive 3D experiential spatial campaign',
    tags: ['works', '3d', 'spatial'],
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },

  // ================= FAQ SHOWCASE REELS =================
  'faq-reel-1': {
    id: 'faq-reel-1',
    title: 'Story Showcase Reel',
    category: 'faq',
    mediaType: 'video',
    filePath: 'assets/videos/works/work-1.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/works/work-1.png',
    aspectRatio: '9:16',
    alt: 'FAQ story vertical showcase card',
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
  'faq-reel-2': {
    id: 'faq-reel-2',
    title: 'Pace Showcase Reel',
    category: 'faq',
    mediaType: 'video',
    filePath: 'assets/videos/works/work-2.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/works/work-2.png',
    aspectRatio: '9:16',
    alt: 'FAQ pace vertical showcase center card',
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
  'faq-reel-3': {
    id: 'faq-reel-3',
    title: 'Motion Showcase Reel',
    category: 'faq',
    mediaType: 'video',
    filePath: 'assets/videos/works/work-3.mp4',
    mimeType: 'video/mp4',
    posterPath: 'assets/works/work-3.png',
    aspectRatio: '9:16',
    alt: 'FAQ motion vertical showcase card',
    active: true,
    updatedAt: '2026-11-06T12:00:00Z',
  },
};

/**
 * Returns manifest entry by ID, or undefined if not registered.
 */
export function getMediaEntry(id: string): MediaManifestEntry | undefined {
  return MEDIA_MANIFEST[id];
}

/**
 * Returns all media entries for a specific category.
 */
export function getMediaByCategory(
  category: MediaCategory
): MediaManifestEntry[] {
  return Object.values(MEDIA_MANIFEST).filter(
    (item) => item.category === category && item.active
  );
}
