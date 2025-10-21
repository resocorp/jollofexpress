// Update order status from Kitchen Display System
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { checkAndManageCapacity } from '@/lib/kitchen-capacity';
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
        { error: 'Invalid status', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { status } = validation.data;
    const supabase = createServiceClient();

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

    // Check kitchen capacity and auto-reopen if needed
    // When orders move to completed/cancelled/out_for_delivery, capacity frees up
    if (status === 'completed' || status === 'cancelled' || status === 'out_for_delivery') {
      const capacityCheck = await checkAndManageCapacity();
      if (capacityCheck.action === 'opened') {
        console.log(`✅ Restaurant auto-reopened: ${capacityCheck.activeOrders}/${capacityCheck.threshold} active orders`);
      }
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
