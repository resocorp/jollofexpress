import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api-client';
import type { 
  DeliveryRegion, 
  DeliveryRegionGroup, 
  DeliveryRegionGroupWithRegions 
} from '@/types/database';

interface DeliveryRegionsResponse {
  groups: DeliveryRegionGroupWithRegions[];
  ungrouped: DeliveryRegion[];
  all_regions: DeliveryRegion[];
}

interface AdminDeliveryRegionsResponse extends DeliveryRegionsResponse {
  all_groups: DeliveryRegionGroup[];
}

// ============ PUBLIC HOOKS ============

/**
 * Fetch active delivery regions for checkout
 */
export function useDeliveryRegions() {
  return useQuery({
    queryKey: ['delivery-regions'],
    queryFn: () => get<DeliveryRegionsResponse>('/api/delivery/regions'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============ ADMIN HOOKS ============

/**
 * Fetch all delivery regions (including inactive) for admin
 */
export function useAdminDeliveryRegions() {
  return useQuery({
    queryKey: ['admin-delivery-regions'],
    queryFn: () => get<AdminDeliveryRegionsResponse>('/api/admin/delivery-regions'),
  });
}

/**
 * Fetch all region groups for admin
 */
export function useAdminRegionGroups() {
  return useQuery({
    queryKey: ['admin-region-groups'],
    queryFn: () => get<{ groups: DeliveryRegionGroup[] }>('/api/admin/delivery-regions/groups'),
  });
}

/**
 * Create a new delivery region
 */
export function useCreateDeliveryRegion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      group_id?: string | null;
      name: string;
      description?: string;
      delivery_fee: number;
      free_delivery_threshold?: number | null;
      display_order?: number;
      is_active?: boolean;
    }) => post<{ region: DeliveryRegion }>('/api/admin/delivery-regions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-regions'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-regions'] });
    },
  });
}

/**
 * Update a delivery region
 */
export function useUpdateDeliveryRegion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      group_id?: string | null;
      name?: string;
      description?: string | null;
      delivery_fee?: number;
      free_delivery_threshold?: number | null;
      display_order?: number;
      is_active?: boolean;
    }) => patch<{ region: DeliveryRegion }>(`/api/admin/delivery-regions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-regions'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-regions'] });
    },
  });
}

/**
 * Delete a delivery region
 */
export function useDeleteDeliveryRegion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/admin/delivery-regions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-regions'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-regions'] });
    },
  });
}

/**
 * Create a new region group
 */
export function useCreateRegionGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      display_order?: number;
      is_active?: boolean;
    }) => post<{ group: DeliveryRegionGroup }>('/api/admin/delivery-regions/groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-regions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-region-groups'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-regions'] });
    },
  });
}

/**
 * Update a region group
 */
export function useUpdateRegionGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      name?: string;
      description?: string | null;
      display_order?: number;
      is_active?: boolean;
    }) => patch<{ group: DeliveryRegionGroup }>(`/api/admin/delivery-regions/groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-regions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-region-groups'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-regions'] });
    },
  });
}

/**
 * Delete a region group
 */
export function useDeleteRegionGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/admin/delivery-regions/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-regions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-region-groups'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-regions'] });
    },
  });
}

/**
 * Reorder regions or groups
 */
export function useReorderDeliveryRegions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      type: 'regions' | 'groups';
      items: { id: string; display_order: number }[];
    }) => post('/api/admin/delivery-regions/reorder', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-regions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-region-groups'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-regions'] });
    },
  });
}
