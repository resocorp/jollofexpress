// Driver management hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '@/lib/api-client';
import type { Driver, DeliveryAssignment } from '@/types/database';

interface DriverLocation {
  latitude: number;
  longitude: number;
  speed?: number;
  course?: number;
  updated_at?: string;
  source: 'traccar' | 'cached';
}

// Fetch all drivers
export function useDrivers(options?: { status?: string; available?: boolean }) {
  return useQuery({
    queryKey: ['drivers', options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.available) params.set('available', 'true');
      const queryString = params.toString();
      return get<Driver[]>(`/api/drivers${queryString ? `?${queryString}` : ''}`);
    },
  });
}

// Fetch single driver's real-time location
export function useDriverLocation(driverId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['driver-location', driverId],
    queryFn: () => get<DriverLocation | null>(`/api/drivers/${driverId}/location`),
    enabled: !!driverId && enabled,
    refetchInterval: 5000, // Poll every 5 seconds for live tracking
    staleTime: 3000,
  });
}

// Create new driver
export function useCreateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Driver>) =>
      post<Driver>('/api/drivers', data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

// Assign driver to order
export function useAssignDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string }) =>
      post<DeliveryAssignment>('/api/delivery/assign', { order_id: orderId, driver_id: driverId }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
}

// Update delivery status (for driver app)
export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      assignmentId, 
      status 
    }: { 
      assignmentId: string; 
      status: 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
    }) =>
      patch<DeliveryAssignment>(`/api/delivery/assignments/${assignmentId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
