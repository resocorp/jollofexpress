import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { getLatestPosition } from '@/lib/traccar/client';
import { sendRiderNearbyNotification } from '@/lib/notifications/notification-service';

export const dynamic = 'force-dynamic';

// Proximity threshold in meters
const PROXIMITY_RADIUS_M = 300;

// Haversine distance between two points in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST - Check driver proximity to orders in a batch and trigger notifications
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    // Accept either direct coordinates (Phase A: all vehicles) or legacy driverId
    const { batchId, driverLat: directLat, driverLng: directLng, driverId } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
    }

    const supabase = createServiceClient();

    let driverLat: number | null = directLat ?? null;
    let driverLng: number | null = directLng ?? null;

    // Legacy path: resolve position from DB driver + Traccar
    if ((!driverLat || !driverLng) && driverId) {
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, name, traccar_device_id, current_latitude, current_longitude')
        .eq('id', driverId)
        .single();

      if (driverError || !driver) {
        return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
      }

      driverLat = driver.current_latitude;
      driverLng = driver.current_longitude;

      if (driver.traccar_device_id) {
        try {
          const position = await getLatestPosition(driver.traccar_device_id);
          if (position) {
            driverLat = position.latitude;
            driverLng = position.longitude;
            await supabase
              .from('drivers')
              .update({
                current_latitude: position.latitude,
                current_longitude: position.longitude,
                last_location_update: position.serverTime || new Date().toISOString(),
              })
              .eq('id', driverId);
          }
        } catch {
          // Use cached position if Traccar fails
        }
      }
    }

    if (!driverLat || !driverLng) {
      return NextResponse.json({ error: 'No driver position available' }, { status: 404 });
    }

    // Get orders in this batch that are out_for_delivery and have GPS.
    // assigned_driver_id is pulled so we can name the rider in the customer's
    // WhatsApp ("Tunde on ABC-123-XY is nearby"). Falls back to a generic
    // wording when unassigned.
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_phone,
        customer_latitude,
        customer_longitude,
        delivery_address,
        status,
        notes,
        assigned_driver_id
      `)
      .eq('batch_id', batchId)
      .eq('order_type', 'delivery')
      .eq('status', 'out_for_delivery')
      .not('customer_latitude', 'is', null)
      .not('customer_longitude', 'is', null);

    if (ordersError) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    const notifications: { orderId: string; orderNumber: string; distance: number }[] = [];

    // Batch-fetch driver info for any orders that have an assignment.
    const driverIds = Array.from(
      new Set(
        (orders || [])
          .map(o => (o as { assigned_driver_id?: string | null }).assigned_driver_id)
          .filter((id): id is string => !!id)
      )
    );
    const driverInfoById = new Map<string, { name: string | null; vehicle_plate: string | null }>();
    if (driverIds.length > 0) {
      const { data: drivers } = await supabase
        .from('drivers')
        .select('id, name, vehicle_plate')
        .in('id', driverIds);
      for (const d of drivers || []) {
        driverInfoById.set(d.id, { name: d.name ?? null, vehicle_plate: d.vehicle_plate ?? null });
      }
    }

    for (const order of orders || []) {
      // Skip if already notified (use notes field to track, or a separate column if available)
      const alreadyNotified = order.notes?.includes('[PROXIMITY_NOTIFIED]');
      if (alreadyNotified) continue;

      const distance = haversineDistance(
        driverLat,
        driverLng,
        order.customer_latitude!,
        order.customer_longitude!
      );

      if (distance <= PROXIMITY_RADIUS_M) {
        try {
          const assignedId = (order as { assigned_driver_id?: string | null }).assigned_driver_id;
          const driverInfo = assignedId ? driverInfoById.get(assignedId) : undefined;
          const sent = await sendRiderNearbyNotification(
            order.customer_phone,
            order.customer_name,
            order.order_number,
            order.delivery_address || 'your location',
            order.id,
            driverInfo?.name ?? null,
            driverInfo?.vehicle_plate ?? null
          );

          if (sent) {
            // Mark as notified by appending to notes
            const updatedNotes = order.notes
              ? `${order.notes} [PROXIMITY_NOTIFIED]`
              : '[PROXIMITY_NOTIFIED]';

            await supabase
              .from('orders')
              .update({ notes: updatedNotes })
              .eq('id', order.id);

            notifications.push({
              orderId: order.id,
              orderNumber: order.order_number,
              distance: Math.round(distance),
            });
          }
        } catch (notifError) {
          console.error(`Failed to notify order ${order.order_number}:`, notifError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      driverPosition: { latitude: driverLat, longitude: driverLng },
      notificationsSent: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('Proximity check error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
