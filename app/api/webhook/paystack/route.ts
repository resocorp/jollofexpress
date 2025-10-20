// Paystack webhook handler for payment events
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;

  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('No signature provided');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      console.error('Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the event
    const event = JSON.parse(body);
    const { event: eventType, data } = event;

    const supabase = await createClient();

    // Handle different event types
    switch (eventType) {
      case 'charge.success': {
        // Payment was successful
        const { reference, metadata } = data;
        const orderId = metadata?.order_id;

        if (!orderId) {
          console.error('No order_id in metadata');
          return NextResponse.json({ received: true });
        }

        // Check if already processed (idempotency)
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('payment_status')
          .eq('id', orderId)
          .single();

        if (existingOrder?.payment_status === 'success') {
          // Already processed
          return NextResponse.json({ received: true, message: 'Already processed' });
        }

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'success',
            payment_reference: reference,
            payment_data: data,
          })
          .eq('id', orderId);

        // Add to print queue
        await supabase.from('print_queue').insert({
          order_id: orderId,
          type: 'new_order',
          status: 'pending',
        });

        // TODO: Send confirmation SMS/Email
        console.log(`Payment successful for order ${orderId}`);
        break;
      }

      case 'charge.failed': {
        // Payment failed
        const { reference, metadata } = data;
        const orderId = metadata?.order_id;

        if (orderId) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              payment_reference: reference,
              payment_data: data,
            })
            .eq('id', orderId);

          console.log(`Payment failed for order ${orderId}`);
        }
        break;
      }

      default:
        // Log other events but don't process them
        console.log(`Unhandled event type: ${eventType}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to prevent Paystack from retrying
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}
