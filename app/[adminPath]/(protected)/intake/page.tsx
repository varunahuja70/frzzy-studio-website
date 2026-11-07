'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  Plus,
  Link as LinkIcon,
  Upload,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Trash2,
  Sparkles,
  Shield,
  IndianRupee,
} from 'lucide-react';

export default function IntakePage(props: { params: Promise<{ adminPath: string }> }) {
  const { adminPath } = use(props.params);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Web Design & Dev');
  const [source, setSource] = useState('Instagram');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [dueDate, setDueDate] = useState('');
  const [quotedPrice, setQuotedPrice] = useState<number>(0);
  const [currency, setCurrency] = useState('INR');
  const [isPersonal, setIsPersonal] = useState(false);

  // Parse pre-filled query params if redirected from Lead page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('title')) setTitle(sp.get('title')!);
      if (sp.get('description')) setDescription(sp.get('description')!);
      if (sp.get('category')) setCategory(sp.get('category')!);
      if (sp.get('clientName')) setClientName(sp.get('clientName')!);
      if (sp.get('clientEmail')) setClientEmail(sp.get('clientEmail')!);
      if (sp.get('source')) setSource(sp.get('source')!);
    }
  }, []);

  // External Drive links
  const [links, setLinks] = useState<Array<{ url: string; label: string }>>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    if (!newLinkUrl.startsWith('http://') && !newLinkUrl.startsWith('https://')) {
      alert('Only secure http:// and https:// URLs are permitted.');
      return;
    }
    setLinks((prev) => [...prev, { url: newLinkUrl.trim(), label: newLinkLabel.trim() || 'Drive Asset' }]);
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const handleRemoveLink = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !clientName.trim()) {
      setError('Please fill in Title, Description, and Client Name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/admin/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          source,
          clientName,
          clientEmail,
          clientPhone,
          clientCompany,
          priority,
          dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
          quotedPrice,
          currency,
          isPersonal,
          links,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create work item');
      }

      const created = await res.json();
      setSuccessMsg(`Work item ${created.itemNumber} created successfully! Redirecting...`);
      setTimeout(() => {
        router.push(`/${adminPath}/work-items`);
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Intake creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-3 border-b border-black/[0.06] dark:border-white/[0.07]">
        <h1 className="text-2xl font-bold tracking-tight text-[#12110b] dark:text-[#f4efea] flex items-center gap-2.5">
          <Inbox className="h-6 w-6 text-[#ff4f31]" />
          Intake Inbox (Manual & Offline Work)
        </h1>
        <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">
          Create work items directly from non-website channels: Instagram, WhatsApp, Referral, or direct contracts.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Project Basic Info Card */}
        <div className="p-6 rounded-[24px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col gap-4">
          <h3 className="text-sm font-bold tracking-tight pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            1. Project Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                Project Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Brand Identity & Web App Redesign"
                className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Source Channel</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              >
                <option value="Instagram">Instagram DM</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Referral">Referral / Word of Mouth</option>
                <option value="Phone">Phone Call</option>
                <option value="Email">Direct Email</option>
                <option value="Personal">Personal / Founder Direct</option>
                <option value="Website">Website Form</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Service Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              >
                <option value="Web Design & Dev">Web Design & Dev</option>
                <option value="Brand Identity">Brand Identity</option>
                <option value="3D & Motion">3D & Motion</option>
                <option value="Creative Direction">Creative Direction</option>
                <option value="Full Production">Full Production</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high' | 'urgent')}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Target Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Scope of Work / Client Brief <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline deliverables, technical scope, brand guidelines, and key milestones..."
              className="w-full p-3.5 rounded-[14px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31] resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Client & Financial Info Card */}
        <div className="p-6 rounded-[24px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col gap-4">
          <h3 className="text-sm font-bold tracking-tight pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            2. Client & Financial Terms
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Client Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Full name or primary contact"
                className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Company / Brand</label>
              <input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Studio, Agency, or Business name"
                className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@domain.com"
                className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Initial Quoted Budget ({currency})</label>
              <input
                type="number"
                min="0"
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(parseInt(e.target.value, 10) || 0)}
                className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs font-semibold outline-none focus:border-[#ff4f31]"
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="isPersonal"
                checked={isPersonal}
                onChange={(e) => setIsPersonal(e.target.checked)}
                className="h-4 w-4 rounded accent-[#ff4f31]"
              />
              <label htmlFor="isPersonal" className="text-xs text-[#5a6265] dark:text-[#a09d93] cursor-pointer">
                Personal / Confidential Item (visible only to creator & Super Admin)
              </label>
            </div>
          </div>
        </div>

        {/* External Drive / Dropbox Links Card */}
        <div className="p-6 rounded-[24px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            <h3 className="text-sm font-bold tracking-tight">3. Cloud Asset Links (Drive, Dropbox, WeTransfer)</h3>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
              <Shield className="h-3 w-3" /> SSRF Protected
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              placeholder="https://drive.google.com/... or https://dropbox.com/..."
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              className="flex-1 h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
            />
            <input
              type="text"
              placeholder="Label (e.g. Raw Footage)"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              className="w-full sm:w-44 h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
            />
            <button
              type="button"
              onClick={handleAddLink}
              className="h-10 px-4 rounded-[12px] bg-black/5 dark:bg-white/10 hover:bg-[#ff4f31] hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              Add Link
            </button>
          </div>

          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {links.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-black/5 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] text-xs"
                >
                  <Paperclip className="h-3.5 w-3.5 text-[#ff4f31]" />
                  <span className="font-semibold">{link.label}</span>
                  <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93] max-w-[120px] truncate">
                    {link.url}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="text-rose-500 hover:text-rose-600 cursor-pointer ml-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/${adminPath}/work-items`)}
            className="h-11 px-5 rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 px-7 rounded-full bg-[#ff4f31] hover:bg-[#e03d21] text-white text-xs font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{submitting ? 'Creating Project...' : 'Create Work Item'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
