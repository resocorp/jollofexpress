// Get active orders for Kitchen Display System
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Fetch orders that are active (not completed or cancelled)
    // Created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .in('status', ['confirmed', 'out_for_delivery'])
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching kitchen orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json(orders || []);

  } catch (error) {
    console.error('Unexpected error in kitchen orders:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
