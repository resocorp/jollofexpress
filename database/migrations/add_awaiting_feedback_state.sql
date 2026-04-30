-- Awaiting-feedback session state.
--
-- Set by the feedback-worker when it sends the "How was your order?" prompt;
-- read by lib/ai/tools.ts:findRecentPendingFeedbackOrder to deterministically
-- resolve which order the customer's reply refers to (no phone-format
-- guessing, no LID-resolution drift).
--
-- Cleared by submit_feedback after a successful insert. Stale flags are
-- ignored if older than the lookup window (currently 14 days).

ALTER TABLE whatsapp_ai_sessions
  ADD COLUMN IF NOT EXISTS awaiting_feedback_order_id UUID
    REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS awaiting_feedback_set_at TIMESTAMPTZ;

-- Lookup index for the awaiting-flag strategy.
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_sessions_awaiting_feedback
  ON whatsapp_ai_sessions(awaiting_feedback_order_id)
  WHERE awaiting_feedback_order_id IS NOT NULL;
