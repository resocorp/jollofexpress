'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingBag, TrendingUp, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/formatters';

interface DashboardStats {
  totalRevenue: { value: number; change: number };
  totalOrders: { value: number; change: number };
  avgOrderValue: { value: number; change: number };
  avgPrepTime: { value: number; change: number };
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
}

interface DashboardData {
  stats: DashboardStats;
  recentOrders: RecentOrder[];
}

async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('/api/admin/dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardData,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const stats = data?.stats
    ? [
        {
          title: 'Total Revenue',
          value: formatCurrency(data.stats.totalRevenue.value),
          change: formatChange(data.stats.totalRevenue.change),
          icon: DollarSign,
          color: 'text-green-600',
          changeColor: data.stats.totalRevenue.change >= 0 ? 'text-green-600' : 'text-red-600',
        },
        {
          title: 'Total Orders',
          value: data.stats.totalOrders.value.toString(),
          change: formatChange(data.stats.totalOrders.change),
          icon: ShoppingBag,
          color: 'text-blue-600',
          changeColor: data.stats.totalOrders.change >= 0 ? 'text-green-600' : 'text-red-600',
        },
        {
          title: 'Average Order Value',
          value: formatCurrency(data.stats.avgOrderValue.value),
          change: formatChange(data.stats.avgOrderValue.change),
          icon: TrendingUp,
          color: 'text-purple-600',
          changeColor: data.stats.avgOrderValue.change >= 0 ? 'text-green-600' : 'text-red-600',
        },
        {
          title: 'Avg Prep Time',
          value: `${data.stats.avgPrepTime.value} min`,
          change: formatChange(data.stats.avgPrepTime.change),
          icon: Clock,
          color: 'text-orange-600',
          changeColor: data.stats.avgPrepTime.change <= 0 ? 'text-green-600' : 'text-red-600',
        },
      ]
    : [];

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's what's happening with your restaurant today.
          </p>
        </div>
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load dashboard data</p>
            <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's what's happening with your restaurant today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-xs text-muted-foreground mt-1">--</p>
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className={`text-xs mt-1 ${stat.changeColor}`}>
                    {stat.change} from last month
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading orders...</p>
            </div>
          ) : !data?.recentOrders || data.recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No orders yet</p>
              <p className="text-sm mt-1">Orders will appear here once customers start ordering</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{order.order_number}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {order.status}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          order.payment_status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : order.payment_status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(order.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menu Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add, edit, or remove menu items
            </p>
            <a href="/admin/menu" className="text-sm text-primary hover:underline">
              Manage Menu →
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View and manage all orders
            </p>
            <a href="/admin/orders" className="text-sm text-primary hover:underline">
              View Orders →
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restaurant Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure hours, fees, and more
            </p>
            <a href="/admin/settings" className="text-sm text-primary hover:underline">
              Settings →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
