-- AI session: mute window + source-tagged messages
-- Part of WhatsApp AI context-loss fix:
--  - `ai_muted_until`: suppress AI replies when a human agent is engaged
--  - `messages[*].source`: tag each turn as 'user' | 'ai' | 'staff' | 'system'
--    so the AI sees staff replies, system notifications, etc. in history.
-- Existing rows (no `source` field) are treated as 'ai' for assistant and
-- 'user' for user — handled in application code, no data migration needed.

ALTER TABLE whatsapp_ai_sessions
  ADD COLUMN IF NOT EXISTS ai_muted_until TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_sessions_muted
  ON whatsapp_ai_sessions(ai_muted_until)
  WHERE ai_muted_until IS NOT NULL;
