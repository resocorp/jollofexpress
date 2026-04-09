import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

// GET - Fetch all orders for a specific batch with location data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id: batchId } = await params;
    const supabase = createServiceClient();

    // Fetch batch info
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*, delivery_window:delivery_windows(*)')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Fetch all orders in this batch with items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_phone,
        customer_latitude,
        customer_longitude,
        delivery_address,
        delivery_city,
        delivery_instructions,
        address_type,
        unit_number,
        order_type,
        status,
        total,
        payment_status,
        payment_method_type,
        delivery_region_name,
        created_at,
        assigned_driver_id,
        order_items (
          item_name,
          item_description,
          quantity,
          selected_variation,
          selected_addons,
          special_instructions,
          subtotal
        )
      `)
      .eq('batch_id', batchId)
      .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed'])
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('Error fetching batch orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Fetch assigned driver info if any orders have drivers
    const driverIds = [...new Set(
      (orders || [])
        .filter(o => o.assigned_driver_id)
        .map(o => o.assigned_driver_id)
    )];

    let drivers: Record<string, any> = {};
    if (driverIds.length > 0) {
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, name, phone, traccar_device_id, current_latitude, current_longitude, last_location_update')
        .in('id', driverIds);

      if (driverData) {
        drivers = Object.fromEntries(driverData.map(d => [d.id, d]));
      }
    }

    return NextResponse.json({
      batch,
      orders: orders || [],
      drivers,
    });
  } catch (error) {
    console.error('Error in batch orders endpoint:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
