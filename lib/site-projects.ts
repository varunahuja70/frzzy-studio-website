/**
 * Server-side storage and Supabase synchronization for Projects & Homepage Showreel.
 * Supports direct Supabase Storage media upload & deletion, plus settings store sync.
 */
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, ensureDatabaseReady } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  ProjectItem,
  ProjectInput,
  ShowreelConfig,
  getDefaultProjectsSeed,
  MAX_HOME_PROJECTS,
} from '@/lib/projects-shared';

export const SITE_PROJECTS_KEY = 'site_projects';
export const SITE_SHOWREEL_KEY = 'site_showreel';
export const MEDIA_BUCKET = 'public-media';
export const DEFAULT_SHOWREEL_URL = '/assets/videos/works/work-1.mp4';

interface ProjectsStore {
  version: 1;
  projects: ProjectItem[];
}

let projectsCache: { store: ProjectsStore; at: number } | null = null;
let showreelCache: { config: ShowreelConfig; at: number } | null = null;
const CACHE_MS = 10_000;

/** ================= SHOWREEL MANAGEMENT ================= **/

export async function getActiveShowreel(fresh = false): Promise<ShowreelConfig> {
  if (!fresh && showreelCache && Date.now() - showreelCache.at < CACHE_MS) {
    return showreelCache.config;
  }

  const supabase = getAdminSupabaseClient();

  // 1. Direct inspection of Supabase Storage in 'public-media/showreel'
  // If the user uploads a video file in Supabase dashboard directly, we automatically detect and use it!
  try {
    const { data: files, error: listErr } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list('showreel', { sortBy: { column: 'created_at', order: 'desc' } });

    if (!listErr && files && files.length > 0) {
      // Find the first video file or non-empty file
      const videoFile = files.find((f) => !f.name.startsWith('.') && f.metadata?.mimetype?.startsWith('video/')) || files[0];
      if (videoFile && videoFile.name) {
        const { data: urlData } = supabase.storage
          .from(MEDIA_BUCKET)
          .getPublicUrl(`showreel/${videoFile.name}`);

        if (urlData?.publicUrl) {
          const config: ShowreelConfig = {
            videoUrl: urlData.publicUrl,
            fileName: videoFile.name,
            source: 'supabase',
            updatedAt: videoFile.updated_at || new Date().toISOString(),
          };
          showreelCache = { config, at: Date.now() };
          return config;
        }
      }
    }
  } catch (err) {
    console.warn('[Showreel] Error checking Supabase storage:', err);
  }

  // 2. Check Supabase settings table for explicit URL
  try {
    const { data: sbData } = await (supabase.from('settings') as any)
      .select('value, updated_at')
      .eq('key', SITE_SHOWREEL_KEY)
      .maybeSingle();

    if (sbData?.value) {
      const val = typeof sbData.value === 'string' ? JSON.parse(sbData.value) : sbData.value;
      if (val?.videoUrl) {
        const config: ShowreelConfig = {
          videoUrl: val.videoUrl,
          fileName: val.fileName,
          source: 'supabase',
          updatedAt: sbData.updated_at || new Date().toISOString(),
        };
        showreelCache = { config, at: Date.now() };
        return config;
      }
    }
  } catch (err) {
    console.warn('[Showreel] Error checking Supabase settings:', err);
  }

  // 3. Fallback to default continuous showreel video
  const defaultConfig: ShowreelConfig = {
    videoUrl: DEFAULT_SHOWREEL_URL,
    source: 'default',
    updatedAt: new Date().toISOString(),
  };
  showreelCache = { config: defaultConfig, at: Date.now() };
  return defaultConfig;
}

export async function uploadShowreelVideo(file: Buffer, fileName: string, mimeType: string): Promise<ShowreelConfig> {
  const supabase = getAdminSupabaseClient();
  const safeName = `reel-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `showreel/${safeName}`;

  // Clean old files in showreel directory
  try {
    const { data: oldFiles } = await supabase.storage.from(MEDIA_BUCKET).list('showreel');
    if (oldFiles && oldFiles.length > 0) {
      const pathsToRemove = oldFiles.map((f) => `showreel/${f.name}`);
      await supabase.storage.from(MEDIA_BUCKET).remove(pathsToRemove);
    }
  } catch {}

  // Upload new video to Supabase Storage
  const { error: uploadErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(filePath, file, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(`Failed to upload video to Supabase Storage: ${uploadErr.message}`);
  }

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  const config: ShowreelConfig = {
    videoUrl: publicUrl,
    fileName: safeName,
    source: 'supabase',
    updatedAt: new Date().toISOString(),
  };

  // Sync to Supabase settings
  await (supabase.from('settings') as any).upsert(
    {
      key: SITE_SHOWREEL_KEY,
      value: config,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  // Sync to local SQLite
  try {
    await ensureDatabaseReady();
    await db
      .insert(settings)
      .values({
        key: SITE_SHOWREEL_KEY,
        value: JSON.stringify(config),
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: JSON.stringify(config),
          updatedAt: Date.now(),
        },
      });
  } catch {}

  showreelCache = { config, at: Date.now() };
  return config;
}

export async function deleteShowreelVideo(): Promise<ShowreelConfig> {
  const supabase = getAdminSupabaseClient();

  // Remove from Supabase Storage
  try {
    const { data: oldFiles } = await supabase.storage.from(MEDIA_BUCKET).list('showreel');
    if (oldFiles && oldFiles.length > 0) {
      const pathsToRemove = oldFiles.map((f) => `showreel/${f.name}`);
      await supabase.storage.from(MEDIA_BUCKET).remove(pathsToRemove);
    }
  } catch {}

  // Remove / clear setting in Supabase
  try {
    await (supabase.from('settings') as any).delete().eq('key', SITE_SHOWREEL_KEY);
  } catch {}

  // Remove from local SQLite
  try {
    await ensureDatabaseReady();
    await db.delete(settings).where(eq(settings.key, SITE_SHOWREEL_KEY));
  } catch {}

  const defaultConfig: ShowreelConfig = {
    videoUrl: DEFAULT_SHOWREEL_URL,
    source: 'default',
    updatedAt: new Date().toISOString(),
  };
  showreelCache = { config: defaultConfig, at: Date.now() };
  return defaultConfig;
}

/** ================= PROJECTS MANAGEMENT ================= **/

async function readProjectsStore(fresh = false): Promise<ProjectsStore> {
  if (!fresh && projectsCache && Date.now() - projectsCache.at < CACHE_MS) {
    return projectsCache.store;
  }

  const supabase = getAdminSupabaseClient();

  // 1. Try reading from Supabase settings first
  try {
    const { data: sbData } = await (supabase.from('settings') as any)
      .select('value, updated_at')
      .eq('key', SITE_PROJECTS_KEY)
      .maybeSingle();

    if (sbData?.value) {
      const parsed = typeof sbData.value === 'string' ? JSON.parse(sbData.value) : sbData.value;
      if (parsed && Array.isArray(parsed.projects)) {
        const store: ProjectsStore = { version: 1, projects: parsed.projects };
        projectsCache = { store, at: Date.now() };
        return store;
      }
    }
  } catch (err) {
    console.warn('[Projects] Failed to fetch from Supabase:', err);
  }

  // 2. Fallback to local SQLite settings
  try {
    await ensureDatabaseReady();
    const rows = await db.select().from(settings).where(eq(settings.key, SITE_PROJECTS_KEY)).limit(1);
    if (rows.length && rows[0].value) {
      const parsed = JSON.parse(rows[0].value);
      if (parsed && Array.isArray(parsed.projects)) {
        const store: ProjectsStore = { version: 1, projects: parsed.projects };
        projectsCache = { store, at: Date.now() };
        return store;
      }
    }
  } catch (err) {
    console.warn('[Projects] Failed to fetch from SQLite:', err);
  }

  // 3. First time initialize: seed default projects and save to Supabase
  const seedProjects = getDefaultProjectsSeed();
  const initialStore: ProjectsStore = { version: 1, projects: seedProjects };
  await writeProjectsStore(initialStore);
  return initialStore;
}

async function writeProjectsStore(store: ProjectsStore): Promise<void> {
  projectsCache = { store, at: Date.now() };

  // 1. Save to Supabase settings
  try {
    const supabase = getAdminSupabaseClient();
    await (supabase.from('settings') as any).upsert(
      {
        key: SITE_PROJECTS_KEY,
        value: store,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn('[Projects] Failed to sync to Supabase settings:', err);
  }

  // 2. Save to local SQLite settings
  try {
    await ensureDatabaseReady();
    await db
      .insert(settings)
      .values({
        key: SITE_PROJECTS_KEY,
        value: JSON.stringify(store),
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: JSON.stringify(store),
          updatedAt: Date.now(),
        },
      });
  } catch (err) {
    console.warn('[Projects] Failed to sync to SQLite settings:', err);
  }
}

export async function listAllProjects(): Promise<ProjectItem[]> {
  const store = await readProjectsStore();
  return store.projects;
}

export async function listHomeProjects(): Promise<ProjectItem[]> {
  const store = await readProjectsStore();
  // Filter for home page and slice to MAX_HOME_PROJECTS (0 to 6)
  return store.projects
    .filter((p) => p.showOnHome)
    .sort((a, b) => (a.homeOrder || 0) - (b.homeOrder || 0))
    .slice(0, MAX_HOME_PROJECTS);
}

export async function getProjectBySlug(slug: string): Promise<ProjectItem | null> {
  const store = await readProjectsStore();
  return store.projects.find((p) => p.slug === slug) || null;
}

export async function createProject(input: ProjectInput): Promise<ProjectItem> {
  const store = await readProjectsStore(true);

  // Check unique slug
  if (store.projects.some((p) => p.slug.toLowerCase() === input.slug.toLowerCase())) {
    throw new Error(`A project with slug "${input.slug}" already exists.`);
  }

  // Check Homepage limit (0 to 6)
  if (input.showOnHome) {
    const currentHomeCount = store.projects.filter((p) => p.showOnHome).length;
    if (currentHomeCount >= MAX_HOME_PROJECTS) {
      throw new Error(
        `Homepage limit reached. Maximum ${MAX_HOME_PROJECTS} projects allowed on home page (currently ${currentHomeCount}). Please unfeature one first.`
      );
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newProject: ProjectItem = {
    id,
    slug: input.slug,
    title: input.title,
    type: input.type,
    category: input.category,
    year: input.year || '2026',
    software: input.software || 'After Effects · Cinema 4D',
    idea: input.idea,
    explored: input.explored,
    mediaType: input.mediaType || 'art',
    videoUrl: input.videoUrl || null,
    imageUrl: input.imageUrl || null,
    artType: input.artType || 'grid',
    showOnHome: Boolean(input.showOnHome),
    homeOrder: input.homeOrder || store.projects.length + 1,
    createdAt: now,
    updatedAt: now,
  };

  store.projects.unshift(newProject);
  await writeProjectsStore(store);
  return newProject;
}

export async function updateProject(id: string, input: Partial<ProjectInput>): Promise<ProjectItem> {
  const store = await readProjectsStore(true);
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx === -1) {
    throw new Error('Project not found');
  }

  const existing = store.projects[idx];

  // If changing slug, verify uniqueness
  if (input.slug && input.slug.toLowerCase() !== existing.slug.toLowerCase()) {
    if (store.projects.some((p) => p.id !== id && p.slug.toLowerCase() === input.slug!.toLowerCase())) {
      throw new Error(`A project with slug "${input.slug}" already exists.`);
    }
  }

  // If enabling on homepage, verify limit
  if (input.showOnHome === true && !existing.showOnHome) {
    const currentHomeCount = store.projects.filter((p) => p.showOnHome && p.id !== id).length;
    if (currentHomeCount >= MAX_HOME_PROJECTS) {
      throw new Error(
        `Homepage limit reached. Maximum ${MAX_HOME_PROJECTS} projects allowed on home page (currently ${currentHomeCount}). Please unfeature one first.`
      );
    }
  }

  const updated: ProjectItem = {
    ...existing,
    ...input,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  store.projects[idx] = updated;
  await writeProjectsStore(store);
  return updated;
}

export async function deleteProject(id: string): Promise<ProjectItem> {
  const store = await readProjectsStore(true);
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx === -1) {
    throw new Error('Project not found');
  }

  const [deleted] = store.projects.splice(idx, 1);
  await writeProjectsStore(store);

  // Clean up any files in Supabase Storage under `projects/${id}`
  try {
    const supabase = getAdminSupabaseClient();
    const { data: projectFiles } = await supabase.storage.from(MEDIA_BUCKET).list(`projects/${id}`);
    if (projectFiles && projectFiles.length > 0) {
      const pathsToRemove = projectFiles.map((f) => `projects/${id}/${f.name}`);
      await supabase.storage.from(MEDIA_BUCKET).remove(pathsToRemove);
    }
  } catch (err) {
    console.warn(`[Projects] Failed to clean up storage for project ${id}:`, err);
  }

  return deleted;
}

export async function reorderProjects(ids: string[]): Promise<ProjectItem[]> {
  const store = await readProjectsStore(true);
  const map = new Map(store.projects.map((p) => [p.id, p]));
  const ordered: ProjectItem[] = [];

  for (const id of ids) {
    const p = map.get(id);
    if (p) {
      ordered.push(p);
      map.delete(id);
    }
  }

  // Append any remaining
  for (const remaining of map.values()) {
    ordered.push(remaining);
  }

  store.projects = ordered;
  await writeProjectsStore(store);
  return store.projects;
}

/** Upload media for a project to Supabase Storage */
export async function uploadProjectMedia(
  projectId: string,
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ publicUrl: string; fileName: string; isVideo: boolean }> {
  const supabase = getAdminSupabaseClient();
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `projects/${projectId}/${safeName}`;

  const { error: uploadErr } = await supabase.storage.from(MEDIA_BUCKET).upload(filePath, file, {
    contentType: mimeType,
    upsert: true,
  });

  if (uploadErr) {
    throw new Error(`Failed to upload media to Supabase: ${uploadErr.message}`);
  }

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
  const isVideo = mimeType.startsWith('video/');

  return {
    publicUrl: urlData.publicUrl,
    fileName: safeName,
    isVideo,
  };
}
