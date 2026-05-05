// React Query hooks for the WhatsApp comms panel.
// Pattern mirrors hooks/use-orders.ts:66-112 — Supabase Realtime channel
// invalidates the React Query cache + a 10s polling fallback.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { adminFetch } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { SessionMessage } from '@/lib/ai/session-log';

export interface ConversationListItem {
  phone: string;
  customer_name: string | null;
  last_message_preview: string;
  last_message_source: string | null;
  last_activity: string | null;
  ai_muted_until: string | null;
  is_muted: boolean;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  assigned_at: string | null;
  is_mine: boolean;
  awaiting_feedback_order_id: string | null;
  status: 'ai_active' | 'human_handling' | 'awaiting_feedback' | 'idle';
}

export interface ConversationDetail {
  phone: string;
  customer_name: string | null;
  messages: SessionMessage[];
  last_activity: string | null;
  ai_muted_until: string | null;
  is_muted: boolean;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  assigned_at: string | null;
  is_mine: boolean;
  awaiting_feedback_order_id: string | null;
  recent_orders: Array<{
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    customer_name: string;
    created_at: string;
    batch_id: string | null;
  }>;
}

export type ConversationFilter = 'all' | 'mine' | 'unclaimed' | 'ai' | 'human' | 'awaiting';

export function useWhatsappConversations(filter: ConversationFilter, search: string) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  // Subscribe to realtime updates on whatsapp_ai_sessions.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('whatsapp-ai-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_ai_sessions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation'] });
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['whatsapp-conversations', filter, search],
    queryFn: async () => {
      const params = new URLSearchParams({ filter });
      if (search) params.set('search', search);
      const res = await adminFetch(`/api/admin/whatsapp/conversations?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return (await res.json()) as { conversations: ConversationListItem[] };
    },
    refetchInterval: 10_000,
  });
}

export function useWhatsappConversation(phone: string | null) {
  return useQuery({
    queryKey: ['whatsapp-conversation', phone],
    queryFn: async () => {
      if (!phone) return null;
      const res = await adminFetch(`/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch conversation');
      }
      return ((await res.json()) as { conversation: ConversationDetail }).conversation;
    },
    enabled: !!phone,
    refetchInterval: 5_000,
  });
}

export function useSendWhatsappMessage(phone: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { message: string; media_path?: string }) => {
      const res = await adminFetch(
        `/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );
      const json = (await res.json()) as { error?: string; success?: boolean; messageId?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to send');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', phone] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
  });
}

export function useClaimConversation(phone: string) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, boolean>({
    mutationFn: async (force: boolean) => {
      const res = await adminFetch(
        `/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}/claim`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force }),
        }
      );
      const json = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) throw Object.assign(new Error(json.error || 'Failed to claim'), { code: json.code });
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', phone] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
  });
}

export function useReleaseConversation(phone: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await adminFetch(
        `/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}/release`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Failed to release');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', phone] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
  });
}

export function useHandbackConversation(phone: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await adminFetch(
        `/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}/handback`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Failed to hand back');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', phone] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
  });
}
