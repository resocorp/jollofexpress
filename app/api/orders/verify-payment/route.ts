// Verify Paystack payment and update order status
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { formatReceipt } from '@/lib/print/format-receipt';

export async function POST(request: NextRequest) {
  try {
    const { order_id, reference } = await request.json();

    if (!order_id || !reference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500 }
      );
    }

    // Verify payment with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!verifyResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to verify payment' },
        { status: 500 }
      );
    }

    const verifyData = await verifyResponse.json();

    if (!verifyData.status) {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    const { data: paymentData } = verifyData;

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      // Update order as failed
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          payment_reference: reference,
        })
        .eq('id', order_id);

      return NextResponse.json(
        { error: 'Payment was not successful', payment_status: paymentData.status },
        { status: 400 }
      );
    }

    // Payment successful - update order
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'success',
        payment_reference: reference,
      })
      .eq('id', order_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    // Fetch complete order with items
    const { data: completeOrder } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', order_id)
      .single();

    // Format receipt data
    if (completeOrder) {
      const receiptData = formatReceipt(completeOrder);

      // Add to print queue with formatted data
      await supabase.from('print_queue').insert({
        order_id: order_id,
        print_data: receiptData,
        status: 'pending',
      });
    }

    // TODO: Send confirmation SMS/Email
    // This would integrate with Termii/Africa's Talking for SMS
    // and Resend/SendGrid for email

    return NextResponse.json({
      success: true,
      order: completeOrder || order,
      message: 'Payment verified successfully',
    });

  } catch (error) {
    console.error('Unexpected error in payment verification:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
