// Single conversation detail: full message history + customer order context.
// Allowed roles: admin + customer_care_agent.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrAgent } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { SessionMessage } from '@/lib/ai/session-log';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const auth = await verifyAdminOrAgent(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { phone: phoneParam } = await params;
    const phone = decodeURIComponent(phoneParam);
    const supabase = createServiceClient();

    const { data: session, error } = await supabase
      .from('whatsapp_ai_sessions')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('[whatsapp:conversations:detail]', error);
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Fetch the customer's recent orders for the context sidebar.
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, status, total_amount, customer_name, created_at, batch_id')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })
      .limit(5);

    // Look up the assigned agent name + the names referenced inside messages.
    const messages = (session.messages as SessionMessage[]) || [];
    const agentIdSet = new Set<string>();
    if (session.assigned_agent_id) agentIdSet.add(session.assigned_agent_id);
    for (const m of messages) {
      if (m.agent_id) agentIdSet.add(m.agent_id);
    }
    const agentIds = Array.from(agentIdSet);
    const agentNameById = new Map<string, string>();
    if (agentIds.length) {
      const { data: agents } = await supabase
        .from('users')
        .select('id, name')
        .in('id', agentIds);
      for (const a of agents ?? []) agentNameById.set(a.id, a.name);
    }

    // Decorate messages with agent_name when missing.
    const decorated: SessionMessage[] = messages.map((m) => ({
      ...m,
      agent_name: m.agent_name ?? (m.agent_id ? agentNameById.get(m.agent_id) : undefined),
    }));

    const customerName = (orders && orders.length > 0 ? orders[0].customer_name : null) || null;

    const isMuted = !!session.ai_muted_until && new Date(session.ai_muted_until).getTime() > Date.now();

    return NextResponse.json({
      conversation: {
        phone: session.phone,
        customer_name: customerName,
        messages: decorated,
        last_activity: session.last_activity,
        ai_muted_until: session.ai_muted_until,
        is_muted: isMuted,
        assigned_agent_id: session.assigned_agent_id,
        assigned_agent_name: session.assigned_agent_id ? agentNameById.get(session.assigned_agent_id) || null : null,
        assigned_at: session.assigned_at,
        is_mine: session.assigned_agent_id === auth.user.id,
        awaiting_feedback_order_id: session.awaiting_feedback_order_id,
        recent_orders: orders ?? [],
      },
    });
  } catch (error) {
    console.error('[whatsapp:conversations:detail] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
