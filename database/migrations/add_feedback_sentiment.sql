-- Sentiment + theme columns on order_feedback.
--
-- Populated by lib/ai/sentiment.ts (Claude Haiku) at submit time, with a
-- one-shot backfill (scripts/backfill-feedback-sentiment.js) for existing
-- rows. Closed taxonomy on themes keeps the dashboard aggregation tidy.

ALTER TABLE order_feedback
  ADD COLUMN IF NOT EXISTS sentiment       TEXT
    CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC
    CHECK (sentiment_score BETWEEN -1 AND 1),
  ADD COLUMN IF NOT EXISTS themes          TEXT[];

CREATE INDEX IF NOT EXISTS idx_order_feedback_sentiment
  ON order_feedback(sentiment);

-- GIN index for theme lookups (e.g. "show me feedback tagged delivery_speed").
CREATE INDEX IF NOT EXISTS idx_order_feedback_themes
  ON order_feedback USING GIN(themes);
