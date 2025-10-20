// React Query hooks for menu data
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api-client';
import type {
  MenuResponse,
  MenuCategory,
  MenuItem,
  MenuItemWithDetails,
} from '@/types/database';

/**
 * Fetch complete menu with categories and items
 */
export function useMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: () => get<MenuResponse>('/api/menu'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single menu item with details
 */
export function useMenuItem(itemId: string) {
  return useQuery({
    queryKey: ['menu-item', itemId],
    queryFn: () => get<MenuItemWithDetails>(`/api/menu/items/${itemId}`),
    enabled: !!itemId,
  });
}

/**
 * Fetch all categories (admin)
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => get<MenuCategory[]>('/api/admin/menu/categories'),
  });
}

/**
 * Create menu category (admin)
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<MenuCategory>) =>
      post<MenuCategory>('/api/admin/menu/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });
}

/**
 * Update menu category (admin)
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuCategory> }) =>
      patch<MenuCategory>(`/api/admin/menu/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });
}

/**
 * Delete menu category (admin)
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      del<void>(`/api/admin/menu/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });
}

/**
 * Create menu item (admin)
 */
export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<MenuItem>) =>
      post<MenuItem>('/api/admin/menu/items', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });
}

/**
 * Update menu item (admin)
 */
export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) =>
      patch<MenuItem>(`/api/admin/menu/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });
}

/**
 * Delete menu item (admin)
 */
export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      del<void>(`/api/admin/menu/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });
}

/**
 * Toggle item availability (kitchen/admin)
 */
export function useToggleItemAvailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, is_available }: { id: string; is_available: boolean }) =>
      patch<MenuItem>(`/api/kitchen/items/${id}/availability`, { is_available }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });
}
