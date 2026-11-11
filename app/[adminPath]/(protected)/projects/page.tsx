'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Upload,
  Eye,
  ExternalLink,
  X,
  RefreshCw,
  Film,
  Sparkles,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Check,
  ChevronRight,
  HardDrive,
  Clock,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  Play,
  RotateCcw,
} from 'lucide-react';
import type {
  ProjectItem,
  ProjectCategory,
  ProjectArtType,
  ProjectMediaType,
  ProjectInput,
} from '@/lib/projects-shared';
import { PROJECT_CATEGORIES, ART_TYPES, MAX_HOME_PROJECTS } from '@/lib/projects-shared';

// Luxury Theme Tokens matching Studio Vault & Dashboard
const card =
  'p-5 sm:p-6 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs hover:border-black/15 dark:hover:border-white/15 transition-all';
const sub = 'text-xs text-[#5a6265] dark:text-[#a09d93]';
const label = 'block text-[11px] font-semibold uppercase tracking-wider text-[#5a6265] dark:text-[#a09d93] mb-1.5';
const input =
  'w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-[13px] text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#26D67C] transition-all placeholder:text-[#5a6265]/60';
const btnPrimary =
  'h-10 px-5 rounded-[12px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#26D67C] dark:hover:bg-[#26D67C] dark:hover:text-[#12110b] text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const btnVolt =
  'h-10 px-5 rounded-[12px] bg-[#26D67C] hover:bg-[#20ba6b] text-[#12110b] font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const btnGhost =
  'h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#181712] border border-black/10 dark:border-white/10 text-xs font-medium text-[#12110b] dark:text-[#f4efea] inline-flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const EMPTY_FORM: ProjectInput = {
  title: '',
  slug: '',
  type: 'Motion · Loop',
  category: 'motion',
  year: '2026',
  software: 'Cinema 4D · Octane · After Effects',
  idea: '',
  explored: [
    'Looping seamless camera perspective',
    'Clean volt accent discipline',
    'High voltage particle motion',
  ],
  mediaType: 'art',
  videoUrl: '',
  imageUrl: '',
  artType: 'grid',
  showOnHome: false,
  homeOrder: 0,
};

export default function AdminProjectsPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // View mode switcher: Grid or Table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Showreel State
  const [showreel, setShowreel] = useState<{ videoUrl: string; fileName?: string; source: string; updatedAt?: string } | null>(null);
  const [reelUploading, setReelUploading] = useState(false);
  const reelFileInputRef = useRef<HTMLInputElement>(null);

  // Project Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'details' | 'explored' | 'media' | 'placement'>('details');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Media Upload inside Project Modal
  const [mediaUploading, setMediaUploading] = useState(false);
  const projectMediaInputRef = useRef<HTMLInputElement>(null);

  // Exploration points state
  const [newPoint, setNewPoint] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const homeCount = projects.filter((p) => p.showOnHome).length;

  const showToast = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Fetch projects and showreel
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, reelRes] = await Promise.all([
        fetch('/api/admin/projects'),
        fetch('/api/admin/showreel'),
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        if (data.projects) setProjects(data.projects);
        if (typeof data.canEdit === 'boolean') setCanEdit(data.canEdit);
      }

      if (reelRes.ok) {
        const data = await reelRes.json();
        if (data.showreel) setShowreel(data.showreel);
      }
    } catch {
      showToast('error', 'Failed to load projects from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Showreel Video Upload
  const handleShowreelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('error', 'Please select a valid video file (MP4, WebM, MOV)');
      return;
    }

    try {
      setReelUploading(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/admin/showreel', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload showreel');

      setShowreel(data.showreel);
      showToast('success', 'Showreel video uploaded and synced to Supabase Storage!');
    } catch (err: any) {
      showToast('error', err.message || 'Showreel upload failed');
    } finally {
      setReelUploading(false);
      if (reelFileInputRef.current) reelFileInputRef.current.value = '';
    }
  };

  // Handle Showreel Video Reset/Delete
  const handleShowreelDelete = async () => {
    if (!confirm('Are you sure you want to delete the custom showreel video from Supabase and restore the default showreel?')) return;

    try {
      const res = await fetch('/api/admin/showreel', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete showreel');

      setShowreel(data.showreel);
      showToast('success', 'Custom video removed from Supabase. Default showreel restored.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete showreel');
    }
  };

  // Open Modal for New Project
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      homeOrder: projects.length + 1,
    });
    setModalTab('details');
    setModalOpen(true);
  };

  // Open Modal for Editing Project
  const handleOpenEdit = (p: ProjectItem) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      type: p.type,
      category: p.category,
      year: p.year,
      software: p.software,
      idea: p.idea,
      explored: [...p.explored],
      mediaType: p.mediaType,
      videoUrl: p.videoUrl || '',
      imageUrl: p.imageUrl || '',
      artType: p.artType,
      showOnHome: p.showOnHome,
      homeOrder: p.homeOrder || 0,
    });
    setModalTab('details');
    setModalOpen(true);
  };

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setForm((prev) => {
      const updated = { ...prev, title: val };
      if (!editingId) {
        updated.slug = val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      return updated;
    });
  };

  // Toggle Show on Homepage with 0 to 6 Limit enforcement
  const handleToggleHome = async (p: ProjectItem) => {
    if (!p.showOnHome && homeCount >= MAX_HOME_PROJECTS) {
      showToast(
        'error',
        `Homepage limit reached! Only 0 to ${MAX_HOME_PROJECTS} projects can be displayed on home. Disable one first.`
      );
      return;
    }

    try {
      const res = await fetch(`/api/admin/projects/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnHome: !p.showOnHome }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      setProjects((prev) => prev.map((item) => (item.id === p.id ? data.project : item)));
      showToast('success', !p.showOnHome ? 'Project featured on Homepage!' : 'Project moved to Work archive.');
    } catch (err: any) {
      showToast('error', err.message || 'Update failed');
    }
  };

  // Handle Project Media Upload to Supabase Storage
  const handleProjectMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setMediaUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('projectId', editingId || 'new');

      const res = await fetch('/api/admin/projects/upload', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload media');

      if (data.isVideo) {
        setForm((prev) => ({ ...prev, mediaType: 'video', videoUrl: data.publicUrl }));
        showToast('success', 'Project video uploaded directly to Supabase Storage!');
      } else {
        setForm((prev) => ({ ...prev, mediaType: 'image', imageUrl: data.publicUrl }));
        showToast('success', 'Project image uploaded directly to Supabase Storage!');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Media upload failed');
    } finally {
      setMediaUploading(false);
      if (projectMediaInputRef.current) projectMediaInputRef.current.value = '';
    }
  };

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.showOnHome && (!editingId || !projects.find((p) => p.id === editingId)?.showOnHome)) {
      if (homeCount >= MAX_HOME_PROJECTS) {
        showToast(
          'error',
          `Homepage limit reached! Only 0 to ${MAX_HOME_PROJECTS} projects can be featured on home. Disable one first.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const url = editingId ? `/api/admin/projects/${editingId}` : '/api/admin/projects';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save project');

      if (editingId) {
        setProjects((prev) => prev.map((p) => (p.id === editingId ? data.project : p)));
        showToast('success', 'Project updated successfully in Supabase!');
      } else {
        setProjects((prev) => [data.project, ...prev]);
        showToast('success', 'New project created and stored in Supabase!');
      }

      setModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Project
  const handleDelete = async (p: ProjectItem) => {
    if (!confirm(`Are you sure you want to permanently delete "${p.title}"? Media stored in Supabase will also be cleaned.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/projects/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      setProjects((prev) => prev.filter((item) => item.id !== p.id));
      showToast('success', `"${p.title}" removed from Supabase and site.`);
    } catch (err: any) {
      showToast('error', err.message || 'Delete failed');
    }
  };

  // Add explored point
  const handleAddPoint = () => {
    if (!newPoint.trim()) return;
    setForm((prev) => ({ ...prev, explored: [...prev.explored, newPoint.trim()] }));
    setNewPoint('');
  };

  // Remove explored point
  const handleRemovePoint = (idx: number) => {
    setForm((prev) => ({ ...prev, explored: prev.explored.filter((_, i) => i !== idx) }));
  };

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-7xl">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea] flex items-center gap-2.5">
              <Layers className="h-6 w-6 text-[#26D67C]" />
              Studio Projects & Works
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#26D67C]/10 text-[#26D67C] border border-[#26D67C]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#26D67C] animate-pulse" />
              Supabase Live Sync
            </span>
          </div>
          <p className={`${sub} mt-1`}>
            Manage homepage showcase experiments, detailed portfolio case studies, and hero showreel media.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className={btnGhost}
            title="Refresh latest data from Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link href="/work" target="_blank" className={btnGhost}>
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Public Work</span>
          </Link>

          {canEdit && (
            <button onClick={handleOpenCreate} className={btnVolt}>
              <Plus className="h-4 w-4" />
              <span>Add New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {alert && (
        <div
          className={`p-3.5 sm:p-4 rounded-[14px] text-xs font-semibold flex items-center gap-2.5 shadow-sm transition-all animate-in fade-in ${
            alert.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          {alert.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* 2. STATS ROW (Strict Linear / Apple Health Aesthetic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Published Works */}
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Total Works</span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[22px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
              {projects.length}
            </span>
            <span className="text-[11px] font-medium text-blue-500">All Live</span>
          </div>
          <span className={`${sub} mt-1 block`}>Public case studies in database</span>
        </div>

        {/* Card 2: Homepage Featured Slot (Strict 0 to 6 Limit) */}
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Homepage Showcase</span>
            <div className="h-7 w-7 rounded-lg bg-[#26D67C]/10 text-[#26D67C] flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[22px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
              {homeCount} <span className="text-xs font-normal text-[#5a6265]">/ {MAX_HOME_PROJECTS} max</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                homeCount >= MAX_HOME_PROJECTS
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-[#26D67C]/10 text-[#26D67C]'
              }`}
            >
              {homeCount >= MAX_HOME_PROJECTS ? 'Full (6/6)' : `${MAX_HOME_PROJECTS - homeCount} Available`}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-black/5 dark:bg-white/5 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-[#26D67C] h-full rounded-full transition-all duration-500"
              style={{ width: `${(homeCount / MAX_HOME_PROJECTS) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 3: Hero Showreel Status */}
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Hero Showreel</span>
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Film className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-sm font-bold tracking-tight text-[#12110b] dark:text-[#f4efea] truncate max-w-[140px]">
              {showreel?.source === 'supabase' ? 'Custom Video' : 'Default Reel'}
            </span>
            <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
            </span>
          </div>
          <span className={`${sub} mt-1 block truncate`}>
            {showreel?.fileName || 'work-1.mp4 continuous loop'}
          </span>
        </div>

        {/* Card 4: Supabase Media Storage */}
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Media Bucket</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <HardDrive className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-sm font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
              public-media
            </span>
            <span className="text-[10px] font-mono text-[#26D67C] bg-[#26D67C]/10 px-1.5 py-0.5 rounded">
              CDN Active
            </span>
          </div>
          <span className={`${sub} mt-1 block`}>Videos & images stored in Supabase</span>
        </div>
      </div>

      {/* 3. CINEMATIC HERO SHOWREEL MANAGER */}
      <div className="p-5 sm:p-7 rounded-[22px] bg-gradient-to-b from-white to-[#FAFAFA] dark:from-[#181712] dark:to-[#12110b] border border-black/[0.08] dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] dark:border-white/[0.07]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#26D67C] animate-pulse" />
              <h2 className="text-sm font-bold text-[#12110b] dark:text-[#f4efea]">
                Homepage Continuous Showreel Player
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#26D67C]/10 text-[#26D67C] border border-[#26D67C]/20">
                16:9 Cinema Loop
              </span>
            </div>
            <p className={`${sub} mt-1 max-w-2xl`}>
              This continuous background video plays right under the header on the public homepage. You can upload any video here, or directly to Supabase Storage at <code className="text-[#26D67C] font-mono">public-media/showreel/</code>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <input
              type="file"
              ref={reelFileInputRef}
              onChange={handleShowreelUpload}
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
            />
            <button
              onClick={() => reelFileInputRef.current?.click()}
              disabled={reelUploading || !canEdit}
              className={btnVolt}
            >
              {reelUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{reelUploading ? 'Uploading to Supabase…' : 'Upload Showreel Video'}</span>
            </button>

            {showreel?.source === 'supabase' && canEdit && (
              <button
                onClick={handleShowreelDelete}
                className={`${btnGhost} text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Default</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mt-6">
          {/* Video Preview */}
          <div className="lg:col-span-7 relative aspect-video rounded-[16px] overflow-hidden bg-black border border-black/15 dark:border-white/10 shadow-lg group">
            <video
              key={showreel?.videoUrl}
              src={showreel?.videoUrl || '/assets/videos/works/work-1.mp4'}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 backdrop-blur-md text-[#26D67C] border border-white/10 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#26D67C] animate-pulse" />
                LIVE ON HOMEPAGE
              </span>
            </div>
          </div>

          {/* Details & Live Status */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="p-4 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
              <span className="text-[10.5px] uppercase font-bold text-[#5a6265] dark:text-[#a09d93]">
                Source Information
              </span>
              <p className="font-semibold text-xs text-[#12110b] dark:text-[#f4efea] mt-1 flex items-center gap-1.5">
                {showreel?.source === 'supabase' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#26D67C]" /> Custom Supabase Storage Video
                  </>
                ) : (
                  <>
                    <Film className="h-3.5 w-3.5 text-blue-500" /> Default Studio Showreel Loop
                  </>
                )}
              </p>
              {showreel?.fileName && (
                <p className="font-mono text-[11px] text-[#26D67C] mt-1 truncate">
                  file: {showreel.fileName}
                </p>
              )}
            </div>

            <div className="p-4 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
              <span className="text-[10.5px] uppercase font-bold text-[#5a6265] dark:text-[#a09d93]">
                Supabase Direct Sync
              </span>
              <p className="text-[11.5px] text-[#5a6265] dark:text-[#a09d93] mt-1 leading-relaxed">
                If you upload or delete videos in your Supabase project under <code className="text-[#26D67C] font-mono">public-media/showreel/</code>, the website updates immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CONTROLS BAR: CATEGORIES, SEARCH & VIEW MODE */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-2">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] shadow-xs'
                : 'bg-black/[0.04] dark:bg-white/[0.04] text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
            }`}
          >
            All Works ({projects.length})
          </button>
          {PROJECT_CATEGORIES.map((c) => {
            const count = projects.filter((p) => p.category === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] shadow-xs'
                    : 'bg-black/[0.04] dark:bg-white/[0.04] text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
                }`}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6265]" />
            <input
              type="text"
              placeholder="Search by title, tag, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#26D67C] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6265] hover:text-[#12110b] dark:hover:text-[#f4efea]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Grid vs Table View Buttons */}
          <div className="flex items-center p-0.5 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[8px] transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#181712] text-[#12110b] dark:text-[#f4efea] shadow-xs'
                  : 'text-[#5a6265] dark:text-[#a09d93]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-[8px] transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#181712] text-[#12110b] dark:text-[#f4efea] shadow-xs'
                  : 'text-[#5a6265] dark:text-[#a09d93]'
              }`}
              title="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. PROJECTS PRESENTATION (GRID OR TABLE) */}
      {loading ? (
        <div className="p-16 text-center text-xs text-[#5a6265] dark:text-[#a09d93]">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#26D67C]" />
          Connecting to Supabase and loading portfolio works…
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-16 text-center rounded-[20px] border border-dashed border-black/15 dark:border-white/15 text-xs text-[#5a6265] dark:text-[#a09d93] space-y-3">
          <Layers className="h-8 w-8 mx-auto text-[#5a6265]/40" />
          <p className="font-semibold text-sm text-[#12110b] dark:text-[#f4efea]">No projects matched your query</p>
          <p className="max-w-md mx-auto">Try clearing search filters or create a new experiment.</p>
          {canEdit && (
            <button onClick={handleOpenCreate} className={btnVolt}>
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className={`${card} flex flex-col justify-between group relative overflow-hidden transition-all duration-300 hover:shadow-md`}
            >
              {/* Media Thumbnail (16:9) */}
              <div className="relative aspect-video rounded-[14px] overflow-hidden bg-black mb-4 border border-black/10 dark:border-white/10">
                {p.videoUrl ? (
                  <video src={p.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black/80 text-[#26D67C]">
                    <Sparkles className="h-6 w-6 mb-1 text-[#26D67C]" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#a09d93]">
                      Art: {p.artType}
                    </span>
                  </div>
                )}

                {/* Top Badge: Homepage status */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm backdrop-blur-md flex items-center gap-1.5 ${
                      p.showOnHome
                        ? 'bg-[#26D67C] text-[#12110b]'
                        : 'bg-black/60 text-white/70 border border-white/10'
                    }`}
                  >
                    {p.showOnHome ? (
                      <>
                        <Check className="h-3 w-3 stroke-[3]" /> Featured on Home
                      </>
                    ) : (
                      'Archive Only'
                    )}
                  </span>
                </div>

                {/* Bottom Badges: Category & Media Type */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white border border-white/10">
                    {p.category.toUpperCase()}
                  </span>
                  {p.videoUrl && (
                    <span className="p-1 rounded-md bg-black/70 backdrop-blur-md text-[#26D67C] border border-white/10">
                      <Video className="h-3 w-3" />
                    </span>
                  )}
                  {p.imageUrl && (
                    <span className="p-1 rounded-md bg-black/70 backdrop-blur-md text-[#26D67C] border border-white/10">
                      <ImageIcon className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#12110b] dark:text-[#f4efea] group-hover:text-[#26D67C] transition-colors line-clamp-1">
                      {p.title}
                    </h3>
                    <p className="font-mono text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                      /{p.slug}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#5a6265] dark:text-[#a09d93] shrink-0">
                    {p.year}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#26D67C] bg-[#26D67C]/10 px-2 py-0.5 rounded-md">
                    {p.type}
                  </span>
                </div>

                <p className="text-xs text-[#5a6265] dark:text-[#a09d93] line-clamp-2 leading-relaxed">
                  {p.idea}
                </p>

                <div className="pt-2 text-[11px] text-[#5a6265] dark:text-[#a09d93] border-t border-black/[0.04] dark:border-white/[0.04]">
                  <span className="font-semibold text-[#12110b] dark:text-[#f4efea]">Made with: </span>
                  <span className="truncate">{p.software}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-black/[0.06] dark:border-white/[0.07] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleHome(p)}
                  disabled={!canEdit}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-[8px] border transition-colors cursor-pointer ${
                    p.showOnHome
                      ? 'border-[#26D67C]/40 bg-[#26D67C]/10 text-[#26D67C]'
                      : 'border-black/10 dark:border-white/10 text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
                  }`}
                  title={p.showOnHome ? 'Click to remove from homepage' : 'Click to feature on homepage (max 6)'}
                >
                  {p.showOnHome ? '✓ On Home' : '+ Add to Home'}
                </button>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`/work/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-[8px] text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title="View Public Case Study Page"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-[8px] text-[#5a6265] dark:text-[#a09d93] hover:text-[#26D67C] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Edit Project"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 rounded-[8px] text-[#5a6265] dark:text-[#a09d93] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Project & Storage Media"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.07] bg-black/[0.02] dark:bg-white/[0.02] text-[#5a6265] dark:text-[#a09d93] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Tags & Software</th>
                  <th className="py-3.5 px-4 text-center">Homepage</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 rounded-[8px] bg-black overflow-hidden shrink-0 border border-black/10 dark:border-white/10">
                          {p.videoUrl ? (
                            <video src={p.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                          ) : p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#26D67C]">
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#12110b] dark:text-[#f4efea]">{p.title}</p>
                          <p className="font-mono text-[10px] text-[#5a6265] dark:text-[#a09d93]">/{p.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold uppercase text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#12110b] dark:text-[#f4efea]">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-[11px] text-[#26D67C]">{p.type}</p>
                      <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] truncate max-w-[200px]">{p.software}</p>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleHome(p)}
                        disabled={!canEdit}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                          p.showOnHome
                            ? 'bg-[#26D67C] text-[#12110b]'
                            : 'bg-black/5 dark:bg-white/5 text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
                        }`}
                      >
                        {p.showOnHome ? '✓ On Home' : 'Archive'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/work/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-[8px] text-[#5a6265] hover:text-[#12110b] dark:hover:text-[#f4efea]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-[8px] text-[#5a6265] hover:text-[#26D67C] cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="p-1.5 rounded-[8px] text-[#5a6265] hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. LUXURY PROJECT EDITOR MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#161510] border border-black/10 dark:border-white/10 rounded-[22px] max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
              <div>
                <h2 className="text-lg font-bold text-[#12110b] dark:text-[#f4efea] flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#26D67C]" />
                  {editingId ? 'Edit Portfolio Project' : 'Create New Portfolio Project'}
                </h2>
                <p className={`${sub} mt-0.5`}>
                  Configures public case study, media files, and Supabase database records.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full text-[#5a6265] hover:text-[#12110b] dark:hover:text-[#f4efea] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Nav Tabs */}
            <div className="flex items-center gap-2 border-b border-black/[0.06] dark:border-white/[0.07] pb-3">
              {[
                { id: 'details', label: '1. Basic Info' },
                { id: 'explored', label: '2. Case Study Points' },
                { id: 'media', label: '3. Media & Storage' },
                { id: 'placement', label: '4. Placement' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModalTab(tab.id as any)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    modalTab === tab.id
                      ? 'bg-[#26D67C]/15 text-[#26D67C] border border-[#26D67C]/30'
                      : 'text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* TAB 1: BASIC DETAILS */}
              {modalTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Project Title *</label>
                      <input
                        type="text"
                        required
                        value={form.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="e.g. Grid Runner"
                        className={input}
                      />
                    </div>
                    <div>
                      <label className={label}>URL Slug *</label>
                      <input
                        type="text"
                        required
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().trim() })}
                        placeholder="e.g. grid-runner"
                        className={input}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={label}>Category *</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as ProjectCategory })}
                        className={input}
                      >
                        {PROJECT_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={label}>Tags / Type *</label>
                      <input
                        type="text"
                        required
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        placeholder="e.g. Motion · Loop"
                        className={input}
                      />
                    </div>

                    <div>
                      <label className={label}>Year</label>
                      <input
                        type="text"
                        value={form.year}
                        onChange={(e) => setForm({ ...form, year: e.target.value })}
                        placeholder="2026"
                        className={input}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={label}>Software / Made With *</label>
                    <input
                      type="text"
                      required
                      value={form.software}
                      onChange={(e) => setForm({ ...form, software: e.target.value })}
                      placeholder="e.g. Houdini · Cinema 4D · Octane · After Effects"
                      className={input}
                    />
                  </div>

                  <div>
                    <label className={label}>The Idea (Description Paragraph) *</label>
                    <textarea
                      required
                      rows={3}
                      value={form.idea}
                      onChange={(e) => setForm({ ...form, idea: e.target.value })}
                      placeholder="A seamless run across an endless volt grid. One colour, one horizon and a camera that never stops moving."
                      className="w-full p-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-[13px] text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#26D67C] resize-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: WHAT WE EXPLORED */}
              {modalTab === 'explored' && (
                <div className="space-y-4">
                  <div>
                    <label className={label}>Case Study Key Exploration Points</label>
                    <p className={`${sub} mb-3`}>
                      These bullet points appear under &quot;What we explored&quot; with the signature bolt icon on the public case study page.
                    </p>

                    <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
                      {form.explored.map((point, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2.5 px-3 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-[#f4efea]"
                        >
                          <span className="flex-1 font-medium">⚡ {point}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePoint(idx)}
                            className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPoint}
                        onChange={(e) => setNewPoint(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPoint();
                          }
                        }}
                        placeholder="Add a new exploration point..."
                        className={input}
                      />
                      <button type="button" onClick={handleAddPoint} className={btnGhost}>
                        Add Point
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MEDIA & SUPABASE STORAGE */}
              {modalTab === 'media' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className={label}>Select Media Mode</label>
                    <div className="flex gap-1.5 p-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04]">
                      {(['video', 'image', 'art'] as ProjectMediaType[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setForm({ ...form, mediaType: m })}
                          className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${
                            form.mediaType === m
                              ? 'bg-[#26D67C] text-[#12110b] shadow-xs'
                              : 'text-[#5a6265] dark:text-[#a09d93]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload to Supabase Storage */}
                  <div className="p-4 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-black/15 dark:border-white/15 text-center space-y-2.5">
                    <input
                      type="file"
                      ref={projectMediaInputRef}
                      onChange={handleProjectMediaUpload}
                      accept={form.mediaType === 'video' ? 'video/*' : 'image/*'}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => projectMediaInputRef.current?.click()}
                      disabled={mediaUploading}
                      className={btnVolt}
                    >
                      {mediaUploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      <span>{mediaUploading ? 'Uploading to Supabase…' : `Upload ${form.mediaType === 'video' ? 'Video' : 'Image'} to Supabase Storage`}</span>
                    </button>
                    <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                      Target: Supabase bucket <code className="text-[#26D67C]">public-media/projects/</code>
                    </p>
                  </div>

                  {form.mediaType === 'video' && (
                    <div>
                      <label className={label}>Video URL (or direct uploaded Supabase link)</label>
                      <input
                        type="url"
                        value={form.videoUrl || ''}
                        onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                        placeholder="https://...supabase.co/storage/v1/object/public/.../video.mp4"
                        className={input}
                      />
                    </div>
                  )}

                  {form.mediaType === 'image' && (
                    <div>
                      <label className={label}>Image URL (or direct uploaded Supabase link)</label>
                      <input
                        type="url"
                        value={form.imageUrl || ''}
                        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                        placeholder="https://...supabase.co/storage/v1/object/public/.../image.webp"
                        className={input}
                      />
                    </div>
                  )}

                  {form.mediaType === 'art' && (
                    <div>
                      <label className={label}>Procedural 3D Art Template</label>
                      <select
                        value={form.artType}
                        onChange={(e) => setForm({ ...form, artType: e.target.value as ProjectArtType })}
                        className={input}
                      >
                        {ART_TYPES.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HOMEPAGE PLACEMENT */}
              {modalTab === 'placement' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#12110b] dark:text-[#f4efea]">
                        Show on Homepage (0 to {MAX_HOME_PROJECTS} limit)
                      </p>
                      <p className={`${sub} mt-0.5`}>
                        Display this piece in &quot;01 / Work Studio experiments&quot; on the home page.
                      </p>
                      <p className="text-[11px] text-[#26D67C] font-semibold mt-1">
                        Current slots used: {homeCount} of {MAX_HOME_PROJECTS}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.showOnHome}
                        onChange={(e) => setForm({ ...form, showOnHome: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-black/20 peer-focus:outline-none rounded-full peer dark:bg-white/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#26D67C]" />
                    </label>
                  </div>

                  <div>
                    <label className={label}>Homepage Display Order</label>
                    <input
                      type="number"
                      value={form.homeOrder}
                      onChange={(e) => setForm({ ...form, homeOrder: parseInt(e.target.value, 10) || 0 })}
                      className={input}
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-black/[0.06] dark:border-white/[0.07]">
                <div className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                  All changes sync to Supabase Database
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className={btnGhost}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className={btnVolt}>
                    {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{submitting ? 'Saving to Supabase…' : editingId ? 'Save Changes' : 'Create Project'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
