-- Agent-only annotations on a WhatsApp conversation.
-- Never sent to the customer; visible to admins and customer-care agents
-- in the comms panel. Keyed by phone (matches whatsapp_ai_sessions.phone).

CREATE TABLE IF NOT EXISTS whatsapp_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  agent_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_internal_notes_phone
  ON whatsapp_internal_notes(phone, created_at DESC);

ALTER TABLE whatsapp_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on whatsapp_internal_notes"
  ON whatsapp_internal_notes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
