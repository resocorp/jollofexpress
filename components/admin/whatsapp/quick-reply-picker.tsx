'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  useQuickReplies,
  substitutePlaceholders,
} from '@/hooks/use-whatsapp-templates';

interface Props {
  customerName: string | null;
  recentOrder: { order_number: string; status: string } | null;
  onPick: (body: string) => void;
}

export function QuickReplyPicker({ customerName, recentOrder, onPick }: Props) {
  const { data: templates, isLoading } = useQuickReplies();

  const handlePick = (body: string) => {
    const filled = substitutePlaceholders(body, {
      customer_name: customerName,
      order_number: recentOrder?.order_number,
      order_status: recentOrder?.status,
    });
    onPick(filled);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title="Quick replies">
          <Sparkles className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Quick replies</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
        ) : !templates || templates.length === 0 ? (
          <DropdownMenuItem disabled>No templates yet</DropdownMenuItem>
        ) : (
          templates.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => handlePick(t.body)}
              className="flex flex-col items-start gap-0.5 cursor-pointer"
            >
              <span className="font-medium text-sm">{t.name}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">{t.body}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
