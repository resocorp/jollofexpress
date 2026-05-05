// Hand a conversation back to the AI: clear assignment + clear mute.
// The AI will respond to the next inbound message.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrAgent } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const auth = await verifyAdminOrAgent(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { phone: phoneParam } = await params;
    const phone = decodeURIComponent(phoneParam);
    const supabase = createServiceClient();

    await supabase
      .from('whatsapp_ai_sessions')
      .update({
        assigned_agent_id: null,
        assigned_at: null,
        ai_muted_until: null,
      })
      .eq('phone', phone);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[whatsapp:handback] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
