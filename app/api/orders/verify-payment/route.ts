// Verify Paystack payment and update order status
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { formatReceipt } from '@/lib/print/format-receipt';
import { triggerImmediatePrint } from '@/lib/print/print-processor';

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

    // Check if order has already been verified to prevent duplicate processing
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('payment_status, payment_reference, status')
      .eq('id', order_id)
      .single();

    if (existingOrder?.payment_status === 'success' && existingOrder?.payment_reference === reference) {
      // Payment already verified - fetch and return complete order without updating
      const { data: completeOrder } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', order_id)
        .single();

      return NextResponse.json({
        success: true,
        order: completeOrder,
        message: 'Payment already verified',
        already_verified: true,
      });
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

    // Format receipt data and add to print queue (with idempotency check)
    if (completeOrder) {
      // Check if print job already exists for this order
      const { data: existingPrintJob } = await supabase
        .from('print_queue')
        .select('id')
        .eq('order_id', order_id)
        .maybeSingle();

      if (!existingPrintJob) {
        const receiptData = formatReceipt(completeOrder);

        // Add to print queue with formatted data
        await supabase.from('print_queue').insert({
          order_id: order_id,
          print_data: receiptData,
          status: 'pending',
        });
        console.log(`Added order ${order_id} to print queue`);

        // Trigger immediate printing (non-blocking, fire-and-forget)
        // If this fails, the job stays in queue for the print-worker to retry
        triggerImmediatePrint(order_id).then((result) => {
          if (result.success) {
            console.log(`[VERIFY-PAYMENT] Immediate print succeeded for order ${order_id}`);
          } else {
            console.log(`[VERIFY-PAYMENT] Immediate print deferred for order ${order_id}: ${result.message}`);
          }
        }).catch((err) => {
          console.error(`[VERIFY-PAYMENT] Immediate print error for order ${order_id}:`, err);
        });
      } else {
        console.log(`Print job already exists for order ${order_id}, skipping`);
      }
    }

    // Send WhatsApp confirmation notification
    if (completeOrder) {
      try {
        const { sendOrderConfirmation } = await import('@/lib/notifications/notification-service');
        await sendOrderConfirmation(completeOrder);
      } catch (notifError) {
        // Don't fail order if notification fails, just log it
        console.error('Failed to send order confirmation notification:', notifError);
      }
    }

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
