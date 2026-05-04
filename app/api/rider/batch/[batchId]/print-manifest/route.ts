import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyRiderAuth } from '@/lib/auth/rider-auth';
import { formatDeliveryManifest } from '@/lib/print/format-manifest';
import { generateManifestESCPOS } from '@/lib/print/escpos-manifest';
import { printToNetwork } from '@/lib/print/network-printer';
import { formatDeliveryWindow } from '@/lib/batch/batch-service';
import { optimizeRoute, type RouteStop } from '@/lib/delivery/route-optimizer';
import { RESTAURANT_LOCATION } from '@/lib/delivery/restaurant-location';
import { getNowMinutesLagos, timeStringToMinutes, isPastCutoff } from '@/lib/batch/print-gate';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const auth = await verifyRiderAuth(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { batchId } = await params;
    const supabase = createServiceClient();

    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*, delivery_window:delivery_windows(*)')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const cutoffMin = batch.delivery_window?.cutoff_time
      ? timeStringToMinutes(batch.delivery_window.cutoff_time)
      : null;
    if (!isPastCutoff(batch.status, cutoffMin, getNowMinutesLagos())) {
      return NextResponse.json(
        { error: 'Manifest available after order cutoff' },
        { status: 403 }
      );
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_phone,
        customer_phone_alt,
        customer_latitude,
        customer_longitude,
        delivery_address,
        delivery_city,
        delivery_instructions,
        total,
        payment_status,
        payment_method_type,
        created_at,
        order_items (
          item_name,
          quantity
        )
      `)
      .eq('batch_id', batchId)
      .eq('order_type', 'delivery')
      .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed'])
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('rider print-manifest fetch orders error:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'No delivery orders in this batch' }, { status: 400 });
    }

    let optimizedDistanceM: number | undefined;
    let sortedOrders = orders;

    const stops: RouteStop[] = orders
      .filter(o => o.customer_latitude != null && o.customer_longitude != null)
      .map(o => ({
        id: o.id,
        lat: o.customer_latitude as number,
        lng: o.customer_longitude as number,
      }));

    if (stops.length > 0) {
      try {
        const optimized = await optimizeRoute(stops, RESTAURANT_LOCATION);
        if (optimized.orderedIds.length > 0) {
          const orderMap = new Map(orders.map(o => [o.id, o]));
          const head = optimized.orderedIds
            .map(id => orderMap.get(id))
            .filter(Boolean) as typeof orders;
          const head_set = new Set(optimized.orderedIds);
          const tail = orders.filter(o => !head_set.has(o.id));
          sortedOrders = [...head, ...tail];
          optimizedDistanceM = optimized.totalDistanceM;
        }
      } catch (optimizeErr) {
        console.error('rider print-manifest optimize fallback:', optimizeErr);
      }
    }

    const deliveryWindowStr = batch.delivery_window
      ? formatDeliveryWindow(batch.delivery_window.delivery_start, batch.delivery_window.delivery_end)
      : '';

    const manifestText = formatDeliveryManifest({
      batchDate: batch.delivery_date,
      windowName: batch.delivery_window?.name || 'Unknown',
      deliveryWindow: deliveryWindowStr,
      driverName: auth.driver_name || undefined,
      orders: sortedOrders.map(o => ({
        order_number: o.order_number,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        customer_phone_alt: o.customer_phone_alt,
        delivery_address: o.delivery_address,
        delivery_city: o.delivery_city,
        delivery_instructions: o.delivery_instructions,
        total: o.total,
        payment_method_type: o.payment_method_type,
        payment_status: o.payment_status,
        order_items: o.order_items || [],
      })),
      totalDistance: optimizedDistanceM,
    });

    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'printer_ip')
      .single();

    const printerHost = settings?.value || process.env.PRINTER_IP_ADDRESS || '192.168.88.5';
    const printerPort = parseInt(process.env.PRINTER_PORT || '9100');

    const escposBuffer = generateManifestESCPOS(manifestText);

    const printResult = await printToNetwork(
      escposBuffer,
      { host: printerHost, port: printerPort, timeout: 10000 }
    );

    if (!printResult.success) {
      console.error('rider manifest print failed:', printResult.error);
      return NextResponse.json({
        error: 'Print failed: ' + printResult.message,
        manifestText,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Manifest printed: ${sortedOrders.length} stops`,
      manifestText,
    });
  } catch (error) {
    console.error('rider print-manifest unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
