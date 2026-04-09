// WhatsApp AI endpoint — receives incoming messages from Baileys sidecar,
// processes via Claude AI, returns the reply text for Baileys to send directly

import { NextRequest, NextResponse } from 'next/server';
import { handleWhatsAppMessage } from '@/lib/ai/whatsapp-ai';

const API_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';

export async function POST(request: NextRequest) {
  // Verify the request is from our Baileys sidecar
  const authHeader = request.headers.get('x-api-secret');
  if (authHeader !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'phone and message are required' },
        { status: 400 }
      );
    }

    // Skip very short messages or media-only messages
    const trimmed = message.trim();
    if (!trimmed) {
      return NextResponse.json({ success: true, skipped: true, reply: null });
    }

    console.log(`[WhatsApp AI] Incoming from ${phone}: ${trimmed.substring(0, 100)}`);

    // Process via AI — returns the text reply
    const aiResponse = await handleWhatsAppMessage(phone, trimmed);

    console.log(`[WhatsApp AI] Response to ${phone}: ${aiResponse.substring(0, 100)}`);

    // Return the reply — Baileys sidecar will send it directly using the original JID
    return NextResponse.json({ success: true, reply: aiResponse });
  } catch (error) {
    console.error('[WhatsApp AI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
