-- Saved canned responses used by the WhatsApp comms panel.
-- Body supports {{customer_name}}, {{order_number}}, {{order_status}}
-- placeholders, substituted client-side from the customer's most recent order.

CREATE TABLE IF NOT EXISTS whatsapp_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_quick_replies_name
  ON whatsapp_quick_replies(name);

ALTER TABLE whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on whatsapp_quick_replies"
  ON whatsapp_quick_replies
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_whatsapp_quick_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_whatsapp_quick_replies_updated_at
  BEFORE UPDATE ON whatsapp_quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_quick_replies_updated_at();
