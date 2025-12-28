'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Bike, 
  Phone, 
  MapPin, 
  Banknote, 
  Package,
  Loader2,
  Edit,
  MoreHorizontal,
  Trash2,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: 'available' | 'busy' | 'offline';
  vehicle_type: string;
  vehicle_plate?: string;
  cod_balance: number;
  total_deliveries: number;
  traccar_device_id?: number;
  is_active: boolean;
  created_at: string;
}

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_type: 'motorcycle',
    vehicle_plate: '',
    traccar_device_id: '',
  });

  // Fetch drivers
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: async () => {
      const res = await fetch('/api/drivers');
      if (!res.ok) throw new Error('Failed to fetch drivers');
      return res.json() as Promise<Driver[]>;
    },
  });

  // Create driver mutation
  const createDriver = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          traccar_device_id: data.traccar_device_id ? parseInt(data.traccar_device_id) : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create driver');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      setIsAddOpen(false);
      resetForm();
      toast.success('Driver created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update driver mutation
  const updateDriver = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Driver> }) => {
      const res = await fetch(`/api/drivers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update driver');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      setEditingDriver(null);
      toast.success('Driver updated');
    },
  });

  // Delete driver mutation
  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/drivers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      if (!res.ok) throw new Error('Failed to deactivate driver');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      toast.success('Driver deactivated');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      vehicle_type: 'motorcycle',
      vehicle_plate: '',
      traccar_device_id: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }
    createDriver.mutate(formData);
  };

  const getStatusBadge = (status: Driver['status']) => {
    const variants = {
      available: 'bg-green-100 text-green-800',
      busy: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      available: '🟢 Online',
      busy: '🟡 On Delivery',
      offline: '🔴 Offline',
    };
    return <Badge className={variants[status]}>{labels[status]}</Badge>;
  };

  // Stats
  const stats = {
    total: drivers.length,
    online: drivers.filter(d => d.status === 'available').length,
    onDelivery: drivers.filter(d => d.status === 'busy').length,
    totalCod: drivers.reduce((sum, d) => sum + Number(d.cod_balance), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bike className="h-8 w-8" />
            Driver Management
          </h1>
          <p className="text-muted-foreground">Manage delivery drivers and track performance</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
                <DialogDescription>
                  Create a new delivery driver account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08012345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_type">Vehicle Type</Label>
                    <Select
                      value={formData.vehicle_type}
                      onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motorcycle">Motorcycle</SelectItem>
                        <SelectItem value="bicycle">Bicycle</SelectItem>
                        <SelectItem value="car">Car</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_plate">Plate Number</Label>
                    <Input
                      id="vehicle_plate"
                      value={formData.vehicle_plate}
                      onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                      placeholder="ABC-123"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="traccar_device_id">Traccar Device ID (Optional)</Label>
                  <Input
                    id="traccar_device_id"
                    type="number"
                    value={formData.traccar_device_id}
                    onChange={(e) => setFormData({ ...formData, traccar_device_id: e.target.value })}
                    placeholder="Enter Sinotrack device ID from Traccar"
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to a GPS tracker device in Traccar for real-time location
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDriver.isPending}>
                  {createDriver.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Driver
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
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
                <p className="text-sm text-muted-foreground">Online Now</p>
                <p className="text-3xl font-bold text-green-600">{stats.online}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                🟢
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Delivery</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.onDelivery}</p>
              </div>
              <Package className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total COD Balance</p>
                <p className="text-3xl font-bold text-amber-600">{formatCurrency(stats.totalCod)}</p>
              </div>
              <Banknote className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Drivers</CardTitle>
          <CardDescription>View and manage all registered drivers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8">
              <Bike className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-medium">No drivers yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first driver to start managing deliveries
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Deliveries</TableHead>
                  <TableHead>COD Balance</TableHead>
                  <TableHead>GPS</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {driver.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(driver.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="capitalize">{driver.vehicle_type}</p>
                        {driver.vehicle_plate && (
                          <p className="text-muted-foreground">{driver.vehicle_plate}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{driver.total_deliveries}</span>
                    </TableCell>
                    <TableCell>
                      <span className={driver.cod_balance > 0 ? 'text-amber-600 font-medium' : ''}>
                        {formatCurrency(driver.cod_balance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {driver.traccar_device_id ? (
                        <Badge variant="outline" className="text-green-600">
                          <MapPin className="h-3 w-3 mr-1" />
                          Linked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400">
                          Not linked
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDriver(driver)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {driver.cod_balance > 0 && (
                            <DropdownMenuItem>
                              <Banknote className="h-4 w-4 mr-2" />
                              Settle COD
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteDriver.mutate(driver.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
