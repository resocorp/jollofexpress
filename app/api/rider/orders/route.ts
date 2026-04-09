import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyRiderAuth } from '@/lib/auth/rider-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyRiderAuth(request);
  if (!auth.authenticated) return auth.response;

  try {
    const supabase = createServiceClient();

    // Fetch ALL orders that are out for delivery (not just assigned to this rider)
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_phone,
        delivery_address,
        total,
        payment_method_type,
        payment_status,
        status,
        created_at,
        assigned_driver_id
      `)
      .eq('status', 'out_for_delivery')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rider orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Fetch delivery assignment IDs for these orders
    const orderIds = (orders || []).map(o => o.id);
    let assignmentMap: Record<string, string> = {};

    if (orderIds.length > 0) {
      const { data: assignments } = await supabase
        .from('delivery_assignments')
        .select('id, order_id')
        .in('order_id', orderIds)
        .in('status', ['pending', 'accepted', 'picked_up']);

      if (assignments) {
        assignmentMap = Object.fromEntries(assignments.map(a => [a.order_id, a.id]));
      }
    }

    const result = (orders || []).map(order => ({
      assignment_id: assignmentMap[order.id] || null,
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      delivery_address: order.delivery_address,
      total: order.total,
      payment_method_type: order.payment_method_type,
      payment_status: order.payment_status,
      assigned_driver_id: order.assigned_driver_id,
      created_at: order.created_at,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
