'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Navigation, Loader2, MapPin } from 'lucide-react';
import { BatchDeliveryMap } from '@/components/admin/batch-delivery-map';
import { formatCurrency } from '@/lib/formatters';
import { get } from '@/lib/api-client';
import { toast } from 'sonner';

interface InFlightOrder {
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
  assigned_driver_id: string | null;
  arrived_at_customer: string | null;
  delivery_start_time: string | null;
  batch_id: string | null;
  order_items: { item_name: string; quantity: number }[];
}

interface DriverRow {
  id: string;
  name: string;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
}

interface InFlightResponse {
  orders: InFlightOrder[];
  drivers: DriverRow[];
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sinceMinutes(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function InFlightPage() {
  const router = useRouter();
  const [data, setData] = useState<InFlightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await get<InFlightResponse>('/api/admin/in-flight');
      setData(response);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const orders = data?.orders || [];
  const drivers = data?.drivers || [];
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  const vehicleLocations = drivers
    .filter((d) => d.current_latitude != null && d.current_longitude != null)
    .map((d) => ({
      latitude: d.current_latitude as number,
      longitude: d.current_longitude as number,
      name: d.name,
      lastUpdate: d.last_location_update || undefined,
    }));

  const mapOrders = orders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    customer_latitude: o.customer_latitude,
    customer_longitude: o.customer_longitude,
    delivery_address: o.delivery_address,
    delivery_city: o.delivery_city,
    delivery_instructions: o.delivery_instructions,
    status: o.status,
    total: o.total,
    payment_status: o.payment_status,
    payment_method_type: o.payment_method_type,
    order_items: o.order_items || [],
  }));

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Navigation className="h-6 w-6" /> In-flight deliveries
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{orders.length} active</Badge>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-300">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live map</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[60vh]">
                <BatchDeliveryMap
                  orders={mapOrders}
                  vehicleLocations={vehicleLocations}
                  className="h-full w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {orders.length === 0 && (
              <p className="text-sm text-muted-foreground">No active deliveries.</p>
            )}
            {orders.map((o) => {
              const driver = o.assigned_driver_id
                ? driverMap.get(o.assigned_driver_id)
                : null;
              const distance =
                driver?.current_latitude != null &&
                driver?.current_longitude != null &&
                o.customer_latitude != null &&
                o.customer_longitude != null
                  ? Math.round(
                      haversineMeters(
                        driver.current_latitude,
                        driver.current_longitude,
                        o.customer_latitude,
                        o.customer_longitude
                      )
                    )
                  : null;
              return (
                <div key={o.id} className="border rounded-md p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">#{o.order_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {sinceMinutes(o.delivery_start_time)}
                    </span>
                  </div>
                  <div className="text-muted-foreground truncate">{o.customer_name}</div>
                  {o.delivery_address && (
                    <div className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="truncate">{o.delivery_address}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs">
                      {driver ? driver.name : <em className="text-muted-foreground">unassigned</em>}
                    </span>
                    {distance !== null && (
                      <Badge
                        variant={
                          distance <= 300 ? 'default' : distance <= 1000 ? 'secondary' : 'outline'
                        }
                      >
                        {distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`}
                      </Badge>
                    )}
                  </div>
                  {o.arrived_at_customer && (
                    <Badge variant="outline" className="text-xs">
                      rider arrived
                    </Badge>
                  )}
                  <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                    <span>{formatCurrency(o.total)}</span>
                    <span>{o.payment_status}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
