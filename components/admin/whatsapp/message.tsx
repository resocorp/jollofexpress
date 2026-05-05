'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Bell,
  Bike,
  CheckCircle2,
  Copy,
  FileText,
  Flag,
  MoreVertical,
  Package,
  Star,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SessionMessage } from '@/lib/ai/session-log';
import { MarkdownContent } from './markdown-content';

export type MessageVariant = 'inbound' | 'ai' | 'operator' | 'system';

interface Props {
  message: SessionMessage;
  variant: MessageVariant;
  showHeader: boolean;
  isLastInRun: boolean;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// TODO: replace with an explicit event_type field on SessionMessage threaded
// through appendAssistantMessage in lib/notifications/notification-service.ts.
// Pattern matching the body is fragile if templates change wording.
function pickSystemEventIcon(content: string): LucideIcon {
  const head = content.slice(0, 80).toLowerCase();
  if (/order confirmed/.test(head)) return Package;
  if (/(out for delivery|on (its|the) way|rider on the way|rider nearby)/.test(head)) return Bike;
  if (/(order ready|your order is ready)/.test(head)) return Utensils;
  if (/(order completed|delivered)/.test(head)) return CheckCircle2;
  if (/(rate your experience|how was|feedback)/.test(head)) return Star;
  if (/payment failed/.test(head)) return AlertCircle;
  return Bell;
}

function senderLabel(message: SessionMessage, variant: MessageVariant): string {
  switch (variant) {
    case 'inbound':
      return 'Customer';
    case 'ai':
      return 'AI';
    case 'operator':
      return message.agent_name || 'Agent';
    case 'system':
      return 'System';
  }
}

export function Message({ message, variant, showHeader, isLastInRun }: Props) {
  const spacing = showHeader ? 'mt-4' : 'mt-1';

  if (variant === 'system') {
    const Icon = pickSystemEventIcon(message.content);
    return (
      <div className="mt-4 flex justify-center">
        <div className="flex w-full max-w-[480px] gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <div className="flex w-10 shrink-0 items-start justify-center">
            <Icon className="mt-0.5 h-5 w-5 text-slate-400" />
          </div>
          <div className="min-w-0 flex-1 text-slate-200">
            <MarkdownContent content={message.content} />
            {message.timestamp && (
              <p className="mt-2 text-xs text-slate-500">{formatTime(message.timestamp)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isInbound = variant === 'inbound';
  const align = isInbound ? 'items-start' : 'items-end';
  const bubbleColor =
    variant === 'ai'
      ? 'bg-orange-600 text-white'
      : variant === 'operator'
        ? 'bg-emerald-700 text-white'
        : 'bg-slate-800 text-slate-100';
  const tail = isLastInRun ? (isInbound ? 'rounded-bl-md' : 'rounded-br-md') : '';

  return (
    <div className={cn('flex flex-col', align, spacing)}>
      {showHeader && (
        <div className="mb-1 px-1 text-xs text-slate-400">
          <span>{senderLabel(message, variant)}</span>
          <span className="ml-2 opacity-70">{formatTime(message.timestamp)}</span>
        </div>
      )}
      <div className="group relative max-w-[85%] md:max-w-[70%]">
        <div className={cn('rounded-2xl px-4 py-2.5', bubbleColor, tail)}>
          {message.media_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.media_url}
              alt="attachment"
              className="mb-2 max-w-full rounded-lg"
            />
          )}
          <MarkdownContent content={message.content} />
        </div>
        <BubbleActions message={message} isOutbound={!isInbound} />
      </div>
    </div>
  );
}

function BubbleActions({ message, isOutbound }: { message: SessionMessage; isOutbound: boolean }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Message actions"
            className={cn(
              'absolute top-1 rounded-full bg-slate-900/80 p-1 text-slate-300 opacity-0 shadow transition-opacity hover:bg-slate-800 focus:opacity-100 focus:outline-none group-hover:opacity-100',
              isOutbound ? '-left-7' : '-right-7'
            )}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOutbound ? 'end' : 'start'} className="w-40">
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(message.content);
              toast.success('Copied');
            }}
          >
            <Copy className="h-4 w-4" />
            Copy text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowRaw(true)}>
            <FileText className="h-4 w-4" />
            View raw
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info('Flagging coming soon')}>
            <Flag className="h-4 w-4" />
            Flag
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showRaw} onOpenChange={setShowRaw}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Raw message content</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 p-3 text-xs text-slate-200">
            {message.content}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
