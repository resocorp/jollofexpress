'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  MapPin,
  Route,
  Printer,
  RefreshCw,
  Navigation,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { BatchDeliveryMap } from '@/components/admin/batch-delivery-map';
import { formatCurrency } from '@/lib/formatters';
import { get, post } from '@/lib/api-client';
import { toast } from 'sonner';

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
  address_type: string | null;
  unit_number: string | null;
  order_type: string;
  status: string;
  total: number;
  payment_status: string;
  payment_method_type: string;
  delivery_region_name: string | null;
  created_at: string;
  assigned_driver_id: string | null;
  order_items: {
    item_name: string;
    quantity: number;
    selected_variation: any;
    selected_addons: any[];
    special_instructions: string | null;
    subtotal: number;
  }[];
}

interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  traccar_device_id: number | null;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
}

interface BatchData {
  batch: any;
  orders: BatchOrder[];
  drivers: Record<string, DriverInfo>;
}

interface OptimizedRoute {
  orderedIds: string[];
  totalDistance: number;
}

// Restaurant location (Awka)
const RESTAURANT_LAT = 6.203072;
const RESTAURANT_LNG = 7.063700;

// Haversine distance in meters
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

// Nearest-neighbor TSP starting from restaurant
function optimizeRoute(orders: BatchOrder[]): OptimizedRoute {
  const geoOrders = orders.filter(
    o => o.customer_latitude != null && o.customer_longitude != null
  );

  if (geoOrders.length === 0) return { orderedIds: [], totalDistance: 0 };
  if (geoOrders.length === 1) return { orderedIds: [geoOrders[0].id], totalDistance: 0 };

  const remaining = new Set(geoOrders.map(o => o.id));
  const orderMap = new Map(geoOrders.map(o => [o.id, o]));
  const ordered: string[] = [];
  let totalDist = 0;

  let currentLat = RESTAURANT_LAT;
  let currentLng = RESTAURANT_LNG;

  while (remaining.size > 0) {
    let nearestId = '';
    let nearestDist = Infinity;

    for (const id of remaining) {
      const order = orderMap.get(id)!;
      const dist = haversineDistance(
        currentLat,
        currentLng,
        order.customer_latitude!,
        order.customer_longitude!
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = id;
      }
    }

    ordered.push(nearestId);
    totalDist += nearestDist;
    remaining.delete(nearestId);

    const nearest = orderMap.get(nearestId)!;
    currentLat = nearest.customer_latitude!;
    currentLng = nearest.customer_longitude!;
  }

  return { orderedIds: ordered, totalDistance: totalDist };
}

export default function BatchMapPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;

  const [data, setData] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  // All active Traccar vehicles shown on map
  const [vehicleLocations, setVehicleLocations] = useState<{
    latitude: number;
    longitude: number;
    name: string;
    lastUpdate?: string;
  }[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPollingDriver, setIsPollingDriver] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await get<BatchData>(`/api/admin/batch/${batchId}/orders`);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load batch data');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh orders every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Poll all Traccar vehicles when tracking is active
  useEffect(() => {
    if (!isPollingDriver) return;

    const pollVehicles = async () => {
      try {
        const result = await get<{
          vehicles: { deviceId: number; name: string; latitude: number | null; longitude: number | null; lastUpdate: string | null; status: string }[]
        }>('/api/tracking/vehicles');

        const active = result.vehicles.filter(
          v => v.latitude != null && v.longitude != null
        );
        setVehicleLocations(
          active.map(v => ({
            latitude: v.latitude!,
            longitude: v.longitude!,
            name: v.name,
            lastUpdate: v.lastUpdate ?? undefined,
          }))
        );

        // Run proximity check for each active vehicle
        for (const vehicle of active) {
          try {
            await post('/api/tracking/proximity-check', {
              batchId,
              traccarDeviceId: vehicle.deviceId,
              driverLat: vehicle.latitude,
              driverLng: vehicle.longitude,
            });
          } catch {
            // Proximity check is best-effort
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    pollVehicles();
    const interval = setInterval(pollVehicles, 10000);
    return () => clearInterval(interval);
  }, [isPollingDriver, batchId]);

  const handleOptimize = () => {
    if (!data) return;
    const route = optimizeRoute(data.orders);
    setOptimizedRoute(route);
    toast.success(`Route optimized: ${route.orderedIds.length} stops, ${(route.totalDistance / 1000).toFixed(1)} km`);
  };

  const handlePrintManifest = async () => {
    if (!data) return;
    setIsPrinting(true);
    try {
      await post('/api/admin/batch/' + batchId + '/print-manifest', {
        optimizedOrderIds: optimizedRoute?.orderedIds || null,
      });
      toast.success('Delivery manifest sent to printer');
    } catch (err: any) {
      toast.error(err.message || 'Failed to print manifest');
    } finally {
      setIsPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error || 'Failed to load batch'}</p>
        <Button onClick={() => router.push('/admin/batches')}>Back to Batches</Button>
      </div>
    );
  }

  const { batch, orders, drivers } = data;
  const deliveryOrders = orders.filter(o => o.order_type === 'delivery');
  const geoOrders = deliveryOrders.filter(o => o.customer_latitude && o.customer_longitude);
  const codOrders = deliveryOrders.filter(o => o.payment_method_type === 'cod');
  const totalCOD = codOrders.reduce((sum, o) => sum + o.total, 0);
  const driverList = Object.values(drivers);
  const windowName = batch.delivery_window?.name || 'Unknown';
  const deliveryWindow = batch.delivery_window
    ? `${batch.delivery_window.delivery_start} - ${batch.delivery_window.delivery_end}`
    : '';

  // Build ordered list for sidebar
  const orderedOrders = optimizedRoute
    ? optimizedRoute.orderedIds
        .map(id => deliveryOrders.find(o => o.id === id))
        .filter(Boolean) as BatchOrder[]
    : deliveryOrders;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/batches')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Batch Delivery Map</h1>
            <p className="text-muted-foreground text-sm">
              {windowName} &middot; {batch.delivery_date} &middot; {deliveryWindow}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={batch.status === 'dispatching' ? 'default' : 'secondary'}>
            {batch.status}
          </Badge>
          <Badge variant="outline">{deliveryOrders.length} orders</Badge>
          <Badge variant="outline">{geoOrders.length} on map</Badge>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleOptimize} variant="default" size="sm">
          <Route className="h-4 w-4 mr-2" />
          Optimize Route
        </Button>
        <Button
          onClick={handlePrintManifest}
          variant="outline"
          size="sm"
          disabled={isPrinting}
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 mr-2" />
          )}
          Print Manifest
        </Button>
        <Button
          onClick={() => setIsPollingDriver(!isPollingDriver)}
          variant={isPollingDriver ? 'default' : 'outline'}
          size="sm"
        >
          <Navigation className="h-4 w-4 mr-2" />
          {isPollingDriver ? `Tracking (${vehicleLocations.length})` : 'Track Rider'}
        </Button>
        <Button onClick={fetchData} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Map + Order List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2">
          <BatchDeliveryMap
            orders={deliveryOrders}
            vehicleLocations={vehicleLocations}
            optimizedRoute={optimizedRoute}
          />

          {/* Stats */}
          {optimizedRoute && (
            <Card className="mt-4">
              <CardContent className="pt-4">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Distance: </span>
                    <span className="font-bold">{(optimizedRoute.totalDistance / 1000).toFixed(1)} km</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stops: </span>
                    <span className="font-bold">{optimizedRoute.orderedIds.length}</span>
                  </div>
                  {totalCOD > 0 && (
                    <div>
                      <span className="text-muted-foreground">COD to Collect: </span>
                      <span className="font-bold text-red-600">{formatCurrency(totalCOD)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order List Sidebar */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {optimizedRoute ? 'Optimized Delivery Order' : 'Delivery Orders'}
              </CardTitle>
              <CardDescription>
                {optimizedRoute
                  ? `${optimizedRoute.orderedIds.length} stops optimized`
                  : `${deliveryOrders.length} orders in batch`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {orderedOrders.map((order, idx) => {
                const stopNum = optimizedRoute
                  ? optimizedRoute.orderedIds.indexOf(order.id) + 1
                  : null;
                const isCOD = order.payment_method_type === 'cod';
                const hasGPS = order.customer_latitude && order.customer_longitude;

                return (
                  <div
                    key={order.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {stopNum && (
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold">
                            {stopNum}
                          </span>
                        )}
                        <div>
                          <span className="font-semibold text-sm">#{order.order_number}</span>
                          {isCOD && (
                            <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">
                              COD
                            </Badge>
                          )}
                          {!hasGPS && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 text-amber-600 border-amber-300">
                              No GPS
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-sm">{formatCurrency(order.total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{order.customer_name}</p>
                    {order.delivery_address && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {order.delivery_address}
                      </p>
                    )}
                    {order.delivery_instructions && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Landmark: {order.delivery_instructions}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.order_items.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
                    </p>
                  </div>
                );
              })}

              {deliveryOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No delivery orders in this batch
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
