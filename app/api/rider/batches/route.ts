import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyRiderAuth } from '@/lib/auth/rider-auth';
import { getTodayDateString } from '@/lib/batch/batch-service';
import { getNowMinutesLagos, timeStringToMinutes, isPastCutoff } from '@/lib/batch/print-gate';

export const dynamic = 'force-dynamic';

const VISIBLE_STATUSES = ['accepting', 'cutoff', 'preparing', 'dispatching'];
const COUNTABLE_ORDER_STATUSES = [
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
];

export async function GET(request: NextRequest) {
  const auth = await verifyRiderAuth(request);
  if (!auth.authenticated) return auth.response;

  try {
    const supabase = createServiceClient();
    const today = getTodayDateString();
    const nowMin = getNowMinutesLagos();

    const { data: batches, error } = await supabase
      .from('batches')
      .select('id, delivery_date, status, delivery_window:delivery_windows(name, cutoff_time, delivery_start, delivery_end)')
      .eq('delivery_date', today)
      .in('status', VISIBLE_STATUSES)
      .order('delivery_date', { ascending: true });

    if (error) {
      console.error('rider/batches list error:', error);
      return NextResponse.json({ error: 'Failed to load batches' }, { status: 500 });
    }

    if (!batches || batches.length === 0) {
      return NextResponse.json([]);
    }

    const batchIds = batches.map(b => b.id);
    const { data: counts, error: countErr } = await supabase
      .from('orders')
      .select('batch_id')
      .in('batch_id', batchIds)
      .eq('order_type', 'delivery')
      .in('status', COUNTABLE_ORDER_STATUSES);

    if (countErr) {
      console.error('rider/batches count error:', countErr);
      return NextResponse.json({ error: 'Failed to count orders' }, { status: 500 });
    }

    const stopCounts = new Map<string, number>();
    for (const row of counts || []) {
      stopCounts.set(row.batch_id, (stopCounts.get(row.batch_id) || 0) + 1);
    }

    // Show every batch for today; UI gates the print button by `printable`
    // so riders can see upcoming windows alongside ones that are open now.
    const result = batches
      .map(b => {
        const window = Array.isArray(b.delivery_window) ? b.delivery_window[0] : b.delivery_window;
        const cutoffMin = window?.cutoff_time ? timeStringToMinutes(window.cutoff_time) : null;
        return {
          id: b.id,
          delivery_date: b.delivery_date,
          status: b.status,
          window_name: window?.name ?? 'Unknown',
          delivery_start: window?.delivery_start ?? null,
          delivery_end: window?.delivery_end ?? null,
          cutoff_time: window?.cutoff_time ?? null,
          stop_count: stopCounts.get(b.id) || 0,
          printable: isPastCutoff(b.status, cutoffMin, nowMin),
        };
      })
      .sort((a, b) => (a.delivery_start || '').localeCompare(b.delivery_start || ''));

    return NextResponse.json(result);
  } catch (err) {
    console.error('rider/batches unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load batches' }, { status: 500 });
  }
}
