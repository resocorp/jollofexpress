import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { z } from 'zod';

const autoAssignSchema = z.object({
  order_id: z.string().uuid(),
});

// Restaurant location (Awka)
const RESTAURANT_LOCATION = { latitude: 6.2103, longitude: 7.0707 };

// Calculate distance between two points (Haversine formula)
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Score a driver for assignment (lower is better)
function scoreDriver(driver: {
  id: string;
  current_latitude: number | null;
  current_longitude: number | null;
  cod_balance: number;
  total_deliveries: number;
  active_deliveries?: number;
}, isCodOrder: boolean): number {
  let score = 0;
  
  // Distance score (0-50 points) - closer is better
  if (driver.current_latitude && driver.current_longitude) {
    const distance = calculateDistance(
      RESTAURANT_LOCATION.latitude,
      RESTAURANT_LOCATION.longitude,
      driver.current_latitude,
      driver.current_longitude
    );
    score += Math.min(distance * 5, 50); // 5 points per km, max 50
  } else {
    score += 25; // Unknown location gets middle score
  }
  
  // Workload score (0-30 points) - fewer active deliveries is better
  score += (driver.active_deliveries || 0) * 15;
  
  // COD balance score for COD orders (0-20 points) - lower balance is better
  if (isCodOrder) {
    const codBalance = Number(driver.cod_balance) || 0;
    score += Math.min(codBalance / 1000, 20); // 1 point per ₦1000, max 20
  }
  
  return score;
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { order_id } = autoAssignSchema.parse(body);
    
    const supabase = await createClient();
    
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();
    
    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Check if order is ready for delivery
    if (order.status !== 'ready' && order.status !== 'preparing') {
      return NextResponse.json(
        { error: 'Order is not ready for delivery assignment' },
        { status: 400 }
      );
    }
    
    // Check if already assigned
    if (order.assigned_driver_id) {
      return NextResponse.json(
        { error: 'Order already has a driver assigned' },
        { status: 400 }
      );
    }
    
    // Get available drivers with active shifts (they have a vehicle)
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
      .eq('status', 'available')
      .eq('is_active', true)
      .is('driver_shifts.ended_at', null);
    
    if (driversError) {
      return NextResponse.json(
        { error: 'Failed to fetch drivers' },
        { status: 500 }
      );
    }
    
    if (!drivers || drivers.length === 0) {
      return NextResponse.json(
        { error: 'No available drivers', available_count: 0 },
        { status: 404 }
      );
    }
    
    // Get active delivery counts for each driver
    const driverIds = drivers.map(d => d.id);
    const { data: activeAssignments } = await supabase
      .from('delivery_assignments')
      .select('driver_id')
      .in('driver_id', driverIds)
      .in('status', ['pending', 'accepted', 'picked_up']);
    
    // Count active deliveries per driver
    const activeCountMap = new Map<string, number>();
    activeAssignments?.forEach(a => {
      activeCountMap.set(a.driver_id, (activeCountMap.get(a.driver_id) || 0) + 1);
    });
    
    // Score and sort drivers
    const isCodOrder = order.payment_method_type === 'cod';
    const scoredDrivers = drivers.map(driver => ({
      ...driver,
      active_deliveries: activeCountMap.get(driver.id) || 0,
      score: scoreDriver({
        ...driver,
        active_deliveries: activeCountMap.get(driver.id) || 0,
      }, isCodOrder),
    })).sort((a, b) => a.score - b.score);
    
    // Select best driver
    const bestDriver = scoredDrivers[0];
    
    // Create assignment
    const { data: assignment, error: assignError } = await supabase
      .from('delivery_assignments')
      .insert({
        order_id,
        driver_id: bestDriver.id,
        status: 'pending',
      })
      .select()
      .single();
    
    if (assignError) {
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      );
    }
    
    // Update order with assigned driver
    await supabase
      .from('orders')
      .update({ assigned_driver_id: bestDriver.id })
      .eq('id', order_id);
    
    // Update driver status to busy
    await supabase
      .from('drivers')
      .update({ status: 'busy' })
      .eq('id', bestDriver.id);
    
    return NextResponse.json({
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
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Auto-assign error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
