// WhatsApp AI endpoint — receives incoming messages from Baileys sidecar,
// processes via Claude AI, returns the reply text for Baileys to send directly.
//
// Body shape:
//   { phone: string, message?: string, image?: { base64: string, mimeType: string } }
//
// `phone` is the canonical session key (sidecar resolves @lid → phone before
// posting). `image`, when present, is forwarded to Claude as a vision content
// block alongside any caption text.

import { NextRequest, NextResponse } from 'next/server';
import { handleWhatsAppMessage } from '@/lib/ai/whatsapp-ai';
import { appendUserMessage, getMuteUntil } from '@/lib/ai/session-log';

const API_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';

interface ImagePayload {
  base64: string;
  mimeType: string;
}

function isValidImage(value: unknown): value is ImagePayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.base64 === 'string' &&
    v.base64.length > 0 &&
    typeof v.mimeType === 'string' &&
    v.mimeType.startsWith('image/')
  );
}

export async function POST(request: NextRequest) {
  // Verify the request is from our Baileys sidecar
  const authHeader = request.headers.get('x-api-secret');
  if (authHeader !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const phone: string = typeof body.phone === 'string' ? body.phone : '';
    const message: string = typeof body.message === 'string' ? body.message : '';
    const image: ImagePayload | undefined = isValidImage(body.image)
      ? body.image
      : undefined;

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const trimmed = message.trim();
    if (!trimmed && !image) {
      // No usable content (e.g. caption-less reaction the sidecar didn't drop).
      return NextResponse.json({ success: true, skipped: true, reply: null });
    }

    const logSuffix = image ? ` [+image ${image.mimeType}]` : '';
    console.log(
      `[WhatsApp AI] Incoming from ${phone}: ${trimmed.substring(0, 100)}${logSuffix}`
    );

    // Persist the inbound turn so the AI has the full customer-side transcript
    // even when muted. For an image without caption we record a placeholder
    // so the transcript remains readable (image bytes are NOT stored in JSONB).
    const persistedText = trimmed || (image ? '[image]' : '');
    if (persistedText) {
      await appendUserMessage(phone, persistedText);
    }

    // If a human agent is currently engaged, short-circuit without calling
    // Claude. Baileys treats an absent `reply` as "no send".
    const mutedUntil = await getMuteUntil(phone);
    if (mutedUntil) {
      console.log(
        `[WhatsApp AI] Muted for ${phone} until ${mutedUntil.toISOString()} — skipping AI reply`
      );
      return NextResponse.json({ success: true, muted: true, reply: null });
    }

    // Process via AI — returns the text reply. The image (if any) is added as
    // a vision content block on the current turn only; it is not retained in
    // the session history (text caption / placeholder is enough for context
    // on subsequent turns).
    const aiResponse = await handleWhatsAppMessage(phone, trimmed, image);

    console.log(`[WhatsApp AI] Response to ${phone}: ${aiResponse.substring(0, 100)}`);

    return NextResponse.json({ success: true, reply: aiResponse });
  } catch (error) {
    console.error('[WhatsApp AI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
