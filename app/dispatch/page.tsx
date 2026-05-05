'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { get } from '@/lib/api-client';
import { DispatchMap, type DispatchOrderInput, type DispatchVehicleInput, type DispatchDriverInput, type DispatchRouteInput } from '@/components/dispatch/dispatch-map';
import { RiderRoster, type GlobalRouteStats } from '@/components/dispatch/rider-roster';
import { BatchPicker, type TodayBatchSummary } from '@/components/dispatch/batch-picker';

interface DispatchBoardResponse {
  restaurant: { lat: number; lng: number };
  activeBatch: {
    id: string;
    status: string;
    delivery_window?: { name?: string; delivery_start?: string; delivery_end?: string };
  } | null;
  autoActiveBatchId: string | null;
  todayBatches: TodayBatchSummary[];
  orders: DispatchOrderInput[];
  drivers: DispatchDriverInput[];
  vehicles: DispatchVehicleInput[];
  routes: DispatchRouteInput[];
  globalRoute: GlobalRouteStats | null;
  unmappableCount: number;
  generated_at: string;
}

export default function DispatchPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [now, setNow] = useState(() => new Date());
  // null = follow the server's auto-pick (priority by status). User clicks a
  // batch pill to scope the board to that batch instead.
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Mirror the admin layout's client-side Supabase auth check — keeps the
  // dispatch board reachable only by admin/kitchen users.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/admin/login?next=/dispatch');
          return;
        }
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (!profile || (profile.role !== 'admin' && profile.role !== 'kitchen')) {
          router.push('/admin/login?next=/dispatch');
          return;
        }
        if (!cancelled) setAuthState('ok');
      } catch {
        if (!cancelled) setAuthState('denied');
        router.push('/admin/login?next=/dispatch');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Slow-changing snapshot: orders + routes. Polled every 5s — the route
  // optimizer's stop-set cache (5min) keeps Mapbox cost bounded; recomputes
  // only fire when the stop set actually changes.
  const ordersQuery = useQuery({
    queryKey: ['dispatch-orders', selectedBatchId],
    queryFn: () => get<DispatchBoardResponse>(
      `/api/dispatch/board${selectedBatchId ? `?batch_id=${selectedBatchId}` : ''}`
    ),
    refetchInterval: 5_000,
    enabled: authState === 'ok',
  });

  // Fast-changing snapshot: vehicles only. Polled every 4s, skipping route
  // recomputation server-side. Drivers are included so vehicle markers can
  // resolve their name + plate even before the slow query catches up.
  const vehiclesQuery = useQuery({
    queryKey: ['dispatch-vehicles', selectedBatchId],
    queryFn: () => get<DispatchBoardResponse>(
      `/api/dispatch/board?skipRoutes=1${selectedBatchId ? `&batch_id=${selectedBatchId}` : ''}`
    ),
    refetchInterval: 4_000,
    enabled: authState === 'ok',
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const data = ordersQuery.data;
  const vehiclesData = vehiclesQuery.data;

  // Use the freshest available vehicles + drivers; fall back to ordersQuery.
  const vehicles = vehiclesData?.vehicles ?? data?.vehicles ?? [];
  const drivers = useMemo(() => {
    // Merge driver lists so we always know the name/plate for any vehicle.
    const byId = new Map<string, DispatchDriverInput>();
    for (const d of data?.drivers ?? []) byId.set(d.id, d);
    for (const d of vehiclesData?.drivers ?? []) byId.set(d.id, d);
    return Array.from(byId.values());
  }, [data?.drivers, vehiclesData?.drivers]);
  const orders = data?.orders ?? [];
  const routes = data?.routes ?? [];
  const globalRoute = data?.globalRoute ?? null;
  const unmappableCount = data?.unmappableCount ?? 0;
  const activeBatch = data?.activeBatch ?? null;
  // Use the freshest todayBatches we have (vehiclesData refreshes more often).
  const todayBatches = vehiclesData?.todayBatches ?? data?.todayBatches ?? [];
  const autoActiveBatchId = vehiclesData?.autoActiveBatchId ?? data?.autoActiveBatchId ?? null;

  const stopsRemaining = orders.filter(o => o.status === 'out_for_delivery').length;
  const lastRefresh = vehiclesData?.generated_at || data?.generated_at || null;

  if (authState !== 'ok') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_360px] h-full w-full">
      <div className="relative">
        <DispatchMap
          orders={orders}
          vehicles={vehicles}
          drivers={drivers}
          routes={routes}
          globalRoute={globalRoute}
        />

        {/* Empty state when no batch is active right now */}
        {!activeBatch && data && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-slate-900/85 backdrop-blur px-6 py-4 rounded-lg border border-slate-700 shadow-xl text-center">
              <div className="text-slate-200 text-base font-semibold">No active dispatch batch</div>
              <div className="text-slate-400 text-xs mt-1">Waiting for the next batch to open or be cooked</div>
            </div>
          </div>
        )}

        {/* Top-left: title, batch picker, counts */}
        <div className="absolute top-4 left-4 bg-slate-900/85 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 shadow-lg max-w-[calc(100vw-400px)]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-orange-500 text-xl font-bold">MyShawarma · Dispatch</div>
            <div className="text-xs text-slate-400">
              {orders.length} active · {stopsRemaining} en route · {drivers.length} riders
            </div>
            {unmappableCount > 0 && (
              <div className="text-xs text-amber-400">
                {unmappableCount} unmappable
              </div>
            )}
          </div>
          {todayBatches.length > 0 && (
            <div className="mt-2">
              <BatchPicker
                batches={todayBatches}
                selectedId={selectedBatchId}
                activeId={autoActiveBatchId}
                onSelect={setSelectedBatchId}
              />
            </div>
          )}
        </div>

        {/* Bottom-left: legend + refresh status */}
        <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur px-3 py-2 rounded-lg border border-slate-700 shadow-lg text-[11px] text-slate-300 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" />
            Kitchen
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full ring-2 ring-orange-400" />
            Stop (ring=status, fill=rider)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
            Rider
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-500">
            {ordersQuery.isFetching || vehiclesQuery.isFetching ? '⟳ refreshing...' : lastRefresh ? `Updated ${new Date(lastRefresh).toLocaleTimeString()}` : ''}
          </span>
        </div>

        {/* Top-right (under nav controls): clock */}
        <div className="absolute top-20 right-4 bg-slate-900/85 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg text-sm font-mono text-slate-200">
          {now.toLocaleTimeString()}
        </div>
      </div>

      <aside className="border-l border-slate-800 bg-slate-950">
        <RiderRoster
          drivers={drivers}
          orders={orders}
          vehicles={vehicles}
          routes={routes}
          globalRoute={globalRoute}
          unmappableCount={unmappableCount}
        />
      </aside>
    </div>
  );
}
