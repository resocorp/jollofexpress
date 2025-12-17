// Admin endpoint to process refunds
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';
import { z } from 'zod';

const refundSchema = z.object({
  reason: z.string().min(10).max(500),
  amount: z.number().positive().optional(), // Optional: defaults to full amount
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin-only access (refunds are sensitive)
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Validate
    const validation = refundSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { reason, amount } = validation.data;
    const supabase = createServiceClient();
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify order can be refunded
    if (order.payment_status !== 'success') {
      return NextResponse.json(
        { error: 'Order payment was not successful, cannot refund' },
        { status: 400 }
      );
    }

    if (order.payment_status === 'refunded') {
      return NextResponse.json(
        { error: 'Order has already been refunded' },
        { status: 400 }
      );
    }

    if (!order.payment_reference) {
      return NextResponse.json(
        { error: 'No payment reference found for this order' },
        { status: 400 }
      );
    }

    // Calculate refund amount (in kobo)
    const refundAmount = (amount || order.total) * 100;

    // Process refund with Paystack
    const refundResponse = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: order.payment_reference,
        amount: refundAmount,
        currency: 'NGN',
        customer_note: reason,
        merchant_note: `Refund for order ${order.order_number}`,
      }),
    });

    if (!refundResponse.ok) {
      const errorData = await refundResponse.json();
      console.error('Paystack refund error:', errorData);
      return NextResponse.json(
        { error: errorData.message || 'Failed to process refund with payment provider' },
        { status: 500 }
      );
    }

    const refundData = await refundResponse.json();

    // Update order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'refunded',
        status: 'cancelled',
        refund_data: refundData.data,
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order after refund:', updateError);
      // Refund was processed but couldn't update DB - log this
      return NextResponse.json(
        { 
          success: true,
          warning: 'Refund processed but database update failed',
          refund: refundData.data,
        },
        { status: 200 }
      );
    }

    // TODO: Send refund notification to customer

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      refund: refundData.data,
      message: 'Refund processed successfully',
    });

  } catch (error) {
    console.error('Unexpected error processing refund:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
