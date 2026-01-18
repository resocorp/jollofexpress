'use client';

import { useState, useEffect, useCallback } from 'react';
import { get } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Search, 
  Users, 
  MapPin, 
  UserCheck, 
  Eye, 
  Loader2,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
  Banknote,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Tag
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface CustomerLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  order_count: number;
  last_order_date: string;
}

interface Customer {
  customer_phone: string;
  customer_name: string;
  customer_email?: string;
  delivery_address?: string;
  delivery_city?: string;
  customer_latitude?: number;
  customer_longitude?: number;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
  promo_codes_used: string[];
  has_location: boolean;
  locations: CustomerLocation[];
  location_count: number;
  influencer_id?: string;
  influencer_name?: string;
  influencer_code?: string;
  first_promo_code?: string;
  attribution_date?: string;
}

interface Summary {
  total_customers: number;
  customers_with_location: number;
  customers_with_influencer: number;
  total_revenue: number;
  total_orders: number;
}

interface Influencer {
  id: string;
  name: string;
  code: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hasLocationFilter, setHasLocationFilter] = useState<string>('all');
  const [influencerFilter, setInfluencerFilter] = useState<string>('all');
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [page, setPage] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const pageSize = 20;

  const fetchInfluencers = useCallback(async () => {
    try {
      const data = await get<{ influencers: Influencer[] }>('/api/admin/influencers');
      setInfluencers(data.influencers || []);
    } catch (error) {
      console.error('Failed to fetch influencers:', error);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
        sort_by: 'last_order_date',
        sort_order: 'desc',
      });

      if (search) params.set('search', search);
      if (hasLocationFilter !== 'all') params.set('has_location', hasLocationFilter);
      if (influencerFilter !== 'all') params.set('influencer_id', influencerFilter);

      const data = await get<{
        customers: Customer[];
        summary: Summary;
        pagination: { total: number };
      }>(`/api/admin/customers?${params}`);
      
      setCustomers(data.customers || []);
      setSummary(data.summary);
      setTotalCustomers(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, hasLocationFilter, influencerFilter]);

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(0);
  }, [search, hasLocationFilter, influencerFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalPages = Math.ceil(totalCustomers / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">View and manage your unique customers</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_customers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.total_orders.toLocaleString()} total orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">With Location</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.customers_with_location.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.total_customers > 0 
                  ? Math.round((summary.customers_with_location / summary.total_customers) * 100)
                  : 0}% of customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">From Influencers</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.customers_with_influencer.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.total_customers > 0 
                  ? Math.round((summary.customers_with_influencer / summary.total_customers) * 100)
                  : 0}% attributed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(summary.total_customers > 0 ? summary.total_revenue / summary.total_customers : 0)} per customer
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email, or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={hasLocationFilter} onValueChange={setHasLocationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Location Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="true">With Location</SelectItem>
                <SelectItem value="false">Without Location</SelectItem>
              </SelectContent>
            </Select>

            <Select value={influencerFilter} onValueChange={setInfluencerFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Influencer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Influencers</SelectItem>
                {influencers.map((inf) => (
                  <SelectItem key={inf.id} value={inf.id}>
                    {inf.name} ({inf.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>
            Showing {customers.length} of {totalCustomers} customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Influencer</TableHead>
                    <TableHead>Last Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.customer_phone}>
                      <TableCell>
                        <div className="font-medium">{customer.customer_name}</div>
                        {customer.delivery_city && (
                          <div className="text-xs text-muted-foreground">{customer.delivery_city}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{customer.customer_phone}</div>
                        {customer.customer_email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {customer.customer_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{customer.total_orders} orders</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(customer.total_spent)}</TableCell>
                      <TableCell>
                        {customer.has_location ? (
                          <a
                            href={`https://www.google.com/maps?q=${customer.customer_latitude},${customer.customer_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-green-600 hover:underline"
                          >
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs">View</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.influencer_name ? (
                          <Badge variant="outline" className="text-xs">
                            {customer.influencer_name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(customer.last_order_date), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCustomer?.customer_name}
              {selectedCustomer?.influencer_name && (
                <Badge variant="secondary" className="ml-2">
                  <UserCheck className="h-3 w-3 mr-1" />
                  {selectedCustomer.influencer_name}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {selectedCustomer?.customer_phone}
              </span>
              {selectedCustomer?.customer_email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {selectedCustomer.customer_email}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="locations" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Locations {selectedCustomer.location_count > 0 && `(${selectedCustomer.location_count})`}
                </TabsTrigger>
                <TabsTrigger value="attribution">Attribution</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Order Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-orange-50 rounded-lg text-center border border-orange-100">
                    <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                    <p className="text-xl font-bold text-orange-700">{selectedCustomer.total_orders}</p>
                    <p className="text-xs text-orange-600">Total Orders</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center border border-green-100">
                    <Banknote className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <p className="text-xl font-bold text-green-700">{formatCurrency(selectedCustomer.total_spent)}</p>
                    <p className="text-xs text-green-600">Total Spent</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-100">
                    <Banknote className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(selectedCustomer.avg_order_value)}</p>
                    <p className="text-xs text-blue-600">Avg Order</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      First Order
                    </p>
                    <p className="font-medium text-sm">
                      {format(new Date(selectedCustomer.first_order_date), 'PPP')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Last Order
                    </p>
                    <p className="font-medium text-sm">
                      {format(new Date(selectedCustomer.last_order_date), 'PPP')}
                    </p>
                  </div>
                </div>

                {/* Last Delivery Address */}
                {selectedCustomer.delivery_address && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Last Delivery Address</p>
                    <p className="font-medium text-sm">
                      {selectedCustomer.delivery_address}
                      {selectedCustomer.delivery_city && `, ${selectedCustomer.delivery_city}`}
                    </p>
                  </div>
                )}

                {/* Promo Codes Used */}
                {selectedCustomer.promo_codes_used.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Promo Codes Used
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCustomer.promo_codes_used.map((code) => (
                        <Badge key={code} variant="outline" className="text-xs">{code}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Locations Tab */}
              <TabsContent value="locations" className="space-y-3 mt-4">
                {selectedCustomer.locations && selectedCustomer.locations.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.location_count} unique delivery location{selectedCustomer.location_count !== 1 ? 's' : ''} recorded
                    </p>
                    <div className="space-y-2">
                      {selectedCustomer.locations.map((loc, index) => (
                        <div
                          key={`${loc.latitude}-${loc.longitude}`}
                          className="p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Navigation className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-800">
                                  Location {index + 1}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {loc.order_count} order{loc.order_count !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              {loc.address && (
                                <p className="text-sm text-green-700 ml-6">
                                  {loc.address}{loc.city && `, ${loc.city}`}
                                </p>
                              )}
                              <p className="text-xs text-green-600 ml-6 mt-1">
                                {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                              </p>
                              <p className="text-xs text-muted-foreground ml-6 mt-1">
                                Last used: {formatDistanceToNow(new Date(loc.last_order_date), { addSuffix: true })}
                              </p>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Map
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No location data shared yet</p>
                    <p className="text-xs mt-1">Customer hasn't shared their GPS location</p>
                  </div>
                )}
              </TabsContent>

              {/* Attribution Tab */}
              <TabsContent value="attribution" className="space-y-4 mt-4">
                {selectedCustomer.influencer_name ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-blue-800">
                          {selectedCustomer.influencer_name}
                        </p>
                        <p className="text-sm text-blue-600">
                          Influencer Code: <span className="font-mono">{selectedCustomer.influencer_code}</span>
                        </p>
                        {selectedCustomer.first_promo_code && (
                          <div className="mt-3 p-2 bg-blue-100 rounded">
                            <p className="text-xs text-blue-700 font-medium">First Promo Code Used</p>
                            <p className="font-mono text-blue-800">{selectedCustomer.first_promo_code}</p>
                          </div>
                        )}
                        {selectedCustomer.attribution_date && (
                          <p className="text-xs text-blue-500 mt-2">
                            Attributed on {format(new Date(selectedCustomer.attribution_date), 'PPP')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-3 p-2 bg-white rounded border">
                          💡 This customer was attributed to {selectedCustomer.influencer_name} when they first used the promo code <strong>{selectedCustomer.first_promo_code}</strong>. 
                          All subsequent orders from this customer will generate commission for this influencer.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No influencer attribution</p>
                    <p className="text-xs mt-1">This customer hasn't used an influencer promo code</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
