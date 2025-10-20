// Manually trigger order reprint
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Add to print queue
    const { error: printError } = await supabase
      .from('print_queue')
      .insert({
        order_id: id,
        type: 'reprint',
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
