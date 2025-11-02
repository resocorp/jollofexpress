// Manually trigger order reprint
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { formatReceipt } from '@/lib/print/format-receipt';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[REPRINT] Starting reprint for order ID:', id);
    const supabase = createServiceClient();

    // Fetch full order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', id)
      .single();

    if (orderError || !order) {
      console.error('[REPRINT] Order not found:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('[REPRINT] Order found:', order.order_number);

    // Format receipt data
    const receiptData = formatReceipt(order);
    console.log('[REPRINT] Receipt data formatted');

    // Add to print queue with formatted data
    const { data: insertedJob, error: printError } = await supabase
      .from('print_queue')
      .insert({
        order_id: id,
        print_data: receiptData,
        status: 'pending',
      })
      .select()
      .single();

    if (printError) {
      console.error('[REPRINT] Error adding to print queue:', printError);
      return NextResponse.json(
        { error: 'Failed to queue print job', details: printError.message },
        { status: 500 }
      );
    }

    console.log('[REPRINT] Print job queued successfully:', insertedJob.id);

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
