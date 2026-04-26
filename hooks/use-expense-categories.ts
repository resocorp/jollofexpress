import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api-client';
import type { ExpenseCategory } from '@/types/database';

export function useExpenseCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['expense-categories', { includeInactive }],
    queryFn: () =>
      get<ExpenseCategory[]>(
        `/api/expense-categories${includeInactive ? '?include_inactive=true' : ''}`,
      ),
  });
}

interface CreateCategoryInput {
  name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryInput) =>
      post<ExpenseCategory>('/api/expense-categories', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
}

export function useUpdateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryInput> }) =>
      patch<ExpenseCategory>(`/api/expense-categories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ deleted?: boolean; deactivated?: boolean }>(`/api/expense-categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
}
