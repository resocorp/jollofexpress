import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import type { DateRange } from '@/lib/date-range';

const qs = (range: DateRange): string => `from=${range.from}&to=${range.to}`;

interface OverviewMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  avgPrepTime: number;
  revenueGrowth: number;
  ordersGrowth: number;
  aovGrowth: number;
  prepTimeChange: number;
}

interface RevenueTrendData {
  date: string;
  revenue: number;
  orders: number;
}

interface VariationBreakdown {
  option: string;
  quantity: number;
  revenue: number;
}

interface TopItemData {
  itemName: string;
  quantity: number;
  revenue: number;
  variations?: VariationBreakdown[];
}

interface TopAddonData {
  addonName: string;
  quantity: number;
}

interface TopItemsResponse {
  topItems: TopItemData[];
  topAddons: TopAddonData[];
}

interface CategoryPerformance {
  categoryName: string;
  revenue: number;
  orders: number;
  percentage: number;
}

interface KitchenPerformance {
  averagePrepTime: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  completionRate: number;
  prepTimeByHour: { hour: number; avgPrepTime: number; orders: number }[];
}

export function useOverviewMetrics(range: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'overview', range.from, range.to],
    queryFn: () => get<OverviewMetrics>(`/api/admin/analytics/overview?${qs(range)}`),
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useRevenueTrend(range: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'revenue-trend', range.from, range.to],
    queryFn: () => get<RevenueTrendData[]>(`/api/admin/analytics/revenue-trend?${qs(range)}`),
    refetchInterval: 60000,
  });
}

export function useTopItems(range: DateRange, limit: number = 10) {
  return useQuery({
    queryKey: ['analytics', 'top-items', range.from, range.to, limit],
    queryFn: () =>
      get<TopItemsResponse>(`/api/admin/analytics/top-items?${qs(range)}&limit=${limit}`),
    refetchInterval: 60000,
  });
}

export function useCategoryPerformance(range: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'category-performance', range.from, range.to],
    queryFn: () =>
      get<CategoryPerformance[]>(`/api/admin/analytics/category-performance?${qs(range)}`),
    refetchInterval: 60000,
  });
}

export function useKitchenPerformance(range: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'kitchen-performance', range.from, range.to],
    queryFn: () =>
      get<KitchenPerformance>(`/api/admin/analytics/kitchen-performance?${qs(range)}`),
    refetchInterval: 60000,
  });
}
