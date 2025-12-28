'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bike, 
  MapPin, 
  Phone, 
  Clock, 
  Banknote,
  Navigation,
  CheckCircle,
  LogOut,
  Loader2,
  Package,
  Car
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  cod_balance: number;
  total_deliveries: number;
}

interface Vehicle {
  id: string;
  name: string;
  plate_number?: string;
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  traccar_device_id?: number;
}

interface Shift {
  id: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  started_at: string;
}

interface ActiveDelivery {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  total: number;
  payment_method_type: 'paystack' | 'cod';
  status: string;
  customer_latitude?: number;
  customer_longitude?: number;
}

export default function DriverDashboard() {
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isStartingShift, setIsStartingShift] = useState(false);

  // Check for stored driver session
  useEffect(() => {
    const storedDriverId = localStorage.getItem('driver_id');
    if (storedDriverId) {
      fetchDriverData(storedDriverId);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch available vehicles
  useEffect(() => {
    if (driver && driver.status === 'offline') {
      fetchVehicles();
    }
  }, [driver?.status]);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles?available=true');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  };

  const fetchDriverData = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}`);
      if (response.ok) {
        const data = await response.json();
        setDriver(data);
        
        // Fetch active shift
        const shiftRes = await fetch(`/api/drivers/shifts?driver_id=${driverId}`);
        if (shiftRes.ok) {
          const shifts = await shiftRes.json();
          if (shifts && shifts.length > 0) {
            setCurrentShift(shifts[0]);
          }
        }
        
        // Fetch active delivery
        const deliveryRes = await fetch(`/api/drivers/${driverId}/active-delivery`);
        if (deliveryRes.ok) {
          const delivery = await deliveryRes.json();
          setActiveDelivery(delivery);
        }
      } else {
        localStorage.removeItem('driver_id');
      }
    } catch (error) {
      console.error('Failed to fetch driver data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!phone || phone.length < 11) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch(`/api/drivers?phone=${encodeURIComponent(phone)}`);
      const drivers = await response.json();
      
      if (drivers && drivers.length > 0) {
        const matchedDriver = drivers.find((d: Driver) => d.phone === phone);
        if (matchedDriver) {
          localStorage.setItem('driver_id', matchedDriver.id);
          setDriver(matchedDriver);
          toast.success(`Welcome back, ${matchedDriver.name}!`);
        } else {
          toast.error('Driver not found. Please contact admin.');
        }
      } else {
        toast.error('Driver not found. Please contact admin.');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    // End shift if active
    if (driver && currentShift) {
      try {
        await fetch('/api/drivers/shifts', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driver_id: driver.id }),
        });
      } catch (error) {
        console.error('Failed to end shift:', error);
      }
    }
    localStorage.removeItem('driver_id');
    setDriver(null);
    setActiveDelivery(null);
    setCurrentShift(null);
    toast.info('Logged out successfully');
  };

  // Start shift (go online with selected bike)
  const startShift = async () => {
    if (!driver || !selectedVehicleId) {
      toast.error('Please select a bike first');
      return;
    }
    
    setIsStartingShift(true);
    try {
      const response = await fetch('/api/drivers/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: driver.id,
          vehicle_id: selectedVehicleId,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentShift(data.shift);
        setDriver({ ...driver, status: 'available' });
        setSelectedVehicleId('');
        toast.success('You are now online!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to start shift');
      }
    } catch (error) {
      toast.error('Failed to start shift');
    } finally {
      setIsStartingShift(false);
    }
  };

  // End shift (go offline)
  const endShift = async () => {
    if (!driver) return;
    
    try {
      const response = await fetch('/api/drivers/shifts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driver.id }),
      });
      
      if (response.ok) {
        setCurrentShift(null);
        setDriver({ ...driver, status: 'offline' });
        toast.success('You are now offline');
        fetchVehicles(); // Refresh available bikes
      }
    } catch (error) {
      toast.error('Failed to end shift');
    }
  };

  const openNavigation = () => {
    if (activeDelivery?.customer_latitude && activeDelivery?.customer_longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.customer_latitude},${activeDelivery.customer_longitude}`,
        '_blank'
      );
    } else if (activeDelivery?.delivery_address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeDelivery.delivery_address)}`,
        '_blank'
      );
    }
  };

  const callCustomer = () => {
    if (activeDelivery?.customer_phone) {
      window.location.href = `tel:${activeDelivery.customer_phone}`;
    }
  };

  const markDelivered = async () => {
    if (!activeDelivery || !driver) return;
    
    try {
      const response = await fetch(`/api/delivery/assignments/${activeDelivery.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: driver.id,
          cod_amount: activeDelivery.payment_method_type === 'cod' ? activeDelivery.total : 0,
        }),
      });
      
      if (response.ok) {
        toast.success('Delivery completed!');
        setActiveDelivery(null);
        // Refresh driver data
        fetchDriverData(driver.id);
      }
    } catch (error) {
      toast.error('Failed to mark delivery as complete');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login screen
  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Bike className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">JollofExpress Driver</CardTitle>
            <CardDescription>Login with your registered phone number</CardDescription>
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
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Driver dashboard
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{driver.name}</h1>
            <Badge variant={driver.status === 'available' ? 'default' : 'secondary'} className="mt-1">
              {driver.status === 'available' ? '🟢 Online' : driver.status === 'busy' ? '🟡 On Delivery' : '🔴 Offline'}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Bike Info (when on shift) */}
        {currentShift && currentShift.vehicle && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Car className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium">{currentShift.vehicle.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentShift.vehicle.plate_number || 'No plate'}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">On Shift</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Go Online - Select Bike */}
        {!activeDelivery && driver.status === 'offline' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5" />
                Select Your Bike
              </CardTitle>
              <CardDescription>Choose a bike to start your shift</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bike..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.length === 0 ? (
                    <SelectItem value="none" disabled>No bikes available</SelectItem>
                  ) : (
                    vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} {vehicle.plate_number ? `(${vehicle.plate_number})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button 
                className="w-full h-14 text-lg"
                onClick={startShift}
                disabled={!selectedVehicleId || isStartingShift}
              >
                {isStartingShift ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                Go Online
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Go Offline Button */}
        {!activeDelivery && driver.status === 'available' && (
          <Card>
            <CardContent className="pt-6">
              <Button 
                className="w-full h-14 text-lg"
                variant="destructive"
                onClick={endShift}
              >
                Go Offline
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Delivery Card */}
        {activeDelivery && (
          <Card className="border-2 border-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Active Delivery
                </CardTitle>
                <Badge>{activeDelivery.order_number}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{activeDelivery.delivery_address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{activeDelivery.customer_name} - {activeDelivery.customer_phone}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Amount Due:</span>
                <span className="text-lg font-bold">
                  {activeDelivery.payment_method_type === 'cod' 
                    ? formatCurrency(activeDelivery.total)
                    : <span className="text-green-600">PAID</span>
                  }
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={openNavigation}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Navigate
                </Button>
                <Button variant="outline" onClick={callCustomer}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              </div>

              <Button className="w-full h-14 text-lg" onClick={markDelivered}>
                <CheckCircle className="h-5 w-5 mr-2" />
                Mark as Delivered
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Banknote className="h-8 w-8 mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(driver.cod_balance)}</p>
              <p className="text-sm text-muted-foreground">COD Balance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Package className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{driver.total_deliveries}</p>
              <p className="text-sm text-muted-foreground">Total Deliveries</p>
            </CardContent>
          </Card>
        </div>

        {/* Waiting for orders message */}
        {driver.status === 'available' && !activeDelivery && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-medium">Waiting for orders...</p>
              <p className="text-sm text-muted-foreground">
                You'll receive a notification when a new order is assigned
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
