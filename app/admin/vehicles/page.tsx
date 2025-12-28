'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Bike, 
  RefreshCw, 
  Download,
  MapPin,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  name: string;
  plate_number?: string;
  traccar_device_id?: number;
  traccar_unique_id?: string;
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  traccar_status?: 'online' | 'offline' | 'unknown';
  current_driver?: {
    id: string;
    name: string;
    phone: string;
  };
  live_location?: {
    latitude: number;
    longitude: number;
    speed: number;
    updated: string;
  };
  created_at: string;
}

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function VehiclesPage() {
  const queryClient = useQueryClient();

  // Fetch vehicles with auto-refresh
  const { data: vehicles = [], isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      return res.json() as Promise<Vehicle[]>;
    },
    refetchInterval: REFRESH_INTERVAL,
  });

  // Format last update time
  const lastUpdated = dataUpdatedAt 
    ? new Date(dataUpdatedAt).toLocaleTimeString() 
    : null;

  // Sync from Traccar mutation
  const syncFromTraccar = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/vehicles', { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Sync failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getStatusBadge = (status: string, traccarStatus?: string) => {
    const variants: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      available: { 
        label: 'Available', 
        className: 'bg-green-100 text-green-800',
        icon: <CheckCircle2 className="h-3 w-3" />
      },
      in_use: { 
        label: 'In Use', 
        className: 'bg-blue-100 text-blue-800',
        icon: <User className="h-3 w-3" />
      },
      maintenance: { 
        label: 'Maintenance', 
        className: 'bg-yellow-100 text-yellow-800',
        icon: <Wrench className="h-3 w-3" />
      },
      offline: { 
        label: 'Offline', 
        className: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-3 w-3" />
      },
    };
    const config = variants[status] || variants.offline;
    return (
      <div className="flex flex-col gap-1">
        <Badge className={`${config.className} flex items-center gap-1`}>
          {config.icon}
          {config.label}
        </Badge>
        {traccarStatus && (
          <span className={`text-xs ${traccarStatus === 'online' ? 'text-green-600' : 'text-red-500'}`}>
            GPS: {traccarStatus}
          </span>
        )}
      </div>
    );
  };

  // Stats
  const stats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    inUse: vehicles.filter(v => v.status === 'in_use').length,
    offline: vehicles.filter(v => v.status === 'offline' || v.status === 'maintenance').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bike className="h-8 w-8" />
            Vehicles (Bikes)
          </h1>
          <p className="text-muted-foreground">
            Manage company bikes synced from Traccar GPS
            {lastUpdated && (
              <span className="ml-2 text-xs">
                • Auto-refreshes every 30s • Last: {lastUpdated}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => syncFromTraccar.mutate()}
            disabled={syncFromTraccar.isPending}
          >
            {syncFromTraccar.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Sync from Traccar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bikes</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Bike className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-3xl font-bold text-green-600">{stats.available}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Use</p>
                <p className="text-3xl font-bold text-blue-600">{stats.inUse}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline/Maintenance</p>
                <p className="text-3xl font-bold text-gray-600">{stats.offline}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Vehicles</CardTitle>
          <CardDescription>
            GPS-tracked bikes from Traccar. Click "Sync from Traccar" to import new devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12">
              <Bike className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No vehicles yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Sync your GPS devices from Traccar to get started
              </p>
              <Button onClick={() => syncFromTraccar.mutate()}>
                <Download className="h-4 w-4 mr-2" />
                Sync from Traccar
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Traccar ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Driver</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.name}</TableCell>
                    <TableCell>{vehicle.plate_number || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {vehicle.traccar_device_id || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(vehicle.status, vehicle.traccar_status)}</TableCell>
                    <TableCell>
                      {vehicle.current_driver ? (
                        <div>
                          <p className="font-medium">{vehicle.current_driver.name}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.current_driver.phone}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {vehicle.live_location ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <MapPin className="h-3 w-3" />
                          <span className="text-xs">
                            {vehicle.live_location.speed.toFixed(0)} km/h
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No GPS</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
