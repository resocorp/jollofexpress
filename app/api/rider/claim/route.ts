import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyRiderAuth } from '@/lib/auth/rider-auth';
import { z } from 'zod';

const claimSchema = z.object({
  order_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await verifyRiderAuth(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const validation = claimSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { order_id } = validation.data;
    const supabase = createServiceClient();

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, assigned_driver_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'out_for_delivery') {
      return NextResponse.json({ error: 'Order is not out for delivery' }, { status: 400 });
    }

    if (order.assigned_driver_id) {
      return NextResponse.json({ error: 'Order already claimed by another rider' }, { status: 409 });
    }

    // Create delivery assignment
    const { data: assignment, error: assignError } = await supabase
      .from('delivery_assignments')
      .insert({
        order_id,
        driver_id: auth.driver_id,
        status: 'pending',
      })
      .select()
      .single();

    if (assignError) {
      console.error('Failed to create assignment:', assignError);
      return NextResponse.json({ error: 'Failed to claim order' }, { status: 500 });
    }

    // Assign driver to order
    await supabase
      .from('orders')
      .update({ assigned_driver_id: auth.driver_id })
      .eq('id', order_id);

    // Mark driver as busy
    await supabase
      .from('drivers')
      .update({ status: 'busy' })
      .eq('id', auth.driver_id);

    return NextResponse.json({
      success: true,
      assignment_id: assignment.id,
      order_number: order.order_number,
    });
  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to claim order' },
      { status: 500 }
    );
  }
}
