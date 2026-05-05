import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyRiderAuth } from '@/lib/auth/rider-auth';
import { verifyOrderToken } from '@/lib/qr/sign';
import { z } from 'zod';

const scanSchema = z.object({
  qr_token: z.string().min(10).max(200),
  confirm_override: z.boolean().optional(),
});

export const dynamic = 'force-dynamic';

// POST /api/rider/scan — rider scans a receipt QR to claim + dispatch the order.
// Force-advances status to out_for_delivery, sets assigned_driver_id to scanning
// rider, upserts delivery_assignment to picked_up, and fires the existing
// "out for delivery" customer notification.
//
// Takeover protection: if the order is already assigned to a DIFFERENT rider,
// the request returns 409 with `requires_confirmation` and the rider must
// re-submit with `confirm_override: true` to take it over.
//
// Every scan that results in a state change (or a same-rider re-scan) is
// recorded to scan_events for audit.
export async function POST(request: NextRequest) {
  const auth = await verifyRiderAuth(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { qr_token, confirm_override } = parsed.data;

    // Verify HMAC signature first — rejects forged / random codes cheaply.
    const orderIdFromSig = verifyOrderToken(qr_token);
    if (!orderIdFromSig) {
      return NextResponse.json({ error: 'Invalid or unrecognised QR code' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Look up the order by the stored token AND the signed id (defense in depth).
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'id, order_number, status, assigned_driver_id, customer_name, customer_phone, delivery_address, order_type, qr_token'
      )
      .eq('id', orderIdFromSig)
      .eq('qr_token', qr_token)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'cancelled' || order.status === 'completed') {
      return NextResponse.json(
        { error: `Order is ${order.status} and cannot be dispatched` },
        { status: 409 }
      );
    }

    const previousDriverId = order.assigned_driver_id ?? null;
    const previousStatus = order.status as string;
    const isTakeover = !!previousDriverId && previousDriverId !== auth.driver_id;

    // Idempotent: if already dispatched to this rider, return success without
    // touching anything or re-firing the notification — but still log the scan.
    if (
      order.status === 'out_for_delivery' &&
      order.assigned_driver_id === auth.driver_id
    ) {
      logScanEvent(supabase, {
        order_id: order.id,
        driver_id: auth.driver_id,
        was_override: false,
        previous_driver_id: previousDriverId,
        previous_status: previousStatus,
      });
      return NextResponse.json({
        success: true,
        already_dispatched: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          delivery_address: order.delivery_address,
        },
      });
    }

    // Takeover guard: another rider already owns this order. Require explicit
    // confirmation from the scanning rider before stealing it.
    if (isTakeover && !confirm_override) {
      const { data: prevDriver } = await supabase
        .from('drivers')
        .select('id, name')
        .eq('id', previousDriverId!)
        .maybeSingle();

      return NextResponse.json(
        {
          requires_confirmation: true,
          previous_driver: prevDriver ?? { id: previousDriverId, name: 'Another rider' },
          order: {
            id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name,
          },
        },
        { status: 409 }
      );
    }

    // Scan-claims: take over the order regardless of prior assignment.
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'out_for_delivery',
        assigned_driver_id: auth.driver_id,
        delivery_start_time: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Scan: failed to update order', updateError);
      return NextResponse.json({ error: 'Failed to dispatch order' }, { status: 500 });
    }

    // Upsert delivery_assignment: create if none, else transfer to scanning rider.
    const { data: existingAssignment } = await supabase
      .from('delivery_assignments')
      .select('id, driver_id, status')
      .eq('order_id', order.id)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existingAssignment) {
      await supabase
        .from('delivery_assignments')
        .update({
          driver_id: auth.driver_id,
          status: 'picked_up',
          picked_up_at: new Date().toISOString(),
        })
        .eq('id', existingAssignment.id);
    } else {
      await supabase.from('delivery_assignments').insert({
        order_id: order.id,
        driver_id: auth.driver_id,
        status: 'picked_up',
        picked_up_at: new Date().toISOString(),
      });
    }

    // Mark driver busy
    await supabase.from('drivers').update({ status: 'busy' }).eq('id', auth.driver_id);

    // Audit log — must not block the success path on failure.
    logScanEvent(supabase, {
      order_id: order.id,
      driver_id: auth.driver_id,
      was_override: isTakeover,
      previous_driver_id: previousDriverId,
      previous_status: previousStatus,
    });

    // Fire "out for delivery" WhatsApp — customer's first alert. Fetch the full
    // order-with-items that the notification function expects.
    try {
      const { data: fullOrder } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', order.id)
        .single();
      if (fullOrder) {
        const { sendOrderStatusUpdate } = await import(
          '@/lib/notifications/notification-service'
        );
        await sendOrderStatusUpdate(fullOrder as never);
      }
    } catch (notifError) {
      console.error('Scan: notification failed (non-fatal)', notifError);
    }

    return NextResponse.json({
      success: true,
      already_dispatched: false,
      order: {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        delivery_address: order.delivery_address,
      },
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

type ScanEventRow = {
  order_id: string;
  driver_id: string;
  was_override: boolean;
  previous_driver_id: string | null;
  previous_status: string | null;
};

function logScanEvent(
  supabase: ReturnType<typeof createServiceClient>,
  row: ScanEventRow
) {
  // Fire-and-forget — audit failure must never break the scan flow.
  supabase
    .from('scan_events')
    .insert(row)
    .then(({ error }) => {
      if (error) console.error('Scan: audit log insert failed', error);
    });
}
