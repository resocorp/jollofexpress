// React Query hooks for promo codes
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api-client';
import type { PromoCode, PromoValidationResponse } from '@/types/database';

/**
 * Validate promo code
 */
export function useValidatePromo() {
  return useMutation({
    mutationFn: ({ code, orderTotal }: { code: string; orderTotal: number }) =>
      post<PromoValidationResponse>('/api/promo/validate', { code, order_total: orderTotal }),
  });
}

/**
 * Fetch all promo codes (admin)
 */
export function usePromoCodes() {
  return useQuery({
    queryKey: ['promo-codes'],
    queryFn: () => get<PromoCode[]>('/api/admin/promos'),
  });
}

/**
 * Create promo code (admin)
 */
export function useCreatePromo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<PromoCode>) =>
      post<PromoCode>('/api/admin/promos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
  });
}

/**
 * Update promo code (admin)
 */
export function useUpdatePromo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PromoCode> }) =>
      patch<PromoCode>(`/api/admin/promos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
  });
}

/**
 * Delete promo code (admin)
 */
export function useDeletePromo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      del<void>(`/api/admin/promos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
  });
}
