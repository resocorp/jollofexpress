// Agent reply endpoint. Sends via Baileys, appends to the AI session history
// with source='staff' + agent metadata, implicitly claims, and extends the AI
// mute by 24h.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrAgent } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { appendStaffMessage } from '@/lib/ai/session-log';
import { sendWhatsAppMedia, sendWhatsAppText } from '@/lib/whatsapp/send';

const sendSchema = z.object({
  message: z.string().max(4096).optional().default(''),
  // Path inside the whatsapp-media bucket; the route signs it before forwarding.
  media_path: z.string().max(512).optional(),
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
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const message = parsed.data.message?.trim() ?? '';
    const mediaPath = parsed.data.media_path?.trim() ?? '';

    if (!message && !mediaPath) {
      return NextResponse.json({ error: 'message or media_path required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Resolve agent name for attribution.
    const { data: agent } = await supabase
      .from('users')
      .select('name')
      .eq('id', auth.user.id)
      .single();
    const agentName = agent?.name || auth.user.email || 'Agent';

    // Implicitly claim the conversation if it isn't already claimed by someone.
    const { data: session } = await supabase
      .from('whatsapp_ai_sessions')
      .select('id, assigned_agent_id')
      .eq('phone', phone)
      .maybeSingle();

    if (session && (!session.assigned_agent_id || session.assigned_agent_id === auth.user.id)) {
      await supabase
        .from('whatsapp_ai_sessions')
        .update({ assigned_agent_id: auth.user.id, assigned_at: new Date().toISOString() })
        .eq('id', session.id);
    }

    // If a media_path was provided, mint a short-lived signed URL for Baileys.
    let mediaSignedUrl: string | null = null;
    let mediaPublicUrlForUi: string | null = null;
    if (mediaPath) {
      const { data, error: signErr } = await supabase.storage
        .from('whatsapp-media')
        .createSignedUrl(mediaPath, 600); // 10 min — Baileys fetches immediately
      if (signErr || !data?.signedUrl) {
        console.error('[whatsapp:send] sign error', signErr);
        return NextResponse.json({ error: 'Failed to sign media URL' }, { status: 500 });
      }
      mediaSignedUrl = data.signedUrl;
      // For the panel UI: a longer-lived signed URL so the bubble stays viewable.
      const { data: longUrl } = await supabase.storage
        .from('whatsapp-media')
        .createSignedUrl(mediaPath, 60 * 60 * 24 * 7);
      mediaPublicUrlForUi = longUrl?.signedUrl ?? null;
    }

    // Send via Baileys.
    const sendResult = mediaSignedUrl
      ? await sendWhatsAppMedia(phone, mediaSignedUrl, message)
      : await sendWhatsAppText(phone, message);

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send WhatsApp message' },
        { status: 502 }
      );
    }

    // Persist into the AI session history. Mute is extended 24h inside.
    await appendStaffMessage(phone, message || (mediaSignedUrl ? '[image]' : ''), {
      agent_id: auth.user.id,
      agent_name: agentName,
      media_url: mediaPublicUrlForUi ?? undefined,
      message_id: sendResult.messageId,
      mute_minutes: 24 * 60,
    });

    return NextResponse.json({ success: true, messageId: sendResult.messageId });
  } catch (error) {
    console.error('[whatsapp:send] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
