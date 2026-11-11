'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
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
  Layers,
  ArrowUpRight,
  X,
  RefreshCw,
  Film,
  FolderPlus,
  FileText,
  Sliders,
  Check,
} from 'lucide-react';
import type {
  ProjectItem,
  ProjectCategory,
  ProjectArtType,
  ProjectMediaType,
  ProjectInput,
} from '@/lib/projects-shared';
import { PROJECT_CATEGORIES, ART_TYPES, MAX_HOME_PROJECTS } from '@/lib/projects-shared';

const cardStyle = 'p-5 sm:p-6 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs';
const subStyle = 'text-xs text-[#5a6265] dark:text-[#a09d93]';
const inputStyle =
  'w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-[13px] text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#26D67C] transition-colors';
const labelStyle = 'block text-[11px] font-semibold uppercase tracking-wider text-[#5a6265] dark:text-[#a09d93] mb-1.5';
const btnPrimary =
  'h-10 px-5 rounded-[12px] bg-[#26D67C] hover:bg-[#20ba6b] text-[#12110b] font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const btnGhost =
  'h-9 px-3 rounded-[10px] border border-black/10 dark:border-white/10 text-xs font-semibold text-[#12110b] dark:text-[#f4efea] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-black/25 dark:hover:border-white/25 transition-colors';

const EMPTY_FORM: ProjectInput = {
  title: '',
  slug: '',
  type: 'Motion · Loop',
  category: 'motion',
  year: '2026',
  software: 'Cinema 4D · Octane · After Effects',
  idea: '',
  explored: ['Looping seamless camera perspective', 'Clean volt accent discipline', 'High voltage particle motion'],
  mediaType: 'art',
  videoUrl: '',
  imageUrl: '',
  artType: 'grid',
  showOnHome: false,
  homeOrder: 0,
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Showreel State
  const [showreel, setShowreel] = useState<{ videoUrl: string; fileName?: string; source: string } | null>(null);
  const [reelUploading, setReelUploading] = useState(false);
  const reelFileInputRef = useRef<HTMLInputElement>(null);

  // Project Modal State
  const [modalOpen, setModalOpen] = useState(false);
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
    if (!confirm('Are you sure you want to delete the custom showreel video from Supabase and reset to default?')) return;

    try {
      const res = await fetch('/api/admin/showreel', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete showreel');

      setShowreel(data.showreel);
      showToast('success', 'Showreel deleted from Supabase. Default video restored.');
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
        `Homepage limit reached! Only 0 to ${MAX_HOME_PROJECTS} projects can be featured on home. Disable one first.`
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
      showToast('success', !p.showOnHome ? 'Project added to Homepage!' : 'Project removed from Homepage.');
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
        showToast('success', 'Project video uploaded to Supabase Storage!');
      } else {
        setForm((prev) => ({ ...prev, mediaType: 'image', imageUrl: data.publicUrl }));
        showToast('success', 'Project image uploaded to Supabase Storage!');
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
    <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea] flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-[#26D67C]" />
            Studio Projects & Showreel
          </h1>
          <p className={`${subStyle} mt-1`}>
            Manage homepage showcase videos, portfolio case studies, and Supabase media storage.
          </p>
        </div>

        {canEdit && (
          <button onClick={handleOpenCreate} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            <span>Add New Project</span>
          </button>
        )}
      </div>

      {/* Toast Alert */}
      {alert && (
        <div
          className={`p-4 rounded-[14px] text-xs font-semibold flex items-center gap-2.5 shadow-sm transition-all ${
            alert.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          {alert.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* 1. HOMEPAGE SHOWREEL SECTION */}
      <div className={cardStyle}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
          <div>
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-[#26D67C]" />
              <h2 className="text-sm font-bold text-[#12110b] dark:text-[#f4efea]">Homepage Hero Showreel Video</h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#26D67C]/10 text-[#26D67C]">
                Supabase Connected
              </span>
            </div>
            <p className={`${subStyle} mt-1`}>
              This continuous 16:9 cinematic video loops directly under the homepage header. Upload a video to Supabase or delete it anytime.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
              className={btnPrimary}
            >
              {reelUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{reelUploading ? 'Uploading to Supabase…' : 'Upload Video'}</span>
            </button>

            {showreel?.source === 'supabase' && canEdit && (
              <button onClick={handleShowreelDelete} className={`${btnGhost} text-rose-500 hover:border-rose-500/30`}>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Reset to Default</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 relative aspect-video rounded-[14px] overflow-hidden bg-black border border-black/10 dark:border-white/10">
            <video
              key={showreel?.videoUrl}
              src={showreel?.videoUrl || '/assets/videos/works/work-1.mp4'}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05]">
              <span className="text-[10px] uppercase font-bold text-[#5a6265] dark:text-[#a09d93]">Video Source</span>
              <p className="font-semibold text-[#12110b] dark:text-[#f4efea] mt-0.5">
                {showreel?.source === 'supabase' ? 'Supabase Storage (Custom Video)' : 'Default Studio Showreel'}
              </p>
              {showreel?.fileName && (
                <p className="font-mono text-[11px] text-[#26D67C] mt-1 truncate">
                  file: {showreel.fileName}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05]">
              <span className="text-[10px] uppercase font-bold text-[#5a6265] dark:text-[#a09d93]">Supabase Storage Location</span>
              <p className="font-mono text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-0.5 break-all">
                bucket: public-media / showreel/
              </p>
              <p className="text-[11px] text-[#26D67C] mt-1.5 flex items-center gap-1">
                <Check className="h-3 w-3" /> Direct backend updates supported
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS & CONTROL BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cardStyle}>
          <span className={labelStyle}>Total Projects</span>
          <p className="text-2xl font-extrabold text-[#12110b] dark:text-[#f4efea] mt-1">{projects.length}</p>
          <span className={`${subStyle} mt-1 block`}>All published case studies</span>
        </div>

        <div className={cardStyle}>
          <div className="flex items-center justify-between">
            <span className={labelStyle}>Homepage Showcase</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                homeCount >= MAX_HOME_PROJECTS
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-[#26D67C]/10 text-[#26D67C]'
              }`}
            >
              Limit: 0 to {MAX_HOME_PROJECTS}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-extrabold text-[#12110b] dark:text-[#f4efea]">{homeCount}</p>
            <span className="text-xs text-[#5a6265] dark:text-[#a09d93]">/ {MAX_HOME_PROJECTS} max featured</span>
          </div>
          <span className={`${subStyle} mt-1 block`}>
            {homeCount >= MAX_HOME_PROJECTS
              ? 'Homepage full (limit reached)'
              : `${MAX_HOME_PROJECTS - homeCount} slots available for home`}
          </span>
        </div>

        <div className={cardStyle}>
          <span className={labelStyle}>Storage Sync</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#26D67C] animate-pulse" />
            <p className="text-sm font-bold text-[#12110b] dark:text-[#f4efea]">Supabase Live Connected</p>
          </div>
          <span className={`${subStyle} mt-1 block`}>Media + Metadata synced real-time</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#26D67C] text-[#12110b]'
                : 'bg-black/[0.04] dark:bg-white/[0.04] text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
            }`}
          >
            All ({projects.length})
          </button>
          {PROJECT_CATEGORIES.map((c) => {
            const count = projects.filter((p) => p.category === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-[#26D67C] text-[#12110b]'
                    : 'bg-black/[0.04] dark:bg-white/[0.04] text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
                }`}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-[#f4efea] outline-none w-full sm:w-60 focus:border-[#26D67C]"
        />
      </div>

      {/* 3. PROJECTS GRID */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#5a6265] dark:text-[#a09d93]">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#26D67C]" />
          Loading projects from Supabase…
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-[18px] border border-dashed border-black/10 dark:border-white/10 text-xs text-[#5a6265] dark:text-[#a09d93]">
          No projects found. Click &quot;Add New Project&quot; to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p, idx) => (
            <div key={p.id} className={`${cardStyle} flex flex-col justify-between group relative overflow-hidden`}>
              {/* Media Thumbnail */}
              <div className="relative aspect-video rounded-[12px] overflow-hidden bg-black mb-3.5 border border-black/10 dark:border-white/10">
                {p.videoUrl ? (
                  <video src={p.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 text-[#26D67C]">
                    <Sparkles className="h-6 w-6 mb-1 opacity-70" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#a09d93]">
                      Art: {p.artType}
                    </span>
                  </div>
                )}

                {/* Homepage Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md ${
                      p.showOnHome
                        ? 'bg-[#26D67C] text-[#12110b]'
                        : 'bg-black/60 text-white/70'
                    }`}
                  >
                    {p.showOnHome ? '🏠 Featured on Home' : 'Work Page Only'}
                  </span>
                </div>

                {/* Category & Media Type Pill */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white">
                    {p.category.toUpperCase()}
                  </span>
                  {p.videoUrl && (
                    <span className="p-1 rounded-md bg-black/70 backdrop-blur-md text-[#26D67C]">
                      <Video className="h-3 w-3" />
                    </span>
                  )}
                  {p.imageUrl && (
                    <span className="p-1 rounded-md bg-black/70 backdrop-blur-md text-[#26D67C]">
                      <ImageIcon className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Info */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#12110b] dark:text-[#f4efea] group-hover:text-[#26D67C] transition-colors">
                    {p.title}
                  </h3>
                  <span className="text-[11px] font-mono text-[#5a6265] dark:text-[#a09d93]">{p.year}</span>
                </div>

                <p className="text-[11px] text-[#26D67C] font-semibold">{p.type}</p>
                <p className="text-xs text-[#5a6265] dark:text-[#a09d93] line-clamp-2 leading-relaxed">
                  {p.idea}
                </p>

                <div className="pt-2 text-[11px] text-[#5a6265] dark:text-[#a09d93]">
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
      )}

      {/* 4. ADD / EDIT PROJECT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#181712] border border-black/10 dark:border-white/10 rounded-[20px] max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.07]">
              <div>
                <h2 className="text-base font-bold text-[#12110b] dark:text-[#f4efea]">
                  {editingId ? 'Edit Project' : 'Add New Project'}
                </h2>
                <p className={subStyle}>All project details and media are stored directly in Supabase.</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#5a6265] hover:text-[#12110b] dark:hover:text-[#f4efea] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Project Title *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Grid Runner"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().trim() })}
                    placeholder="e.g. grid-runner"
                    className={inputStyle}
                  />
                </div>
              </div>

              {/* Category & Tags/Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelStyle}>Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ProjectCategory })}
                    className={inputStyle}
                  >
                    {PROJECT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>Type / Tags *</label>
                  <input
                    type="text"
                    required
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    placeholder="e.g. Motion · Loop"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Year</label>
                  <input
                    type="text"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    placeholder="2026"
                    className={inputStyle}
                  />
                </div>
              </div>

              {/* Software / Made with */}
              <div>
                <label className={labelStyle}>Software / Made With *</label>
                <input
                  type="text"
                  required
                  value={form.software}
                  onChange={(e) => setForm({ ...form, software: e.target.value })}
                  placeholder="e.g. Houdini · Cinema 4D · Octane · After Effects"
                  className={inputStyle}
                />
              </div>

              {/* The Idea (Paragraph) */}
              <div>
                <label className={labelStyle}>The Idea (Description Paragraph) *</label>
                <textarea
                  required
                  rows={3}
                  value={form.idea}
                  onChange={(e) => setForm({ ...form, idea: e.target.value })}
                  placeholder="A seamless run across an endless volt grid. One colour, one horizon and a camera that never stops moving."
                  className="w-full p-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-[13px] text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#26D67C] resize-none"
                />
              </div>

              {/* What We Explored (Key Points) */}
              <div>
                <label className={labelStyle}>What We Explored (Key Points on Case Study)</label>
                <div className="space-y-2 mb-2">
                  {form.explored.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 px-3 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-[#f4efea]"
                    >
                      <span className="flex-1">⚡ {point}</span>
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
                    placeholder="Add a key exploration point..."
                    className={inputStyle}
                  />
                  <button type="button" onClick={handleAddPoint} className={btnGhost}>
                    Add Point
                  </button>
                </div>
              </div>

              {/* Media Options (Video / Image / Procedural Art) */}
              <div className="p-4 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelStyle}>Media Type</label>
                  <div className="flex gap-1.5">
                    {(['video', 'image', 'art'] as ProjectMediaType[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForm({ ...form, mediaType: m })}
                        className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                          form.mediaType === m
                            ? 'bg-[#26D67C] text-[#12110b]'
                            : 'bg-black/5 dark:bg-white/5 text-[#5a6265] dark:text-[#a09d93]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload to Supabase Storage */}
                <div className="flex items-center gap-3 pt-1">
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
                    className={btnGhost}
                  >
                    {mediaUploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>{mediaUploading ? 'Uploading to Supabase…' : `Upload ${form.mediaType === 'video' ? 'Video' : 'Image'} to Supabase`}</span>
                  </button>
                  <span className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                    Stored in Supabase bucket: <code className="text-[#26D67C]">public-media/projects/</code>
                  </span>
                </div>

                {form.mediaType === 'video' && (
                  <div>
                    <label className={labelStyle}>Video URL (or uploaded Supabase link)</label>
                    <input
                      type="url"
                      value={form.videoUrl || ''}
                      onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                      placeholder="https://...supabase.co/.../video.mp4"
                      className={inputStyle}
                    />
                  </div>
                )}

                {form.mediaType === 'image' && (
                  <div>
                    <label className={labelStyle}>Image URL (or uploaded Supabase link)</label>
                    <input
                      type="url"
                      value={form.imageUrl || ''}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://...supabase.co/.../image.webp"
                      className={inputStyle}
                    />
                  </div>
                )}

                {form.mediaType === 'art' && (
                  <div>
                    <label className={labelStyle}>Procedural 3D Art Template</label>
                    <select
                      value={form.artType}
                      onChange={(e) => setForm({ ...form, artType: e.target.value as ProjectArtType })}
                      className={inputStyle}
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

              {/* Homepage Feature Toggle */}
              <div className="p-4 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#12110b] dark:text-[#f4efea]">Show on Homepage (0 to {MAX_HOME_PROJECTS} max)</p>
                  <p className={subStyle}>Display this experiment directly in &quot;01 / Work Studio experiments&quot; on the home page.</p>
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

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={btnGhost}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className={btnPrimary}>
                  {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>{submitting ? 'Saving to Supabase…' : editingId ? 'Save Changes' : 'Create Project'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
