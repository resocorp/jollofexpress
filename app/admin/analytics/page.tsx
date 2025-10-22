'use client';

import { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  ChefHat,
  Package,
} from 'lucide-react';
import { MetricCard } from '@/components/admin/analytics/metric-card';
import {
  useOverviewMetrics,
  useRevenueTrend,
  useTopItems,
  useCategoryPerformance,
  useKitchenPerformance,
} from '@/hooks/use-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30');

  const { data: overview, isLoading: overviewLoading } = useOverviewMetrics(period);
  const { data: revenueTrend, isLoading: trendLoading } = useRevenueTrend(period);
  const { data: topItems, isLoading: topItemsLoading } = useTopItems(period);
  const { data: categoryPerformance, isLoading: categoryLoading } = useCategoryPerformance(period);
  const { data: kitchenPerformance, isLoading: kitchenLoading } = useKitchenPerformance(period);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed insights into your restaurant operations
          </p>
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

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={overview ? formatCurrency(overview.totalRevenue) : '₦0'}
          change={overview?.revenueGrowth}
          icon={DollarSign}
          iconClassName="text-green-600"
        />
        <MetricCard
          title="Total Orders"
          value={overview?.totalOrders || 0}
          change={overview?.ordersGrowth}
          icon={ShoppingBag}
          iconClassName="text-blue-600"
        />
        <MetricCard
          title="Average Order Value"
          value={overview ? formatCurrency(overview.averageOrderValue) : '₦0'}
          change={overview?.aovGrowth}
          icon={TrendingUp}
          iconClassName="text-purple-600"
        />
        <MetricCard
          title="Avg Prep Time"
          value={overview ? `${Math.round(overview.avgPrepTime)} min` : '0 min'}
          change={overview?.prepTimeChange}
          icon={Clock}
          iconClassName="text-orange-600"
        />
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue and order volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Loading chart...</p>
            </div>
          ) : revenueTrend && revenueTrend.length > 0 ? (
            <ChartContainer
              config={{
                revenue: {
                  label: 'Revenue',
                  color: 'hsl(var(--chart-1))',
                },
                orders: {
                  label: 'Orders',
                  color: 'hsl(var(--chart-2))',
                },
              }}
              className="h-[300px]"
            >
              <AreaChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString();
                      }}
                      formatter={(value, name) => {
                        if (name === 'revenue') {
                          return [formatCurrency(Number(value)), 'Revenue'];
                        }
                        return [value, 'Orders'];
                      }}
                    />
                  }
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  fill="var(--color-revenue)"
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
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">No data available for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
            <CardDescription>Best performing menu items by quantity</CardDescription>
          </CardHeader>
          <CardContent>
            {topItemsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : topItems && topItems.length > 0 ? (
              <ChartContainer
                config={{
                  quantity: {
                    label: 'Quantity Sold',
                    color: 'hsl(var(--chart-3))',
                  },
                }}
                className="h-[300px]"
              >
                <BarChart data={topItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="itemName" type="category" width={120} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, props) => {
                          const content = `Quantity: ${value} | Revenue: ${formatCurrency(props.payload.revenue)}`;
                          return [content, props.payload.itemName];
                        }}
                      />
                    }
                  />
                  <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No items sold in this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Revenue breakdown by menu category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : categoryPerformance && categoryPerformance.length > 0 ? (
              <div className="space-y-4">
                {categoryPerformance.map((category) => (
                  <div key={category.categoryName} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category.categoryName}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(category.revenue)} ({category.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {category.orders} orders
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No category data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kitchen Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Kitchen Performance</CardTitle>
          <CardDescription>Order fulfillment and preparation metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {kitchenLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading kitchen metrics...</p>
            </div>
          ) : kitchenPerformance ? (
            <div className="space-y-6">
              {/* Kitchen Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Completed Orders</p>
                  <p className="text-2xl font-bold">{kitchenPerformance.completedOrders}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Active Orders</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {kitchenPerformance.activeOrders}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {kitchenPerformance.completionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="text-2xl font-bold text-red-600">
                    {kitchenPerformance.cancelledOrders}
                  </p>
                </div>
              </div>

              {/* Prep Time by Hour */}
              {kitchenPerformance.prepTimeByHour.length > 0 && (
                <>
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-medium mb-4">Average Prep Time by Hour</h4>
                    <ChartContainer
                      config={{
                        avgPrepTime: {
                          label: 'Avg Prep Time (min)',
                          color: 'hsl(var(--chart-4))',
                        },
                      }}
                      className="h-[200px]"
                    >
                      <BarChart data={kitchenPerformance.prepTimeByHour}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={(value) => `${value}:00`}
                        />
                        <YAxis />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name, props) => {
                                const content = `Avg Time: ${Math.round(Number(value))} min | Orders: ${props.payload.orders}`;
                                return [content, `${props.payload.hour}:00`];
                              }}
                            />
                          }
                        />
                        <Bar dataKey="avgPrepTime" fill="var(--color-avgPrepTime)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No kitchen data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
