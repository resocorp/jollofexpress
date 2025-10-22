import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

interface OverviewMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  avgPrepTime: number;
  revenueGrowth: number;
  ordersGrowth: number;
  aovGrowth: number;
  prepTimeChange: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const periodDays = parseInt(period);

    const supabase = createServiceClient();

    // Calculate date ranges
    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);
    
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

    // Fetch current period data
    const { data: currentOrders, error: currentError } = await supabase
      .from('orders')
      .select('total, estimated_prep_time, created_at')
      .gte('created_at', currentPeriodStart.toISOString())
      .in('status', ['completed', 'ready', 'out_for_delivery', 'preparing', 'confirmed']);

    if (currentError) throw currentError;

    // Fetch previous period data for comparison
    const { data: previousOrders, error: previousError } = await supabase
      .from('orders')
      .select('total, estimated_prep_time')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', currentPeriodStart.toISOString())
      .in('status', ['completed', 'ready', 'out_for_delivery', 'preparing', 'confirmed']);

    if (previousError) throw previousError;

    // Calculate current period metrics
    const totalRevenue = currentOrders?.reduce((sum: number, order: any) => sum + Number(order.total), 0) || 0;
    const totalOrders = currentOrders?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgPrepTime = currentOrders?.reduce((sum: number, order: any) => sum + (order.estimated_prep_time || 0), 0) / (totalOrders || 1);

    // Calculate previous period metrics
    const prevTotalRevenue = previousOrders?.reduce((sum: number, order: any) => sum + Number(order.total), 0) || 0;
    const prevTotalOrders = previousOrders?.length || 0;
    const prevAverageOrderValue = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
    const prevAvgPrepTime = previousOrders?.reduce((sum: number, order: any) => sum + (order.estimated_prep_time || 0), 0) / (prevTotalOrders || 1);

    // Calculate growth percentages
    const revenueGrowth = prevTotalRevenue > 0 
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
      : 0;
    const ordersGrowth = prevTotalOrders > 0 
      ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 
      : 0;
    const aovGrowth = prevAverageOrderValue > 0 
      ? ((averageOrderValue - prevAverageOrderValue) / prevAverageOrderValue) * 100 
      : 0;
    const prepTimeChange = prevAvgPrepTime > 0 
      ? ((avgPrepTime - prevAvgPrepTime) / prevAvgPrepTime) * 100 
      : 0;

    const metrics: OverviewMetrics = {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      avgPrepTime,
      revenueGrowth,
      ordersGrowth,
      aovGrowth,
      prepTimeChange,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview metrics' },
      { status: 500 }
    );
  }
}
