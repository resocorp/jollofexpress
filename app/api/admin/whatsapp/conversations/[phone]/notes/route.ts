// Internal notes for a WhatsApp conversation. Visible to staff only;
// never sent to the customer. Admin + agent can read and add.
// Delete is restricted to the note's author or any admin.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrAgent } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';

const addSchema = z.object({
  body: z.string().min(1).max(2000),
});

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

    const { data: notes, error } = await supabase
      .from('whatsapp_internal_notes')
      .select('id, phone, agent_id, body, created_at')
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[whatsapp:notes:list]', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    const agentIds = Array.from(
      new Set((notes ?? []).map((n) => n.agent_id).filter((v): v is string => !!v))
    );
    const nameById = new Map<string, string>();
    if (agentIds.length) {
      const { data: agents } = await supabase
        .from('users')
        .select('id, name')
        .in('id', agentIds);
      for (const a of agents ?? []) nameById.set(a.id, a.name);
    }

    return NextResponse.json({
      notes: (notes ?? []).map((n) => ({
        ...n,
        agent_name: n.agent_id ? nameById.get(n.agent_id) || null : null,
      })),
    });
  } catch (error) {
    console.error('[whatsapp:notes:list] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const auth = await verifyAdminOrAgent(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { phone: phoneParam } = await params;
    const phone = decodeURIComponent(phoneParam);
    const body = await request.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('whatsapp_internal_notes')
      .insert({ phone, body: parsed.data.body, agent_id: auth.user.id })
      .select()
      .single();

    if (error) {
      console.error('[whatsapp:notes:create]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ note: data }, { status: 201 });
  } catch (error) {
    console.error('[whatsapp:notes:create] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const auth = await verifyAdminOrAgent(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { phone: phoneParam } = await params;
    const phone = decodeURIComponent(phoneParam);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = createServiceClient();

    // Authorize: admins can delete any note; agents can only delete their own.
    const { data: note } = await supabase
      .from('whatsapp_internal_notes')
      .select('agent_id, phone')
      .eq('id', id)
      .maybeSingle();
    if (!note || note.phone !== phone) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    if (auth.user.role !== 'admin' && note.agent_id !== auth.user.id) {
      return NextResponse.json({ error: 'Cannot delete another agent\'s note' }, { status: 403 });
    }

    const { error } = await supabase.from('whatsapp_internal_notes').delete().eq('id', id);
    if (error) {
      console.error('[whatsapp:notes:delete]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[whatsapp:notes:delete] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
