import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/in-flight — all orders currently out_for_delivery across every
// batch, plus the latest cached location for each assigned driver.
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.response;

  const supabase = createServiceClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      `id, order_number, customer_name, customer_phone, customer_latitude,
       customer_longitude, delivery_address, delivery_city, delivery_instructions,
       status, total, payment_status, payment_method_type, assigned_driver_id,
       arrived_at_customer, delivery_start_time, batch_id,
       order_items (item_name, quantity)`
    )
    .eq('status', 'out_for_delivery')
    .eq('order_type', 'delivery')
    .order('delivery_start_time', { ascending: true });

  if (error) {
    console.error('in-flight: failed to fetch orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  const driverIds = Array.from(
    new Set((orders || []).map((o) => o.assigned_driver_id).filter(Boolean))
  ) as string[];

  let drivers: Array<{
    id: string;
    name: string;
    current_latitude: number | null;
    current_longitude: number | null;
    last_location_update: string | null;
  }> = [];

  if (driverIds.length > 0) {
    const { data: driversData } = await supabase
      .from('drivers')
      .select('id, name, current_latitude, current_longitude, last_location_update')
      .in('id', driverIds);
    drivers = driversData || [];
  }

  return NextResponse.json({
    orders: orders || [],
    drivers,
  });
}
