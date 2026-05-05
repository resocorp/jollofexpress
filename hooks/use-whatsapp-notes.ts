import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/api-client';

export interface InternalNote {
  id: string;
  phone: string;
  agent_id: string | null;
  agent_name: string | null;
  body: string;
  created_at: string;
}

export function useInternalNotes(phone: string | null) {
  return useQuery({
    queryKey: ['whatsapp-notes', phone],
    queryFn: async () => {
      if (!phone) return [];
      const res = await adminFetch(
        `/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}/notes`
      );
      if (!res.ok) throw new Error('Failed to fetch notes');
      return ((await res.json()) as { notes: InternalNote[] }).notes;
    },
    enabled: !!phone,
  });
}

export function useAddNote(phone: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await adminFetch(
        `/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        }
      );
      if (!res.ok) throw new Error('Failed to add note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-notes', phone] });
    },
  });
}

export function useDeleteNote(phone: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(
        `/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}/notes?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-notes', phone] });
    },
  });
}
