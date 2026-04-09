-- WhatsApp AI Chat Sessions
-- Stores conversation history for AI-powered WhatsApp chat
-- Each phone number gets one session with message history as JSONB array

CREATE TABLE IF NOT EXISTS whatsapp_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  -- Tracks if AI is currently processing (prevents duplicate handling)
  is_processing BOOLEAN DEFAULT FALSE,
  -- Optional: link to customer's last order for context
  last_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by phone
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_sessions_phone ON whatsapp_ai_sessions(phone);
-- Index for session cleanup (TTL)
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_sessions_last_activity ON whatsapp_ai_sessions(last_activity);

-- RLS: service role only (server-side access)
ALTER TABLE whatsapp_ai_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on whatsapp_ai_sessions"
  ON whatsapp_ai_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_ai_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_ai_sessions_updated_at
  BEFORE UPDATE ON whatsapp_ai_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_ai_sessions_updated_at();
