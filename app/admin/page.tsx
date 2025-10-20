'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingBag, TrendingUp, Clock } from 'lucide-react';

export default function AdminDashboard() {
  // TODO: Fetch real data from API
  const stats = [
    {
      title: 'Total Revenue',
      value: '₦0',
      change: '+0%',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Total Orders',
      value: '0',
      change: '+0%',
      icon: ShoppingBag,
      color: 'text-blue-600',
    },
    {
      title: 'Average Order Value',
      value: '₦0',
      change: '+0%',
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      title: 'Avg Prep Time',
      value: '0 min',
      change: '-0%',
      icon: Clock,
      color: 'text-orange-600',
    },
  ];

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
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
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
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No orders yet</p>
            <p className="text-sm mt-1">Orders will appear here once customers start ordering</p>
          </div>
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
