// Resolves WhatsApp JIDs (either `<digits>@s.whatsapp.net` or
// `<lid>@lid`) to the canonical phone string that we use as the AI session
// key in `whatsapp_ai_sessions.phone`. The mapping is also persisted in
// `whatsapp_lid_map` so subsequent inbound messages from the same LID
// resolve without needing senderPn from Baileys.
//
// Why this exists: outbound order/status notifications key the session by
// `order.customer_phone` (e.g. "2348012345678"), but inbound chats arrive
// on `@lid` JIDs (e.g. "21230174351544@lid") and were previously stored
// under the bare LID — splitting the same conversation across two rows.

import { createServiceClient } from '@/lib/supabase/service';

export type ResolveSource =
  | 'jid-direct' // remoteJid was @s.whatsapp.net — phone is the digits
  | 'sender-pn' // resolved from msg.key.senderPn (Baileys 7+)
  | 'lid-map' // resolved from the persisted whatsapp_lid_map cache
  | 'lid-fallback'; // unknown LID — caller should use the bare LID as a temporary key

export interface ResolveInput {
  remoteJid: string;
  /** Optional `<digits>@s.whatsapp.net` provided by Baileys for @lid messages */
  senderPn?: string | null;
  pushName?: string | null;
}

export interface ResolveResult {
  /** Digits-only phone string (e.g. "2348012345678"), or the bare LID when unknown */
  canonicalPhone: string;
  source: ResolveSource;
  /** True when canonicalPhone is a real phone, false when it's a fallback LID */
  isPhone: boolean;
}

/**
 * Canonical Nigerian phone form: digits-only, "234" country prefix.
 * Mirrors the existing formatPhoneNumber() in scripts/baileys-server.js so
 * inbound resolution and outbound sends agree on the session key.
 *
 *   "08012345678"      → "2348012345678"
 *   "+234 801 234 5678" → "2348012345678"
 *   "2348012345678"    → "2348012345678"
 *   ""                 → ""
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return '';
  let cleaned = input.replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('234')) {
    cleaned = '234' + cleaned;
  }
  return cleaned;
}

/**
 * All formats we'd plausibly find in `orders.customer_phone` for a given
 * input phone — used when matching by phone across the schema, since checkout
 * stores whatever the customer typed.
 *
 *   "2348012345678" → ["2348012345678", "+2348012345678", "08012345678", "8012345678"]
 */
export function phoneVariants(input: string | null | undefined): string[] {
  const canonical = normalizePhone(input);
  if (!canonical) return [];
  const local10 = canonical.startsWith('234') ? canonical.substring(3) : canonical;
  const variants = new Set<string>([
    canonical, // 2348012345678
    `+${canonical}`, // +2348012345678
    `0${local10}`, // 08012345678
    local10, // 8012345678
  ]);
  // Preserve any unusual raw input the customer typed at checkout.
  const raw = (input || '').trim();
  if (raw) variants.add(raw);
  return Array.from(variants);
}

function digitsFromJid(jid: string): string {
  return jid.replace(/@s\.whatsapp\.net$/, '').replace(/@lid$/, '');
}

/**
 * Resolve a remote JID to the phone we use as the session key.
 *
 * The function never throws on DB errors — when Supabase fails, we fall back
 * to the bare LID so the AI flow keeps moving (slightly degraded: that
 * customer's session won't unify with their notification history yet).
 */
export async function resolveSessionKey(
  input: ResolveInput
): Promise<ResolveResult> {
  const { remoteJid } = input;

  if (remoteJid.endsWith('@s.whatsapp.net')) {
    return {
      canonicalPhone: digitsFromJid(remoteJid),
      source: 'jid-direct',
      isPhone: true,
    };
  }

  if (!remoteJid.endsWith('@lid')) {
    // Unsupported JID shape — return digits for whatever was passed.
    return {
      canonicalPhone: digitsFromJid(remoteJid),
      source: 'lid-fallback',
      isPhone: false,
    };
  }

  const lidJid = remoteJid;

  // Preferred path: Baileys 7 sometimes populates senderPn with the
  // `<digits>@s.whatsapp.net` form on @lid messages.
  if (input.senderPn) {
    const phone = normalizePhone(digitsFromJid(input.senderPn));
    if (phone) {
      await recordLidForPhone(lidJid, phone).catch((err) => {
        console.error('[identity] recordLidForPhone failed:', err);
      });
      return { canonicalPhone: phone, source: 'sender-pn', isPhone: true };
    }
  }

  // Fallback: cached mapping from a previous successful resolve.
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('whatsapp_lid_map')
    .select('phone')
    .eq('lid_jid', lidJid)
    .maybeSingle();

  if (!error && data?.phone) {
    // Touch last_seen so we can spot stale mappings later if needed.
    void supabase
      .from('whatsapp_lid_map')
      .update({ last_seen: new Date().toISOString() })
      .eq('lid_jid', lidJid);
    return { canonicalPhone: data.phone, source: 'lid-map', isPhone: true };
  }

  // Unknown LID — caller will use this as a temporary session key. Future
  // outbound messages or a senderPn-bearing inbound will populate the map.
  return {
    canonicalPhone: digitsFromJid(lidJid),
    source: 'lid-fallback',
    isPhone: false,
  };
}

/** Upsert a (lid_jid, phone) mapping. Safe to call repeatedly. */
export async function recordLidForPhone(
  lidJid: string,
  phone: string
): Promise<void> {
  if (!lidJid.endsWith('@lid')) return;
  const normalized = normalizePhone(phone);
  if (!normalized) return;

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  await supabase.from('whatsapp_lid_map').upsert(
    {
      lid_jid: lidJid,
      phone: normalized,
      last_seen: nowIso,
    },
    { onConflict: 'lid_jid' }
  );
}
