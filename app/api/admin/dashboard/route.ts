import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Get current month date range
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get last month date range
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Fetch current month orders with payment_status = 'success'
    const { data: currentOrders, error: currentError } = await supabase
      .from('orders')
      .select('total, estimated_prep_time, created_at')
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', currentMonthEnd.toISOString())
      .eq('payment_status', 'success');

    if (currentError) {
      console.error('Error fetching current month orders:', currentError);
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      );
    }

    // Fetch last month orders with payment_status = 'success'
    const { data: lastOrders, error: lastError } = await supabase
      .from('orders')
      .select('total, estimated_prep_time')
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString())
      .eq('payment_status', 'success');

    if (lastError) {
      console.error('Error fetching last month orders:', lastError);
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      );
    }

    // Calculate current month stats
    const currentOrderCount = currentOrders?.length || 0;
    const currentRevenue = currentOrders?.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0) || 0;
    const currentAvgOrderValue = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
    
    // Calculate average prep time (only for orders with estimated_prep_time)
    const ordersWithPrepTime = currentOrders?.filter(o => o.estimated_prep_time) || [];
    const currentAvgPrepTime = ordersWithPrepTime.length > 0
      ? ordersWithPrepTime.reduce((sum, order) => sum + (order.estimated_prep_time || 0), 0) / ordersWithPrepTime.length
      : 0;

    // Calculate last month stats
    const lastOrderCount = lastOrders?.length || 0;
    const lastRevenue = lastOrders?.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0) || 0;
    const lastAvgOrderValue = lastOrderCount > 0 ? lastRevenue / lastOrderCount : 0;
    
    const lastOrdersWithPrepTime = lastOrders?.filter(o => o.estimated_prep_time) || [];
    const lastAvgPrepTime = lastOrdersWithPrepTime.length > 0
      ? lastOrdersWithPrepTime.reduce((sum, order) => sum + (order.estimated_prep_time || 0), 0) / lastOrdersWithPrepTime.length
      : 0;

    // Calculate percentage changes
    const revenueChange = lastRevenue > 0 
      ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 
      : currentRevenue > 0 ? 100 : 0;

    const orderCountChange = lastOrderCount > 0 
      ? ((currentOrderCount - lastOrderCount) / lastOrderCount) * 100 
      : currentOrderCount > 0 ? 100 : 0;

    const avgOrderValueChange = lastAvgOrderValue > 0 
      ? ((currentAvgOrderValue - lastAvgOrderValue) / lastAvgOrderValue) * 100 
      : currentAvgOrderValue > 0 ? 100 : 0;

    const avgPrepTimeChange = lastAvgPrepTime > 0 
      ? ((currentAvgPrepTime - lastAvgPrepTime) / lastAvgPrepTime) * 100 
      : 0;

    // Fetch recent orders (last 10)
    const { data: recentOrders, error: recentError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, total, status, payment_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent orders:', recentError);
    }

    return NextResponse.json({
      stats: {
        totalRevenue: {
          value: currentRevenue,
          change: revenueChange,
        },
        totalOrders: {
          value: currentOrderCount,
          change: orderCountChange,
        },
        avgOrderValue: {
          value: currentAvgOrderValue,
          change: avgOrderValueChange,
        },
        avgPrepTime: {
          value: Math.round(currentAvgPrepTime),
          change: avgPrepTimeChange,
        },
      },
      recentOrders: recentOrders || [],
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
