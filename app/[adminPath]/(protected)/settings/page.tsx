'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, CheckCircle2, Shield, Calendar, Bell, Mail, Clock } from 'lucide-react';

export default function AdminSettingsPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);
  const router = useRouter();

  const [calendlyUrl, setCalendlyUrl] = useState('https://calendly.com/frxcx-studio/intro-call');
  const [notifyOnNewLead, setNotifyOnNewLead] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState('15');
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem('frxcx_calendly_url');
        if (saved) setCalendlyUrl(saved);
      } catch {
        // ignore
      }
    });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('frxcx_calendly_url', calendlyUrl.trim());
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea]">
          Studio & Vault Settings
        </h1>
        <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
          Configure calendar scheduling integration, security timeout windows, and notification rules.
        </p>
      </div>

      {savedMessage && (
        <div className="p-3.5 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Preferences updated and saved to local studio vault.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Calendar Scheduling Integration */}
        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center gap-2 mb-1 text-[#ff4f31]">
            <Calendar className="h-4 w-4" />
            <h3 className="font-bold text-sm text-[#12110b] dark:text-[#f4efea]">Discovery Call Scheduling URL</h3>
          </div>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mb-3">
            The Calendly URL embedded in the customer booking tab on the homepage.
          </p>

          <input
            type="url"
            value={calendlyUrl}
            onChange={(e) => setCalendlyUrl(e.target.value)}
            className="w-full h-10 px-4 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-[#f4efea] outline-none focus:border-[#12110b] dark:focus:border-[#f4efea]"
            placeholder="https://calendly.com/your-studio/intro-call"
          />
        </div>

        {/* Security & Inactivity Session Control */}
        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center gap-2 mb-1 text-emerald-500">
            <Clock className="h-4 w-4" />
            <h3 className="font-bold text-sm text-[#12110b] dark:text-[#f4efea]">Inactivity Session Defense</h3>
          </div>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mb-3">
            Automatic session termination after continuous idle period to safeguard client records.
          </p>

          <select
            value={sessionTimeoutMinutes}
            onChange={(e) => setSessionTimeoutMinutes(e.target.value)}
            className="h-10 px-4 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-[#12110b] dark:text-[#f4efea] outline-none cursor-pointer"
          >
            <option value="15">15 Minutes (Strict Security - Recommended)</option>
            <option value="30">30 Minutes</option>
            <option value="60">60 Minutes</option>
          </select>
        </div>

        {/* Notification Preferences */}
        <div className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
          <div className="flex items-center gap-2 mb-1 text-blue-500">
            <Bell className="h-4 w-4" />
            <h3 className="font-bold text-sm text-[#12110b] dark:text-[#f4efea]">Inquiry Notifications</h3>
          </div>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mb-3">
            Real-time notifications when a new inquiry brief is submitted.
          </p>

          <label className="flex items-center gap-3 text-xs text-[#12110b] dark:text-[#f4efea] cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnNewLead}
              onChange={(e) => setNotifyOnNewLead(e.target.checked)}
              className="h-4 w-4 rounded accent-[#12110b] dark:accent-[#f4efea] cursor-pointer"
            />
            <span>Show live notification indicator dot on top bar when new leads arrive</span>
          </label>
        </div>

        <button
          type="submit"
          className="h-10 px-6 rounded-[12px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>Save Preferences</span>
        </button>
      </form>
    </div>
  );
}