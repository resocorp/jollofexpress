import { createServiceClient } from '@/lib/supabase/service';
import * as traccar from '@/lib/traccar/client';

// Restaurant location (Awka)
const RESTAURANT_LOCATION = { latitude: 6.2103, longitude: 7.0707 };

// Haversine distance in km
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Score a driver (lower is better)
function scoreDriver(driver: {
  current_latitude: number | null;
  current_longitude: number | null;
  cod_balance: number;
  active_deliveries: number;
}, isCodOrder: boolean): number {
  let score = 0;

  if (driver.current_latitude && driver.current_longitude) {
    const distance = calculateDistance(
      RESTAURANT_LOCATION.latitude,
      RESTAURANT_LOCATION.longitude,
      driver.current_latitude,
      driver.current_longitude
    );
    score += Math.min(distance * 5, 50);
  } else {
    score += 25;
  }

  score += (driver.active_deliveries || 0) * 15;

  if (isCodOrder) {
    const codBalance = Number(driver.cod_balance) || 0;
    score += Math.min(codBalance / 1000, 20);
  }

  return score;
}

interface AutoAssignResult {
  success: boolean;
  assignment?: any;
  driver?: { id: string; name: string; phone: string; score: number };
  scoring?: { is_cod_order: boolean; candidates_evaluated: number; top_candidates: any[] };
  error?: string;
}

/**
 * Auto-assign an order to the best available driver.
 * Looks for drivers with active shifts (on-shift with a vehicle).
 * Accepts orders in ready, preparing, or out_for_delivery status.
 */
export async function autoAssignOrder(orderId: string): Promise<AutoAssignResult> {
  const supabase = createServiceClient();

  // Get order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, customer_latitude, customer_longitude')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: 'Order not found' };
  }

  // Check order is assignable
  if (!['ready', 'preparing', 'out_for_delivery', 'confirmed'].includes(order.status)) {
    return { success: false, error: 'Order is not ready for delivery assignment' };
  }

  // Check not already assigned
  if (order.assigned_driver_id) {
    return { success: false, error: 'Order already has a driver assigned' };
  }

  // Get drivers with active shifts (available or busy — busy drivers can take more orders)
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select(`
      *,
      active_shift:driver_shifts!inner(
        id,
        vehicle_id,
        vehicle:vehicles(id, name, traccar_device_id)
      )
    `)
    .in('status', ['available', 'busy'])
    .eq('is_active', true)
    .is('driver_shifts.ended_at', null);

  if (driversError) {
    return { success: false, error: 'Failed to fetch drivers' };
  }

  if (!drivers || drivers.length === 0) {
    return { success: false, error: 'No available drivers' };
  }

  // Count active deliveries per driver
  const driverIds = drivers.map(d => d.id);
  const { data: activeAssignments } = await supabase
    .from('delivery_assignments')
    .select('driver_id')
    .in('driver_id', driverIds)
    .in('status', ['pending', 'accepted', 'picked_up']);

  const activeCountMap = new Map<string, number>();
  activeAssignments?.forEach(a => {
    activeCountMap.set(a.driver_id, (activeCountMap.get(a.driver_id) || 0) + 1);
  });

  // Score and sort
  const isCodOrder = order.payment_method_type === 'cod';
  const scoredDrivers = drivers.map(driver => ({
    ...driver,
    active_deliveries: activeCountMap.get(driver.id) || 0,
    score: scoreDriver({
      ...driver,
      active_deliveries: activeCountMap.get(driver.id) || 0,
    }, isCodOrder),
  })).sort((a, b) => a.score - b.score);

  const bestDriver = scoredDrivers[0];

  // Create assignment
  const { data: assignment, error: assignError } = await supabase
    .from('delivery_assignments')
    .insert({
      order_id: orderId,
      driver_id: bestDriver.id,
      status: 'pending',
    })
    .select()
    .single();

  if (assignError) {
    return { success: false, error: 'Failed to create assignment' };
  }

  // Update order
  await supabase
    .from('orders')
    .update({
      assigned_driver_id: bestDriver.id,
      status: 'out_for_delivery',
    })
    .eq('id', orderId);

  // Update driver status to busy
  await supabase
    .from('drivers')
    .update({ status: 'busy' })
    .eq('id', bestDriver.id);

  // Create geofence if customer has GPS
  if (order.customer_latitude && order.customer_longitude) {
    try {
      const geofence = await traccar.createCircularGeofence(
        `Customer-${order.order_number}`,
        order.customer_latitude,
        order.customer_longitude,
        100
      );
      await supabase
        .from('orders')
        .update({ customer_geofence_id: geofence.id })
        .eq('id', orderId);
    } catch (e) {
      console.error('Geofence creation failed:', e);
    }
  }

  return {
    success: true,
    assignment,
    driver: {
      id: bestDriver.id,
      name: bestDriver.name,
      phone: bestDriver.phone,
      score: bestDriver.score,
    },
    scoring: {
      is_cod_order: isCodOrder,
      candidates_evaluated: scoredDrivers.length,
      top_candidates: scoredDrivers.slice(0, 3).map(d => ({
        name: d.name,
        score: d.score,
        active_deliveries: d.active_deliveries,
      })),
    },
  };
}
