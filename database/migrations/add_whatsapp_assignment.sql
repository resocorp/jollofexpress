-- Conversation assignment for the WhatsApp comms panel.
-- assigned_agent_id  → which user 'owns' the conversation right now
-- assigned_at        → when it was claimed (used in the "Claimed by X at Y" banner)

ALTER TABLE whatsapp_ai_sessions
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_sessions_assigned_agent
  ON whatsapp_ai_sessions(assigned_agent_id)
  WHERE assigned_agent_id IS NOT NULL;
