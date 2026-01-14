// React Query hooks for influencer management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api-client';
import type { 
  Influencer, 
  InfluencerWithPromoCode, 
  InfluencerPayout,
  CustomerLTV,
  PromoAnalytics,
} from '@/types/database';

// ============ INFLUENCER HOOKS (Admin) ============

interface InfluencerWithPerformance extends InfluencerWithPromoCode {
  performance?: {
    total_customers: number;
    total_customer_ltv: number;
    total_orders: number;
    total_revenue: number;
    total_commission: number;
    new_customers: number;
    avg_order_value: number;
  };
}

interface CreateInfluencerData {
  name: string;
  email: string;
  phone: string;
  commission_type: 'percentage' | 'fixed_amount';
  commission_value: number;
  social_handle?: string;
  platform?: string;
  notes?: string;
  is_active?: boolean;
  promo_code?: string;
  promo_discount_type?: 'percentage' | 'fixed_amount';
  promo_discount_value?: number;
  promo_max_discount?: number;
  promo_min_order_value?: number;
  promo_usage_limit?: number;
  promo_expiry_date?: string;
}

/**
 * Fetch all influencers with optional performance metrics
 */
export function useInfluencers(includePerformance = false) {
  return useQuery({
    queryKey: ['influencers', includePerformance],
    queryFn: () => get<InfluencerWithPerformance[]>(
      `/api/admin/influencers${includePerformance ? '?include_performance=true' : ''}`
    ),
  });
}

/**
 * Fetch single influencer with full details
 */
export function useInfluencer(id: string | null) {
  return useQuery({
    queryKey: ['influencer', id],
    queryFn: () => get<InfluencerWithPerformance>(`/api/admin/influencers/${id}`),
    enabled: !!id,
  });
}

/**
 * Create new influencer
 */
export function useCreateInfluencer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateInfluencerData) =>
      post<InfluencerWithPromoCode>('/api/admin/influencers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
  });
}

/**
 * Update influencer
 */
export function useUpdateInfluencer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Influencer> }) =>
      patch<Influencer>(`/api/admin/influencers/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      queryClient.invalidateQueries({ queryKey: ['influencer', variables.id] });
    },
  });
}

/**
 * Delete influencer
 */
export function useDeleteInfluencer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean; deactivated?: boolean }>(`/api/admin/influencers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
  });
}

/**
 * Regenerate influencer access token
 */
export function useRegenerateInfluencerToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      post<{ success: boolean; access_token: string; dashboard_url: string }>(
        `/api/admin/influencers/${id}`,
        { action: 'regenerate_token' }
      ),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['influencer', id] });
    },
  });
}

// ============ PROMO ANALYTICS HOOKS ============

interface PromoAnalyticsResponse {
  period: number;
  start_date: string;
  totals: {
    total_promos: number;
    active_promos: number;
    total_uses: number;
    total_revenue: number;
    total_discount: number;
    total_new_customers: number;
  };
  promos: PromoAnalytics[];
}

interface PromoDetailAnalytics {
  promo: any;
  summary: {
    total_uses: number;
    total_revenue: number;
    total_discount: number;
    total_commission: number;
    unique_customers: number;
    new_customers: number;
    first_orders: number;
    avg_order_value: number;
    conversion_rate: number;
  };
  trend: Array<{ date: string; uses: number; revenue: number; discount: number; new_customers: number }>;
  recent_usage: any[];
}

/**
 * Fetch promo analytics summary
 */
export function usePromoAnalytics(period = '30') {
  return useQuery({
    queryKey: ['promo-analytics', period],
    queryFn: () => get<PromoAnalyticsResponse>(`/api/admin/promos/analytics?period=${period}`),
  });
}

/**
 * Fetch detailed analytics for a specific promo code
 */
export function usePromoDetailAnalytics(promoId: string | null, period = '30') {
  return useQuery({
    queryKey: ['promo-detail-analytics', promoId, period],
    queryFn: () => get<PromoDetailAnalytics>(`/api/admin/promos/analytics?promo_id=${promoId}&period=${period}`),
    enabled: !!promoId,
  });
}

// ============ CUSTOMER LTV HOOKS ============

interface CustomerLTVResponse {
  totals: {
    total_customers: number;
    total_ltv: number;
    total_orders: number;
    avg_ltv: number;
    avg_orders_per_customer: number;
    attributed_customers: number;
  };
  customers: CustomerLTV[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

/**
 * Fetch customer LTV data
 */
export function useCustomerLTV(options?: {
  influencerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  minOrders?: number;
}) {
  const params = new URLSearchParams();
  if (options?.influencerId) params.set('influencer_id', options.influencerId);
  if (options?.sortBy) params.set('sort_by', options.sortBy);
  if (options?.sortOrder) params.set('sort_order', options.sortOrder);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.minOrders) params.set('min_orders', options.minOrders.toString());

  return useQuery({
    queryKey: ['customer-ltv', options],
    queryFn: () => get<CustomerLTVResponse>(`/api/admin/customers/ltv?${params.toString()}`),
  });
}

// ============ PAYOUT HOOKS ============

interface PayoutsResponse {
  totals: {
    total_payouts: number;
    pending_amount: number;
    paid_amount: number;
  };
  payouts: (InfluencerPayout & { influencers?: { name: string; email: string } })[];
}

/**
 * Fetch payouts
 */
export function usePayouts(options?: {
  influencerId?: string;
  status?: string;
  month?: string;
}) {
  const params = new URLSearchParams();
  if (options?.influencerId) params.set('influencer_id', options.influencerId);
  if (options?.status) params.set('status', options.status);
  if (options?.month) params.set('month', options.month);

  return useQuery({
    queryKey: ['payouts', options],
    queryFn: () => get<PayoutsResponse>(`/api/admin/payouts?${params.toString()}`),
  });
}

/**
 * Generate monthly payouts
 */
export function useGeneratePayouts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (month: string) =>
      post<{ message: string; payouts: any[] }>('/api/admin/payouts', { month }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
    },
  });
}

/**
 * Update payout status
 */
export function useUpdatePayout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      payout_id: string;
      status: 'pending' | 'processing' | 'paid' | 'failed';
      paid_amount?: number;
      payment_reference?: string;
      payment_notes?: string;
    }) => patch<InfluencerPayout>('/api/admin/payouts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
    },
  });
}

// ============ INFLUENCER DASHBOARD HOOKS (for influencer's own view) ============

interface InfluencerDashboardData {
  influencer: {
    id: string;
    name: string;
    email: string;
    commission_type: string;
    commission_value: number;
    social_handle?: string;
    platform?: string;
  };
  promo_code: {
    code: string;
    discount_type: string;
    discount_value: number;
    used_count: number;
    is_active: boolean;
  } | null;
  all_time_stats: {
    total_orders: number;
    total_revenue: number;
    total_commission: number;
    new_customers: number;
  };
  period_stats: {
    total_orders: number;
    total_revenue: number;
    total_commission: number;
    new_customers: number;
  };
  period_days: number;
  earnings: {
    total_earned: number;
    paid: number;
    pending: number;
  };
  total_customers: number;
  top_customers: any[];
  recent_payouts: any[];
  trend: Array<{ date: string; orders: number; revenue: number; commission: number }>;
}

/**
 * Fetch influencer dashboard data (for influencer's own view)
 */
export function useInfluencerDashboard(token: string | null, period = '30') {
  return useQuery({
    queryKey: ['influencer-dashboard', token, period],
    queryFn: async () => {
      const response = await fetch(`/api/influencer/dashboard?period=${period}`, {
        headers: {
          'x-influencer-token': token || '',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json() as Promise<InfluencerDashboardData>;
    },
    enabled: !!token,
  });
}
