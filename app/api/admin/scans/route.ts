import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

interface ScanEventRow {
  id: string;
  order_id: string;
  driver_id: string;
  scanned_at: string;
  was_override: boolean;
  previous_driver_id: string | null;
  previous_status: string | null;
}

// GET /api/admin/scans — list recent rider scan events for audit.
// Query params:
//   driver_id        — filter to a specific scanning rider
//   order_id         — filter to a specific order
//   overrides_only   — 'true' to only return takeover events
//   since            — ISO timestamp; only events at/after this time
//   limit            — default 200, max 500
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) return authResult.response;

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const driverId = searchParams.get('driver_id');
    const orderId = searchParams.get('order_id');
    const overridesOnly = searchParams.get('overrides_only') === 'true';
    const since = searchParams.get('since');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

    let query = supabase
      .from('scan_events')
      .select('id, order_id, driver_id, scanned_at, was_override, previous_driver_id, previous_status')
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (driverId) query = query.eq('driver_id', driverId);
    if (orderId) query = query.eq('order_id', orderId);
    if (overridesOnly) query = query.eq('was_override', true);
    if (since) query = query.gte('scanned_at', since);

    const { data: events, error } = await query;
    if (error) {
      console.error('[admin/scans] Failed to fetch:', error);
      return NextResponse.json({ error: 'Failed to fetch scan events' }, { status: 500 });
    }

    const rows = (events || []) as ScanEventRow[];

    // Hydrate driver names + order numbers in one round-trip each.
    const driverIds = Array.from(
      new Set(
        rows.flatMap((r) => [r.driver_id, r.previous_driver_id].filter(Boolean) as string[])
      )
    );
    const orderIds = Array.from(new Set(rows.map((r) => r.order_id)));

    const [{ data: drivers }, { data: orders }] = await Promise.all([
      driverIds.length
        ? supabase.from('drivers').select('id, name').in('id', driverIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      orderIds.length
        ? supabase.from('orders').select('id, order_number, customer_name').in('id', orderIds)
        : Promise.resolve({
            data: [] as { id: string; order_number: string; customer_name: string }[],
          }),
    ]);

    const driverMap = new Map((drivers || []).map((d) => [d.id, d.name]));
    const orderMap = new Map((orders || []).map((o) => [o.id, o]));

    const result = rows.map((r) => {
      const order = orderMap.get(r.order_id);
      return {
        id: r.id,
        scanned_at: r.scanned_at,
        order_id: r.order_id,
        order_number: order?.order_number ?? null,
        customer_name: order?.customer_name ?? null,
        driver_id: r.driver_id,
        driver_name: driverMap.get(r.driver_id) ?? 'Unknown',
        was_override: r.was_override,
        previous_driver_id: r.previous_driver_id,
        previous_driver_name: r.previous_driver_id
          ? driverMap.get(r.previous_driver_id) ?? 'Unknown'
          : null,
        previous_status: r.previous_status,
      };
    });

    return NextResponse.json({ events: result });
  } catch (err) {
    console.error('[admin/scans] Unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
