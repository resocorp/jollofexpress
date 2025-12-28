// Get driver's active delivery
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/drivers/[id]/active-delivery - Get driver's current active delivery
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Find active assignment for this driver
    const { data: assignment, error: assignmentError } = await supabase
      .from('delivery_assignments')
      .select(`
        id,
        status,
        orders(
          id,
          order_number,
          customer_name,
          customer_phone,
          delivery_address,
          delivery_instructions,
          total,
          payment_method_type,
          customer_latitude,
          customer_longitude
        )
      `)
      .eq('driver_id', id)
      .in('status', ['pending', 'accepted', 'picked_up'])
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(null);
    }

    // Flatten the response
    const order = assignment.orders as any;
    return NextResponse.json({
      id: assignment.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      delivery_address: order.delivery_address,
      delivery_instructions: order.delivery_instructions,
      total: order.total,
      payment_method_type: order.payment_method_type,
      status: assignment.status,
      customer_latitude: order.customer_latitude,
      customer_longitude: order.customer_longitude,
    });
  } catch (error: any) {
    console.error('Active delivery fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch active delivery' },
      { status: 500 }
    );
  }
}
