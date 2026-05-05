'use client';

import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useWhatsappConversations,
  type ConversationFilter,
  type ConversationListItem,
} from '@/hooks/use-whatsapp-conversations';

const FILTERS: Array<{ value: ConversationFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'unclaimed', label: 'Unclaimed' },
  { value: 'ai', label: 'AI' },
  { value: 'human', label: 'Human' },
  { value: 'awaiting', label: 'Awaiting feedback' },
];

const STATUS_LABEL: Record<ConversationListItem['status'], { label: string; className: string }> = {
  ai_active: { label: 'AI', className: 'bg-orange-500/20 text-orange-300' },
  human_handling: { label: 'Human', className: 'bg-emerald-500/20 text-emerald-300' },
  awaiting_feedback: { label: 'Feedback', className: 'bg-yellow-500/20 text-yellow-300' },
  idle: { label: 'Idle', className: 'bg-zinc-600/30 text-zinc-300' },
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Props {
  filter: ConversationFilter;
  onFilterChange: (f: ConversationFilter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  selectedPhone: string | null;
  onSelect: (phone: string) => void;
}

export function ConversationList({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  selectedPhone,
  onSelect,
}: Props) {
  const { data, isLoading } = useWhatsappConversations(filter, search);

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-3 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterChange(f.value)}
              className={cn(
                'text-xs px-2 py-1 rounded',
                filter === f.value ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
        ) : (
          <ul>
            {data.conversations.map((c) => {
              const status = STATUS_LABEL[c.status];
              const selected = c.phone === selectedPhone;
              return (
                <li key={c.phone}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.phone)}
                    className={cn(
                      'w-full text-left px-3 py-3 border-b hover:bg-muted/50 transition-colors',
                      selected && 'bg-muted'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">
                        {c.customer_name || c.phone}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {timeAgo(c.last_activity)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.last_message_preview}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Badge className={cn('text-xs', status.className)}>{status.label}</Badge>
                      {c.is_mine && (
                        <Badge className="text-xs bg-blue-500/20 text-blue-300">Mine</Badge>
                      )}
                      {!c.is_mine && c.assigned_agent_name && (
                        <Badge className="text-xs bg-purple-500/20 text-purple-300" title={c.assigned_agent_name}>
                          {c.assigned_agent_name}
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
