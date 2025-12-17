import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

interface RevenueTrendData {
  date: string;
  revenue: number;
  orders: number;
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const periodDays = parseInt(period);

    const supabase = createServiceClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch orders within the period
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .in('status', ['completed', 'ready', 'out_for_delivery', 'preparing', 'confirmed'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const trendMap = new Map<string, { revenue: number; orders: number }>();
    
    orders?.forEach((order: any) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = trendMap.get(date) || { revenue: 0, orders: 0 };
      trendMap.set(date, {
        revenue: existing.revenue + Number(order.total),
        orders: existing.orders + 1,
      });
    });

    // Convert to array and fill missing dates
    const trend: RevenueTrendData[] = [];
    for (let i = 0; i < periodDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const data = trendMap.get(dateStr) || { revenue: 0, orders: 0 };
      trend.push({
        date: dateStr,
        revenue: data.revenue,
        orders: data.orders,
      });
    }

    return NextResponse.json(trend);
  } catch (error) {
    console.error('Error fetching revenue trend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue trend' },
      { status: 500 }
    );
  }
}
