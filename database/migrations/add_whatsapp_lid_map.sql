-- Maps WhatsApp `@lid` JIDs to the customer's canonical phone number so that
-- inbound messages (which arrive on the LID side) and outbound system
-- notifications (keyed by order.customer_phone) resolve to the same row in
-- whatsapp_ai_sessions. Without this, the AI's view of a conversation is
-- split: notifications under the phone, replies under the LID.

CREATE TABLE IF NOT EXISTS whatsapp_lid_map (
  lid_jid     TEXT PRIMARY KEY,
  phone       VARCHAR(20) NOT NULL,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_lid_map_phone
  ON whatsapp_lid_map(phone);

-- RLS: service role only (server-side access). Same pattern as
-- whatsapp_ai_sessions — this table is only ever read/written by the Next.js
-- service client, never by anon or authenticated browser sessions.
ALTER TABLE whatsapp_lid_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on whatsapp_lid_map"
  ON whatsapp_lid_map
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
