'use client';

import { useRef, useState } from 'react';
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/api-client';
import { useSendWhatsappMessage, type ConversationDetail } from '@/hooks/use-whatsapp-conversations';
import { QuickReplyPicker } from './quick-reply-picker';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

interface Props {
  conversation: ConversationDetail;
}

export function ReplyComposer({ conversation }: Props) {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const send = useSendWhatsappMessage(conversation.phone);

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }
    setImageFile(file);
  };

  const uploadImage = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminFetch('/api/admin/whatsapp/media/upload', {
        method: 'POST',
        body: fd,
      });
      const json = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !json.path) throw new Error(json.error || 'Upload failed');
      return json.path;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const message = text.trim();
    if (!message && !imageFile) return;

    try {
      let media_path: string | undefined;
      if (imageFile) {
        media_path = await uploadImage(imageFile);
      }
      await send.mutateAsync({ message, media_path });
      setText('');
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const submitting = send.isPending || uploading;

  return (
    <form onSubmit={handleSubmit} className="border-t p-3 space-y-2">
      {imageFile && (
        <div className="flex items-center gap-2 text-sm bg-muted/50 px-2 py-1 rounded">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 truncate">{imageFile.name}</span>
          <button
            type="button"
            onClick={() => {
              setImageFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex gap-2 items-start">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAttach}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting}
          title="Attach image"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <QuickReplyPicker
          customerName={conversation.customer_name}
          recentOrder={conversation.recent_orders[0] ?? null}
          onPick={(body) => setText((prev) => (prev ? `${prev}\n${body}` : body))}
        />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          className="resize-none min-h-[44px] max-h-32"
          rows={1}
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting || (!text.trim() && !imageFile)}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
