import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';

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

interface TopItemData {
  itemName: string;
  quantity: number;
  revenue: number;
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

export function useOverviewMetrics(period: string = '30') {
  return useQuery({
    queryKey: ['analytics', 'overview', period],
    queryFn: () => get<OverviewMetrics>(`/api/admin/analytics/overview?period=${period}`),
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useRevenueTrend(period: string = '30') {
  return useQuery({
    queryKey: ['analytics', 'revenue-trend', period],
    queryFn: () => get<RevenueTrendData[]>(`/api/admin/analytics/revenue-trend?period=${period}`),
    refetchInterval: 60000,
  });
}

export function useTopItems(period: string = '30', limit: number = 10) {
  return useQuery({
    queryKey: ['analytics', 'top-items', period, limit],
    queryFn: () => get<TopItemData[]>(`/api/admin/analytics/top-items?period=${period}&limit=${limit}`),
    refetchInterval: 60000,
  });
}

export function useCategoryPerformance(period: string = '30') {
  return useQuery({
    queryKey: ['analytics', 'category-performance', period],
    queryFn: () => get<CategoryPerformance[]>(`/api/admin/analytics/category-performance?period=${period}`),
    refetchInterval: 60000,
  });
}

export function useKitchenPerformance(period: string = '30') {
  return useQuery({
    queryKey: ['analytics', 'kitchen-performance', period],
    queryFn: () => get<KitchenPerformance>(`/api/admin/analytics/kitchen-performance?period=${period}`),
    refetchInterval: 60000,
  });
}
