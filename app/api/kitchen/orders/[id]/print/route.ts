// Manually trigger order reprint
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { formatReceipt } from '@/lib/print/format-receipt';
import { triggerImmediatePrint } from '@/lib/print/print-processor';
import { logPrintAudit } from '@/lib/print/audit-log';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[REPRINT] Starting reprint for order ID:', id);
    const supabase = createServiceClient();

    // Determine if id is UUID or order_number
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const queryField = isUUID ? 'id' : 'order_number';
    console.log(`[REPRINT] Querying by ${queryField}:`, id);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq(queryField, id)
      .single();

    if (orderError || !order) {
      console.error('[REPRINT] Order not found:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('[REPRINT] Order found:', order.order_number);

    const receiptData = formatReceipt(order);

    const { data: insertedJob, error: printError } = await supabase
      .from('print_queue')
      .insert({
        order_id: order.id,
        print_data: receiptData,
        status: 'pending',
      })
      .select()
      .single();

    if (printError) {
      // Partial unique index: a pending row for this order already exists
      // (e.g. the original print hasn't gone out yet). Treat as success —
      // the existing row will be printed shortly.
      if ((printError as { code?: string }).code === '23505') {
        console.log('[REPRINT] Pending job already exists for order:', order.id);
        await logPrintAudit({
          event: 'duplicate_blocked',
          source: 'kitchen_reprint',
          orderId: order.id,
          details: { reason: 'pending_already_exists' },
        }, supabase);
        return NextResponse.json({
          success: true,
          message: `A pending print job already exists for order ${order.order_number}`,
        });
      }
      console.error('[REPRINT] Error adding to print queue:', printError);
      return NextResponse.json(
        { error: 'Failed to queue print job', details: printError.message },
        { status: 500 }
      );
    }

    console.log('[REPRINT] Print job queued successfully:', insertedJob.id);
    await logPrintAudit({
      event: 'queued',
      source: 'kitchen_reprint',
      orderId: order.id,
      printJobId: insertedJob.id,
    }, supabase);

    // Fire an immediate print so the staff member sees paper come out fast.
    // Race-safe via the same atomic claim the worker poll uses.
    triggerImmediatePrint(order.id).catch((err) => {
      console.error('[REPRINT] Immediate print error:', err);
    });

    return NextResponse.json({
      success: true,
      message: `Print job queued for order ${order.order_number}`,
      jobId: insertedJob.id,
    });

  } catch (error) {
    console.error('Unexpected error in reprint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
