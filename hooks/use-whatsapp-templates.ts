import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/api-client';

export interface QuickReply {
  id: string;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export function useQuickReplies() {
  return useQuery({
    queryKey: ['whatsapp-quick-replies'],
    queryFn: async () => {
      const res = await adminFetch('/api/admin/whatsapp/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return ((await res.json()) as { templates: QuickReply[] }).templates;
    },
  });
}

export function useUpsertQuickReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; body: string }) => {
      const isUpdate = !!input.id;
      const url = isUpdate
        ? `/api/admin/whatsapp/templates?id=${encodeURIComponent(input.id!)}`
        : '/api/admin/whatsapp/templates';
      const res = await adminFetch(url, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: input.name, body: input.body }),
      });
      if (!res.ok) throw new Error('Failed to save template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
    },
  });
}

export function useDeleteQuickReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`/api/admin/whatsapp/templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
    },
  });
}

export function substitutePlaceholders(
  body: string,
  ctx: {
    customer_name?: string | null;
    order_number?: string | null;
    order_status?: string | null;
  }
): string {
  return body
    .replace(/\{\{\s*customer_name\s*\}\}/g, ctx.customer_name || 'there')
    .replace(/\{\{\s*order_number\s*\}\}/g, ctx.order_number || '')
    .replace(/\{\{\s*order_status\s*\}\}/g, (ctx.order_status || '').replace(/_/g, ' '));
}
