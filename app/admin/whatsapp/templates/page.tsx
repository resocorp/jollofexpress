'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useQuickReplies,
  useUpsertQuickReply,
  useDeleteQuickReply,
  type QuickReply,
} from '@/hooks/use-whatsapp-templates';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function TemplatesPage() {
  const { data: me } = useCurrentUser();
  const { data: templates, isLoading } = useQuickReplies();
  const upsert = useUpsertQuickReply();
  const del = useDeleteQuickReply();
  const [editing, setEditing] = useState<Partial<QuickReply> | null>(null);

  if (me && me.role !== 'admin') {
    return <div className="p-8 text-muted-foreground">Admin access required.</div>;
  }

  const handleSave = async () => {
    if (!editing?.name?.trim() || !editing?.body?.trim()) {
      toast.error('Name and body required');
      return;
    }
    try {
      await upsert.mutateAsync({
        id: editing.id,
        name: editing.name.trim(),
        body: editing.body.trim(),
      });
      toast.success('Template saved');
      setEditing(null);
    } catch {
      toast.error('Failed to save template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quick replies</h1>
          <p className="text-muted-foreground">
            Saved canned responses. Use <code className="text-xs px-1 bg-muted rounded">{'{{customer_name}}'}</code>,{' '}
            <code className="text-xs px-1 bg-muted rounded">{'{{order_number}}'}</code>, or{' '}
            <code className="text-xs px-1 bg-muted rounded">{'{{order_status}}'}</code> as placeholders.
          </p>
        </div>
        <Button onClick={() => setEditing({})}>
          <Plus className="mr-2 h-4 w-4" />
          New template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          ) : !templates || templates.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No templates yet.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-start justify-between border rounded p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{t.body}</p>
                  </div>
                  <div className="flex gap-1 ml-3 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${t.name}"?`)) {
                          del.mutate(t.id, {
                            onSuccess: () => toast.success('Deleted'),
                            onError: () => toast.error('Failed to delete'),
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit template' : 'New template'}</DialogTitle>
            <DialogDescription>
              Use <code className="text-xs">{'{{customer_name}}'}</code>, <code className="text-xs">{'{{order_number}}'}</code>, <code className="text-xs">{'{{order_status}}'}</code> for substitutions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="t-name">Name</Label>
              <Input
                id="t-name"
                value={editing?.name || ''}
                onChange={(e) => setEditing((s) => ({ ...(s ?? {}), name: e.target.value }))}
                placeholder="e.g. Refund initiated"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-body">Body</Label>
              <Textarea
                id="t-body"
                rows={6}
                value={editing?.body || ''}
                onChange={(e) => setEditing((s) => ({ ...(s ?? {}), body: e.target.value }))}
                placeholder={`Hi {{customer_name}}, we've initiated a refund for order #{{order_number}}.`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
