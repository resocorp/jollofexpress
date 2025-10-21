// React Query hooks for kitchen capacity monitoring
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';

export interface KitchenCapacityStatus {
  isOpen: boolean;
  autoCloseEnabled: boolean;
  activeOrders: number;
  maxOrders: number;
  capacityPercentage: number;
  canAcceptOrders: boolean;
}

/**
 * Fetch current kitchen capacity status
 * Useful for displaying capacity indicators in admin/kitchen views
 */
export function useKitchenCapacity() {
  return useQuery({
    queryKey: ['kitchen-capacity'],
    queryFn: () => get<KitchenCapacityStatus>('/api/kitchen/capacity'),
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}
