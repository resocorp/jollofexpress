import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/api-client';

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
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/analytics/overview?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch overview metrics');
      return res.json() as Promise<OverviewMetrics>;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useRevenueTrend(period: string = '30') {
  return useQuery({
    queryKey: ['analytics', 'revenue-trend', period],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/analytics/revenue-trend?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch revenue trend');
      return res.json() as Promise<RevenueTrendData[]>;
    },
    refetchInterval: 60000,
  });
}

export function useTopItems(period: string = '30', limit: number = 10) {
  return useQuery({
    queryKey: ['analytics', 'top-items', period, limit],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/analytics/top-items?period=${period}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch top items');
      return res.json() as Promise<TopItemData[]>;
    },
    refetchInterval: 60000,
  });
}

export function useCategoryPerformance(period: string = '30') {
  return useQuery({
    queryKey: ['analytics', 'category-performance', period],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/analytics/category-performance?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch category performance');
      return res.json() as Promise<CategoryPerformance[]>;
    },
    refetchInterval: 60000,
  });
}

export function useKitchenPerformance(period: string = '30') {
  return useQuery({
    queryKey: ['analytics', 'kitchen-performance', period],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/analytics/kitchen-performance?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch kitchen performance');
      return res.json() as Promise<KitchenPerformance>;
    },
    refetchInterval: 60000,
  });
}
