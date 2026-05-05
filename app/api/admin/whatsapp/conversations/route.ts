// List all WhatsApp AI conversations for the comms panel.
// Allowed roles: admin + customer_care_agent.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrAgent } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { SessionMessage } from '@/lib/ai/session-log';

interface SessionRow {
  id: string;
  phone: string;
  messages: SessionMessage[] | null;
  last_activity: string | null;
  ai_muted_until: string | null;
  awaiting_feedback_order_id: string | null;
  assigned_agent_id: string | null;
  assigned_at: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminOrAgent(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search')?.trim() || '';

    const supabase = createServiceClient();

    let query = supabase
      .from('whatsapp_ai_sessions')
      .select('id, phone, messages, last_activity, ai_muted_until, awaiting_feedback_order_id, assigned_agent_id, assigned_at')
      .order('last_activity', { ascending: false, nullsFirst: false })
      .limit(200);

    if (search) {
      query = query.ilike('phone', `%${search}%`);
    }

    const { data: sessions, error } = await query;
    if (error) {
      console.error('[whatsapp:conversations:list]', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    const rows = (sessions ?? []) as SessionRow[];
    const now = Date.now();

    // Resolve customer names from the most recent matching order per phone.
    const phones = rows.map((r) => r.phone);
    const customerNameByPhone = new Map<string, string>();
    if (phones.length) {
      const { data: orderRows } = await supabase
        .from('orders')
        .select('customer_phone, customer_name, created_at')
        .in('customer_phone', phones)
        .order('created_at', { ascending: false });
      for (const o of orderRows ?? []) {
        if (o.customer_phone && !customerNameByPhone.has(o.customer_phone)) {
          customerNameByPhone.set(o.customer_phone, o.customer_name);
        }
      }
    }

    // Resolve assigned agent names.
    const agentIds = Array.from(
      new Set(rows.map((r) => r.assigned_agent_id).filter((v): v is string => !!v))
    );
    const agentNameById = new Map<string, string>();
    if (agentIds.length) {
      const { data: agents } = await supabase
        .from('users')
        .select('id, name')
        .in('id', agentIds);
      for (const a of agents ?? []) agentNameById.set(a.id, a.name);
    }

    const conversations = rows.map((row) => {
      const messages = row.messages ?? [];
      const lastMessage = messages.length ? messages[messages.length - 1] : null;
      const isMuted = !!row.ai_muted_until && new Date(row.ai_muted_until).getTime() > now;
      const isClaimed = !!row.assigned_agent_id;
      const isMine = row.assigned_agent_id === auth.user.id;

      return {
        phone: row.phone,
        customer_name: customerNameByPhone.get(row.phone) || null,
        last_message_preview: lastMessage ? truncate(lastMessage.content, 80) : '',
        last_message_source: lastMessage?.source || null,
        last_activity: row.last_activity,
        ai_muted_until: row.ai_muted_until,
        is_muted: isMuted,
        assigned_agent_id: row.assigned_agent_id,
        assigned_agent_name: row.assigned_agent_id ? agentNameById.get(row.assigned_agent_id) || null : null,
        assigned_at: row.assigned_at,
        is_mine: isMine,
        awaiting_feedback_order_id: row.awaiting_feedback_order_id,
        status: deriveStatus({ isMuted, isClaimed, awaitingFeedback: !!row.awaiting_feedback_order_id, lastActivity: row.last_activity }),
      };
    });

    const filtered = conversations.filter((c) => {
      switch (filter) {
        case 'mine': return c.is_mine;
        case 'unclaimed': return !c.assigned_agent_id;
        case 'ai': return !c.is_muted && !c.assigned_agent_id;
        case 'human': return c.is_muted || !!c.assigned_agent_id;
        case 'awaiting': return !!c.awaiting_feedback_order_id;
        case 'all':
        default:
          return true;
      }
    });

    return NextResponse.json({ conversations: filtered });
  } catch (error) {
    console.error('[whatsapp:conversations:list] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function deriveStatus(opts: { isMuted: boolean; isClaimed: boolean; awaitingFeedback: boolean; lastActivity: string | null }): string {
  if (opts.isClaimed) return 'human_handling';
  if (opts.isMuted) return 'human_handling';
  if (opts.awaitingFeedback) return 'awaiting_feedback';
  if (opts.lastActivity) {
    const ageHours = (Date.now() - new Date(opts.lastActivity).getTime()) / 3_600_000;
    if (ageHours > 24) return 'idle';
  }
  return 'ai_active';
}
