'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, QrCode, ShieldAlert, RefreshCw } from 'lucide-react';

interface ScanEvent {
  id: string;
  scanned_at: string;
  order_id: string;
  order_number: string | null;
  customer_name: string | null;
  driver_id: string;
  driver_name: string;
  was_override: boolean;
  previous_driver_id: string | null;
  previous_driver_name: string | null;
  previous_status: string | null;
}

interface ScanEventsResponse {
  events: ScanEvent[];
}

interface Driver {
  id: string;
  name: string;
}

const ALL_DRIVERS = '__all__';

export default function AdminScanLogPage() {
  const [driverId, setDriverId] = useState<string>(ALL_DRIVERS);
  const [overridesOnly, setOverridesOnly] = useState(false);

  const driversQuery = useQuery<Driver[]>({
    queryKey: ['admin-drivers'],
    queryFn: async () => {
      const res = await adminFetch('/api/drivers');
      if (!res.ok) throw new Error('Failed to fetch drivers');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const scansQuery = useQuery<ScanEventsResponse>({
    queryKey: ['admin-scan-events', driverId, overridesOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (driverId !== ALL_DRIVERS) params.set('driver_id', driverId);
      if (overridesOnly) params.set('overrides_only', 'true');
      const res = await adminFetch(`/api/admin/scans?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch scan events');
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const events = scansQuery.data?.events ?? [];
  const overrideCount = useMemo(
    () => events.filter((e) => e.was_override).length,
    [events]
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <QrCode className="h-6 w-6" /> Rider scan log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit trail of every receipt QR scan. Overrides happen when a rider
            takes an order from another rider.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scansQuery.refetch()}
          disabled={scansQuery.isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${scansQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Rider</label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All riders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DRIVERS}>All riders</SelectItem>
              {(driversQuery.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={overridesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOverridesOnly((v) => !v)}
          >
            <ShieldAlert className="h-4 w-4 mr-2" />
            Overrides only
          </Button>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {events.length} scan{events.length === 1 ? '' : 's'}
          {overrideCount > 0 && (
            <span className="ml-2 text-amber-600">
              ({overrideCount} override{overrideCount === 1 ? '' : 's'})
            </span>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[170px]">When</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Rider</TableHead>
              <TableHead>Status before</TableHead>
              <TableHead>Override</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scansQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            )}
            {!scansQuery.isLoading && events.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No scans yet.
                </TableCell>
              </TableRow>
            )}
            {events.map((e) => (
              <TableRow key={e.id} className={e.was_override ? 'bg-amber-50/40' : ''}>
                <TableCell className="text-sm whitespace-nowrap">
                  {new Date(e.scanned_at).toLocaleString('en-NG', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  })}
                </TableCell>
                <TableCell className="font-medium">
                  {e.order_number ? `#${e.order_number}` : '—'}
                </TableCell>
                <TableCell className="text-sm">{e.customer_name ?? '—'}</TableCell>
                <TableCell className="text-sm">{e.driver_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {e.previous_status ?? '—'}
                </TableCell>
                <TableCell>
                  {e.was_override ? (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                      Took from {e.previous_driver_name ?? 'unknown'}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
