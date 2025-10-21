// React Query hooks for restaurant settings
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '@/lib/api-client';
import type {
  RestaurantInfo,
  OperatingHours,
  DeliverySettings,
  PaymentSettings,
  OrderSettings,
  RestaurantStatusResponse,
} from '@/types/database';

/**
 * Fetch restaurant info (public)
 */
export function useRestaurantInfo() {
  return useQuery({
    queryKey: ['restaurant-info'],
    queryFn: () => get<RestaurantInfo>('/api/restaurant/info'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch restaurant status (open/closed, prep time)
 */
export function useRestaurantStatus() {
  return useQuery({
    queryKey: ['restaurant-status'],
    queryFn: () => get<RestaurantStatusResponse>('/api/restaurant/status'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Fetch delivery cities
 */
export function useDeliveryCities() {
  return useQuery({
    queryKey: ['delivery-cities'],
    queryFn: () => get<string[]>('/api/delivery/cities'),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Fetch delivery settings (public)
 */
export function useDeliverySettings() {
  return useQuery({
    queryKey: ['delivery-settings'],
    queryFn: () => get<DeliverySettings>('/api/delivery/settings'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch all settings (admin)
 */
export function useAllSettings() {
  return useQuery({
    queryKey: ['all-settings'],
    queryFn: () =>
      get<{
        restaurant_info: RestaurantInfo;
        operating_hours: OperatingHours;
        delivery_settings: DeliverySettings;
        payment_settings: PaymentSettings;
        order_settings: OrderSettings;
      }>('/api/admin/settings'),
  });
}

/**
 * Update settings (admin)
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      patch<{ success: boolean }>('/api/admin/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-settings'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-info'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-status'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-cities'] });
    },
  });
}

/**
 * Update restaurant operational status (kitchen)
 */
export function useUpdateRestaurantStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { is_open?: boolean; prep_time?: number }) =>
      patch<{ success: boolean }>('/api/kitchen/restaurant/status', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-status'] });
    },
  });
}
