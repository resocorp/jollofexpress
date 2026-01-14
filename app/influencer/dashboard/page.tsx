'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfluencerDashboard } from '@/hooks/use-influencer';
import { formatCurrency } from '@/lib/formatters';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  DollarSign,
  Users,
  ShoppingBag,
  TrendingUp,
  Copy,
  CheckCircle,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PERIOD_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

export default function InfluencerDashboardPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [period, setPeriod] = useState('30');
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useInfluencerDashboard(token, period);

  const copyPromoCode = () => {
    if (data?.promo_code?.code) {
      navigator.clipboard.writeText(data.promo_code.code);
      setCopied(true);
      toast.success('Promo code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No access token provided. Please use the link provided by the admin to access your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Unable to load dashboard. Your access token may be invalid or expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {data.influencer.name}!</h1>
              <p className="text-muted-foreground">
                Track your performance and earnings
              </p>
            </div>
            {data.promo_code && (
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 rounded-lg px-4 py-2">
                  <p className="text-xs text-muted-foreground">Your Promo Code</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-primary">
                      {data.promo_code.code}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={copyPromoCode}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Badge variant={data.promo_code.is_active ? 'default' : 'secondary'}>
                  {data.promo_code.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Earnings Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.earnings.total_earned)}
              </div>
              <p className="text-xs text-muted-foreground">All time earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(data.earnings.pending)}
              </div>
              <p className="text-xs text-muted-foreground">To be paid</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.earnings.paid)}
              </div>
              <p className="text-xs text-muted-foreground">Already received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.influencer.commission_type === 'percentage'
                  ? `${data.influencer.commission_value}%`
                  : formatCurrency(data.influencer.commission_value)}
              </div>
              <p className="text-xs text-muted-foreground">Per order</p>
            </CardContent>
          </Card>
        </div>

        {/* Period Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance</CardTitle>
                <CardDescription>Your stats for the selected period</CardDescription>
              </div>
              <Tabs value={period} onValueChange={setPeriod}>
                <TabsList>
                  {PERIOD_OPTIONS.map((option) => (
                    <TabsTrigger key={option.value} value={option.value}>
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <ShoppingBag className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{data.period_stats.total_orders}</p>
                <p className="text-sm text-muted-foreground">Orders</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <DollarSign className="h-6 w-6 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{formatCurrency(data.period_stats.total_revenue)}</p>
                <p className="text-sm text-muted-foreground">Revenue Generated</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Wallet className="h-6 w-6 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{formatCurrency(data.period_stats.total_commission)}</p>
                <p className="text-sm text-muted-foreground">Commission Earned</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Users className="h-6 w-6 mx-auto text-orange-500 mb-2" />
                <p className="text-2xl font-bold">{data.period_stats.new_customers}</p>
                <p className="text-sm text-muted-foreground">New Customers</p>
              </div>
            </div>

            {/* Trend Chart */}
            {data.trend && data.trend.length > 0 && (
              <ChartContainer
                config={{
                  commission: {
                    label: 'Commission',
                    color: 'hsl(var(--chart-1))',
                  },
                  orders: {
                    label: 'Orders',
                    color: 'hsl(var(--chart-2))',
                  },
                }}
                className="h-[250px]"
              >
                <AreaChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis yAxisId="left" tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value, name) => {
                          if (name === 'commission') return [formatCurrency(Number(value)), 'Commission'];
                          return [value, 'Orders'];
                        }}
                      />
                    }
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="commission"
                    stroke="var(--color-commission)"
                    fill="var(--color-commission)"
                    fillOpacity={0.2}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    stroke="var(--color-orders)"
                    fill="var(--color-orders)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Customers who used your code</CardDescription>
            </CardHeader>
            <CardContent>
              {data.top_customers && data.top_customers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_customers.map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.customer_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {customer.customer_phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{customer.total_orders}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(customer.total_spent)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No customers yet. Share your promo code to start earning!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payout History */}
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Your monthly payouts</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recent_payouts && data.recent_payouts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent_payouts.map((payout: any) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          {new Date(payout.payout_month).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payout.commission_earned)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              payout.status === 'paid'
                                ? 'default'
                                : payout.status === 'pending'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {payout.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No payouts yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Time Stats */}
        <Card>
          <CardHeader>
            <CardTitle>All Time Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{data.all_time_stats.total_orders}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{formatCurrency(data.all_time_stats.total_revenue)}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{data.total_customers}</p>
                <p className="text-sm text-muted-foreground">Total Customers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{data.promo_code?.used_count || 0}</p>
                <p className="text-sm text-muted-foreground">Code Uses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
