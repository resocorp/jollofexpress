// Claim or force-take-over a WhatsApp conversation.
// `force=true` reassigns even if another agent currently holds it.
// Always extends the AI mute by 24h so the AI doesn't intrude.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrAgent } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { setMute } from '@/lib/ai/session-log';

const schema = z.object({
  force: z.boolean().optional().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const auth = await verifyAdminOrAgent(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { phone: phoneParam } = await params;
    const phone = decodeURIComponent(phoneParam);
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: session } = await supabase
      .from('whatsapp_ai_sessions')
      .select('id, assigned_agent_id')
      .eq('phone', phone)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (
      session.assigned_agent_id &&
      session.assigned_agent_id !== auth.user.id &&
      !parsed.data.force
    ) {
      return NextResponse.json(
        { error: 'Already claimed by another agent', code: 'ALREADY_CLAIMED' },
        { status: 409 }
      );
    }

    await supabase
      .from('whatsapp_ai_sessions')
      .update({
        assigned_agent_id: auth.user.id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    await setMute(phone, new Date(Date.now() + 24 * 60 * 60 * 1000));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[whatsapp:claim] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
