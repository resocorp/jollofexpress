'use client';

import { useEffect, useState } from 'react';
import { colorForDriver } from './colors';
import type {
  DispatchDriverInput,
  DispatchGlobalRoute,
  DispatchOrderInput,
  DispatchRouteInput,
  DispatchVehicleInput,
} from './dispatch-map';

export interface GlobalRouteStats extends DispatchGlobalRoute {
  totalDistanceM: number;
  totalDurationS: number;
}

interface Props {
  drivers: DispatchDriverInput[];
  orders: DispatchOrderInput[];
  vehicles: DispatchVehicleInput[];
  routes: DispatchRouteInput[];
  globalRoute: GlobalRouteStats | null;
  unmappableCount: number;
}

const STALE_THRESHOLD_MS = 90_000;

function formatRelative(iso: string | null, now: number): string {
  if (!iso) return 'never';
  const ms = now - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

export function RiderRoster({
  drivers,
  orders,
  vehicles,
  routes,
  globalRoute,
  unmappableCount,
}: Props) {
  // Tick once a second so "Last seen" stays current without a re-fetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const vehicleByDriver = new Map(vehicles.map(v => [v.driver_id, v]));
  const routeByDriver = new Map(routes.map(r => [r.driver_id, r]));

  const ordersByDriver = new Map<string, DispatchOrderInput[]>();
  for (const o of orders) {
    if (!o.assigned_driver_id) continue;
    if (!ordersByDriver.has(o.assigned_driver_id)) {
      ordersByDriver.set(o.assigned_driver_id, []);
    }
    ordersByDriver.get(o.assigned_driver_id)!.push(o);
  }

  const unassigned = orders.filter(o => !o.assigned_driver_id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-slate-400">Optimal Run</span>
          <span className="inline-block w-3 h-0.5 bg-slate-500" />
        </div>
        {globalRoute ? (
          <p className="text-sm text-slate-200 mt-0.5">
            {globalRoute.orderedIds.length} stop{globalRoute.orderedIds.length === 1 ? '' : 's'}
            {' · '}
            {(globalRoute.totalDistanceM / 1000).toFixed(1)} km
            {' · '}
            ~{Math.round(globalRoute.totalDurationS / 60)} min
            {globalRoute.source === 'fallback' && (
              <span className="text-amber-400 text-xs ml-2">approx.</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-slate-500 mt-0.5">No mappable stops</p>
        )}
        {unmappableCount > 0 && (
          <p className="text-xs text-amber-400 mt-1">
            ⚠ {unmappableCount} order{unmappableCount === 1 ? '' : 's'} not mappable (missing coordinates)
          </p>
        )}
      </div>

      <div className="px-4 py-3 border-b border-slate-800">
        <h2 className="text-base font-semibold text-slate-100">Riders</h2>
        <p className="text-xs text-slate-400">{drivers.length} active · {orders.length} stops</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {drivers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No active riders right now
          </div>
        )}

        {drivers.map(d => {
          const color = colorForDriver(d.id);
          const v = vehicleByDriver.get(d.id);
          const route = routeByDriver.get(d.id);
          const driverOrders = ordersByDriver.get(d.id) || [];
          const remaining = driverOrders.filter(o => o.status === 'out_for_delivery');
          const isStale =
            v?.last_update && now - new Date(v.last_update).getTime() > STALE_THRESHOLD_MS;

          // Next stop = first in optimized order that's still pending
          let nextOrder: DispatchOrderInput | undefined;
          if (route) {
            for (const id of route.orderedIds) {
              const o = driverOrders.find(x => x.id === id);
              if (o && o.status === 'out_for_delivery') {
                nextOrder = o;
                break;
              }
            }
          }
          if (!nextOrder) nextOrder = remaining[0];

          return (
            <div
              key={d.id}
              className="px-4 py-3 border-b border-slate-800/70 hover:bg-slate-900/40"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: color, boxShadow: `0 0 0 3px ${color}33` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100 truncate">{d.name}</span>
                    <span className="text-xs text-slate-500 truncate">
                      {d.vehicle_plate || '—'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {remaining.length} of {driverOrders.length} remaining
                    {route && (
                      <>
                        {' · '}
                        {(route.totalDistanceM / 1000).toFixed(1)} km
                        {' · '}
                        ~{Math.round(route.totalDurationS / 60)} min
                      </>
                    )}
                  </div>
                  {nextOrder && (
                    <div className="text-xs text-slate-300 mt-1 truncate">
                      Next: <span className="text-slate-100">#{nextOrder.order_number}</span>
                      {nextOrder.delivery_address && (
                        <span className="text-slate-500"> · {nextOrder.delivery_address}</span>
                      )}
                    </div>
                  )}
                  <div
                    className={`text-[11px] mt-1 ${
                      isStale ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {isStale && '⚠ stale · '}Last seen: {formatRelative(v?.last_update ?? null, now)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {unassigned.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/30">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
              Unassigned ({unassigned.length})
            </h3>
            <ul className="space-y-1">
              {unassigned.slice(0, 8).map(o => (
                <li key={o.id} className="text-xs text-slate-400 truncate">
                  #{o.order_number} · {o.customer_name} · {o.status.replace(/_/g, ' ')}
                </li>
              ))}
              {unassigned.length > 8 && (
                <li className="text-xs text-slate-600">+{unassigned.length - 8} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
