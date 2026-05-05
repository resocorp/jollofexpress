'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { RESTAURANT_LNG_LAT } from '@/lib/delivery/restaurant-location';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Restaurant location (Awka) — [lng, lat] for Mapbox
const RESTAURANT_LOCATION: [number, number] = RESTAURANT_LNG_LAT;

interface BatchOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_latitude: number | null;
  customer_longitude: number | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_instructions: string | null;
  status: string;
  total: number;
  payment_status: string;
  payment_method_type: string;
  order_items: {
    item_name: string;
    quantity: number;
  }[];
}

interface VehicleLocation {
  latitude: number;
  longitude: number;
  name: string;
  lastUpdate?: string;
}

interface OptimizedRoute {
  orderedIds: string[];
  totalDistance: number;
  // Optional road-following polyline from Mapbox Optimization. When absent
  // (nearest-neighbor fallback) the line is drawn straight + dashed.
  geometry?: GeoJSON.LineString;
  source?: 'mapbox' | 'fallback';
}

interface BatchDeliveryMapProps {
  orders: BatchOrder[];
  vehicleLocations?: VehicleLocation[];
  optimizedRoute?: OptimizedRoute | null;
  onOrderClick?: (orderId: string) => void;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#3b82f6',    // blue
  preparing: '#8b5cf6',    // purple
  ready: '#06b6d4',        // cyan
  out_for_delivery: '#f97316', // orange
  completed: '#22c55e',    // green
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#6b7280'; // gray fallback
}

export function BatchDeliveryMap({
  orders,
  vehicleLocations = [],
  optimizedRoute,
  onOrderClick,
  className = '',
}: BatchDeliveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const vehicleMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routeLayerAdded = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'streets'>('streets');

  // Get orders with valid coordinates
  const geoOrders = orders.filter(
    o => o.customer_latitude != null && o.customer_longitude != null
  );

  // Build route order lookup for numbered markers
  const routeOrderMap = new Map<string, number>();
  if (optimizedRoute) {
    optimizedRoute.orderedIds.forEach((id, idx) => {
      routeOrderMap.set(id, idx + 1);
    });
  }

  // Create numbered marker element
  const createMarkerElement = useCallback((order: BatchOrder, stopNumber?: number) => {
    const el = document.createElement('div');
    const color = getStatusColor(order.status);
    const isCOD = order.payment_method_type === 'cod';

    el.style.cssText = `
      width: ${stopNumber ? '32px' : '24px'};
      height: ${stopNumber ? '32px' : '24px'};
      border-radius: 50%;
      background: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      color: white;
      position: relative;
    `;

    if (stopNumber) {
      el.textContent = String(stopNumber);
    }

    // COD indicator
    if (isCOD) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute;
        top: -6px;
        right: -6px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #ef4444;
        border: 2px solid white;
        font-size: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      `;
      badge.textContent = '$';
      el.appendChild(badge);
    }

    return el;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle === 'satellite'
        ? 'mapbox://styles/mapbox/satellite-streets-v12'
        : 'mapbox://styles/mapbox/streets-v12',
      center: RESTAURANT_LOCATION,
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setIsLoading(false);
    });

    // Restaurant marker
    const restaurantEl = document.createElement('div');
    restaurantEl.style.cssText = `
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #dc2626;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    `;
    restaurantEl.textContent = '🏠';

    new mapboxgl.Marker({ element: restaurantEl })
      .setLngLat(RESTAURANT_LOCATION)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<strong>MyShawarma Restaurant</strong>'))
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
      routeLayerAdded.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update order markers when orders or route changes
  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(RESTAURANT_LOCATION);

    geoOrders.forEach(order => {
      const lng = order.customer_longitude!;
      const lat = order.customer_latitude!;
      const stopNum = routeOrderMap.get(order.id);

      const el = createMarkerElement(order, stopNum);

      // Popup content
      const items = order.order_items
        .map(i => `${i.quantity}x ${i.item_name}`)
        .join('<br>');
      const codBadge = order.payment_method_type === 'cod'
        ? '<span style="color:#ef4444;font-weight:bold"> [COD]</span>'
        : '';
      const popupHtml = `
        <div style="min-width:180px">
          <strong>#${order.order_number}</strong>${codBadge}
          ${stopNum ? `<span style="float:right;background:${getStatusColor(order.status)};color:white;padding:0 6px;border-radius:10px;font-size:11px">Stop ${stopNum}</span>` : ''}
          <br><span style="color:#666">${order.customer_name}</span>
          <br><span style="color:#666;font-size:12px">${order.delivery_address || ''}</span>
          ${order.delivery_instructions ? `<br><span style="color:#b45309;font-size:11px">📍 ${order.delivery_instructions}</span>` : ''}
          <hr style="margin:6px 0;border-color:#eee">
          <span style="font-size:12px">${items}</span>
          <br><strong>NGN ${order.total.toLocaleString()}</strong>
          <br><span style="font-size:11px;color:${getStatusColor(order.status)}">${order.status.replace(/_/g, ' ')}</span>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
        .addTo(map.current!);

      el.addEventListener('click', () => {
        onOrderClick?.(order.id);
      });

      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
    });

    // Fit bounds if we have orders
    if (geoOrders.length > 0) {
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [orders, optimizedRoute, createMarkerElement, geoOrders, onOrderClick, routeOrderMap]);

  // Draw route line when optimized route is available
  useEffect(() => {
    if (!map.current || !optimizedRoute) return;

    const mapInstance = map.current;

    const drawRoute = () => {
      // Prefer the road-following GeoJSON from Mapbox Optimization when present;
      // fall back to straight legs between consecutive stops.
      const isRoadRoute = !!optimizedRoute.geometry && optimizedRoute.source === 'mapbox';
      let coords: [number, number][];

      if (optimizedRoute.geometry) {
        coords = optimizedRoute.geometry.coordinates as [number, number][];
      } else {
        coords = [RESTAURANT_LOCATION];
        const orderMap = new Map(geoOrders.map(o => [o.id, o]));
        optimizedRoute.orderedIds.forEach(id => {
          const order = orderMap.get(id);
          if (order?.customer_longitude && order?.customer_latitude) {
            coords.push([order.customer_longitude, order.customer_latitude]);
          }
        });
      }

      // Remove existing route layer/source
      if (mapInstance.getLayer('route-line')) mapInstance.removeLayer('route-line');
      if (mapInstance.getSource('route')) mapInstance.removeSource('route');

      mapInstance.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      });

      mapInstance.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#6366f1',
          'line-width': isRoadRoute ? 4 : 3,
          // Solid for road routes, dashed when we fell back to straight lines.
          ...(isRoadRoute ? {} : { 'line-dasharray': [2, 2] }),
        },
      });

      routeLayerAdded.current = true;
    };

    if (mapInstance.isStyleLoaded()) {
      drawRoute();
    } else {
      mapInstance.on('load', drawRoute);
    }
  }, [optimizedRoute, geoOrders]);

  // Update vehicle markers (one per active Traccar device)
  useEffect(() => {
    if (!map.current) return;

    // Add pulse animation style once
    if (!document.getElementById('vehicle-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'vehicle-pulse-style';
      style.textContent = `
        @keyframes vehiclePulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.1), 0 2px 8px rgba(0,0,0,0.3); }
        }
      `;
      document.head.appendChild(style);
    }

    // Remove all existing vehicle markers
    vehicleMarkersRef.current.forEach(m => m.remove());
    vehicleMarkersRef.current = [];

    vehicleLocations.forEach(vehicle => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #3b82f6;
        border: 4px solid white;
        box-shadow: 0 0 0 4px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        animation: vehiclePulse 2s ease-in-out infinite;
      `;
      el.textContent = '🏍️';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([vehicle.longitude, vehicle.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${vehicle.name}</strong>` +
            (vehicle.lastUpdate
              ? `<br><span style="font-size:11px;color:#666">Updated: ${new Date(vehicle.lastUpdate).toLocaleTimeString()}</span>`
              : '')
          )
        )
        .addTo(map.current!);

      vehicleMarkersRef.current.push(marker);
    });
  }, [vehicleLocations]);

  // Toggle map style
  const toggleStyle = () => {
    if (!map.current) return;
    const newStyle = mapStyle === 'satellite' ? 'streets' : 'satellite';
    setMapStyle(newStyle);
    map.current.setStyle(
      newStyle === 'satellite'
        ? 'mapbox://styles/mapbox/satellite-streets-v12'
        : 'mapbox://styles/mapbox/streets-v12'
    );
  };

  const ordersWithCoords = geoOrders.length;
  const ordersWithoutCoords = orders.length - ordersWithCoords;

  return (
    <div className={className}>
      <div className="relative">
        <div ref={mapContainer} className="h-[500px] w-full rounded-lg overflow-hidden border" />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Map style toggle */}
        <button
          onClick={toggleStyle}
          className="absolute top-3 left-3 bg-card px-3 py-1.5 rounded-md shadow text-xs font-medium hover:bg-muted z-10"
        >
          {mapStyle === 'satellite' ? '🗺️ Street' : '🛰️ Satellite'}
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span>Restaurant</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Out for Delivery</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Delivered</span>
        </div>
        {vehicleLocations.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200" />
            <span>Rider{vehicleLocations.length > 1 ? 's' : ''} ({vehicleLocations.length})</span>
          </div>
        )}
        {ordersWithoutCoords > 0 && (
          <div className="text-amber-600 font-medium">
            {ordersWithoutCoords} order{ordersWithoutCoords > 1 ? 's' : ''} without GPS
          </div>
        )}
      </div>
    </div>
  );
}
