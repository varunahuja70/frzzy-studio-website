'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Users,
  Eye,
  MousePointerClick,
  TrendingUp,
  Inbox,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Download,
  Calendar,
  Globe2,
  Smartphone,
  Layers,
} from 'lucide-react';
import { DashboardMetrics } from '@/lib/analytics/rollups';
import { ReauthModal } from '@/components/admin/reauth-modal';

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 800;
    let animFrame: number;
    const startTime = performance.now();

    const updateCount = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * easeProgress));

      if (progress < 1) {
        animFrame = requestAnimationFrame(updateCount);
      } else {
        setDisplay(end);
      }
    };

    animFrame = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animFrame);
  }, [value]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function AdminDashboardPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);

  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reauthOpen, setReauthOpen] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin/dashboard?range=${range}`);
      if (!res.ok) {
        throw new Error('Failed to load metrics');
      }
      const data = await res.json();
      setMetrics(data);
    } catch {
      setError('Unable to fetch dashboard metrics. Check connection.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchMetrics();
    });
    // Refresh live events and active counts every 15 seconds
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleExportCsv = async () => {
    const res = await fetch('/api/admin/leads/export');
    if (res.status === 403) {
      setReauthOpen(true);
      return;
    }
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frxcx-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = metrics?.kpis;

  const kpiCards = [
    {
      title: 'Total Visitors',
      value: kpis?.totalVisitors ?? 0,
      change: kpis?.totalVisitorsChange ?? 0,
      icon: Users,
    },
    {
      title: 'Unique Visitors',
      value: kpis?.uniqueVisitors ?? 0,
      change: kpis?.uniqueVisitorsChange ?? 0,
      icon: Activity,
    },
    {
      title: 'Page Views',
      value: kpis?.pageViews ?? 0,
      change: kpis?.pageViewsChange ?? 0,
      icon: Eye,
    },
    {
      title: 'Total Clicks',
      value: kpis?.totalClicks ?? 0,
      change: kpis?.totalClicksChange ?? 0,
      icon: MousePointerClick,
    },
    {
      title: 'CTA Conversion Rate',
      value: kpis?.ctaConversionRate ?? 0,
      change: kpis?.ctaConversionRateChange ?? 0,
      icon: TrendingUp,
      suffix: '%',
    },
    {
      title: 'Total Inquiries (Leads)',
      value: kpis?.totalLeads ?? 0,
      change: kpis?.totalLeadsChange ?? 0,
      icon: Inbox,
    },
    {
      title: 'New Unread Leads',
      value: kpis?.newLeads ?? 0,
      change: 0,
      icon: Sparkles,
      highlight: true,
    },
    {
      title: 'Lead Conversion Rate',
      value: kpis?.leadConversionRate ?? 0,
      change: kpis?.leadConversionRateChange ?? 0,
      icon: TrendingUp,
      suffix: '%',
    },
    {
      title: 'Avg Time On Page',
      value: kpis?.avgSessionSeconds ?? 0,
      change: 0,
      icon: Clock,
      suffix: 's',
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12 select-none">
      {/* Re-auth Modal */}
      <ReauthModal
        isOpen={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSuccess={() => handleExportCsv()}
        title="Confirm Export Security Checkpoint"
        description="Please confirm your admin credentials to export confidential studio leads into CSV."
      />

      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">
            Analytics <span className="text-[#ff4f31]">Dashboard</span>
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Real-time privacy-compliant visitor activity & lead intelligence
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex items-center p-1 rounded-full bg-white dark:bg-[#1a1914] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
            {(['today', '7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  range === r
                    ? 'bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] shadow-xs'
                    : 'text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
                }`}
              >
                {r === 'today' ? 'Today' : r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Export Leads CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-[38px] px-4 rounded-full bg-white dark:bg-[#1a1914] border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#ff4f31]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* 9 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          const isPositive = card.change >= 0;

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className={`p-5 sm:p-6 rounded-[20px] border transition-all ${
                card.highlight
                  ? 'bg-gradient-to-br from-[#ff4f31]/10 via-transparent to-transparent border-[#ff4f31]/30 dark:bg-[#1a1914]'
                  : 'bg-white dark:bg-[#1a1914] border-black/[0.05] dark:border-white/[0.07] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12.5px] font-medium text-[#5a6265] dark:text-[#a09d93]">
                  {card.title}
                </span>
                <div className="h-8 w-8 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-[#12110b] dark:text-[#f4efea]">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <h3 className="text-[26px] sm:text-[30px] font-bold tracking-tight">
                  <AnimatedNumber value={card.value} suffix={card.suffix} />
                </h3>

                {card.change !== 0 && (
                  <div
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                      isPositive ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    <span>{Math.abs(card.change)}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Middle Section: Live Now Activity + Recent Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Now Card (Left) */}
        <div className="lg:col-span-5 p-6 rounded-[22px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <h3 className="text-[15px] font-bold tracking-tight">Live Visitors Right Now</h3>
              </div>
              <span className="text-xs font-mono text-[#a09d93]">Last 5 mins</span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-[44px] font-extrabold tracking-tight text-[#ff4f31] tabular-nums">
                {metrics?.liveNow.activeVisitorsLast5Min ?? 0}
              </span>
              <span className="text-xs text-[#5a6265] dark:text-[#a09d93]">
                active sessions on site
              </span>
            </div>

            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#a09d93] mb-3">
              Recent Real-time Activity
            </h4>
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {metrics?.liveNow.recentEvents && metrics.liveNow.recentEvents.length > 0 ? (
                metrics.liveNow.recentEvents.slice(0, 6).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-[12px] bg-[#f4f3f0] dark:bg-white/[0.03] text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="capitalize font-semibold text-[#ff4f31]">
                        {evt.eventType}
                      </span>
                      <span className="truncate text-[#5a6265] dark:text-[#a09d93]">
                        {evt.target || evt.path}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#a09d93] shrink-0 font-mono">
                      {new Date(evt.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#a09d93] py-4 text-center">No recent live events.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Inquiries (Right) */}
        <div className="lg:col-span-7 p-6 rounded-[22px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-[#ff4f31]" />
                <h3 className="text-[15px] font-bold tracking-tight">Recent Inquiries (Leads)</h3>
              </div>
              <Link
                href={`/${adminPath}/leads`}
                className="text-xs text-[#ff4f31] font-semibold hover:underline flex items-center gap-1"
              >
                <span>View all leads</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="flex flex-col gap-2.5">
              {metrics?.recentLeads && metrics.recentLeads.length > 0 ? (
                metrics.recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/${adminPath}/leads`}
                    className="p-3 rounded-[14px] bg-[#f4f3f0] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold block text-[13px]">{lead.name}</span>
                      <span className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                        {lead.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          lead.status === 'new'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}
                      >
                        {lead.status}
                      </span>
                      <span className="text-[11px] text-[#a09d93]">
                        {new Date(lead.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#a09d93]">
                  No leads received yet. Submit the homepage contact form to test!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Clicked Elements + Device & Country Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Clicked Elements */}
        <div className="p-6 rounded-[22px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MousePointerClick className="h-4 w-4 text-[#ff4f31]" />
            <h3 className="text-[14.5px] font-bold tracking-tight">Top Clicked CTAs & Links</h3>
          </div>

          <div className="flex flex-col gap-2.5">
            {metrics?.charts.topClicked && metrics.charts.topClicked.length > 0 ? (
              metrics.charts.topClicked.map((item) => (
                <div
                  key={item.target}
                  className="flex items-center justify-between text-xs p-2 rounded-[10px] bg-[#f4f3f0] dark:bg-white/[0.03]"
                >
                  <span className="font-mono text-[#12110b] dark:text-[#f4efea] font-medium truncate pr-2">
                    {item.target}
                  </span>
                  <span className="font-bold tabular-nums shrink-0 text-[#ff4f31]">
                    {item.count} clicks
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#a09d93] py-4 text-center">No clicks recorded yet.</p>
            )}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="p-6 rounded-[22px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-4 w-4 text-[#ff4f31]" />
            <h3 className="text-[14.5px] font-bold tracking-tight">Device Split</h3>
          </div>

          <div className="flex flex-col gap-3">
            {metrics?.charts.deviceSplit && metrics.charts.deviceSplit.length > 0 ? (
              metrics.charts.deviceSplit.map((dev) => (
                <div key={dev.device} className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="capitalize">{dev.device}</span>
                    <span className="font-mono">{dev.percentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-[#ff4f31] rounded-full transition-all duration-500"
                      style={{ width: `${dev.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#a09d93] py-4 text-center">No device data.</p>
            )}
          </div>
        </div>

        {/* Scroll Funnel */}
        <div className="p-6 rounded-[22px] bg-white dark:bg-[#1a1914] border border-black/[0.05] dark:border-white/[0.07] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-[#ff4f31]" />
            <h3 className="text-[14.5px] font-bold tracking-tight">Scroll Funnel Depth</h3>
          </div>

          <div className="flex flex-col gap-2.5">
            {metrics?.charts.scrollFunnel.map((step) => (
              <div
                key={step.depth}
                className="flex items-center justify-between text-xs p-2 rounded-[10px] bg-[#f4f3f0] dark:bg-white/[0.03]"
              >
                <span className="font-medium">{step.depth}</span>
                <span className="font-mono tabular-nums text-[#ff4f31] font-semibold">
                  {step.count} viewers
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
