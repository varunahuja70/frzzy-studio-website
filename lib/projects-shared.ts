import { z } from 'zod';
import { CASES, CASE_ORDER } from '@/components/frzzy/work-data';

export type ProjectCategory = 'motion' | '3d' | 'branding' | 'social' | 'digital' | 'campaign';
export type ProjectArtType = 'grid' | 'orb' | 'bands' | 'bolts' | 'rings' | 'spark' | 'charge' | 'ground';
export type ProjectMediaType = 'video' | 'image' | 'art';

export interface ProjectItem {
  id: string;
  slug: string;
  title: string;
  type: string; // e.g. "Motion · Loop"
  category: ProjectCategory;
  year: string; // e.g. "2026"
  software: string; // "Made with" e.g. "Houdini · Cinema 4D · Octane · After Effects"
  idea: string; // The idea paragraph
  explored: string[]; // What we explored (bullet points)
  mediaType: ProjectMediaType;
  videoUrl?: string | null;
  imageUrl?: string | null;
  artType: ProjectArtType;
  showOnHome: boolean;
  homeOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShowreelConfig {
  videoUrl: string;
  fileName?: string;
  source: 'supabase' | 'default' | 'external';
  updatedAt: string;
}

export const PROJECT_CATEGORIES: { id: ProjectCategory; label: string }[] = [
  { id: 'motion', label: 'Motion' },
  { id: '3d', label: '3D' },
  { id: 'branding', label: 'Branding' },
  { id: 'social', label: 'Social' },
  { id: 'digital', label: 'Digital' },
  { id: 'campaign', label: 'Campaign' },
];

export const ART_TYPES: { id: ProjectArtType; label: string }[] = [
  { id: 'grid', label: 'Volt Grid Runner' },
  { id: 'orb', label: 'Chrome Sphere / Orb' },
  { id: 'bands', label: 'Glitch Bands' },
  { id: 'bolts', label: 'Bolt Pattern' },
  { id: 'rings', label: 'Orbiting Rings' },
  { id: 'spark', label: 'Spark Burst' },
  { id: 'charge', label: 'Battery Charge' },
  { id: 'ground', label: 'Ground Zero' },
];

export const MAX_HOME_PROJECTS = 6;

export const ProjectInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100),
  slug: z.string().trim().min(1, 'Slug is required').max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. my-project)'),
  type: z.string().trim().min(1, 'Type/Tag is required').max(80),
  category: z.enum(['motion', '3d', 'branding', 'social', 'digital', 'campaign']),
  year: z.string().trim().max(20).default(new Date().getFullYear().toString()),
  software: z.string().trim().max(200).default('After Effects · Cinema 4D · Blender'),
  idea: z.string().trim().min(5, 'The idea description must have at least 5 characters').max(1000),
  explored: z.array(z.string().trim().min(1)).min(1, 'Add at least one exploration point').max(10),
  mediaType: z.enum(['video', 'image', 'art']).default('art'),
  videoUrl: z.string().trim().max(1000).nullable().optional(),
  imageUrl: z.string().trim().max(1000).nullable().optional(),
  artType: z.enum(['grid', 'orb', 'bands', 'bolts', 'rings', 'spark', 'charge', 'ground']).default('grid'),
  showOnHome: z.boolean().default(false),
  homeOrder: z.number().int().default(0),
});

export type ProjectInput = z.infer<typeof ProjectInputSchema>;

/** Initial baseline seed from existing static cases */
export function getDefaultProjectsSeed(): ProjectItem[] {
  return CASE_ORDER.map((slug, idx) => {
    const c = CASES[slug];
    return {
      id: `seed-${slug}`,
      slug: c.slug,
      title: c.title,
      type: c.type,
      category: c.category,
      year: '2026',
      software: 'Houdini · Cinema 4D · Octane · After Effects',
      idea: c.idea,
      explored: [...c.explored],
      mediaType: 'art',
      videoUrl: null,
      imageUrl: null,
      artType: c.artType,
      showOnHome: idx < 4, // First 4 featured on home by default
      homeOrder: idx + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}
