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
  // Optional metadata used when source='staff' (set from the comms panel):
  agent_id?: string;
  agent_name?: string;
  media_url?: string;
  message_id?: string;
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

/**
 * Append an agent reply from the comms panel. Same as appendAssistantMessage
 * with source='staff', but carries author and media metadata so the UI can
 * render "sent by <agent name>" and inline images. Always extends the AI mute.
 */
export async function appendStaffMessage(
  phone: string,
  content: string,
  meta: {
    agent_id: string;
    agent_name?: string;
    media_url?: string;
    message_id?: string;
    mute_minutes?: number;
  }
): Promise<void> {
  if (!phone || (!content && !meta.media_url)) return;

  const supabase = createServiceClient();
  const { id, messages } = await fetchSessionMessages(phone);

  const next = trim([
    ...messages,
    {
      role: 'assistant',
      content,
      source: 'staff',
      timestamp: new Date().toISOString(),
      agent_id: meta.agent_id,
      agent_name: meta.agent_name,
      media_url: meta.media_url,
      message_id: meta.message_id,
    },
  ]);

  const muteMinutes = meta.mute_minutes ?? 24 * 60;
  const patch = {
    messages: next,
    last_activity: new Date().toISOString(),
    ai_muted_until: new Date(Date.now() + muteMinutes * 60_000).toISOString(),
  };

  if (id) {
    await supabase.from('whatsapp_ai_sessions').update(patch).eq('id', id);
  } else {
    await supabase.from('whatsapp_ai_sessions').insert({ phone, ...patch });
  }
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

/**
 * Mark this phone's session as awaiting feedback for a specific order.
 * Set by the feedback-worker when it sends the prompt; consumed by
 * findRecentPendingFeedbackOrder so the AI doesn't have to guess which
 * order a customer's reply refers to.
 */
export async function setAwaitingFeedback(
  phone: string,
  orderId: string
): Promise<void> {
  if (!phone || !orderId) return;
  const supabase = createServiceClient();
  const { id } = await fetchSessionMessages(phone);
  const patch = {
    awaiting_feedback_order_id: orderId,
    awaiting_feedback_set_at: new Date().toISOString(),
  };
  if (id) {
    await supabase.from('whatsapp_ai_sessions').update(patch).eq('id', id);
  } else {
    await supabase
      .from('whatsapp_ai_sessions')
      .insert({ phone, messages: [], ...patch });
  }
}

export async function clearAwaitingFeedback(phone: string): Promise<void> {
  if (!phone) return;
  const supabase = createServiceClient();
  await supabase
    .from('whatsapp_ai_sessions')
    .update({
      awaiting_feedback_order_id: null,
      awaiting_feedback_set_at: null,
    })
    .eq('phone', phone);
}

/**
 * Returns the awaiting-feedback order_id for this phone if set within the
 * given window, else null. Tolerant of the migration not yet being applied.
 */
export async function getAwaitingFeedbackOrderId(
  phone: string,
  withinDays = 14
): Promise<string | null> {
  if (!phone) return null;
  const supabase = createServiceClient();
  const cutoff = new Date(
    Date.now() - withinDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data, error } = await supabase
    .from('whatsapp_ai_sessions')
    .select('awaiting_feedback_order_id, awaiting_feedback_set_at')
    .eq('phone', phone)
    .maybeSingle();
  if (error || !data) return null;
  if (
    !data.awaiting_feedback_order_id ||
    !data.awaiting_feedback_set_at ||
    data.awaiting_feedback_set_at < cutoff
  ) {
    return null;
  }
  return data.awaiting_feedback_order_id as string;
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
