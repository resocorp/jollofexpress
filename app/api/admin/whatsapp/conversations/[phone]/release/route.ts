// Release a claim without resuming the AI. The AI stays muted until
// ai_muted_until expires or the agent explicitly hands back.

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
      .update({ assigned_agent_id: null, assigned_at: null })
      .eq('phone', phone);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[whatsapp:release] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
