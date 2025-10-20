// Admin endpoints for individual order operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const orderUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']).optional(),
  payment_status: z.enum(['pending', 'success', 'failed', 'refunded']).optional(),
  delivery_address: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_phone_alt: z.string().optional(),
  delivery_instructions: z.string().optional(),
  admin_notes: z.string().optional(),
});

// PATCH - Update order (admin override)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate
    const validation = orderUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update order
    const updateData: any = { ...validation.data };

    // If marking as completed, set completed_at
    if (validation.data.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

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
      console.error('Error updating order:', error);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Order updated successfully',
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
