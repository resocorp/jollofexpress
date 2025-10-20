// Update order status from Kitchen Display System
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const statusSchema = z.object({
  status: z.enum(['confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate status
    const validation = statusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid status', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { status } = validation.data;
    const supabase = await createClient();

    // Prepare update data
    const updateData: any = { status };

    // If marking as completed, set completed_at timestamp
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Update the order
    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        items:order_items(*)
      `)
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // TODO: Send notification to customer
    // SMS/Push notification that order status changed

    return NextResponse.json({
      success: true,
      order,
    });

  } catch (error) {
    console.error('Unexpected error updating order status:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
