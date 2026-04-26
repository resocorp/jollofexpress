import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api-client';
import type {
  ExpenseAnalyticsResponse,
  ExpenseWithCategory,
} from '@/types/database';

export interface ExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  search?: string;
  limit?: number;
}

function buildQs(filters: ExpenseFilters | undefined): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.categoryId) params.set('category_id', filters.categoryId);
  if (filters.search) params.set('search', filters.search);
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useExpenses(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: ['expenses', filters ?? {}],
    queryFn: () => get<ExpenseWithCategory[]>(`/api/expenses${buildQs(filters)}`),
  });
}

export interface CreateExpenseInput {
  category_id: string;
  item_name: string;
  quantity: number;
  unit?: string;
  unit_cost: number;
  total_cost?: number;
  vendor?: string;
  purchase_date: string; // YYYY-MM-DD
  notes?: string;
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) =>
      post<ExpenseWithCategory>('/api/expenses', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-analytics'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateExpenseInput> }) =>
      patch<ExpenseWithCategory>(`/api/expenses/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-analytics'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ deleted: true }>(`/api/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-analytics'] });
    },
  });
}

export interface BatchExpenseItem {
  category_id: string;
  item_name: string;
  quantity: number;
  unit?: string;
  unit_cost: number;
  total_cost?: number;
  vendor?: string;
  purchase_date?: string;
  notes?: string;
}

export interface BatchExpenseInput {
  default_purchase_date: string;
  default_vendor?: string;
  default_notes?: string;
  items: BatchExpenseItem[];
}

export interface BatchExpenseResult {
  inserted: number;
  total_spend: number;
  items: ExpenseWithCategory[];
}

export function useCreateExpenseBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BatchExpenseInput) =>
      post<BatchExpenseResult>('/api/expenses/batch', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-analytics'] });
    },
  });
}

export function useExpenseAnalytics(periodDays = 90) {
  return useQuery({
    queryKey: ['expense-analytics', periodDays],
    queryFn: () =>
      get<ExpenseAnalyticsResponse>(`/api/admin/analytics/expenses?period=${periodDays}`),
  });
}
