// Complete delivery assignment
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const completeSchema = z.object({
  driver_id: z.string().uuid(),
  cod_amount: z.number().min(0).optional(),
});

// POST /api/delivery/assignments/[id]/complete - Mark delivery as completed
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { driver_id, cod_amount } = completeSchema.parse(body);
    
    const supabase = createServiceClient();

    // Get assignment with order details
    const { data: assignment, error: fetchError } = await supabase
      .from('delivery_assignments')
      .select('*, orders(id, order_number, total, payment_method_type)')
      .eq('id', id)
      .eq('driver_id', driver_id)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Update assignment to delivered
    const { error: updateError } = await supabase
      .from('delivery_assignments')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    const order = assignment.orders as any;

    // Update order status to completed
    await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        delivery_completion_time: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Update driver status back to available and increment deliveries
    await supabase
      .from('drivers')
      .update({ 
        status: 'available',
        total_deliveries: supabase.rpc('increment', { x: 1 }),
      })
      .eq('id', driver_id);

    // Record COD collection if applicable
    if (cod_amount && cod_amount > 0) {
      await supabase
        .from('cod_collections')
        .insert({
          order_id: order.id,
          driver_id,
          amount: cod_amount,
          status: 'collected',
          collected_at: new Date().toISOString(),
        });

      // Update driver COD balance
      await supabase.rpc('increment_driver_cod_balance', {
        p_driver_id: driver_id,
        p_amount: cod_amount,
      });

      // Mark order cash as collected
      await supabase
        .from('orders')
        .update({
          cash_collected: true,
          payment_status: 'success',
        })
        .eq('id', order.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery completed successfully',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Completion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete delivery' },
      { status: 500 }
    );
  }
}
