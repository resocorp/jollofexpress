'use client';

import { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Truck, 
  Package, 
  User, 
  Phone, 
  MapPin, 
  Loader2,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Banknote
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address?: string;
  delivery_city?: string;
  status: string;
  total: number;
  payment_method_type?: string;
  assigned_driver_id?: string;
  customer_latitude?: number;
  customer_longitude?: number;
  created_at: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  cod_balance: number;
  total_deliveries: number;
}

interface Assignment {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  assigned_at: string;
  picked_up_at?: string;
  delivered_at?: string;
  driver?: Driver;
  order?: Order;
}

export default function DeliveryManagementPage() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Fetch orders ready for delivery
  const { data: pendingOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders?status=ready,preparing&type=delivery');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      return (data.orders || []).filter((o: Order) => 
        !o.assigned_driver_id && o.status !== 'completed'
      ) as Order[];
    },
    refetchInterval: 10000,
  });

  // Fetch active deliveries
  const { data: activeDeliveries = [], isLoading: deliveriesLoading } = useQuery({
    queryKey: ['active-deliveries'],
    queryFn: async () => {
      const res = await fetch('/api/delivery/assignments?status=pending,accepted,picked_up');
      if (!res.ok) return [];
      return res.json() as Promise<Assignment[]>;
    },
    refetchInterval: 10000,
  });

  // Fetch available drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['available-drivers'],
    queryFn: async () => {
      const res = await fetch('/api/drivers?status=available');
      if (!res.ok) throw new Error('Failed to fetch drivers');
      return res.json() as Promise<Driver[]>;
    },
  });

  // Auto-assign mutation
  const autoAssign = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch('/api/delivery/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Auto-assign failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['available-drivers'] });
      toast.success(`Assigned to ${data.driver.name}`, {
        description: `Score: ${data.driver.score.toFixed(1)} (${data.scoring.candidates_evaluated} drivers evaluated)`,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Manual assign mutation
  const manualAssign = useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: string; driverId: string }) => {
      const res = await fetch('/api/delivery/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, driver_id: driverId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Assignment failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['available-drivers'] });
      setIsAssignDialogOpen(false);
      setSelectedOrder(null);
      setSelectedDriverId('');
      toast.success('Driver assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Auto-assign all pending orders
  const autoAssignAll = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const order of pendingOrders) {
        try {
          const res = await fetch('/api/delivery/auto-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: order.id }),
          });
          if (res.ok) {
            results.push({ order: order.order_number, success: true });
          } else {
            const error = await res.json();
            results.push({ order: order.order_number, success: false, error: error.error });
          }
        } catch {
          results.push({ order: order.order_number, success: false, error: 'Failed' });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['available-drivers'] });
      const successful = results.filter(r => r.success).length;
      toast.success(`Auto-assigned ${successful}/${results.length} orders`);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      preparing: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      pending: 'bg-blue-100 text-blue-800',
      accepted: 'bg-purple-100 text-purple-800',
      picked_up: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const openAssignDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsAssignDialogOpen(true);
  };

  // Stats
  const stats = {
    pendingOrders: pendingOrders.length,
    activeDeliveries: activeDeliveries.length,
    availableDrivers: drivers.filter(d => d.status === 'available').length,
    codOrders: pendingOrders.filter(o => o.payment_method_type === 'cod').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Delivery Management
          </h1>
          <p className="text-muted-foreground">Assign drivers to orders and track deliveries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchOrders()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {pendingOrders.length > 0 && drivers.length > 0 && (
            <Button 
              onClick={() => autoAssignAll.mutate()}
              disabled={autoAssignAll.isPending}
            >
              {autoAssignAll.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Auto-Assign All
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pendingOrders}</p>
              </div>
              <Package className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Deliveries</p>
                <p className="text-3xl font-bold text-blue-600">{stats.activeDeliveries}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Drivers</p>
                <p className="text-3xl font-bold text-green-600">{stats.availableDrivers}</p>
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">COD Orders</p>
                <p className="text-3xl font-bold text-purple-600">{stats.codOrders}</p>
              </div>
              <Banknote className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Awaiting Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Orders Awaiting Driver Assignment
          </CardTitle>
          <CardDescription>
            Orders that are ready or preparing and need a driver assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                No orders waiting for driver assignment
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      #{order.order_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.customer_phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="text-sm truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {order.delivery_address || order.delivery_city || 'N/A'}
                        </p>
                        {order.customer_latitude && (
                          <p className="text-xs text-green-600">📍 GPS saved</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <Badge variant={order.payment_method_type === 'cod' ? 'secondary' : 'outline'}>
                        {order.payment_method_type === 'cod' ? '💵 COD' : '💳 Paid'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAssignDialog(order)}
                        >
                          Manual
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => autoAssign.mutate(order.id)}
                          disabled={autoAssign.isPending || drivers.length === 0}
                        >
                          {autoAssign.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-1" />
                              Auto
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Active Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Active Deliveries
          </CardTitle>
          <CardDescription>
            Orders currently being delivered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliveriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeDeliveries.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-medium">No active deliveries</p>
              <p className="text-sm text-muted-foreground">
                Assign drivers to orders to start deliveries
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">
                      #{delivery.order?.order_number || delivery.order_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{delivery.driver?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {delivery.driver?.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(delivery.assigned_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <div className={`h-2 w-8 rounded ${delivery.status !== 'pending' ? 'bg-green-500' : 'bg-gray-200'}`} title="Accepted" />
                        <div className={`h-2 w-8 rounded ${delivery.picked_up_at ? 'bg-green-500' : 'bg-gray-200'}`} title="Picked Up" />
                        <div className={`h-2 w-8 rounded ${delivery.delivered_at ? 'bg-green-500' : 'bg-gray-200'}`} title="Delivered" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>
              Select a driver to assign to order #{selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedOrder.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.delivery_address || selectedOrder.delivery_city}
                </p>
                <p className="text-sm font-medium mt-2">
                  {formatCurrency(selectedOrder.total)}
                  {selectedOrder.payment_method_type === 'cod' && (
                    <Badge className="ml-2" variant="secondary">COD</Badge>
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Driver</label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a driver..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.status === 'available').map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{driver.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({driver.total_deliveries} deliveries)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {drivers.filter(d => d.status === 'available').length === 0 && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    No drivers available
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedOrder && manualAssign.mutate({
                orderId: selectedOrder.id,
                driverId: selectedDriverId,
              })}
              disabled={!selectedDriverId || manualAssign.isPending}
            >
              {manualAssign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
