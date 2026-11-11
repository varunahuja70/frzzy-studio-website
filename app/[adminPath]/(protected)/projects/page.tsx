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
  FileVideo,
  FileImage,
  ArrowUpRight,
} from 'lucide-react';
import type {
  ProjectItem,
  ProjectCategory,
  ProjectArtType,
  ProjectMediaType,
  ProjectInput,
} from '@/lib/projects-shared';
import { PROJECT_CATEGORIES, ART_TYPES, MAX_HOME_PROJECTS } from '@/lib/projects-shared';

// Luxury Theme Tokens - Studio Vault Electric Orange Edition (#ff4f31)
const card =
  'p-5 sm:p-6 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] shadow-xs hover:border-[#ff4f31]/30 transition-all';
const sub = 'text-xs text-[#5a6265] dark:text-[#a09d93]';
const label =
  'block text-[11px] font-semibold uppercase tracking-wider text-[#5a6265] dark:text-[#a09d93] mb-1.5';
const input =
  'w-full h-11 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-[13px] text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#ff4f31] focus:ring-1 focus:ring-[#ff4f31]/30 transition-all placeholder:text-[#5a6265]/60';
const btnPrimary =
  'h-11 px-5 rounded-[12px] bg-[#ff4f31] hover:bg-[#ff3b1a] text-white font-semibold text-xs inline-flex items-center gap-2 shadow-lg shadow-[#ff4f31]/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const btnSecondary =
  'h-11 px-4 rounded-[12px] bg-white dark:bg-[#181712] border border-black/10 dark:border-white/10 text-xs font-semibold text-[#12110b] dark:text-[#f4efea] inline-flex items-center gap-2 hover:border-[#ff4f31]/40 hover:text-[#ff4f31] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const btnGhost =
  'h-9 px-3 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-xs font-medium text-[#12110b] dark:text-[#f4efea] inline-flex items-center gap-1.5 hover:bg-[#ff4f31]/10 hover:text-[#ff4f31] hover:border-[#ff4f31]/20 transition-all cursor-pointer';

const EMPTY_FORM: ProjectInput = {
  title: '',
  slug: '',
  type: 'Motion · Loop',
  category: 'motion',
  year: '2026',
  software: 'Cinema 4D · Octane · After Effects',
  idea: '',
  explored: [
    'Seamless camera loop timed to 10 seconds',
    'Controlled accent lighting and chrome reflections',
    'Rendered at 60fps for high-density displays',
  ],
  mediaType: 'video',
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
  const [showreel, setShowreel] = useState<{
    videoUrl: string;
    fileName?: string;
    source: string;
    updatedAt?: string;
  } | null>(null);
  const [reelUploading, setReelUploading] = useState(false);
  const [reelDragging, setReelDragging] = useState(false);
  const reelFileInputRef = useRef<HTMLInputElement>(null);

  // Project Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'media' | 'case' | 'placement'>('info');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Media Drag & Drop & Live Preview
  const [mediaDragging, setMediaDragging] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localPreviewType, setLocalPreviewType] = useState<'video' | 'image' | null>(null);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const projectMediaInputRef = useRef<HTMLInputElement>(null);

  // Exploration points state
  const [newPoint, setNewPoint] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const homeCount = projects.filter((p) => p.showOnHome).length;

  const showToast = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4500);
  };

  // Broadcast sync event to public site components in current window
  const notifyPublicSite = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('frzzy-projects-updated'));
    }
  };

  // Fetch projects and showreel from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, reelRes] = await Promise.all([
        fetch(`/api/admin/projects?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/admin/showreel?t=${Date.now()}`, { cache: 'no-store' }),
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        if (Array.isArray(data.projects)) setProjects(data.projects);
        if (typeof data.canEdit === 'boolean') setCanEdit(data.canEdit);
      }

      if (reelRes.ok) {
        const data = await reelRes.json();
        if (data.showreel) setShowreel(data.showreel);
      }
    } catch {
      showToast('error', 'Failed to load projects from Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clean up object URLs on modal close or unmount
  useEffect(() => {
    return () => {
      if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  // ================= SHOWREEL MANAGEMENT ================= //

  const uploadReelFile = async (file: File) => {
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
      notifyPublicSite();
      showToast('success', 'Showreel video uploaded and synced to Supabase Storage!');
    } catch (err: any) {
      showToast('error', err.message || 'Showreel upload failed');
    } finally {
      setReelUploading(false);
      if (reelFileInputRef.current) reelFileInputRef.current.value = '';
    }
  };

  const handleShowreelDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete the custom video from Supabase Storage and restore the default showreel?'
      )
    )
      return;

    try {
      const res = await fetch('/api/admin/showreel', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete showreel');

      setShowreel(data.showreel);
      notifyPublicSite();
      showToast('success', 'Custom video removed from Supabase. Default showreel restored.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete showreel');
    }
  };

  // ================= PROJECT MODAL CONTROLS ================= //

  const handleOpenCreate = () => {
    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(null);
    setLocalPreviewType(null);
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      homeOrder: projects.length + 1,
    });
    setActiveSection('info');
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProjectItem) => {
    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(p.videoUrl || p.imageUrl || null);
    setLocalPreviewType(p.mediaType === 'video' ? 'video' : p.mediaType === 'image' ? 'image' : null);
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
    setActiveSection('info');
    setModalOpen(true);
  };

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

  // ================= DRAG & DROP MEDIA UPLOAD WITH INSTANT PREVIEW ================= //

  const handleMediaFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const isVid = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');

    if (!isVid && !isImg) {
      showToast('error', 'Please drop a video (MP4/WebM/MOV) or an image (PNG/JPG/WebP/GIF)');
      return;
    }

    // 1. Instant local preview
    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(blobUrl);
    setLocalPreviewType(isVid ? 'video' : 'image');

    // 2. Upload to Supabase Storage
    try {
      setMediaUploading(true);
      setUploadProgressText(`Uploading ${file.name} to Supabase Storage...`);

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
        setForm((prev) => ({
          ...prev,
          mediaType: 'video',
          videoUrl: data.publicUrl,
          imageUrl: '',
        }));
        showToast('success', 'Video successfully uploaded to Supabase Storage!');
      } else {
        setForm((prev) => ({
          ...prev,
          mediaType: 'image',
          imageUrl: data.publicUrl,
          videoUrl: '',
        }));
        showToast('success', 'Image successfully uploaded to Supabase Storage!');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Media upload failed');
    } finally {
      setMediaUploading(false);
      setUploadProgressText('');
      if (projectMediaInputRef.current) projectMediaInputRef.current.value = '';
    }
  };

  const handleClearMedia = () => {
    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(null);
    setLocalPreviewType(null);
    setForm((prev) => ({
      ...prev,
      mediaType: 'art',
      videoUrl: '',
      imageUrl: '',
    }));
  };

  // ================= FORM SUBMISSION & DELETION ================= //

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
      notifyPublicSite();
      showToast(
        'success',
        !p.showOnHome
          ? `"${p.title}" is now featured on Homepage!`
          : `"${p.title}" removed from Homepage.`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Update failed');
    }
  };

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

      notifyPublicSite();
      setModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p: ProjectItem) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${p.title}"? Media files in Supabase Storage will also be wiped.`
      )
    ) {
      return;
    }

    // Optimistic UI removal
    setProjects((prev) => prev.filter((item) => item.id !== p.id));

    try {
      const res = await fetch(`/api/admin/projects/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        // Rollback on failure
        loadData();
        throw new Error(data.error || 'Failed to delete');
      }

      notifyPublicSite();
      showToast('success', `"${p.title}" permanently deleted from Supabase & site.`);
    } catch (err: any) {
      showToast('error', err.message || 'Delete failed');
    }
  };

  const handleAddPoint = () => {
    if (!newPoint.trim()) return;
    setForm((prev) => ({ ...prev, explored: [...prev.explored, newPoint.trim()] }));
    setNewPoint('');
  };

  const handleRemovePoint = (idx: number) => {
    if (form.explored.length <= 1) {
      showToast('error', 'Must have at least one explored bullet point');
      return;
    }
    setForm((prev) => ({
      ...prev,
      explored: prev.explored.filter((_, i) => i !== idx),
    }));
  };

  // Filtered list
  const filtered = projects.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      search.trim() === '' ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      p.software.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {alert && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-[14px] text-xs font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 ${
            alert.type === 'success'
              ? 'bg-[#12110b] dark:bg-[#1f1e18] text-[#ff4f31] border border-[#ff4f31]/40'
              : 'bg-red-950/90 text-red-200 border border-red-800'
          }`}
        >
          {alert.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-[#ff4f31] shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#ff4f31] uppercase">
            <Layers className="h-3.5 w-3.5" />
            <span>Studio Vault · Projects &amp; Works</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-[#12110b] dark:text-[#f4efea] tracking-tight mt-1">
            Portfolio <span className="font-semibold text-[#ff4f31]">Case Studies</span>
          </h1>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1 max-w-xl">
            Live synchronization with Supabase Database and Storage bucket{' '}
            <code className="text-[#ff4f31] bg-[#ff4f31]/10 px-1.5 py-0.5 rounded font-mono">
              public-media
            </code>
            . Deletions and additions instantly reflect on the public website.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className={btnSecondary}
            title="Refresh from Supabase"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#ff4f31]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canEdit && (
            <button type="button" onClick={handleOpenCreate} className={btnPrimary}>
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className={sub}>Total Works</span>
            <span className="h-8 w-8 rounded-[10px] bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-light text-[#12110b] dark:text-[#f4efea] mt-2">
            {projects.length}
          </p>
          <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-1">
            {projects.length === 0 ? 'No projects published' : 'Live in Supabase store'}
          </p>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between">
            <span className={sub}>Homepage Showcase</span>
            <span className="h-8 w-8 rounded-[10px] bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center font-mono font-bold text-xs">
              {homeCount}/{MAX_HOME_PROJECTS}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl sm:text-3xl font-light text-[#12110b] dark:text-[#f4efea]">
              {homeCount}
            </p>
            <span className="text-xs text-[#5a6265] dark:text-[#a09d93]">/ {MAX_HOME_PROJECTS} max</span>
          </div>
          <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-[#ff4f31] h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (homeCount / MAX_HOME_PROJECTS) * 100)}%` }}
            />
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between">
            <span className={sub}>Hero Showreel</span>
            <span className="h-8 w-8 rounded-[10px] bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center">
              <Film className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                showreel?.source === 'supabase' ? 'bg-[#ff4f31] animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span className="text-sm font-semibold text-[#12110b] dark:text-[#f4efea]">
              {showreel?.source === 'supabase' ? 'Custom Video' : 'Default Reel'}
            </span>
          </div>
          <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-1 truncate">
            {showreel?.fileName || 'work-1.mp4 continuous'}
          </p>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between">
            <span className={sub}>Supabase Storage</span>
            <span className="h-8 w-8 rounded-[10px] bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center">
              <HardDrive className="h-4 w-4" />
            </span>
          </div>
          <p className="text-sm font-semibold text-[#12110b] dark:text-[#f4efea] mt-2 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#ff4f31]" />
            <span>public-media</span>
          </p>
          <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-1">
            Direct video &amp; image uploads
          </p>
        </div>
      </div>

      {/* ================= HERO SHOWREEL DRAG & DROP BANNER ================= */}
      <div className="p-6 rounded-[22px] bg-gradient-to-br from-white via-white to-black/[0.02] dark:from-[#181712] dark:via-[#181712] dark:to-black/40 border border-black/[0.08] dark:border-white/[0.08] shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ff4f31]/10 border border-[#ff4f31]/20 text-[#ff4f31] text-[10px] font-mono font-bold uppercase">
                Homepage Hero Video
              </span>
              <span className="text-xs text-[#5a6265] dark:text-[#a09d93]">
                Autoplays continuously on the public website
              </span>
            </div>
            <h2 className="text-lg font-semibold text-[#12110b] dark:text-[#f4efea]">
              Drag &amp; Drop Showreel Video
            </h2>
            <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">
              Drop an MP4, WebM, or MOV video file here to upload it straight to Supabase Storage.
              If deleted, it automatically falls back to the default continuous showreel.
            </p>
          </div>

          {/* Showreel Drag Drop Zone */}
          <div className="flex items-center gap-4 shrink-0 flex-wrap">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setReelDragging(true);
              }}
              onDragLeave={() => setReelDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setReelDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) uploadReelFile(f);
              }}
              onClick={() => reelFileInputRef.current?.click()}
              className={`px-5 py-4 rounded-[16px] border-2 border-dashed transition-all cursor-pointer flex items-center gap-3.5 ${
                reelDragging
                  ? 'border-[#ff4f31] bg-[#ff4f31]/10 scale-[1.02]'
                  : 'border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] hover:border-[#ff4f31]/50'
              }`}
            >
              <input
                ref={reelFileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadReelFile(f);
                }}
              />
              <div className="h-10 w-10 rounded-xl bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center shrink-0">
                {reelUploading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-[#12110b] dark:text-[#f4efea]">
                  {reelUploading ? 'Uploading to Supabase...' : 'Drop new video here'}
                </p>
                <p className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">
                  or click to select (MP4/WebM/MOV)
                </p>
              </div>
            </div>

            {/* Video Preview or Reset */}
            {showreel && (
              <div className="flex items-center gap-2">
                <a
                  href={showreel.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={btnGhost}
                  title="Open video URL"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </a>

                {showreel.source === 'supabase' && (
                  <button
                    type="button"
                    onClick={handleShowreelDelete}
                    className="h-9 px-3 rounded-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Delete custom showreel and restore default"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset to Default</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= SEARCH & FILTER TOOLBAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#ff4f31] text-white shadow-sm'
                : 'bg-black/[0.04] dark:bg-white/[0.05] text-[#5a6265] dark:text-[#a09d93] hover:text-[#ff4f31]'
            }`}
          >
            All Works ({projects.length})
          </button>
          {PROJECT_CATEGORIES.map((cat) => {
            const count = projects.filter((p) => p.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#ff4f31] text-white shadow-sm'
                    : 'bg-black/[0.04] dark:bg-white/[0.05] text-[#5a6265] dark:text-[#a09d93] hover:text-[#ff4f31]'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & Layout Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6265]" />
            <input
              type="text"
              placeholder="Search title, slug, software..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#ff4f31]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6265] hover:text-[#12110b] dark:hover:text-[#f4efea]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center rounded-[10px] bg-black/[0.04] dark:bg-white/[0.05] p-1 border border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[7px] transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#181712] text-[#ff4f31] shadow-xs'
                  : 'text-[#5a6265] hover:text-[#12110b] dark:hover:text-[#f4efea]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-[7px] transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#181712] text-[#ff4f31] shadow-xs'
                  : 'text-[#5a6265] hover:text-[#12110b] dark:hover:text-[#f4efea]'
              }`}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= PROJECTS LIST / GRID ================= */}
      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#ff4f31]" />
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-3">
            Loading projects from Supabase...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-[20px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 text-center">
          <Layers className="h-10 w-10 mx-auto text-[#5a6265] opacity-50" />
          <h3 className="text-base font-medium text-[#12110b] dark:text-[#f4efea] mt-3">
            No projects found
          </h3>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1 max-w-sm mx-auto">
            {search
              ? 'No projects matched your search query.'
              : 'You have no projects currently published. Click "Create Project" to add your first case study with Supabase storage.'}
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className={`${btnPrimary} mt-4`}
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            return (
              <div
                key={p.id}
                className="group p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#ff4f31]/40 shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Media Thumbnail Container */}
                  <div className="relative aspect-video rounded-[14px] bg-black/5 dark:bg-black/40 overflow-hidden border border-black/5 dark:border-white/5 mb-4 group-hover:scale-[1.01] transition-transform">
                    {p.videoUrl ? (
                      <video
                        src={p.videoUrl}
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#12110b] to-[#1f1e18] text-[#a09d93]">
                        <Sparkles className="h-6 w-6 text-[#ff4f31] mb-1" />
                        <span className="text-[10px] font-mono text-[#ff4f31]">
                          Canvas Art · {p.artType}
                        </span>
                      </div>
                    )}

                    {/* Media Type Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-mono font-medium flex items-center gap-1">
                        {p.mediaType === 'video' ? (
                          <Video className="h-3 w-3 text-[#ff4f31]" />
                        ) : p.mediaType === 'image' ? (
                          <ImageIcon className="h-3 w-3 text-[#ff4f31]" />
                        ) : (
                          <Sparkles className="h-3 w-3 text-[#ff4f31]" />
                        )}
                        <span>{p.mediaType.toUpperCase()}</span>
                      </span>
                    </div>

                    {/* Homepage Badge */}
                    {p.showOnHome && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#ff4f31] text-white text-[10px] font-mono font-bold shadow-md">
                          HOME #{p.homeOrder || 1}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Meta & Title */}
                  <div className="flex items-center justify-between text-[11px] text-[#5a6265] dark:text-[#a09d93] mb-1">
                    <span className="font-mono text-[#ff4f31] uppercase">{p.category}</span>
                    <span>{p.year}</span>
                  </div>

                  <h3 className="text-base font-semibold text-[#12110b] dark:text-[#f4efea] group-hover:text-[#ff4f31] transition-colors">
                    {p.title}
                  </h3>

                  <p className="text-xs text-[#5a6265] dark:text-[#a09d93] line-clamp-2 mt-1.5">
                    {p.idea}
                  </p>

                  <p className="text-[10px] font-mono text-[#5a6265]/80 dark:text-[#a09d93]/80 mt-2 truncate">
                    {p.software}
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 mt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                  {/* Home Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleHome(p)}
                    className={`h-8 px-2.5 rounded-[8px] text-[11px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      p.showOnHome
                        ? 'bg-[#ff4f31]/15 text-[#ff4f31] border border-[#ff4f31]/30 hover:bg-[#ff4f31]/25'
                        : 'bg-black/[0.03] dark:bg-white/[0.04] text-[#5a6265] hover:text-[#ff4f31]'
                    }`}
                    title={
                      p.showOnHome
                        ? 'Click to remove from homepage'
                        : 'Click to feature on homepage (max 6)'
                    }
                  >
                    <Check className={`h-3 w-3 ${p.showOnHome ? 'text-[#ff4f31]' : 'opacity-40'}`} />
                    <span>{p.showOnHome ? 'On Home' : 'Show on Home'}</span>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/work/${p.slug}`}
                      target="_blank"
                      className="p-2 rounded-[8px] text-[#5a6265] hover:text-[#12110b] dark:hover:text-[#f4efea] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Open live case study"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>

                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-2 rounded-[8px] text-[#5a6265] hover:text-[#ff4f31] hover:bg-[#ff4f31]/10 transition-colors cursor-pointer"
                          title="Edit project"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="p-2 rounded-[8px] text-[#5a6265] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.08] dark:border-white/[0.08] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 text-[11px] font-mono text-[#5a6265] dark:text-[#a09d93] uppercase">
                <tr>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Media</th>
                  <th className="py-3 px-4">Homepage</th>
                  <th className="py-3 px-4">Software</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-[#12110b] dark:text-[#f4efea]">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 rounded-[8px] bg-black/10 dark:bg-black/50 overflow-hidden shrink-0 border border-black/5 dark:border-white/5">
                          {p.videoUrl ? (
                            <video src={p.videoUrl} className="w-full h-full object-cover" />
                          ) : p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-[#ff4f31]">
                              ART
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{p.title}</p>
                          <p className="text-[10px] font-mono text-[#5a6265] dark:text-[#a09d93]">
                            /{p.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-[#ff4f31]/10 text-[#ff4f31] font-mono text-[10px] uppercase">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                      {p.mediaType}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleHome(p)}
                        className={`h-7 px-2 rounded-[6px] text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          p.showOnHome
                            ? 'bg-[#ff4f31] text-white'
                            : 'bg-black/[0.04] dark:bg-white/[0.05] text-[#5a6265] hover:text-[#ff4f31]'
                        }`}
                      >
                        {p.showOnHome ? `HOME #${p.homeOrder || 1}` : 'OFF'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-[#5a6265] dark:text-[#a09d93] text-[11px] truncate max-w-xs">
                      {p.software}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/work/${p.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-[6px] text-[#5a6265] hover:text-[#12110b] dark:hover:text-[#f4efea]"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-[6px] text-[#5a6265] hover:text-[#ff4f31] cursor-pointer"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="p-1.5 rounded-[6px] text-[#5a6265] hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* ================= MODAL: CREATE / EDIT PROJECT ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#ffffff] dark:bg-[#161511] w-full sm:max-w-3xl sm:rounded-[24px] rounded-t-[24px] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0 bg-white dark:bg-[#161511]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-[#12110b] dark:text-[#f4efea]">
                    {editingId ? 'Edit Project Case Study' : 'Create New Portfolio Project'}
                  </h2>
                  <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">
                    Stored in Supabase database &amp; media storage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 w-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[#5a6265] hover:text-[#12110b] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Section Switcher Pills */}
            <div className="px-5 sm:px-6 py-2.5 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
              {[
                { id: 'info', label: '1. Basic Info' },
                { id: 'media', label: '2. Media & Upload' },
                { id: 'case', label: '3. Case Study Details' },
                { id: 'placement', label: '4. Placement & Home' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id as any)}
                  className={`px-3 py-1 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeSection === s.id
                      ? 'bg-[#ff4f31] text-white shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 text-[#5a6265] dark:text-[#a09d93] hover:text-[#ff4f31]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* SECTION 1: BASIC INFO */}
              {activeSection === 'info' && (
                <div className="space-y-4 animate-in fade-in duration-150">
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
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                          }))
                        }
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
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, category: e.target.value as ProjectCategory }))
                        }
                        className={`${input} cursor-pointer`}
                      >
                        {PROJECT_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id} className="bg-white dark:bg-[#181712]">
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={label}>Subtitle Tag *</label>
                      <input
                        type="text"
                        required
                        value={form.type}
                        onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                        placeholder="e.g. Motion · Loop"
                        className={input}
                      />
                    </div>

                    <div>
                      <label className={label}>Year *</label>
                      <input
                        type="text"
                        required
                        value={form.year}
                        onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
                        placeholder="2026"
                        className={input}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={label}>Made With (Software Tools)</label>
                    <input
                      type="text"
                      value={form.software}
                      onChange={(e) => setForm((prev) => ({ ...prev, software: e.target.value }))}
                      placeholder="e.g. Cinema 4D · Octane · After Effects · Houdini"
                      className={input}
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: MEDIA DRAG & DROP & PREVIEW */}
              {activeSection === 'media' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#12110b] dark:text-[#f4efea]">
                        Project Media File (Video / Image)
                      </p>
                      <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                        Upload directly to Supabase Storage with instant visual preview
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.05]">
                      {(['video', 'image', 'art'] as ProjectMediaType[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, mediaType: m }))}
                          className={`px-2.5 py-1 rounded-[7px] text-[11px] font-mono uppercase font-semibold transition-all cursor-pointer ${
                            form.mediaType === m
                              ? 'bg-[#ff4f31] text-white'
                              : 'text-[#5a6265] hover:text-[#ff4f31]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DRAG & DROP ZONE */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setMediaDragging(true);
                    }}
                    onDragLeave={() => setMediaDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setMediaDragging(false);
                      handleMediaFiles(e.dataTransfer.files);
                    }}
                    onClick={() => projectMediaInputRef.current?.click()}
                    className={`p-6 sm:p-8 rounded-[18px] border-2 border-dashed transition-all cursor-pointer text-center relative overflow-hidden ${
                      mediaDragging
                        ? 'border-[#ff4f31] bg-[#ff4f31]/10 scale-[1.01]'
                        : 'border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] hover:border-[#ff4f31]/50'
                    }`}
                  >
                    <input
                      ref={projectMediaInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => handleMediaFiles(e.target.files)}
                    />

                    <div className="h-12 w-12 rounded-2xl bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center mx-auto mb-3">
                      {mediaUploading ? (
                        <RefreshCw className="h-6 w-6 animate-spin" />
                      ) : (
                        <Upload className="h-6 w-6" />
                      )}
                    </div>

                    <p className="text-sm font-semibold text-[#12110b] dark:text-[#f4efea]">
                      {mediaUploading ? uploadProgressText : 'Drag & Drop Video or Image Here'}
                    </p>
                    <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1">
                      Supports MP4, WebM, MOV (up to 100MB) or PNG, JPG, WebP (up to 20MB)
                    </p>
                    <span className="inline-block mt-3 px-3 py-1 rounded-[8px] bg-black/5 dark:bg-white/5 text-[11px] font-mono text-[#ff4f31]">
                      Target: Supabase bucket public-media/projects/
                    </span>
                  </div>

                  {/* LIVE MEDIA PREVIEW */}
                  {(localPreviewUrl || form.videoUrl || form.imageUrl) && (
                    <div className="p-4 rounded-[18px] bg-black/[0.03] dark:bg-black/40 border border-black/10 dark:border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#ff4f31] flex items-center gap-1.5">
                          {form.mediaType === 'video' ? (
                            <FileVideo className="h-4 w-4" />
                          ) : (
                            <FileImage className="h-4 w-4" />
                          )}
                          <span>Live Media Preview</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleClearMedia}
                          className="text-xs text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div className="rounded-[14px] overflow-hidden aspect-video bg-black flex items-center justify-center">
                        {form.mediaType === 'video' ? (
                          <video
                            src={localPreviewUrl || form.videoUrl || ''}
                            controls
                            autoPlay
                            muted
                            loop
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={localPreviewUrl || form.imageUrl || ''}
                            alt="Media Preview"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Direct URL input fallback */}
                  <div className="pt-2 border-t border-black/5 dark:border-white/5">
                    <label className={label}>
                      {form.mediaType === 'video' ? 'Direct Video URL' : 'Direct Image URL'} (Optional)
                    </label>
                    <input
                      type="url"
                      value={form.mediaType === 'video' ? form.videoUrl || '' : form.imageUrl || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (form.mediaType === 'video') {
                          setForm((p) => ({ ...p, videoUrl: val }));
                          setLocalPreviewUrl(val);
                        } else {
                          setForm((p) => ({ ...p, imageUrl: val }));
                          setLocalPreviewUrl(val);
                        }
                      }}
                      placeholder="https://...supabase.co/storage/v1/object/public/public-media/..."
                      className={input}
                    />
                  </div>

                  {form.mediaType === 'art' && (
                    <div>
                      <label className={label}>Canvas Generative Art Type</label>
                      <select
                        value={form.artType}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, artType: e.target.value as ProjectArtType }))
                        }
                        className={`${input} cursor-pointer`}
                      >
                        {ART_TYPES.map((a) => (
                          <option key={a.id} value={a.id} className="bg-white dark:bg-[#181712]">
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: THE CASE STUDY */}
              {activeSection === 'case' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className={label}>The Idea (Hero Case Study Paragraph) *</label>
                    <textarea
                      required
                      rows={3}
                      value={form.idea}
                      onChange={(e) => setForm((prev) => ({ ...prev, idea: e.target.value }))}
                      placeholder="Describe the creative concept, visual technique, and goal of this project..."
                      className="w-full p-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-[13px] text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#ff4f31] focus:ring-1 focus:ring-[#ff4f31]/30 transition-all resize-none placeholder:text-[#5a6265]/60"
                    />
                  </div>

                  <div>
                    <label className={label}>What We Explored (Case Study Bullet Points) *</label>
                    <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mb-2">
                      Key creative takeaways shown on the public project case study page.
                    </p>

                    <div className="space-y-2 mb-3">
                      {form.explored.map((point, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#ff4f31] w-5 text-right">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm((prev) => {
                                const exp = [...prev.explored];
                                exp[idx] = val;
                                return { ...prev, explored: exp };
                              });
                            }}
                            className="flex-1 h-10 px-3 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#ff4f31]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePoint(idx)}
                            className="h-10 w-10 rounded-[10px] bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add new exploration bullet point..."
                        value={newPoint}
                        onChange={(e) => setNewPoint(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPoint();
                          }
                        }}
                        className="flex-1 h-10 px-3 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#ff4f31]"
                      />
                      <button
                        type="button"
                        onClick={handleAddPoint}
                        className={btnSecondary}
                      >
                        <Plus className="h-4 w-4 text-[#ff4f31]" />
                        <span>Add Point</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: PLACEMENT & HOMEPAGE */}
              {activeSection === 'placement' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-[16px] bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#12110b] dark:text-[#f4efea]">
                        Feature on Homepage
                      </p>
                      <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">
                        Strictly between 0 and {MAX_HOME_PROJECTS} projects allowed on the homepage
                        (currently {homeCount}/{MAX_HOME_PROJECTS}).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          showOnHome: !prev.showOnHome,
                        }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        form.showOnHome ? 'bg-[#ff4f31]' : 'bg-black/20 dark:bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          form.showOnHome ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {form.showOnHome && (
                    <div>
                      <label className={label}>Homepage Display Order (1 to 6)</label>
                      <input
                        type="number"
                        min={1}
                        max={MAX_HOME_PROJECTS}
                        value={form.homeOrder || 1}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, homeOrder: parseInt(e.target.value) || 1 }))
                        }
                        className={input}
                      />
                    </div>
                  )}

                  <div className="p-4 rounded-[14px] bg-[#ff4f31]/10 border border-[#ff4f31]/20 flex items-start gap-3">
                    <Info className="h-4 w-4 text-[#ff4f31] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">
                      When published, this case study will be available at{' '}
                      <code className="text-[#ff4f31] font-mono">/work/{form.slug || 'slug'}</code> and
                      linked directly in the work archive.
                    </p>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3 sticky bottom-0 bg-white dark:bg-[#161511]">
                <div className="flex items-center gap-2">
                  {activeSection !== 'info' && (
                    <button
                      type="button"
                      onClick={() => {
                        const order: Array<'info' | 'media' | 'case' | 'placement'> = [
                          'info',
                          'media',
                          'case',
                          'placement',
                        ];
                        const idx = order.indexOf(activeSection);
                        if (idx > 0) setActiveSection(order[idx - 1]);
                      }}
                      className={btnSecondary}
                    >
                      Back
                    </button>
                  )}
                  {activeSection !== 'placement' && (
                    <button
                      type="button"
                      onClick={() => {
                        const order: Array<'info' | 'media' | 'case' | 'placement'> = [
                          'info',
                          'media',
                          'case',
                          'placement',
                        ];
                        const idx = order.indexOf(activeSection);
                        if (idx < order.length - 1) setActiveSection(order[idx + 1]);
                      }}
                      className={btnSecondary}
                    >
                      Next Step
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className={btnSecondary}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || mediaUploading}
                    className={btnPrimary}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Saving to Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>{editingId ? 'Update Project' : 'Create Project'}</span>
                      </>
                    )}
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
