import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyRiderAuth } from '@/lib/auth/rider-auth';

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyRiderAuth(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { assignmentId } = await params;
    const supabase = createServiceClient();

    // Fetch assignment — verify it belongs to this driver
    const { data: assignment, error: fetchError } = await supabase
      .from('delivery_assignments')
      .select('*, orders(id, order_number, total, payment_method_type)')
      .eq('id', assignmentId)
      .eq('driver_id', auth.driver_id)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const order = assignment.orders as any;
    const now = new Date().toISOString();

    // Mark assignment as delivered
    const { error: updateError } = await supabase
      .from('delivery_assignments')
      .update({ status: 'delivered', delivered_at: now })
      .eq('id', assignmentId);

    if (updateError) throw updateError;

    // Mark order as completed
    await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: now,
        delivery_completion_time: now,
      })
      .eq('id', order.id);

    // Update driver: available + increment deliveries
    await supabase
      .from('drivers')
      .update({ status: 'available' })
      .eq('id', auth.driver_id);

    // Increment total_deliveries via RPC
    const { error: rpcError } = await supabase.rpc('increment_driver_deliveries', { p_driver_id: auth.driver_id });
    if (rpcError) {
      // Fallback: direct update if RPC doesn't exist
      await supabase
        .from('drivers')
        .update({ total_deliveries: (assignment as any).total_deliveries + 1 })
        .eq('id', auth.driver_id);
    }

    // Handle COD payment
    if (order.payment_method_type === 'cod') {
      const codAmount = order.total;

      await supabase
        .from('cod_collections')
        .insert({
          order_id: order.id,
          driver_id: auth.driver_id,
          amount: codAmount,
          status: 'collected',
          collected_at: now,
        });

      const { error: codRpcError } = await supabase.rpc('increment_driver_cod_balance', {
        p_driver_id: auth.driver_id,
        p_amount: codAmount,
      });
      if (codRpcError) {
        console.warn('increment_driver_cod_balance RPC failed:', codRpcError.message);
      }

      await supabase
        .from('orders')
        .update({ cash_collected: true, payment_status: 'success' })
        .eq('id', order.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery completed',
      order_number: order.order_number,
    });
  } catch (error: any) {
    console.error('Deliver error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete delivery' },
      { status: 500 }
    );
  }
}
