'use client';

import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import type { SessionMessage } from '@/lib/ai/session-log';
import { Message, type MessageVariant } from './message';

interface Props {
  messages: SessionMessage[];
}

function variantFor(message: SessionMessage): MessageVariant {
  if (message.source === 'system') return 'system';
  if (message.source === 'staff') return 'operator';
  if (message.source === 'ai') return 'ai';
  if (message.source === 'user') return 'inbound';
  return message.role === 'user' ? 'inbound' : 'ai';
}

function senderId(message: SessionMessage): string {
  if (message.source === 'staff') return `staff:${message.agent_id || 'unknown'}`;
  return message.source || message.role;
}

const TWO_MINUTES_MS = 2 * 60 * 1000;

function sameRun(a: SessionMessage, b: SessionMessage): boolean {
  if (senderId(a) !== senderId(b)) return false;
  if (a.source === 'system' || b.source === 'system') return false;
  if (!a.timestamp || !b.timestamp) return true;
  const dt = Math.abs(new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return dt <= TWO_MINUTES_MS;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

function sameDay(a?: string, b?: string): boolean {
  if (!a || !b) return true;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

const PINNED_THRESHOLD_PX = 80;

export function MessageThread({ messages }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const lastLengthRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handle = () => {
      const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
      isPinnedRef.current = distance < PINNED_THRESHOLD_PX;
    };
    el.addEventListener('scroll', handle, { passive: true });
    handle();
    return () => el.removeEventListener('scroll', handle);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > lastLengthRef.current;
    const isFirstPaint = lastLengthRef.current === 0 && messages.length > 0;
    if (isFirstPaint || (grew && isPinnedRef.current)) {
      el.scrollTop = el.scrollHeight;
      isPinnedRef.current = true;
    }
    lastLengthRef.current = messages.length;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-950 px-4 py-3">
        <p className="py-8 text-center text-sm text-slate-500">No messages yet.</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-950 px-4 py-3">
      {messages.map((m, i) => {
        const prev = i > 0 ? messages[i - 1] : null;
        const next = i < messages.length - 1 ? messages[i + 1] : null;
        const variant = variantFor(m);

        const dayChanged = !!prev && !sameDay(prev.timestamp, m.timestamp);
        const showHeader = !prev || dayChanged || !sameRun(prev, m);
        const isLastInRun = !next || !sameRun(m, next);

        const key = `${m.timestamp || ''}-${m.message_id || i}`;

        return (
          <div key={key}>
            {dayChanged && m.timestamp && <DayDivider label={dayLabel(m.timestamp)} />}
            <Message
              message={m}
              variant={variant}
              showHeader={showHeader}
              isLastInRun={isLastInRun}
            />
          </div>
        );
      })}
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-800" />
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-slate-800" />
    </div>
  );
}
