import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth/session';
import { resolveAdminPermissions, hasPermission, buildLeadScopeConditions } from '@/lib/auth/permissions';
import { getDashboardData } from '@/lib/analytics/rollups';
import { leads } from '@/lib/db/schema';

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = await resolveAdminPermissions(sessionRes.admin.id);
    if (!hasPermission(perms, 'dashboard:view_kpis') && !hasPermission(perms, 'dashboard:view_analytics')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view dashboard' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const range = (searchParams.get('range') || '7d') as 'today' | '7d' | '30d' | '90d' | 'custom';
    const startDate = searchParams.get('start') ? parseInt(searchParams.get('start')!, 10) : undefined;
    const endDate = searchParams.get('end') ? parseInt(searchParams.get('end')!, 10) : undefined;

    // Granular Lead Scoping for KPI calculations and recent inquiries widget
    const scopeConditions = buildLeadScopeConditions(perms?.leadScope, sessionRes.admin.id, leads);

    const data = await getDashboardData(
      {
        range,
        startDate,
        endDate,
      },
      scopeConditions
    );

    // If user cannot view live telemetry, redact live metrics
    if (!hasPermission(perms, 'dashboard:view_live')) {
      data.liveNow = {
        activeVisitorsLast5Min: 0,
        recentEvents: [],
      };
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Dashboard data error:', err);
    return NextResponse.json({ error: 'Failed to retrieve dashboard data' }, { status: 500 });
  }
}
