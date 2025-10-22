import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

interface TopItemData {
  itemName: string;
  quantity: number;
  revenue: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const limit = parseInt(searchParams.get('limit') || '10');
    const periodDays = parseInt(period);

    const supabase = createServiceClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch order items with their orders
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        item_name,
        quantity,
        subtotal,
        order_id,
        orders!inner(created_at, status)
      `)
      .gte('orders.created_at', startDate.toISOString())
      .in('orders.status', ['completed', 'ready', 'out_for_delivery', 'preparing', 'confirmed']);

    if (error) throw error;

    // Aggregate by item name
    const itemMap = new Map<string, { quantity: number; revenue: number }>();
    
    orderItems?.forEach((item: any) => {
      const existing = itemMap.get(item.item_name) || { quantity: 0, revenue: 0 };
      itemMap.set(item.item_name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + Number(item.subtotal),
      });
    });

    // Convert to array and sort by quantity
    const topItems: TopItemData[] = Array.from(itemMap.entries())
      .map(([itemName, data]) => ({
        itemName,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    return NextResponse.json(topItems);
  } catch (error) {
    console.error('Error fetching top items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top items' },
      { status: 500 }
    );
  }
}
