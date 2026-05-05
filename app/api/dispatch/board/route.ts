import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import {
  getOrCreateTodayBatches,
  getTodayDateString,
  type Batch,
  type BatchStatus,
} from '@/lib/batch/batch-service';
import { optimizeRoute, type OptimizedRouteResult } from '@/lib/delivery/route-optimizer';
import { RESTAURANT_LOCATION } from '@/lib/delivery/restaurant-location';

const PRIORITY: Record<BatchStatus, number> = {
  dispatching: 4,
  preparing: 3,
  cutoff: 2,
  accepting: 1,
  completed: 0,
  cancelled: 0,
};

function pickActive(batches: Batch[], activeOrderCounts: Map<string, number>): Batch | null {
  const candidates = batches.filter(b => PRIORITY[b.status] > 0);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    // Batches with active orders always beat empty batches — an empty
    // 'dispatching' shouldn't hide a populated 'accepting' just because
    // its lifecycle status is later.
    const aHas = (activeOrderCounts.get(a.id) ?? 0) > 0 ? 1 : 0;
    const bHas = (activeOrderCounts.get(b.id) ?? 0) > 0 ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    const p = PRIORITY[b.status] - PRIORITY[a.status];
    if (p !== 0) return p;
    const aStart = a.delivery_window?.delivery_start ?? '99:99';
    const bStart = b.delivery_window?.delivery_start ?? '99:99';
    return aStart.localeCompare(bStart);
  });
  return candidates[0];
}

interface TodayBatchSummary {
  id: string;
  status: BatchStatus;
  window_name: string | null;
  delivery_start: string | null;
  delivery_end: string | null;
  total_orders: number;
}

export const dynamic = 'force-dynamic';

// Statuses that should show as active stops on the dispatch board.
// 'confirmed' is included so newly-paid orders appear immediately, even before
// the kitchen flips them to 'preparing'. Excludes 'completed' and 'cancelled'
// so the board clears as deliveries finish.
const ACTIVE_STATUSES = ['confirmed', 'preparing', 'ready', 'out_for_delivery'] as const;

interface DispatchOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_phone_alt: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_instructions: string | null;
  status: string;
  total: number;
  payment_status: string;
  payment_method_type: string;
  batch_id: string | null;
  assigned_driver_id: string | null;
  arrived_at_customer: string | null;
  order_items: { item_name: string; quantity: number }[];
}

interface DispatchDriver {
  id: string;
  name: string;
  vehicle_plate: string | null;
  status: string;
  phone: string | null;
}

interface DispatchVehicle {
  driver_id: string;
  latitude: number;
  longitude: number;
  last_update: string | null;
}

interface DispatchRoute extends OptimizedRouteResult {
  driver_id: string;
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  // Allow the client to skip route recomputation during fast vehicle polls.
  const url = new URL(request.url);
  const skipRoutes = url.searchParams.get('skipRoutes') === '1';
  const requestedBatchId = url.searchParams.get('batch_id');

  try {
    const supabase = createServiceClient();

    // Fetch today's batches once — used for both the active-batch selection
    // and the picker UI's todayBatches summary.
    const todayBatches = await getOrCreateTodayBatches();
    const today = getTodayDateString();

    // Count active orders per batch so the auto-pick can prefer batches with
    // actual work — an empty 'dispatching' batch shouldn't beat a populated
    // 'accepting' batch just because its lifecycle status sorts later.
    const activeOrderCounts = new Map<string, number>();
    if (todayBatches.length > 0) {
      const { data: countRows } = await supabase
        .from('orders')
        .select('batch_id')
        .in('batch_id', todayBatches.map(b => b.id))
        .eq('order_type', 'delivery')
        .in('status', ACTIVE_STATUSES as unknown as string[]);
      for (const row of (countRows || []) as Array<{ batch_id: string }>) {
        if (!row.batch_id) continue;
        activeOrderCounts.set(row.batch_id, (activeOrderCounts.get(row.batch_id) ?? 0) + 1);
      }
    }

    // Resolve the batch we'll scope the board to. If the client passed an
    // explicit batch_id and it belongs to today's set, honor it. Otherwise
    // fall back to the priority-based auto-pick so reviewing yesterday by
    // accident isn't possible.
    let activeBatch: Batch | null = null;
    if (requestedBatchId) {
      activeBatch = todayBatches.find(b => b.id === requestedBatchId && b.delivery_date === today) ?? null;
    }
    if (!activeBatch) activeBatch = pickActive(todayBatches, activeOrderCounts);

    const batchIds = activeBatch ? [activeBatch.id] : [];

    // Picker summary — sorted by delivery window start, ascending.
    const todayBatchSummaries: TodayBatchSummary[] = [...todayBatches]
      .sort((a, b) => {
        const aStart = a.delivery_window?.delivery_start ?? '99:99';
        const bStart = b.delivery_window?.delivery_start ?? '99:99';
        return aStart.localeCompare(bStart);
      })
      .map(b => ({
        id: b.id,
        status: b.status,
        window_name: b.delivery_window?.name ?? null,
        delivery_start: b.delivery_window?.delivery_start ?? null,
        delivery_end: b.delivery_window?.delivery_end ?? null,
        // Count of orders currently visible on the dispatch board (active
        // statuses only) — what the operator actually needs to know.
        total_orders: activeOrderCounts.get(b.id) ?? 0,
      }));

    // Active delivery orders in the selected batch.
    let orders: DispatchOrder[] = [];
    if (batchIds.length > 0) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          customer_phone_alt,
          customer_latitude,
          customer_longitude,
          delivery_address,
          delivery_city,
          delivery_instructions,
          status,
          total,
          payment_status,
          payment_method_type,
          batch_id,
          assigned_driver_id,
          arrived_at_customer,
          order_items (
            item_name,
            quantity
          )
        `)
        .in('batch_id', batchIds)
        .eq('order_type', 'delivery')
        .in('status', ACTIVE_STATUSES as unknown as string[]);

      if (error) {
        console.error('[dispatch/board] orders fetch failed:', error);
      } else {
        orders = (data || []) as unknown as DispatchOrder[];
      }
    }

    // Drivers — anyone assigned to an active order today, plus anyone marked busy.
    const assignedIds = Array.from(
      new Set(orders.map(o => o.assigned_driver_id).filter((x): x is string => !!x))
    );

    const driverQuery = supabase
      .from('drivers')
      .select(
        'id, name, vehicle_plate, status, phone, current_latitude, current_longitude, last_location_update'
      )
      .eq('is_active', true);

    const { data: driverRows } =
      assignedIds.length > 0
        ? await driverQuery.or(
            `id.in.(${assignedIds.join(',')}),status.eq.busy`
          )
        : await driverQuery.eq('status', 'busy');

    const drivers: DispatchDriver[] = (driverRows || []).map(d => ({
      id: d.id,
      name: d.name,
      vehicle_plate: d.vehicle_plate ?? null,
      status: d.status,
      phone: d.phone ?? null,
    }));

    const vehicles: DispatchVehicle[] = (driverRows || [])
      .filter(d => d.current_latitude != null && d.current_longitude != null)
      .map(d => ({
        driver_id: d.id,
        latitude: d.current_latitude as number,
        longitude: d.current_longitude as number,
        last_update: d.last_location_update ?? null,
      }));

    // Mappable stops — every active order with valid coords. Used both for
    // the global advisory route and to surface an unmappable count.
    const allMappable = orders
      .filter(o => o.customer_latitude != null && o.customer_longitude != null)
      .map(o => ({
        id: o.id,
        lat: o.customer_latitude as number,
        lng: o.customer_longitude as number,
      }));
    const unmappableCount = orders.length - allMappable.length;

    // Per-rider routes — only for drivers with at least one out_for_delivery
    // order today. The route optimizer caches by sorted stop-IDs, so repeated
    // calls with the same stop set are free.
    const routes: DispatchRoute[] = [];
    let globalRoute: OptimizedRouteResult | null = null;

    if (!skipRoutes) {
      const stopsByDriver = new Map<
        string,
        { id: string; lat: number; lng: number }[]
      >();

      for (const o of orders) {
        if (
          o.status === 'out_for_delivery' &&
          o.assigned_driver_id &&
          o.customer_latitude != null &&
          o.customer_longitude != null
        ) {
          if (!stopsByDriver.has(o.assigned_driver_id)) {
            stopsByDriver.set(o.assigned_driver_id, []);
          }
          stopsByDriver.get(o.assigned_driver_id)!.push({
            id: o.id,
            lat: o.customer_latitude,
            lng: o.customer_longitude,
          });
        }
      }

      for (const [driver_id, stops] of stopsByDriver.entries()) {
        if (stops.length === 0) continue;
        try {
          const result = await optimizeRoute(stops, RESTAURANT_LOCATION);
          routes.push({ driver_id, ...result });
        } catch (err) {
          console.error('[dispatch/board] route failed for driver', driver_id, err);
        }
      }

      // Global advisory route through every active stop, regardless of status
      // or assignment. Drawn as a neutral underlay; per-rider colored lines
      // (above) layer on top of their assigned out_for_delivery legs.
      if (allMappable.length > 0) {
        try {
          globalRoute = await optimizeRoute(allMappable, RESTAURANT_LOCATION);
        } catch (err) {
          console.error('[dispatch/board] global route failed:', err);
        }
      }
    }

    return NextResponse.json({
      restaurant: RESTAURANT_LOCATION,
      activeBatch,
      autoActiveBatchId: pickActive(todayBatches, activeOrderCounts)?.id ?? null,
      todayBatches: todayBatchSummaries,
      orders,
      drivers,
      vehicles,
      routes,
      globalRoute,
      unmappableCount,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[dispatch/board] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load dispatch data' },
      { status: 500 }
    );
  }
}
