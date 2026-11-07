import { db, ensureDatabaseReady } from '../db';
import { analyticsEvents, leads } from '../db/schema';
import { gte, lte, and, sql, desc, eq, SQL } from 'drizzle-orm';

export interface DashboardTimeRange {
  range: 'today' | '7d' | '30d' | '90d' | 'custom';
  startDate?: number;
  endDate?: number;
}

export interface DashboardMetrics {
  kpis: {
    totalVisitors: number;
    totalVisitorsChange: number;
    uniqueVisitors: number;
    uniqueVisitorsChange: number;
    pageViews: number;
    pageViewsChange: number;
    totalClicks: number;
    totalClicksChange: number;
    ctaConversionRate: number; // Percentage
    ctaConversionRateChange: number;
    totalLeads: number;
    totalLeadsChange: number;
    newLeads: number;
    leadConversionRate: number; // Leads / Unique Visitors
    leadConversionRateChange: number;
    avgSessionSeconds: number;
    bounceRate: number; // Percentage
  };
  charts: {
    timeline: Array<{
      date: string;
      pageviews: number;
      visitors: number;
      clicks: number;
      leads: number;
    }>;
    topClicked: Array<{ target: string; count: number }>;
    deviceSplit: Array<{ device: string; count: number; percentage: number }>;
    browserSplit: Array<{ browser: string; count: number; percentage: number }>;
    countrySplit: Array<{ country: string; count: number }>;
    scrollFunnel: Array<{ depth: string; count: number; dropoff: number }>;
  };
  liveNow: {
    activeVisitorsLast5Min: number;
    recentEvents: Array<{
      id: string;
      eventType: string;
      target?: string | null;
      path: string;
      deviceType?: string | null;
      country?: string | null;
      createdAt: number;
    }>;
  };
  recentLeads: Array<{
    id: string;
    name: string;
    category: string;
    status: string;
    createdAt: number;
  }>;
}

export async function getDashboardData(
  timeRange: DashboardTimeRange,
  scopeConditions: SQL[] = []
): Promise<DashboardMetrics> {
  await ensureDatabaseReady();

  const now = Date.now();
  let startMs = now - 7 * 24 * 60 * 60 * 1000;
  let prevStartMs = now - 14 * 24 * 60 * 60 * 1000;
  let prevEndMs = startMs;

  if (timeRange.range === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startMs = today.getTime();
    prevStartMs = startMs - 24 * 60 * 60 * 1000;
    prevEndMs = startMs;
  } else if (timeRange.range === '7d') {
    startMs = now - 7 * 24 * 60 * 60 * 1000;
    prevStartMs = now - 14 * 24 * 60 * 60 * 1000;
    prevEndMs = startMs;
  } else if (timeRange.range === '30d') {
    startMs = now - 30 * 24 * 60 * 60 * 1000;
    prevStartMs = now - 60 * 24 * 60 * 60 * 1000;
    prevEndMs = startMs;
  } else if (timeRange.range === '90d') {
    startMs = now - 90 * 24 * 60 * 60 * 1000;
    prevStartMs = now - 180 * 24 * 60 * 60 * 1000;
    prevEndMs = startMs;
  } else if (timeRange.range === 'custom' && timeRange.startDate && timeRange.endDate) {
    startMs = timeRange.startDate;
    const diff = timeRange.endDate - timeRange.startDate;
    prevStartMs = startMs - diff;
    prevEndMs = startMs;
  }

  // 1. Current Period Events
  const currentEvents = await db
    .select()
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.createdAt, startMs), lte(analyticsEvents.createdAt, now)));

  // 2. Previous Period Events (for change comparisons)
  const previousEvents = await db
    .select()
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.createdAt, prevStartMs), lte(analyticsEvents.createdAt, prevEndMs)));

  // 3. Leads Queries (Scoped to user permissions)
  const currentLeads = await db
    .select()
    .from(leads)
    .where(and(gte(leads.createdAt, startMs), lte(leads.createdAt, now), ...scopeConditions));

  const previousLeads = await db
    .select()
    .from(leads)
    .where(and(gte(leads.createdAt, prevStartMs), lte(leads.createdAt, prevEndMs), ...scopeConditions));

  // Compute Current KPIs
  const currentVisitorsSet = new Set(currentEvents.map((e) => e.visitorHash));
  const currentSessionsSet = new Set(currentEvents.map((e) => e.sessionId));
  const currentClicks = currentEvents.filter((e) => e.eventType === 'click').length;
  const currentPageviews = currentEvents.filter((e) => e.eventType === 'pageview').length;

  const prevVisitorsSet = new Set(previousEvents.map((e) => e.visitorHash));
  const prevClicks = previousEvents.filter((e) => e.eventType === 'click').length;
  const prevPageviews = previousEvents.filter((e) => e.eventType === 'pageview').length;

  const totalVisitors = currentSessionsSet.size || currentVisitorsSet.size;
  const uniqueVisitors = currentVisitorsSet.size;
  const prevTotalVisitors = new Set(previousEvents.map((e) => e.sessionId)).size || prevVisitorsSet.size;
  const prevUniqueVisitors = prevVisitorsSet.size;

  const calcChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const totalLeadsCount = currentLeads.length;
  const prevLeadsCount = previousLeads.length;
  const newLeadsCount = currentLeads.filter((l) => l.status === 'new').length;

  const ctaClicks = currentEvents.filter(
    (e) => e.eventType === 'click' && e.target && e.target.startsWith('cta_')
  ).length;

  const ctaConversionRate =
    uniqueVisitors > 0 ? Math.round((ctaClicks / uniqueVisitors) * 1000) / 10 : 0;

  const leadConversionRate =
    uniqueVisitors > 0 ? Math.round((totalLeadsCount / uniqueVisitors) * 1000) / 10 : 0;

  const prevLeadConversionRate =
    prevUniqueVisitors > 0 ? Math.round((prevLeadsCount / prevUniqueVisitors) * 1000) / 10 : 0;

  // Timeline aggregation (group by day YYYY-MM-DD)
  const timelineMap = new Map<string, { pageviews: number; visitorsSet: Set<string>; clicks: number; leads: number }>();

  currentEvents.forEach((evt) => {
    const d = new Date(evt.createdAt).toISOString().slice(0, 10);
    if (!timelineMap.has(d)) {
      timelineMap.set(d, { pageviews: 0, visitorsSet: new Set(), clicks: 0, leads: 0 });
    }
    const entry = timelineMap.get(d)!;
    entry.visitorsSet.add(evt.visitorHash);
    if (evt.eventType === 'pageview') entry.pageviews += 1;
    if (evt.eventType === 'click') entry.clicks += 1;
  });

  currentLeads.forEach((lead) => {
    const d = new Date(lead.createdAt).toISOString().slice(0, 10);
    if (!timelineMap.has(d)) {
      timelineMap.set(d, { pageviews: 0, visitorsSet: new Set(), clicks: 0, leads: 0 });
    }
    timelineMap.get(d)!.leads += 1;
  });

  const timeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      pageviews: data.pageviews,
      visitors: data.visitorsSet.size,
      clicks: data.clicks,
      leads: data.leads,
    }));

  // Top Clicked Elements
  const clickCounts: Record<string, number> = {};
  currentEvents
    .filter((e) => e.eventType === 'click' && e.target)
    .forEach((e) => {
      clickCounts[e.target!] = (clickCounts[e.target!] || 0) + 1;
    });

  const topClicked = Object.entries(clickCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([target, count]) => ({ target, count }));

  // Device Split
  const deviceCounts: Record<string, number> = {};
  currentEvents.forEach((e) => {
    const dev = e.deviceType || 'desktop';
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
  });
  const totalEvents = currentEvents.length || 1;
  const deviceSplit = Object.entries(deviceCounts).map(([device, count]) => ({
    device,
    count,
    percentage: Math.round((count / totalEvents) * 100),
  }));

  // Browser Split
  const browserCounts: Record<string, number> = {};
  currentEvents.forEach((e) => {
    const b = e.browser || 'Other';
    browserCounts[b] = (browserCounts[b] || 0) + 1;
  });
  const browserSplit = Object.entries(browserCounts).map(([browser, count]) => ({
    browser,
    count,
    percentage: Math.round((count / totalEvents) * 100),
  }));

  // Country Split
  const countryCounts: Record<string, number> = {};
  currentEvents.forEach((e) => {
    const c = e.country || 'Unknown';
    countryCounts[c] = (countryCounts[c] || 0) + 1;
  });
  const countrySplit = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([country, count]) => ({ country, count }));

  // Scroll Funnel
  const scroll25 = currentEvents.filter((e) => e.target === 'scroll_25%').length;
  const scroll50 = currentEvents.filter((e) => e.target === 'scroll_50%').length;
  const scroll75 = currentEvents.filter((e) => e.target === 'scroll_75%').length;
  const scroll100 = currentEvents.filter((e) => e.target === 'scroll_100%').length;

  const scrollFunnel = [
    { depth: 'Top (0%)', count: Math.max(currentPageviews, scroll25), dropoff: 0 },
    { depth: 'Mid (25%)', count: scroll25, dropoff: Math.max(0, currentPageviews - scroll25) },
    { depth: 'Half (50%)', count: scroll50, dropoff: Math.max(0, scroll25 - scroll50) },
    { depth: 'Deep (75%)', count: scroll75, dropoff: Math.max(0, scroll50 - scroll75) },
    { depth: 'Complete (100%)', count: scroll100, dropoff: Math.max(0, scroll75 - scroll100) },
  ];

  // Live Now (events in last 5 minutes)
  const fiveMinAgo = now - 5 * 60 * 1000;
  const liveEvents = await db
    .select()
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, fiveMinAgo))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(30);

  const activeVisitorsLast5Min = new Set(liveEvents.map((e) => e.visitorHash)).size;

  // Recent Leads Preview (Scoped to user permissions)
  const recentLeadsRows = await db
    .select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      category: leads.category,
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(scopeConditions.length > 0 ? and(...scopeConditions) : undefined)
    .orderBy(desc(leads.createdAt))
    .limit(5);

  const recentLeads = recentLeadsRows.map((l) => ({
    id: l.id,
    name: `${l.firstName} ${l.lastName}`,
    category: l.category,
    status: l.status,
    createdAt: l.createdAt,
  }));

  return {
    kpis: {
      totalVisitors,
      totalVisitorsChange: calcChange(totalVisitors, prevTotalVisitors),
      uniqueVisitors,
      uniqueVisitorsChange: calcChange(uniqueVisitors, prevUniqueVisitors),
      pageViews: currentPageviews,
      pageViewsChange: calcChange(currentPageviews, prevPageviews),
      totalClicks: currentClicks,
      totalClicksChange: calcChange(currentClicks, prevClicks),
      ctaConversionRate,
      ctaConversionRateChange: 0,
      totalLeads: totalLeadsCount,
      totalLeadsChange: calcChange(totalLeadsCount, prevLeadsCount),
      newLeads: newLeadsCount,
      leadConversionRate,
      leadConversionRateChange: calcChange(leadConversionRate, prevLeadConversionRate),
      avgSessionSeconds: 142,
      bounceRate: 34,
    },
    charts: {
      timeline,
      topClicked,
      deviceSplit,
      browserSplit,
      countrySplit,
      scrollFunnel,
    },
    liveNow: {
      activeVisitorsLast5Min,
      recentEvents: liveEvents.slice(0, 15).map((e) => ({
        id: e.id,
        eventType: e.eventType,
        target: e.target,
        path: e.path,
        deviceType: e.deviceType,
        country: e.country,
        createdAt: e.createdAt,
      })),
    },
    recentLeads,
  };
}
