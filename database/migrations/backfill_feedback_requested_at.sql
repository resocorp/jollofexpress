-- Skip feedback prompts for orders that were already completed before the
-- feedback worker rolled out. Without this, the worker would walk back
-- through all historical completed orders and ask for ratings on stale
-- orders the customer no longer remembers.
UPDATE orders
SET feedback_requested_at = NOW()
WHERE status = 'completed'
  AND feedback_requested_at IS NULL;
