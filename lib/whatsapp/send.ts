// Shared wrapper around the Baileys sidecar's /send and /send-media endpoints.
// Used by the WhatsApp comms panel for agent replies. Notification service has
// its own copy today; that can be migrated to this helper in a follow-up.

const BAILEYS_URL = process.env.BAILEYS_SIDECAR_URL || 'http://localhost:3001';
const BAILEYS_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';

export interface BaileysSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppText(phone: string, message: string): Promise<BaileysSendResult> {
  try {
    const res = await fetch(`${BAILEYS_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': BAILEYS_SECRET,
      },
      body: JSON.stringify({ phone, message }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, messageId: data.messageId };
    }
    return { success: false, error: data.error || data.message || 'Send failed' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[whatsapp/send] text send error', msg);
    return { success: false, error: `Baileys connection error: ${msg}` };
  }
}

export async function sendWhatsAppMedia(
  phone: string,
  mediaUrl: string,
  caption: string
): Promise<BaileysSendResult> {
  try {
    const res = await fetch(`${BAILEYS_URL}/send-media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': BAILEYS_SECRET,
      },
      body: JSON.stringify({ phone, mediaUrl, caption }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, messageId: data.messageId };
    }
    return { success: false, error: data.error || data.message || 'Send failed' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[whatsapp/send] media send error', msg);
    return { success: false, error: `Baileys connection error: ${msg}` };
  }
}
