// Geofence logic for auto-completing deliveries when a rider enters and then
// exits the customer's location radius. Driven by driver GPS updates.
//
// State machine per order (out_for_delivery with customer coords):
//   - distance <= NEARBY_RADIUS_M AND not yet notified → send "rider nearby" WhatsApp
//   - distance <= ARRIVAL_RADIUS_M → set arrived_at_customer = now()
//   - distance > EXIT_RADIUS_M AND (now - arrived_at_customer) >= MIN_DWELL_MS
//     → mark completed, set auto_completed_at, fire completion notification

import { createServiceClient } from '@/lib/supabase/service';

export const NEARBY_RADIUS_M = 300;
export const ARRIVAL_RADIUS_M = 50;
export const EXIT_RADIUS_M = 70; // hysteresis buffer to avoid GPS flapping
export const MIN_DWELL_MS = 20 * 1000;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeofenceResult {
  orderId: string;
  orderNumber: string;
  event: 'nearby' | 'arrived' | 'completed' | 'noop';
  distance: number;
}

/**
 * Evaluate geofence events for every active delivery assigned to `driverId`
 * against the driver's latest position. Writes state changes and fires
 * completion notifications. Returns a list of events for logging.
 */
export async function evaluateGeofenceForDriver(
  driverId: string,
  driverLat: number,
  driverLng: number
): Promise<GeofenceResult[]> {
  const supabase = createServiceClient();
  const results: GeofenceResult[] = [];

  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, customer_name, customer_phone, delivery_address, notes, customer_latitude, customer_longitude, arrived_at_customer'
    )
    .eq('assigned_driver_id', driverId)
    .eq('status', 'out_for_delivery')
    .eq('order_type', 'delivery')
    .not('customer_latitude', 'is', null)
    .not('customer_longitude', 'is', null);

  if (error || !orders || orders.length === 0) return results;

  // One driver lookup per evaluation — name + plate threaded into the
  // "rider nearby" WhatsApp so the customer knows who is arriving.
  const { data: driver } = await supabase
    .from('drivers')
    .select('name, vehicle_plate')
    .eq('id', driverId)
    .maybeSingle();
  const riderName = driver?.name ?? null;
  const vehiclePlate = driver?.vehicle_plate ?? null;

  for (const order of orders) {
    const distance = haversineMeters(
      driverLat,
      driverLng,
      order.customer_latitude as number,
      order.customer_longitude as number
    );

    // NEARBY — one-shot WhatsApp to customer while rider is ~300m out
    if (
      distance <= NEARBY_RADIUS_M &&
      !order.notes?.includes('[PROXIMITY_NOTIFIED]')
    ) {
      try {
        const { sendRiderNearbyNotification } = await import(
          '@/lib/notifications/notification-service'
        );
        const sent = await sendRiderNearbyNotification(
          order.customer_phone,
          order.customer_name,
          order.order_number,
          order.delivery_address || 'your location',
          order.id,
          riderName,
          vehiclePlate
        );
        if (sent) {
          const updatedNotes = order.notes
            ? `${order.notes} [PROXIMITY_NOTIFIED]`
            : '[PROXIMITY_NOTIFIED]';
          await supabase
            .from('orders')
            .update({ notes: updatedNotes })
            .eq('id', order.id);
          results.push({
            orderId: order.id,
            orderNumber: order.order_number,
            event: 'nearby',
            distance: Math.round(distance),
          });
        }
      } catch (nearbyErr) {
        console.error('Rider-nearby notification failed:', nearbyErr);
      }
    }

    // ARRIVAL — first time inside radius
    if (distance <= ARRIVAL_RADIUS_M && !order.arrived_at_customer) {
      await supabase
        .from('orders')
        .update({ arrived_at_customer: new Date().toISOString() })
        .eq('id', order.id);
      results.push({
        orderId: order.id,
        orderNumber: order.order_number,
        event: 'arrived',
        distance: Math.round(distance),
      });
      continue;
    }

    // EXIT → AUTO-COMPLETE (with dwell check)
    if (distance > EXIT_RADIUS_M && order.arrived_at_customer) {
      const arrivedAt = new Date(order.arrived_at_customer).getTime();
      const dwellMs = Date.now() - arrivedAt;
      if (dwellMs < MIN_DWELL_MS) {
        // Drive-by — clear the arrival marker so the rider can arrive properly later.
        await supabase
          .from('orders')
          .update({ arrived_at_customer: null })
          .eq('id', order.id);
        results.push({
          orderId: order.id,
          orderNumber: order.order_number,
          event: 'noop',
          distance: Math.round(distance),
        });
        continue;
      }

      const nowIso = new Date().toISOString();
      const { error: updErr } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          auto_completed_at: nowIso,
          delivery_completion_time: nowIso,
        })
        .eq('id', order.id)
        .eq('status', 'out_for_delivery'); // guard against race

      if (updErr) {
        console.error('Geofence auto-complete failed for', order.id, updErr);
        continue;
      }

      await supabase
        .from('delivery_assignments')
        .update({ status: 'delivered', delivered_at: nowIso })
        .eq('order_id', order.id)
        .eq('driver_id', driverId);

      // Mark driver available again if no other active deliveries.
      const { count: activeCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_driver_id', driverId)
        .eq('status', 'out_for_delivery');
      if (!activeCount) {
        await supabase.from('drivers').update({ status: 'available' }).eq('id', driverId);
      }

      // Fire completion notification (contains the automated-message disclaimer).
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
      } catch (notifErr) {
        console.error('Geofence completion notification failed:', notifErr);
      }

      results.push({
        orderId: order.id,
        orderNumber: order.order_number,
        event: 'completed',
        distance: Math.round(distance),
      });
    }
  }

  return results;
}
