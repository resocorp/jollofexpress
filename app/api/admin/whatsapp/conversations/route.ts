// List all WhatsApp AI conversations for the comms panel.
// Allowed roles: admin + customer_care_agent.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrAgent } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { SessionMessage } from '@/lib/ai/session-log';
import { phoneVariants } from '@/lib/whatsapp/identity';

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

    // Resolve any session keyed by a bare LID to its real phone via the
    // whatsapp_lid_map cache. Sessions whose `phone` is already a Nigerian
    // E.164 stay unchanged; bare-LID sessions get a `display_phone` so the
    // panel can render the actual customer number, and so the customer-name
    // lookup against `orders.customer_phone` can hit.
    const sessionPhones = rows.map((r) => r.phone);
    const mappedPhoneBySessionPhone = new Map<string, string>();
    if (sessionPhones.length) {
      const lidJids = sessionPhones.map((p) => `${p}@lid`);
      const { data: lidRows } = await supabase
        .from('whatsapp_lid_map')
        .select('lid_jid, phone')
        .in('lid_jid', lidJids);
      for (const r of lidRows ?? []) {
        const sessionPhone = r.lid_jid.replace(/@lid$/, '');
        mappedPhoneBySessionPhone.set(sessionPhone, r.phone);
      }
    }

    // Build the lookup keys for orders.customer_phone — uses every plausible
    // formatting of the resolved phone (or the raw session phone when no map).
    const orderLookupSet = new Set<string>();
    const variantsBySessionPhone = new Map<string, string[]>();
    for (const r of rows) {
      const resolved = mappedPhoneBySessionPhone.get(r.phone) || r.phone;
      const variants = phoneVariants(resolved);
      // Also include the raw session phone (covers non-LID sessions whose
      // checkout phone may differ from the WhatsApp normalized form).
      if (!variants.includes(r.phone)) variants.push(r.phone);
      variantsBySessionPhone.set(r.phone, variants);
      for (const v of variants) orderLookupSet.add(v);
    }

    const customerNameByVariant = new Map<string, string>();
    if (orderLookupSet.size) {
      const { data: orderRows } = await supabase
        .from('orders')
        .select('customer_phone, customer_name, created_at')
        .in('customer_phone', Array.from(orderLookupSet))
        .order('created_at', { ascending: false });
      for (const o of orderRows ?? []) {
        if (o.customer_phone && !customerNameByVariant.has(o.customer_phone)) {
          customerNameByVariant.set(o.customer_phone, o.customer_name);
        }
      }
    }
    const customerNameForSessionPhone = (sessionPhone: string): string | null => {
      const variants = variantsBySessionPhone.get(sessionPhone) ?? [sessionPhone];
      for (const v of variants) {
        const name = customerNameByVariant.get(v);
        if (name) return name;
      }
      return null;
    };

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
      const mappedPhone = mappedPhoneBySessionPhone.get(row.phone) || null;
      const looksLikeNigerianPhone = /^234[0-9]{10}$/.test(row.phone);
      const isUnresolvedLid = !mappedPhone && !looksLikeNigerianPhone;

      return {
        phone: row.phone,
        display_phone: mappedPhone || row.phone,
        is_unresolved_lid: isUnresolvedLid,
        customer_name: customerNameForSessionPhone(row.phone),
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
