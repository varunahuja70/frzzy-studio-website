import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth/session';
import { getDashboardData } from '@/lib/analytics/rollups';

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const range = (searchParams.get('range') || '7d') as 'today' | '7d' | '30d' | '90d' | 'custom';
    const startDate = searchParams.get('start') ? parseInt(searchParams.get('start')!, 10) : undefined;
    const endDate = searchParams.get('end') ? parseInt(searchParams.get('end')!, 10) : undefined;

    const data = await getDashboardData({
      range,
      startDate,
      endDate,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('Dashboard data error:', err);
    return NextResponse.json({ error: 'Failed to retrieve dashboard data' }, { status: 500 });
  }
}
