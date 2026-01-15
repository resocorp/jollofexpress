// React Query hooks for order operations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { get, post, patch } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { Order, OrderWithItems, OrderStatus } from '@/types/database';

/**
 * Fetch single order by ID
 */
export function useOrder(orderId: string, phone?: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => {
      const params = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      return get<OrderWithItems>(`/api/orders/${orderId}${params}`);
    },
    enabled: !!orderId,
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });
}

/**
 * Create new order
 */
export function useCreateOrder() {
  return useMutation({
    mutationFn: (data: Partial<Order> & { items: any[] }) =>
      post<{ order: Order; payment_url: string; scheduled?: boolean; scheduled_note?: string }>('/api/orders', data),
    // Don't log expected errors to console (503 is handled in UI)
    onError: (error: any) => {
      // Suppress console logging for expected errors
      // They're already handled with user-friendly toast messages
      const isExpectedError = 
        error.statusCode === 503;   // Kitchen at capacity (orders outside hours are allowed as scheduled)
      
      if (!isExpectedError) {
        console.error('Unexpected order creation error:', error);
      }
    },
  });
}

/**
 * Verify payment after Paystack redirect
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, reference }: { orderId: string; reference: string }) =>
      post<OrderWithItems & { already_verified?: boolean }>('/api/orders/verify-payment', {
        order_id: orderId,
        reference: reference,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['order', data.id], data);
    },
  });
}

/**
 * Fetch active kitchen orders (for KDS)
 * Uses Supabase Realtime for instant updates with fallback polling
 */
export function useKitchenOrders() {
  const queryClient = useQueryClient();
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null);

  // Set up Supabase Realtime subscription for instant updates
  useEffect(() => {
    const supabase = supabaseRef.current;

    // Subscribe to order changes
    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('🍳 Kitchen: Order change detected', payload.eventType);
          // Invalidate and refetch kitchen orders on any change
          queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
        }
      )
      .subscribe((status) => {
        console.log('🍳 Kitchen realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🍳 Kitchen: Unsubscribing from realtime');
      channel.unsubscribe();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => get<OrderWithItems[]>('/api/kitchen/orders'),
    refetchInterval: 30000, // Fallback polling every 30 seconds (reduced from 5s)
    staleTime: 5000, // Consider data fresh for 5 seconds
  });
}

/**
 * Update order status (kitchen)
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      patch<Order>(`/api/kitchen/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    },
  });
}

/**
 * Reprint order (kitchen)
 */
export function useReprintOrder() {
  return useMutation({
    mutationFn: (orderId: string) =>
      post<{ success: boolean }>(`/api/kitchen/orders/${orderId}/print`, {}),
  });
}

/**
 * Fetch all orders (admin)
 */
export function useAdminOrders(params?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (params?.dateFrom) queryParams.set('date_from', params.dateFrom);
  if (params?.dateTo) queryParams.set('date_to', params.dateTo);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.search) queryParams.set('search', params.search);
  
  const queryString = queryParams.toString();
  
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: async () => {
      const response = await get<{ orders: OrderWithItems[]; pagination: any }>(`/api/admin/orders${queryString ? `?${queryString}` : ''}`);
      return response.orders;
    },
  });
}

/**
 * Update order (admin override)
 */
export function useAdminUpdateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: Partial<Order> }) =>
      patch<Order>(`/api/admin/orders/${orderId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    },
  });
}

/**
 * Process refund (admin)
 */
export function useRefundOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderId: string) =>
      post<{ success: boolean; message: string }>(`/api/admin/orders/${orderId}/refund`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

/**
 * Fetch customer order history
 */
export function useOrderHistory(phone: string) {
  return useQuery({
    queryKey: ['order-history', phone],
    queryFn: () => get<OrderWithItems[]>(`/api/orders/history?phone=${encodeURIComponent(phone)}`),
    enabled: !!phone,
  });
}
