import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

interface KitchenPerformance {
  averagePrepTime: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  completionRate: number;
  prepTimeByHour: { hour: number; avgPrepTime: number; orders: number }[];
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

    // Fetch all orders in the period
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, estimated_prep_time, created_at, completed_at')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Calculate metrics
    const completedOrders = orders?.filter((o: any) => o.status === 'completed') || [];
    const activeOrders = orders?.filter((o: any) => ['preparing', 'ready', 'out_for_delivery'].includes(o.status)) || [];
    const cancelledOrders = orders?.filter((o: any) => o.status === 'cancelled') || [];
    
    const totalOrders = orders?.length || 0;
    const completionRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;

    // Calculate average prep time for completed orders
    const avgPrepTime = completedOrders.length > 0
      ? completedOrders.reduce((sum: number, o: any) => sum + (o.estimated_prep_time || 0), 0) / completedOrders.length
      : 0;

    // Prep time by hour of day
    const hourMap = new Map<number, { totalTime: number; count: number }>();
    
    completedOrders.forEach((order: any) => {
      const hour = new Date(order.created_at).getHours();
      const existing = hourMap.get(hour) || { totalTime: 0, count: 0 };
      hourMap.set(hour, {
        totalTime: existing.totalTime + (order.estimated_prep_time || 0),
        count: existing.count + 1,
      });
    });

    const prepTimeByHour = Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour,
        avgPrepTime: data.count > 0 ? data.totalTime / data.count : 0,
        orders: data.count,
      }))
      .sort((a, b) => a.hour - b.hour);

    const performance: KitchenPerformance = {
      averagePrepTime: Math.round(avgPrepTime),
      completedOrders: completedOrders.length,
      activeOrders: activeOrders.length,
      cancelledOrders: cancelledOrders.length,
      completionRate: Math.round(completionRate * 100) / 100,
      prepTimeByHour,
    };

    return NextResponse.json(performance);
  } catch (error) {
    console.error('Error fetching kitchen performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kitchen performance' },
      { status: 500 }
    );
  }
}
