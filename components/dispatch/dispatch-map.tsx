'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { RESTAURANT_LNG_LAT } from '@/lib/delivery/restaurant-location';
import { colorForDriver } from './colors';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const STALE_THRESHOLD_MS = 90_000;

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#64748b',
  preparing: '#8b5cf6',
  ready: '#06b6d4',
  out_for_delivery: '#f97316',
  completed: '#22c55e',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] || '#94a3b8';
}

export interface DispatchOrderInput {
  id: string;
  order_number: string;
  customer_name: string;
  customer_latitude: number | null;
  customer_longitude: number | null;
  delivery_address: string | null;
  delivery_instructions: string | null;
  status: string;
  total: number;
  payment_method_type: string;
  assigned_driver_id: string | null;
  order_items: { item_name: string; quantity: number }[];
}

export interface DispatchVehicleInput {
  driver_id: string;
  latitude: number;
  longitude: number;
  last_update: string | null;
}

export interface DispatchDriverInput {
  id: string;
  name: string;
  vehicle_plate: string | null;
}

export interface DispatchRouteInput {
  driver_id: string;
  orderedIds: string[];
  geometry: GeoJSON.LineString;
  source: 'mapbox' | 'fallback-roads' | 'fallback';
  totalDistanceM: number;
  totalDurationS: number;
}

export interface DispatchGlobalRoute {
  orderedIds: string[];
  geometry: GeoJSON.LineString;
  source: 'mapbox' | 'fallback-roads' | 'fallback';
}

interface Props {
  orders: DispatchOrderInput[];
  vehicles: DispatchVehicleInput[];
  drivers: DispatchDriverInput[];
  routes: DispatchRouteInput[];
  globalRoute: DispatchGlobalRoute | null;
}

export function DispatchMap({ orders, vehicles, drivers, routes, globalRoute }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const orderMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const vehicleMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const driverIdsKey = drivers
    .map(d => d.id)
    .sort()
    .join(',');
  // Refit bounds when the active driver set changes OR when we transition
  // between "no mappable stops" and "at least one mappable stop", so the
  // camera frames the very first order in an unassigned-only batch.
  const hasMappable = orders.some(
    o => o.customer_latitude != null && o.customer_longitude != null
  );
  const fitKey = `${driverIdsKey}|${hasMappable ? '1' : '0'}`;
  const lastFitKeyRef = useRef<string>('');

  // Init map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: RESTAURANT_LNG_LAT,
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      setIsLoading(false);
      setStyleLoaded(true);
    });

    // Pulse animation for vehicle markers
    if (!document.getElementById('dispatch-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'dispatch-pulse-style';
      style.textContent = `
        @keyframes dispatchPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `;
      document.head.appendChild(style);
    }

    // Restaurant marker (kitchen origin)
    const restaurantEl = document.createElement('div');
    restaurantEl.style.cssText = `
      width: 40px; height: 40px; border-radius: 50%;
      background: #dc2626; border: 3px solid #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    `;
    restaurantEl.textContent = '🏠';
    new mapboxgl.Marker({ element: restaurantEl })
      .setLngLat(RESTAURANT_LNG_LAT)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<strong>MyShawarma Kitchen</strong>'))
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Order markers — one per active stop, color-keyed by assigned rider
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    const m = map.current;

    // Diff against previous markers — remove ones no longer present
    const seenIds = new Set(orders.map(o => o.id));
    for (const [id, marker] of orderMarkersRef.current.entries()) {
      if (!seenIds.has(id)) {
        marker.remove();
        orderMarkersRef.current.delete(id);
      }
    }

    // Build stopNumber lookup from per-driver routes (rider-local numbering).
    // Backfill from the global advisory route for any order not covered by a
    // rider — gray unassigned stops then show their global-route position.
    const stopNumberByOrder = new Map<string, number>();
    for (const r of routes) {
      r.orderedIds.forEach((id, idx) => stopNumberByOrder.set(id, idx + 1));
    }
    if (globalRoute) {
      globalRoute.orderedIds.forEach((id, idx) => {
        if (!stopNumberByOrder.has(id)) stopNumberByOrder.set(id, idx + 1);
      });
    }

    for (const order of orders) {
      if (order.customer_latitude == null || order.customer_longitude == null) continue;

      const driverColor = order.assigned_driver_id
        ? colorForDriver(order.assigned_driver_id)
        : '#94a3b8';
      const ringColor = statusColor(order.status);
      const stopNum = stopNumberByOrder.get(order.id);

      const existing = orderMarkersRef.current.get(order.id);
      if (existing) {
        existing.setLngLat([order.customer_longitude, order.customer_latitude]);
        // Update visuals (color may change as rider is assigned/reassigned)
        const el = existing.getElement();
        el.style.background = driverColor;
        el.style.borderColor = ringColor;
        el.textContent = stopNum ? String(stopNum) : '';
        continue;
      }

      const el = document.createElement('div');
      el.style.cssText = `
        width: 30px; height: 30px; border-radius: 50%;
        background: ${driverColor};
        border: 3px solid ${ringColor};
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: bold; color: #fff;
        cursor: pointer;
      `;
      if (stopNum) el.textContent = String(stopNum);

      if (order.payment_method_type === 'cod') {
        const badge = document.createElement('div');
        badge.style.cssText = `
          position: absolute; top: -4px; right: -4px;
          width: 14px; height: 14px; border-radius: 50%;
          background: #ef4444; border: 2px solid #fff; color: #fff;
          font-size: 9px; display: flex; align-items: center; justify-content: center;
        `;
        badge.textContent = '$';
        el.style.position = 'relative';
        el.appendChild(badge);
      }

      const items = order.order_items
        .map(i => `${i.quantity}× ${i.item_name}`)
        .join('<br>');
      const popupHtml = `
        <div style="min-width:200px;color:#0f172a">
          <strong>#${order.order_number}</strong>
          <br><span style="color:#475569">${order.customer_name}</span>
          ${order.delivery_address ? `<br><span style="color:#64748b;font-size:12px">${order.delivery_address}</span>` : ''}
          ${order.delivery_instructions ? `<br><span style="color:#b45309;font-size:11px">📍 ${order.delivery_instructions}</span>` : ''}
          <hr style="margin:6px 0;border-color:#e2e8f0">
          <span style="font-size:12px">${items}</span>
          <br><strong>NGN ${order.total.toLocaleString()}</strong>
          <br><span style="font-size:11px;color:${ringColor}">${order.status.replace(/_/g, ' ')}</span>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([order.customer_longitude, order.customer_latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
        .addTo(m);
      orderMarkersRef.current.set(order.id, marker);
    }
  }, [orders, routes, globalRoute, styleLoaded]);

  // Global advisory route — TSP through every active stop in the batch,
  // regardless of status or assignment. Drawn as a wide, translucent slate
  // underlay so per-rider colored lines (added in the next effect) layer on
  // top of any assigned legs.
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    const m = map.current;
    const SRC = 'global-route';
    const LYR = 'global-route-line';

    if (!globalRoute) {
      if (m.getLayer(LYR)) m.removeLayer(LYR);
      if (m.getSource(SRC)) m.removeSource(SRC);
      return;
    }

    const data: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: globalRoute.geometry,
    };

    const existingSrc = m.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
    if (existingSrc) {
      existingSrc.setData(data);
    } else {
      m.addSource(SRC, { type: 'geojson', data });
      m.addLayer({
        id: LYR,
        type: 'line',
        source: SRC,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#64748b',
          'line-width': 5,
          'line-opacity': 0.45,
          // Only true straight-line fallback gets dashed; 'fallback-roads'
          // is road-following geometry layered on nearest-neighbor order.
          ...(globalRoute.source === 'fallback' ? { 'line-dasharray': [3, 3] } : {}),
        },
      });
    }
  }, [globalRoute, styleLoaded]);

  // Per-rider route lines. Each driver gets one Mapbox source/layer pair so we
  // can update them independently as routes change. Source IDs use the
  // 'rider-route-' prefix so the cleanup loop here doesn't accidentally wipe
  // the global-route source above.
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    const m = map.current;

    const drawn = new Set<string>();
    for (const r of routes) {
      const sourceId = `rider-route-${r.driver_id}`;
      const layerId = `rider-route-line-${r.driver_id}`;
      drawn.add(sourceId);

      const data: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: r.geometry,
      };

      const existingSrc = m.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
      if (existingSrc) {
        existingSrc.setData(data);
      } else {
        m.addSource(sourceId, { type: 'geojson', data });
        m.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': colorForDriver(r.driver_id),
            'line-width': r.source === 'fallback' ? 3 : 4,
            'line-opacity': 0.85,
            // Dashed only for true straight-line fallback; road-following
            // geometry (mapbox or fallback-roads) renders solid.
            ...(r.source === 'fallback' ? { 'line-dasharray': [2, 2] } : {}),
          },
        });
      }
    }

    // Remove any old route layers/sources for drivers no longer active
    const allSources = (m.getStyle()?.sources || {}) as Record<string, unknown>;
    for (const id of Object.keys(allSources)) {
      if (id.startsWith('rider-route-') && !drawn.has(id)) {
        const layerId = id.replace('rider-route-', 'rider-route-line-');
        if (m.getLayer(layerId)) m.removeLayer(layerId);
        m.removeSource(id);
      }
    }
  }, [routes, styleLoaded]);

  // Vehicle markers — direct positioning per poll. We had smooth interpolation
  // but the parent re-renders every 1s (clock tick), which restarted the 1.5s
  // animation from the stale start position every tick — making the chip
  // oscillate. A rider moves ~30m per 4s poll at city speeds; teleporting
  // between samples is barely noticeable.
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    const m = map.current;
    const driverById = new Map(drivers.map(d => [d.id, d]));

    const seenDriverIds = new Set(vehicles.map(v => v.driver_id));
    for (const [id, marker] of vehicleMarkersRef.current.entries()) {
      if (!seenDriverIds.has(id)) {
        marker.remove();
        vehicleMarkersRef.current.delete(id);
      }
    }

    for (const v of vehicles) {
      const driver = driverById.get(v.driver_id);
      if (!driver) continue;

      const color = colorForDriver(v.driver_id);
      const isStale =
        v.last_update && Date.now() - new Date(v.last_update).getTime() > STALE_THRESHOLD_MS;

      let marker = vehicleMarkersRef.current.get(v.driver_id);

      if (!marker) {
        const el = document.createElement('div');
        const firstName = driver.name.split(/\s+/)[0];
        const plateTail = (driver.vehicle_plate || '').slice(-3);
        const label = plateTail ? `${firstName} ${plateTail}` : firstName;

        // z-index 1000 keeps the rider chip above order pins (no z-index of
        // their own) — Mapbox's default lat-based marker sort sometimes lands
        // the chip behind a customer pin when the rider is at the address.
        el.style.cssText = `
          position: relative;
          z-index: 1000;
          padding: 4px 10px;
          border-radius: 16px;
          background: ${color};
          color: #0f172a;
          border: 3px solid #fff;
          box-shadow: 0 2px 12px rgba(0,0,0,0.6);
          font-size: 12px; font-weight: 700;
          white-space: nowrap;
          display: flex; align-items: center; gap: 4px;
          animation: dispatchPulse 2s ease-in-out infinite;
        `;
        el.innerHTML = `<span>🏍️</span><span>${label}</span>`;

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([v.longitude, v.latitude])
          .addTo(m);
        vehicleMarkersRef.current.set(v.driver_id, marker);
        continue;
      }

      // Update visuals + position straight from the latest sample.
      const el = marker.getElement();
      el.style.opacity = isStale ? '0.45' : '1';
      el.style.filter = isStale ? 'grayscale(0.6)' : 'none';
      marker.setLngLat([v.longitude, v.latitude]);
    }
  }, [vehicles, drivers, styleLoaded]);

  // Auto-fit bounds only when the active driver set changes or the first stop
  // appears — never on every vehicle tick, otherwise the camera jitters.
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    if (fitKey === lastFitKeyRef.current) return;
    lastFitKeyRef.current = fitKey;

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(RESTAURANT_LNG_LAT);
    let added = 0;
    for (const o of orders) {
      if (o.customer_latitude != null && o.customer_longitude != null) {
        bounds.extend([o.customer_longitude, o.customer_latitude]);
        added++;
      }
    }
    for (const v of vehicles) {
      bounds.extend([v.longitude, v.latitude]);
      added++;
    }
    if (added === 0) return;

    map.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 });
  }, [fitKey, orders, vehicles, styleLoaded]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
          <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
