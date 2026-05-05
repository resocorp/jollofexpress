import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { formatDeliveryManifest } from '@/lib/print/format-manifest';
import { generateManifestESCPOS } from '@/lib/print/escpos-manifest';
import { printToNetwork } from '@/lib/print/network-printer';
import { formatDeliveryWindow } from '@/lib/batch/batch-service';

export const dynamic = 'force-dynamic';

// POST - Generate and print delivery manifest for a batch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id: batchId } = await params;
    const body = await request.json();
    const optimizedOrderIds: string[] | null = body.optimizedOrderIds || null;

    const supabase = createServiceClient();

    // Fetch batch with window
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*, delivery_window:delivery_windows(*)')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Fetch delivery orders for this batch
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_phone,
        customer_phone_alt,
        delivery_address,
        delivery_city,
        delivery_instructions,
        total,
        payment_status,
        payment_method_type,
        assigned_driver_id,
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
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'No delivery orders in this batch' }, { status: 400 });
    }

    // Get driver name if assigned
    let driverName: string | undefined;
    const driverIds = [...new Set(orders.filter(o => o.assigned_driver_id).map(o => o.assigned_driver_id))];
    if (driverIds.length > 0) {
      const { data: driver } = await supabase
        .from('drivers')
        .select('name')
        .eq('id', driverIds[0]!)
        .single();
      if (driver) driverName = driver.name;
    }

    // Sort orders by optimized route if provided
    let sortedOrders = orders;
    if (optimizedOrderIds && optimizedOrderIds.length > 0) {
      const orderMap = new Map(orders.map(o => [o.id, o]));
      const optimized = optimizedOrderIds
        .map(id => orderMap.get(id))
        .filter(Boolean) as typeof orders;
      // Append any orders not in the optimized list
      const optimizedSet = new Set(optimizedOrderIds);
      const remaining = orders.filter(o => !optimizedSet.has(o.id));
      sortedOrders = [...optimized, ...remaining];
    }

    // Build delivery window display string
    const deliveryWindowStr = batch.delivery_window
      ? formatDeliveryWindow(batch.delivery_window.delivery_start, batch.delivery_window.delivery_end)
      : '';

    // Format manifest
    const manifestText = formatDeliveryManifest({
      batchDate: batch.delivery_date,
      windowName: batch.delivery_window?.name || 'Unknown',
      deliveryWindow: deliveryWindowStr,
      driverName,
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
    });

    // Get printer config from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'printer_ip')
      .single();

    const printerHost = settings?.value || process.env.PRINTER_IP_ADDRESS || '192.168.88.5';
    const printerPort = parseInt(process.env.PRINTER_PORT || '9100');

    // Generate ESC/POS and print
    const escposBuffer = generateManifestESCPOS(manifestText);

    const printResult = await printToNetwork(
      escposBuffer,
      { host: printerHost, port: printerPort, timeout: 10000 }
    );

    if (!printResult.success) {
      console.error('Manifest print failed:', printResult.error);
      return NextResponse.json({
        error: 'Print failed: ' + printResult.message,
        manifestText, // Return text so it can be displayed/copied
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Manifest printed: ${sortedOrders.length} stops`,
      manifestText,
    });
  } catch (error) {
    console.error('Error printing manifest:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
