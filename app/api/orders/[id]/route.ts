// Get order details for tracking
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');

    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', id);

    // If phone is provided, verify it matches (security check)
    if (phone) {
      query = query.eq('customer_phone', phone);
    }

    const { data: order, error } = await query.single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
