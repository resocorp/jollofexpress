import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

interface CategoryPerformance {
  categoryName: string;
  revenue: number;
  orders: number;
  percentage: number;
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

    // Fetch order items with their menu item categories
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        subtotal,
        quantity,
        item_id,
        order_id,
        orders!inner(created_at, status),
        menu_items!inner(category_id, menu_categories!inner(name))
      `)
      .gte('orders.created_at', startDate.toISOString())
      .in('orders.status', ['completed', 'ready', 'out_for_delivery', 'preparing', 'confirmed']);

    if (error) throw error;

    // Aggregate by category
    const categoryMap = new Map<string, { revenue: number; orderIds: Set<string> }>();
    let totalRevenue = 0;

    orderItems?.forEach((item: any) => {
      const categoryName = item.menu_items?.menu_categories?.name || 'Uncategorized';
      const revenue = Number(item.subtotal);
      totalRevenue += revenue;

      const existing = categoryMap.get(categoryName) || { revenue: 0, orderIds: new Set() };
      existing.revenue += revenue;
      existing.orderIds.add(item.order_id);
      categoryMap.set(categoryName, existing);
    });

    // Convert to array with percentages
    const categoryPerformance: CategoryPerformance[] = Array.from(categoryMap.entries())
      .map(([categoryName, data]) => ({
        categoryName,
        revenue: data.revenue,
        orders: data.orderIds.size,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json(categoryPerformance);
  } catch (error) {
    console.error('Error fetching category performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category performance' },
      { status: 500 }
    );
  }
}
