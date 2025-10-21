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
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Format receipt data
    const receiptData = formatReceipt(order);

    // Add to print queue with formatted data
    const { error: printError } = await supabase
      .from('print_queue')
      .insert({
        order_id: id,
        print_data: receiptData,
        status: 'pending',
      });

    if (printError) {
      console.error('Error adding to print queue:', printError);
      return NextResponse.json(
        { error: 'Failed to queue print job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Print job queued for order ${order.order_number}`,
    });

  } catch (error) {
    console.error('Unexpected error in reprint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
