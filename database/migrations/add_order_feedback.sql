-- Order feedback: 1–5 rating + optional comment, collected inline on WhatsApp
-- - `order_feedback`: one row per order (UNIQUE on order_id prevents duplicates)
-- - `orders.feedback_requested_at`: set by the feedback-worker after sending
--   the prompt, so we only ask once per order.

CREATE TABLE IF NOT EXISTS order_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  customer_phone TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'whatsapp_inline'
);

CREATE INDEX IF NOT EXISTS idx_order_feedback_rating
  ON order_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_order_feedback_submitted
  ON order_feedback(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_feedback_phone
  ON order_feedback(customer_phone);

-- RLS: service role only (admin UI uses service client server-side)
ALTER TABLE order_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on order_feedback"
  ON order_feedback
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS feedback_requested_at TIMESTAMPTZ NULL;

-- Partial index: drives the feedback-worker poll query (completed orders
-- that haven't had a feedback prompt sent yet).
CREATE INDEX IF NOT EXISTS idx_orders_feedback_pending
  ON orders(completed_at)
  WHERE completed_at IS NOT NULL AND feedback_requested_at IS NULL;
