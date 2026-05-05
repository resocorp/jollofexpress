// Verify Paystack payment and update order status
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { formatReceipt } from '@/lib/print/format-receipt';
import { triggerImmediatePrint } from '@/lib/print/print-processor';
import { logPrintAudit } from '@/lib/print/audit-log';

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

    // Idempotent insert into print queue. The partial unique index
    // uq_print_queue_one_pending_per_order serialises with the webhook
    // path: whichever request arrives first inserts, the other receives
    // a 23505 unique violation and silently moves on.
    if (completeOrder) {
      const receiptData = formatReceipt(completeOrder);
      const { error: insertError } = await supabase
        .from('print_queue')
        .insert({
          order_id: order_id,
          print_data: receiptData,
          status: 'pending',
        });

      if (insertError) {
        if ((insertError as { code?: string }).code === '23505') {
          console.log(`[VERIFY-PAYMENT] Print job already queued for order ${order_id} (race lost)`);
          await logPrintAudit({
            event: 'duplicate_blocked',
            source: 'verify_payment',
            orderId: order_id,
            details: { reason: 'unique_violation' },
          }, supabase);
        } else {
          console.error(`[VERIFY-PAYMENT] Failed to queue print for order ${order_id}:`, insertError);
        }
      } else {
        console.log(`Added order ${order_id} to print queue`);
        await logPrintAudit({
          event: 'queued',
          source: 'verify_payment',
          orderId: order_id,
        }, supabase);

        // Trigger immediate printing (non-blocking, fire-and-forget). The
        // worker poll and triggerImmediatePrint share an atomic claim, so
        // the same row can't be picked up twice.
        triggerImmediatePrint(order_id).then((result) => {
          if (result.success) {
            console.log(`[VERIFY-PAYMENT] Immediate print succeeded for order ${order_id}`);
          } else {
            console.log(`[VERIFY-PAYMENT] Immediate print deferred for order ${order_id}: ${result.message}`);
          }
        }).catch((err) => {
          console.error(`[VERIFY-PAYMENT] Immediate print error for order ${order_id}:`, err);
        });
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
