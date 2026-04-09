'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Bike,
  MapPin,
  Phone,
  CheckCircle2,
  LogOut,
  Loader2,
  RefreshCw,
  Hand,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface RiderOrder {
  assignment_id: string | null;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  total: number;
  payment_method_type: 'paystack' | 'cod';
  payment_status: string;
  assigned_driver_id: string | null;
  created_at: string;
}

interface DeliveredOrder extends RiderOrder {
  delivered_at: string;
}

interface DriverInfo {
  id: string;
  name: string;
}

export default function RiderChecklist() {
  const [token, setToken] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<RiderOrder | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);

  // Login state
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Restore session
  useEffect(() => {
    const storedToken = localStorage.getItem('rider_token');
    const storedDriver = localStorage.getItem('rider_driver');
    if (storedToken && storedDriver) {
      setToken(storedToken);
      setDriver(JSON.parse(storedDriver));
    }
    setIsLoading(false);
  }, []);

  const fetchOrders = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/rider/orders', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        // Token expired
        handleLogout();
        toast.error('Session expired. Please log in again.');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {
      console.error('Failed to fetch orders');
    }
  }, []);

  // Fetch orders on login + auto-refresh every 30s
  useEffect(() => {
    if (!token) return;
    fetchOrders(token);
    const interval = setInterval(() => fetchOrders(token), 30000);
    return () => clearInterval(interval);
  }, [token, fetchOrders]);

  const handleLogin = async () => {
    if (!phone || phone.length < 11) {
      toast.error('Enter a valid phone number');
      return;
    }
    if (!pin || pin.length < 4) {
      toast.error('Enter the 4-digit PIN');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/rider/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });

      if (res.status === 429) {
        toast.error('Too many attempts. Try again in 15 minutes.');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('rider_token', data.token);
      localStorage.setItem('rider_driver', JSON.stringify(data.driver));
      setToken(data.token);
      setDriver(data.driver);
      toast.success(`Welcome, ${data.driver.name}!`);
    } catch {
      toast.error('Login failed. Try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rider_token');
    localStorage.removeItem('rider_driver');
    setToken(null);
    setDriver(null);
    setOrders([]);
    setDeliveredOrders([]);
    setPhone('');
    setPin('');
  };

  const handleRefresh = async () => {
    if (!token) return;
    setIsRefreshing(true);
    await fetchOrders(token);
    setIsRefreshing(false);
    toast.success('Refreshed');
  };

  const handleClaim = async (order: RiderOrder) => {
    if (!token) return;
    setClaimingOrderId(order.order_id);
    try {
      const res = await fetch('/api/rider/claim', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: order.order_id }),
      });

      if (res.status === 401) {
        handleLogout();
        toast.error('Session expired. Please log in again.');
        return;
      }

      if (res.status === 409) {
        toast.error('Order already claimed by another rider');
        await fetchOrders(token);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to claim order');
        return;
      }

      toast.success(`Claimed order ${order.order_number}`);
      await fetchOrders(token);
    } catch {
      toast.error('Failed to claim order');
    } finally {
      setClaimingOrderId(null);
    }
  };

  const handleDeliver = async (order: RiderOrder) => {
    if (!token || !order.assignment_id) return;

    setIsDelivering(true);
    try {
      const res = await fetch(`/api/rider/deliver/${order.assignment_id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        handleLogout();
        toast.error('Session expired. Please log in again.');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to mark as delivered');
        return;
      }

      // Move to delivered list
      setOrders(prev => prev.filter(o => o.order_id !== order.order_id));
      setDeliveredOrders(prev => [
        { ...order, delivered_at: new Date().toISOString() },
        ...prev,
      ]);
      toast.success(`Order ${order.order_number} delivered!`);
    } catch {
      toast.error('Failed to mark as delivered');
    } finally {
      setIsDelivering(false);
      setConfirmOrder(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login screen
  if (!token || !driver) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Bike className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Rider Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="****"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="h-12 text-lg text-center tracking-widest"
              />
            </div>
            <Button
              className="w-full h-12 text-base"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCount = orders.length + deliveredOrders.length;
  const doneCount = deliveredOrders.length;

  // Checklist screen
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{driver.name}</h1>
            {totalCount > 0 && (
              <p className="text-sm text-primary-foreground/80">
                {doneCount}/{totalCount} delivered
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-white hover:bg-white/20"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 pb-20">
        {/* Empty state */}
        {orders.length === 0 && deliveredOrders.length === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <Bike className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-medium">No deliveries assigned</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pull down to refresh or wait for new orders
              </p>
              <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending orders */}
        {orders.map((order) => (
          <Card key={order.order_id} className={`border-l-4 ${!order.assigned_driver_id ? 'border-l-blue-400' : order.assigned_driver_id === driver?.id ? 'border-l-orange-400' : 'border-l-border'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-bold text-base">{order.order_number}</span>
                  <span className="text-muted-foreground mx-2">·</span>
                  <span className="text-sm">{order.customer_name}</span>
                </div>
                {order.payment_method_type === 'cod' ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 shrink-0">
                    COD {formatCurrency(order.total)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 shrink-0">
                    PAID
                  </Badge>
                )}
              </div>

              <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="line-clamp-1">{order.delivery_address}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{new Date(order.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-none"
                  onClick={() => {
                    window.location.href = `tel:${order.customer_phone}`;
                  }}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                {!order.assigned_driver_id ? (
                  <Button
                    className="flex-1 h-11 text-base bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleClaim(order)}
                    disabled={claimingOrderId === order.order_id}
                  >
                    {claimingOrderId === order.order_id ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Hand className="h-5 w-5 mr-2" />
                    )}
                    Claim
                  </Button>
                ) : order.assigned_driver_id === driver?.id ? (
                  <Button
                    className="flex-1 h-11 text-base"
                    onClick={() => setConfirmOrder(order)}
                    disabled={!order.assignment_id}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Delivered
                  </Button>
                ) : (
                  <Badge variant="outline" className="flex-1 h-11 flex items-center justify-center text-base bg-muted text-muted-foreground border-border">
                    Claimed
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Delivered section */}
        {deliveredOrders.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Completed ({deliveredOrders.length})
              </span>
            </div>

            {deliveredOrders.map((order) => (
              <Card key={order.order_id} className="border-l-4 border-l-green-400 opacity-70">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium line-through text-muted-foreground">
                        {order.order_number}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {order.customer_name}
                      </span>
                    </div>
                    {order.payment_method_type === 'cod' ? (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        COD {formatCurrency(order.total)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        PAID
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmOrder} onOpenChange={(open) => !open && setConfirmOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Mark order <strong>{confirmOrder?.order_number}</strong> for{' '}
              <strong>{confirmOrder?.customer_name}</strong> as delivered?
              {confirmOrder?.payment_method_type === 'cod' && (
                <>
                  <br />
                  <span className="text-amber-600 font-medium mt-1 block">
                    COD: Collect {formatCurrency(confirmOrder.total)}
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDelivering}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmOrder && handleDeliver(confirmOrder)}
              disabled={isDelivering}
            >
              {isDelivering && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Yes, Delivered
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
