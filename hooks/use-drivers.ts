// Driver management hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.available) params.set('available', 'true');
      
      const response = await fetch(`/api/drivers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch drivers');
      return response.json() as Promise<Driver[]>;
    },
  });
}

// Fetch single driver's real-time location
export function useDriverLocation(driverId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['driver-location', driverId],
    queryFn: async () => {
      if (!driverId) throw new Error('No driver ID');
      const response = await fetch(`/api/drivers/${driverId}/location`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch driver location');
      }
      return response.json() as Promise<DriverLocation>;
    },
    enabled: !!driverId && enabled,
    refetchInterval: 5000, // Poll every 5 seconds for live tracking
    staleTime: 3000,
  });
}

// Create new driver
export function useCreateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Driver>) => {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create driver');
      }
      return response.json() as Promise<Driver>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

// Assign driver to order
export function useAssignDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: string; driverId: string }) => {
      const response = await fetch('/api/delivery/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, driver_id: driverId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign driver');
      }
      return response.json();
    },
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
    mutationFn: async ({ 
      assignmentId, 
      status 
    }: { 
      assignmentId: string; 
      status: 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
    }) => {
      const response = await fetch(`/api/delivery/assignments/${assignmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
