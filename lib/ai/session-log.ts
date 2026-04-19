// Central helper for appending any WhatsApp turn to the AI session history.
// Keeps the AI's view of the conversation in sync regardless of who sent the
// message — the AI itself, an automated system notification, or a human agent.
//
// Without this, manual staff replies (fromMe on the business phone) and
// order-status notifications would be invisible to the AI on the next customer
// turn, so it replies as if the exchange never happened.

import { createServiceClient } from '@/lib/supabase/service';

const MAX_HISTORY_MESSAGES = 40;
const STAFF_MUTE_MINUTES = 120; // 2 hours, auto-extended on each staff reply

export type MessageSource = 'user' | 'ai' | 'system' | 'staff';

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: MessageSource;
  timestamp?: string;
}

function trim(messages: SessionMessage[]): SessionMessage[] {
  return messages.length > MAX_HISTORY_MESSAGES
    ? messages.slice(messages.length - MAX_HISTORY_MESSAGES)
    : messages;
}

async function fetchSessionMessages(phone: string): Promise<{
  id: string | null;
  messages: SessionMessage[];
}> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('whatsapp_ai_sessions')
    .select('id, messages')
    .eq('phone', phone)
    .single();

  if (!data) return { id: null, messages: [] };
  return { id: data.id, messages: (data.messages as SessionMessage[]) || [] };
}

/**
 * Append an outbound (assistant-role) message to the session.
 * Creates the session row if missing.
 *
 * - source='ai'     → the AI's own reply (tag for symmetry; the existing AI
 *                     persistence path will migrate to call this too)
 * - source='system' → system notification (order confirmed, rider nearby, etc.)
 * - source='staff'  → human agent reply; also extends ai_muted_until by 2h
 */
export async function appendAssistantMessage(
  phone: string,
  content: string,
  source: Exclude<MessageSource, 'user'>
): Promise<void> {
  if (!phone || !content) return;

  const supabase = createServiceClient();
  const { id, messages } = await fetchSessionMessages(phone);

  const next = trim([
    ...messages,
    {
      role: 'assistant',
      content,
      source,
      timestamp: new Date().toISOString(),
    },
  ]);

  const patch: Record<string, unknown> = {
    messages: next,
    last_activity: new Date().toISOString(),
  };

  if (source === 'staff') {
    patch.ai_muted_until = new Date(
      Date.now() + STAFF_MUTE_MINUTES * 60_000
    ).toISOString();
  }

  if (id) {
    await supabase.from('whatsapp_ai_sessions').update(patch).eq('id', id);
  } else {
    await supabase.from('whatsapp_ai_sessions').insert({
      phone,
      ...patch,
    });
  }
}

/**
 * Append an inbound customer message. Used to record messages received while
 * the AI is muted so the session stays coherent when the mute expires.
 */
export async function appendUserMessage(
  phone: string,
  content: string
): Promise<void> {
  if (!phone || !content) return;

  const supabase = createServiceClient();
  const { id, messages } = await fetchSessionMessages(phone);

  const next = trim([
    ...messages,
    {
      role: 'user',
      content,
      source: 'user',
      timestamp: new Date().toISOString(),
    },
  ]);

  const patch = {
    messages: next,
    last_activity: new Date().toISOString(),
  };

  if (id) {
    await supabase.from('whatsapp_ai_sessions').update(patch).eq('id', id);
  } else {
    await supabase.from('whatsapp_ai_sessions').insert({ phone, ...patch });
  }
}

/**
 * Return the mute deadline if the AI is currently silenced for this phone,
 * else null.
 */
export async function getMuteUntil(phone: string): Promise<Date | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('whatsapp_ai_sessions')
    .select('ai_muted_until')
    .eq('phone', phone)
    .single();

  if (!data?.ai_muted_until) return null;
  const until = new Date(data.ai_muted_until);
  return until.getTime() > Date.now() ? until : null;
}

export async function setMute(phone: string, until: Date): Promise<void> {
  const supabase = createServiceClient();
  const { id } = await fetchSessionMessages(phone);
  const patch = { ai_muted_until: until.toISOString() };
  if (id) {
    await supabase.from('whatsapp_ai_sessions').update(patch).eq('id', id);
  } else {
    await supabase
      .from('whatsapp_ai_sessions')
      .insert({ phone, messages: [], ...patch });
  }
}

export async function clearMute(phone: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from('whatsapp_ai_sessions')
    .update({ ai_muted_until: null })
    .eq('phone', phone);
}

export async function listMuted(): Promise<
  Array<{ phone: string; ai_muted_until: string }>
> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('whatsapp_ai_sessions')
    .select('phone, ai_muted_until')
    .not('ai_muted_until', 'is', null)
    .gt('ai_muted_until', new Date().toISOString())
    .order('ai_muted_until', { ascending: true });

  return (data || []) as Array<{ phone: string; ai_muted_until: string }>;
}
