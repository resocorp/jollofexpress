'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useInternalNotes, useAddNote, useDeleteNote } from '@/hooks/use-whatsapp-notes';
import { useCurrentUser } from '@/hooks/use-current-user';

interface Props {
  phone: string;
}

export function InternalNotesPanel({ phone }: Props) {
  const [body, setBody] = useState('');
  const { data: notes, isLoading } = useInternalNotes(phone);
  const add = useAddNote(phone);
  const del = useDeleteNote(phone);
  const { data: me } = useCurrentUser();

  const handleAdd = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await add.mutateAsync(trimmed);
      setBody('');
    } catch {
      toast.error('Failed to add note');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Internal notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Visible to staff only. Never sent to the customer.
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto my-4" />
          ) : !notes || notes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No notes yet.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="bg-muted/40 rounded p-2 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {n.agent_name || 'Agent'} · {new Date(n.created_at).toLocaleString()}
                  </span>
                  {(me?.role === 'admin' || me?.id === n.agent_id) && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-red-400"
                      onClick={() => del.mutate(n.id)}
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{n.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="resize-none"
          />
          <Button size="sm" onClick={handleAdd} disabled={!body.trim() || add.isPending} className="w-full">
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
