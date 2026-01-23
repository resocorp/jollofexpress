// Paystack webhook handler for payment events
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { formatReceipt } from '@/lib/print/format-receipt';
import { triggerImmediatePrint } from '@/lib/print/print-processor';
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

// Process customer attribution and commission for ALL orders from attributed customers
// This ensures influencers get commission on ALL orders from customers they referred,
// not just the first order where the promo code was used
async function processCustomerAttribution(
  supabase: ReturnType<typeof createServiceClient>,
  order: {
    id: string;
    promo_code?: string;
    customer_phone: string;
    customer_name: string;
    customer_email?: string;
    total: number;
    discount: number;
  }
) {
  console.log('[ATTRIBUTION] Processing customer attribution for order:', {
    order_id: order.id,
    customer_phone: order.customer_phone,
    promo_code: order.promo_code,
    total: order.total,
  });

  try {
    // Check if we already tracked this order (idempotency)
    const { data: existingUsage } = await supabase
      .from('promo_code_usage')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    if (existingUsage) {
      console.log(`[ATTRIBUTION] Order ${order.id} already tracked, skipping`);
      return;
    }

    // Check if this is their first order ever
    const { count: previousOrderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_phone', order.customer_phone)
      .eq('payment_status', 'success')
      .neq('id', order.id);

    const isFirstOrder = (previousOrderCount || 0) === 0;

    // Check if customer has an existing attribution to an influencer
    const { data: existingAttribution } = await supabase
      .from('customer_attributions')
      .select('id, influencer_id, total_orders, total_spent')
      .eq('customer_phone', order.customer_phone)
      .maybeSingle();

    let influencerId: string | null = null;
    let promoCodeId: string | null = null;
    let isNewCustomer = false;
    let commissionAmount = 0;

    // If order has a promo code, process it
    if (order.promo_code) {
      const { data: promoCode, error: promoLookupError } = await supabase
        .from('promo_codes')
        .select('id, influencer_id, used_count')
        .eq('code', order.promo_code.toUpperCase())
        .single();

      if (promoCode) {
        promoCodeId = promoCode.id;
        
        // Increment promo code used_count
        await supabase
          .from('promo_codes')
          .update({ used_count: (promoCode.used_count || 0) + 1 })
          .eq('id', promoCode.id);
        
        console.log(`[ATTRIBUTION] Incremented used_count for promo ${order.promo_code}`);

        // If this promo belongs to an influencer and customer has no attribution yet,
        // create the permanent binding
        if (promoCode.influencer_id && !existingAttribution) {
          isNewCustomer = true;
          influencerId = promoCode.influencer_id;

          await supabase.from('customer_attributions').insert({
            customer_phone: order.customer_phone,
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            influencer_id: promoCode.influencer_id,
            promo_code_id: promoCode.id,
            first_promo_code: order.promo_code,
            first_order_id: order.id,
            first_order_date: new Date().toISOString(),
            first_order_total: order.total,
            total_orders: 1,
            total_spent: order.total,
            last_order_date: new Date().toISOString(),
          });

          console.log(`[ATTRIBUTION] Created new attribution: customer ${order.customer_phone} -> influencer ${promoCode.influencer_id}`);
        }
      } else {
        console.log(`[ATTRIBUTION] Promo code ${order.promo_code} not found in database`);
      }
    }

    // If customer already has an attribution (from a previous order), use that influencer
    if (existingAttribution) {
      influencerId = existingAttribution.influencer_id;
      
      // Update the attribution stats for this returning customer
      await supabase
        .from('customer_attributions')
        .update({
          total_orders: existingAttribution.total_orders + 1,
          total_spent: existingAttribution.total_spent + order.total,
          last_order_date: new Date().toISOString(),
        })
        .eq('id', existingAttribution.id);

      console.log(`[ATTRIBUTION] Updated attribution stats for returning customer ${order.customer_phone}`);
    }

    // Calculate commission if customer is attributed to an influencer
    if (influencerId) {
      const { data: influencer } = await supabase
        .from('influencers')
        .select('commission_type, commission_value, is_active')
        .eq('id', influencerId)
        .single();

      if (influencer && influencer.is_active) {
        if (influencer.commission_type === 'percentage') {
          commissionAmount = Math.round((order.total * influencer.commission_value) / 100 * 100) / 100;
        } else {
          commissionAmount = influencer.commission_value;
        }
        console.log(`[ATTRIBUTION] Calculated commission: ${commissionAmount} for influencer ${influencerId}`);
      }
    }

    // Log the usage record (tracks both promo usage and attributed commission)
    const { error: usageInsertError } = await supabase.from('promo_code_usage').insert({
      promo_code_id: promoCodeId, // Will be null if no promo was used
      order_id: order.id,
      influencer_id: influencerId, // From promo OR from existing attribution
      customer_phone: order.customer_phone,
      customer_name: order.customer_name,
      order_total: order.total,
      discount_applied: order.discount,
      commission_amount: commissionAmount,
      is_first_order: isFirstOrder,
      is_new_customer: isNewCustomer,
    });

    if (usageInsertError) {
      console.error('[ATTRIBUTION] Error inserting usage record:', usageInsertError);
    } else {
      console.log(`[ATTRIBUTION] Successfully logged: order=${order.id}, influencer=${influencerId || 'none'}, commission=${commissionAmount}, promo=${order.promo_code || 'none'}`);
    }
  } catch (error) {
    console.error('[ATTRIBUTION] Unexpected error:', error);
    // Don't fail the webhook for tracking errors
  }
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

    const supabase = createServiceClient();

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

        // Fetch order with items (needed for both idempotency check and processing)
        const { data: existingOrder, error: orderFetchError } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .eq('id', orderId)
          .single();

        if (orderFetchError || !existingOrder) {
          console.error('[WEBHOOK] Failed to fetch order:', orderId, orderFetchError);
          return NextResponse.json({ received: true, error: 'Order not found' });
        }

        const alreadyPaid = existingOrder.payment_status === 'success';

        // Update order status if not already paid
        if (!alreadyPaid) {
          await supabase
            .from('orders')
            .update({
              status: 'confirmed',
              payment_status: 'success',
              payment_reference: reference,
            })
            .eq('id', orderId);
          console.log('[WEBHOOK] Updated order status to confirmed:', orderId);
        }

        console.log('[WEBHOOK] Processing order:', {
          orderId,
          promo_code: existingOrder.promo_code,
          discount: existingOrder.discount,
          alreadyPaid,
        });

        // ALWAYS process customer attribution (has its own idempotency check)
        // This ensures:
        // 1. Promo code usage is tracked
        // 2. Customer attribution is created/updated
        // 3. Commission is calculated for ALL orders from attributed customers
        await processCustomerAttribution(supabase, {
          id: existingOrder.id,
          promo_code: existingOrder.promo_code,
          customer_phone: existingOrder.customer_phone,
          customer_name: existingOrder.customer_name,
          customer_email: existingOrder.customer_email,
          total: existingOrder.total,
          discount: existingOrder.discount,
        });

        // If already fully processed, skip the rest (print queue, notifications)
        if (alreadyPaid) {
          console.log('[WEBHOOK] Order already paid, promo tracked, skipping rest:', orderId);
          return NextResponse.json({ received: true, message: 'Already processed, promo re-checked' });
        }

        const completeOrder = existingOrder;

        // Format and add to print queue (with idempotency check)
        if (completeOrder) {
          // Check if print job already exists for this order
          const { data: existingPrintJob } = await supabase
            .from('print_queue')
            .select('id')
            .eq('order_id', orderId)
            .maybeSingle();

          if (!existingPrintJob) {
            const receiptData = formatReceipt(completeOrder);
            
            await supabase.from('print_queue').insert({
              order_id: orderId,
              print_data: receiptData,
              status: 'pending',
            });
            console.log(`Added order ${orderId} to print queue`);

            // Trigger immediate printing (non-blocking, fire-and-forget)
            // If this fails, the job stays in queue for the print-worker to retry
            triggerImmediatePrint(orderId).then((result) => {
              if (result.success) {
                console.log(`[WEBHOOK] Immediate print succeeded for order ${orderId}`);
              } else {
                console.log(`[WEBHOOK] Immediate print deferred for order ${orderId}: ${result.message}`);
              }
            }).catch((err) => {
              console.error(`[WEBHOOK] Immediate print error for order ${orderId}:`, err);
            });
          } else {
            console.log(`Print job already exists for order ${orderId}, skipping`);
          }
        }

        // DISABLED: WhatsApp ordering system
        // Send WhatsApp confirmation for WhatsApp orders
        // if (completeOrder?.order_source === 'whatsapp') {
        //   try {
        //     const { handlePaymentConfirmation } = await import('@/lib/whatsapp');
        //     await handlePaymentConfirmation(orderId, true);
        //     console.log(`WhatsApp confirmation sent for order ${orderId}`);
        //   } catch (whatsappError) {
        //     console.error('Failed to send WhatsApp confirmation:', whatsappError);
        //   }
        // }

        // Send new order alert to admins
        if (completeOrder) {
          try {
            const { sendNewOrderAlert } = await import('@/lib/notifications/notification-service');
            await sendNewOrderAlert(completeOrder);
            console.log(`New order alert sent for order ${orderId}`);
          } catch (alertError) {
            console.error('Failed to send new order alert:', alertError);
          }
        }

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
