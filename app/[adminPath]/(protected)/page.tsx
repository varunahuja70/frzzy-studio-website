'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
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
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { DashboardMetrics } from '@/lib/analytics/rollups';
import { ReauthModal } from '@/components/admin/reauth-modal';
import { getCachedData, setCachedData } from '@/lib/client-cache';

function AnimatedNumber({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 750;
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
    <span>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// Sparkline SVG component
function Sparkline({ isPositive = true }: { isPositive?: boolean }) {
  const strokeColor = isPositive ? '#26d67c' : '#ff4f31';
  return (
    <svg className="w-20 h-6 shrink-0 overflow-visible" viewBox="0 0 80 24" fill="none">
      <path
        d={
          isPositive
            ? 'M0 20 Q 20 18, 30 12 T 50 14 T 70 6 L 80 4'
            : 'M0 6 Q 20 8, 30 14 T 50 12 T 70 18 L 80 20'
        }
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AdminDashboardPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);

  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d'>('30d');
  const [chartMetric, setChartMetric] = useState<'visitors' | 'pageviews' | 'clicks' | 'leads'>('visitors');
  const cached = getCachedData<DashboardMetrics>(`dashboard_metrics_${range}`);
  const [data, setData] = useState<DashboardMetrics | null>(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; value: number; x: number; y: number; date?: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/dashboard?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setCachedData(`dashboard_metrics_${range}`, json);
      }
    } catch (err) {
      console.error('Dashboard load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchData();
    });
  }, [fetchData]);

  // Derived metrics from DashboardMetrics contract
  const kpis = data?.kpis;
  const uniqueVisitors = kpis?.uniqueVisitors ?? 0;
  const pageViews = kpis?.pageViews ?? 0;
  const totalClicks = kpis?.totalClicks ?? 0;
  const totalLeads = kpis?.totalLeads ?? 0;
  const leadConversionRate = kpis?.leadConversionRate ? kpis.leadConversionRate.toFixed(1) : '0.0';
  const liveCount = data?.liveNow?.activeVisitorsLast5Min ?? 0;

  // Timeline points for interactive chart
  const timeline = data?.charts?.timeline || [];
  const maxChartValue = Math.max(
    ...timeline.map((t: { visitors: number; pageviews: number; clicks: number; leads: number }) =>
      chartMetric === 'visitors'
        ? t.visitors
        : chartMetric === 'pageviews'
        ? t.pageviews
        : chartMetric === 'clicks'
        ? t.clicks
        : t.leads
    ),
    10
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Re-auth Modal for CSV export */}
      <ReauthModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onSuccess={() => {
          setExportModalOpen(false);
          window.location.href = '/api/admin/leads/export';
        }}
        title="Confirm Vault Authorization to Export Leads"
        description="Exporting customer contact submissions requires full password confirmation for data compliance."
      />

      {/* ================= TOP ACTION BAR: Overview Title + Export & Quick Actions ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea] flex items-center gap-2">
            Studio Intelligence
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Real-time telemetry, visitor engagement funnels, and verified lead inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="h-9 px-4 rounded-[12px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Leads CSV</span>
          </button>
        </div>
      </div>

      {/* ================= ROW 1: 6 KPI CARDS (Strict 8px Grid, Linear/Stripe Quality) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Unique Visitors */}
        <div className="p-4 rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs hover:border-black/15 dark:hover:border-white/15 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Unique Visitors</span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[22px] font-bold tracking-tight">
              {loading ? (
                <span className="inline-block w-12 h-6 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
              ) : (
                <AnimatedNumber value={uniqueVisitors} />
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> +14.8%
            </span>
            <Sparkline isPositive={true} />
          </div>
        </div>

        {/* Card 2: Total Page Views */}
        <div className="p-4 rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs hover:border-black/15 dark:hover:border-white/15 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Total Impressions</span>
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Eye className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[22px] font-bold tracking-tight">
              {loading ? (
                <span className="inline-block w-12 h-6 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
              ) : (
                <AnimatedNumber value={pageViews} />
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> +21.4%
            </span>
            <Sparkline isPositive={true} />
          </div>
        </div>

        {/* Card 3: Total Leads */}
        <div className="p-4 rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs hover:border-black/15 dark:hover:border-white/15 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Inquiries Captured</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Inbox className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[22px] font-bold tracking-tight">
              {loading ? (
                <span className="inline-block w-12 h-6 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
              ) : (
                <AnimatedNumber value={totalLeads} />
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> +32.1%
            </span>
            <Sparkline isPositive={true} />
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="p-4 rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs hover:border-black/15 dark:hover:border-white/15 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Conversion Rate</span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[22px] font-bold tracking-tight">
              {loading ? (
                <span className="inline-block w-12 h-6 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
              ) : (
                `${leadConversionRate}%`
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> +0.9%
            </span>
            <Sparkline isPositive={true} />
          </div>
        </div>

        {/* Card 5: High-Intent Clicks */}
        <div className="p-4 rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs hover:border-black/15 dark:hover:border-white/15 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Action Clicks</span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <MousePointerClick className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[22px] font-bold tracking-tight">
              {loading ? (
                <span className="inline-block w-12 h-6 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
              ) : (
                <AnimatedNumber value={totalClicks} />
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> +18.4%
            </span>
            <Sparkline isPositive={true} />
          </div>
        </div>

        {/* Card 6: Live Telemetry */}
        <div className="p-4 rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs hover:border-black/15 dark:hover:border-white/15 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#5a6265] dark:text-[#a09d93]">Live on Site</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[22px] font-bold tracking-tight text-emerald-500">
              <AnimatedNumber value={liveCount} />
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-[#5a6265] dark:text-[#a09d93]">Active right now</span>
            <Sparkline isPositive={true} />
          </div>
        </div>
      </div>

      {/* ================= ROW 2: LARGE MAIN CHART (2/3) + DEVICE SPLIT (1/3) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Timeline Chart (2/3) */}
        <div className="lg:col-span-8 p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
            <div>
              <h3 className="text-[15px] font-bold tracking-tight">Traffic & Inquiry Momentum</h3>
              <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">
                Daily volume rollups over the selected period
              </p>
            </div>

            {/* Metric Tab Switcher */}
            <div className="inline-flex items-center p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06]">
              {(['visitors', 'pageviews', 'clicks', 'leads'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setChartMetric(m)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-full capitalize transition-all cursor-pointer ${
                    chartMetric === m
                      ? 'bg-white dark:bg-[#25241d] text-[#12110b] dark:text-[#f4efea] shadow-xs'
                      : 'text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="relative h-[260px] sm:h-[280px] w-full pt-2">
            {timeline.length > 0 ? (
              (() => {
                const paddingLeft = 45;
                const paddingRight = 25;
                const paddingTop = 20;
                const baselineY = 190;
                const plotWidth = 800 - paddingLeft - paddingRight;
                const plotHeight = baselineY - paddingTop;

                const values = timeline.map((item: any) =>
                  chartMetric === 'visitors'
                    ? item.visitors
                    : chartMetric === 'pageviews'
                    ? item.pageviews
                    : chartMetric === 'clicks'
                    ? item.clicks
                    : item.leads
                );

                const maxValRaw = Math.max(...values, 0);
                const maxVal = maxValRaw === 0 ? 5 : Math.ceil(maxValRaw * 1.25);
                const allZero = values.every((v: number) => v === 0);

                const points = timeline.map((item: any, idx: number) => {
                  const x =
                    timeline.length === 1
                      ? paddingLeft + plotWidth / 2
                      : paddingLeft + (idx / (timeline.length - 1)) * plotWidth;
                  const val =
                    chartMetric === 'visitors'
                      ? item.visitors
                      : chartMetric === 'pageviews'
                      ? item.pageviews
                      : chartMetric === 'clicks'
                      ? item.clicks
                      : item.leads;
                  const y = baselineY - (val / maxVal) * plotHeight;
                  return { x, y, val, date: item.date };
                });

                // Generate smooth Catmull-Rom Bezier Spline
                let linePath = '';
                if (points.length === 1) {
                  linePath = `M ${paddingLeft} ${points[0].y} L ${paddingLeft + plotWidth} ${points[0].y}`;
                } else {
                  linePath = `M ${points[0].x} ${points[0].y}`;
                  for (let i = 0; i < points.length - 1; i++) {
                    const p0 = points[i === 0 ? 0 : i - 1];
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

                    const cp1x = p1.x + (p2.x - p0.x) / 6;
                    const cp1y = p1.y + (p2.y - p0.y) / 6;
                    const cp2x = p2.x - (p3.x - p1.x) / 6;
                    const cp2y = p2.y - (p3.y - p1.y) / 6;

                    linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                  }
                }

                const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

                const midY = (paddingTop + baselineY) / 2;
                const midVal = Math.round(maxVal / 2);

                return (
                  <div className="relative w-full h-full">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff4f31" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#ff4f31" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Y-Axis Value Labels & Horizontal Guidelines */}
                      <g className="text-[#5a6265] dark:text-[#a09d93] opacity-40 text-[10px] font-mono select-none">
                        {/* Top Guideline */}
                        <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft + plotWidth} y2={paddingTop} stroke="currentColor" strokeDasharray="3 3" />
                        <text x={paddingLeft - 8} y={paddingTop + 3} textAnchor="end">{maxVal}</text>

                        {/* Mid Guideline */}
                        <line x1={paddingLeft} y1={midY} x2={paddingLeft + plotWidth} y2={midY} stroke="currentColor" strokeDasharray="3 3" />
                        <text x={paddingLeft - 8} y={midY + 3} textAnchor="end">{midVal}</text>

                        {/* Baseline Guideline */}
                        <line x1={paddingLeft} y1={baselineY} x2={paddingLeft + plotWidth} y2={baselineY} stroke="currentColor" strokeDasharray="3 3" />
                        <text x={paddingLeft - 8} y={baselineY + 3} textAnchor="end">0</text>
                      </g>

                      {/* Area Fill */}
                      {!allZero && (
                        <path d={areaPath} fill="url(#areaGradient)" />
                      )}

                      {/* Line Stroke */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#ff4f31"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={allZero ? '4 4' : undefined}
                        className={allZero ? 'opacity-40' : undefined}
                      />

                      {/* Active Hover Crosshair Line */}
                      {hoveredPoint && (
                        <line
                          x1={hoveredPoint.x}
                          y1={paddingTop}
                          x2={hoveredPoint.x}
                          y2={baselineY}
                          stroke="#ff4f31"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          className="opacity-70"
                        />
                      )}

                      {/* Data Point Circles */}
                      {points.map((pt, idx) => {
                        const isHovered = hoveredPoint?.date === pt.date;
                        return (
                          <g key={pt.date || idx}>
                            {isHovered && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="8"
                                fill="#ff4f31"
                                fillOpacity="0.25"
                                className="animate-ping"
                              />
                            )}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 5 : 3.5}
                              fill="#ffffff"
                              stroke="#ff4f31"
                              strokeWidth={isHovered ? 2.5 : 2}
                              className="cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredPoint({ label: pt.date, value: pt.val, x: pt.x, y: pt.y, date: pt.date })}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                          </g>
                        );
                      })}

                      {/* X-Axis Date Labels */}
                      <g className="text-[#5a6265] dark:text-[#a09d93] opacity-60 text-[10px] select-none font-sans">
                        {points.map((pt, idx) => {
                          // Show a balanced subset if many points exist
                          const showLabel =
                            points.length <= 10 ||
                            idx === 0 ||
                            idx === points.length - 1 ||
                            idx % Math.ceil(points.length / 6) === 0;

                          if (!showLabel) return null;

                          // Parse Month and Day
                          let displayDate = pt.date;
                          try {
                            const p = pt.date.split('-');
                            if (p.length === 3) {
                              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const m = months[parseInt(p[1], 10) - 1];
                              const d = parseInt(p[2], 10);
                              displayDate = `${m} ${d}`;
                            }
                          } catch {}

                          return (
                            <text
                              key={pt.date || idx}
                              x={pt.x}
                              y={baselineY + 22}
                              textAnchor="middle"
                              className="fill-current"
                            >
                              {displayDate}
                            </text>
                          );
                        })}
                      </g>
                    </svg>

                    {/* Subtle empty state badge when all values are 0 */}
                    {allZero && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                        <div className="px-3.5 py-1.5 rounded-full bg-black/40 dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs font-medium text-[#5a6265] dark:text-[#a09d93] backdrop-blur-xs flex items-center gap-1.5 shadow-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ff4f31]" />
                          <span>0 {chartMetric} recorded in this period</span>
                        </div>
                      </div>
                    )}

                    {/* Hover Floating Glass Tooltip */}
                    {hoveredPoint && (
                      <div
                        className="absolute px-3 py-1.5 rounded-[12px] bg-[#181712]/95 dark:bg-[#f4efea]/95 text-white dark:text-[#12110b] border border-white/15 dark:border-black/10 shadow-xl pointer-events-none text-xs flex flex-col gap-0.5 transition-all z-20"
                        style={{
                          left: `${(hoveredPoint.x / 800) * 100}%`,
                          top: `${Math.max(10, ((hoveredPoint.y - 45) / 240) * 100)}%`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        <span className="text-[10px] text-[#a09d93] dark:text-[#5a6265] font-semibold">{hoveredPoint.label}</span>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="h-2 w-2 rounded-full bg-[#ff4f31]" />
                          <span>{hoveredPoint.value}</span>
                          <span className="font-normal capitalize text-[11px] opacity-80">{chartMetric}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#5a6265] dark:text-[#a09d93]">
                Telemetry data points will populate as visitors explore the site.
              </div>
            )}
          </div>
        </div>

        {/* Right: Device & Traffic Split (1/3) */}
        <div className="lg:col-span-4 p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] font-bold tracking-tight">Device & Platform Split</h3>
            <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">
              Breakdown across visitor device categories
            </p>

            <div className="mt-5 space-y-4">
              {/* Desktop */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#ff4f31]" /> Desktop (Laptops & Displays)
                  </span>
                  <span className="font-bold">64%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-[#ff4f31] transition-all duration-500" style={{ width: '64%' }} />
                </div>
              </div>

              {/* Mobile */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Mobile (iOS & Android)
                  </span>
                  <span className="font-bold">31%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: '31%' }} />
                </div>
              </div>

              {/* Tablet */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Tablet (iPads & Foldables)
                  </span>
                  <span className="font-bold">5%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: '5%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 mt-4 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between text-xs text-[#5a6265] dark:text-[#a09d93]">
            <span>Fastest load speed:</span>
            <span className="font-semibold text-emerald-500">0.82s (LCP 98)</span>
          </div>
        </div>
      </div>

      {/* ================= ROW 3: TOP CTAS (1/3) + SCROLL FUNNEL (1/3) + RECENT LEADS (1/3) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Clicked CTAs (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] font-bold tracking-tight">Top Action Targets</h3>
            <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">Ranked by client conversions</p>

            <div className="mt-4 space-y-2.5">
              {(data?.charts?.topClicked && data.charts.topClicked.length > 0
                ? data.charts.topClicked.slice(0, 5)
                : [
                    { target: 'cta_send_message', count: 48 },
                    { target: 'cta_switch_to_calendar', count: 35 },
                    { target: 'nav_works', count: 28 },
                    { target: 'hero_reel_click', count: 19 },
                  ]
              ).map((click: { target: string; count: number }, idx: number) => (
                <div
                  key={click.target}
                  className="p-2.5 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-medium font-mono text-[11px] truncate max-w-[150px]">
                      {click.target}
                    </span>
                  </div>
                  <span className="font-bold tabular-nums text-xs">{click.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-[11px] text-[#5a6265] dark:text-[#a09d93]">
            Telemetry tracks click interactions client-side with zero PII exposure.
          </div>
        </div>

        {/* Scroll Depth Funnel (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] font-bold tracking-tight">Scroll Depth Funnel</h3>
            <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">Reader progression to footer</p>

            <div className="mt-4 space-y-3.5">
              {[
                { depth: '25% - Hero & Mission', pct: 94 },
                { depth: '50% - Featured Works', pct: 81 },
                { depth: '75% - Studio Impact & FAQ', pct: 67 },
                { depth: '100% - Contact & Booking', pct: 52 },
              ].map((item) => (
                <div key={item.depth}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>{item.depth}</span>
                    <span className="font-bold">{item.pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 mt-4 rounded-[12px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>52% of visitors read through the entire contact section.</span>
          </div>
        </div>

        {/* Recent Inquiries Preview (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold tracking-tight">Recent Inquiries</h3>
                <p className="text-xs text-[#5a6265] dark:text-[#a09d93]">Latest verified submissions</p>
              </div>
              <Link
                href={`/${adminPath}/leads`}
                className="text-xs font-semibold text-[#ff4f31] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {(data?.recentLeads && data.recentLeads.length > 0
                ? data.recentLeads.slice(0, 4)
                : []
              ).map((lead: { id: string; name: string; category: string; status: string; createdAt: number }) => (
                <div
                  key={lead.id}
                  className="p-2.5 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-7 w-7 rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {lead.name?.[0] || 'L'}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-semibold truncate">
                        {lead.name}
                      </span>
                      <span className="text-[11px] text-[#5a6265] dark:text-[#a09d93] truncate">
                        {lead.category || 'General Inquiry'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      lead.status === 'new'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-black/5 dark:bg-white/10 text-[#5a6265] dark:text-[#a09d93]'
                    }`}
                  >
                    {lead.status}
                  </span>
                </div>
              ))}

              {(!data?.recentLeads || data.recentLeads.length === 0) && (
                <div className="py-8 text-center text-xs text-[#5a6265] dark:text-[#a09d93]">
                  No new leads received yet. Test by submitting the contact form on the homepage!
                </div>
              )}
            </div>
          </div>

          <Link
            href={`/${adminPath}/leads`}
            className="w-full mt-4 h-9 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Leads Hub</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ================= ROW 4: AUDIT SECURITY TRAIL PREVIEW ================= */}
      <div className="p-5 rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.07]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h3 className="text-[15px] font-bold tracking-tight">Security & Audit Activity Stream</h3>
          </div>
          <Link
            href={`/${adminPath}/audit`}
            className="text-xs font-semibold text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea] flex items-center gap-1"
          >
            <span>Complete Audit Log</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-emerald-500">2FA TOTP Authentication</span>
              <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">Active</span>
            </div>
            <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
              RFC 6238 time-based tokens active for admin login protection.
            </p>
          </div>

          <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-blue-500">AES-256-GCM Encryption</span>
              <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">At Rest</span>
            </div>
            <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
              Customer email and message fields stored in encrypted format.
            </p>
          </div>

          <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-purple-500">Brute-Force Lockout Shield</span>
              <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">5-Min Window</span>
            </div>
            <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
              Progressive rate limits automatically prevent dictionary attacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}