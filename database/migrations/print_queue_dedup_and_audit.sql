-- ================================================
-- Migration: print_queue dedup, atomic claim, and audit log
-- ================================================
-- Closes three race conditions that were causing the kitchen thermal
-- printer to occasionally print the same new order twice:
--
--   Race A: Paystack webhook + verify-payment redirect both run after a
--           successful charge. Both did SELECT-then-INSERT on print_queue
--           with no DB-level uniqueness, so two rows could land for the
--           same order_id when they raced. Closed by the partial unique
--           index below; insertion code switches to plain INSERT and
--           treats unique violation (23505) as "already queued".
--
--   Race B: triggerImmediatePrint() and the PM2 worker poll both did
--           bare SELECT WHERE status='pending' before printing, with no
--           atomic claim. The worker could grab a row mid-immediate-print
--           and print it again. Closed by claim_print_job_for_order /
--           claim_print_jobs RPCs which atomically stamp claimed_at via
--           UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED).
--
--   Stuck-job recovery is folded into the claim itself: a row whose
--   claimed_at is older than 2 minutes is eligible to be re-claimed,
--   so a worker that crashed mid-print can never strand a row.
--
-- Also adds print_audit_log so any future double-print can be diagnosed
-- with a single SQL query against the order_id timeline.
-- ================================================

-- ------------------------------------------------
-- 1. Track when a row was claimed for printing
-- ------------------------------------------------
ALTER TABLE print_queue
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- ------------------------------------------------
-- 2. Partial unique index — at most one pending row per order
-- ------------------------------------------------
-- Allows historical 'printed'/'failed' rows to coexist with intentional
-- reprints (kitchen "Reprint" button inserts a new row after the first
-- has already moved to 'printed').
CREATE UNIQUE INDEX IF NOT EXISTS uq_print_queue_one_pending_per_order
  ON print_queue(order_id)
  WHERE status = 'pending';

-- ------------------------------------------------
-- 3. Atomic claim for a single order (used by triggerImmediatePrint)
-- ------------------------------------------------
-- Returns 0 rows if no claimable row exists (someone else is printing it
-- and the claim is fresh). Returns the claimed row otherwise.
CREATE OR REPLACE FUNCTION claim_print_job_for_order(p_order_id UUID)
RETURNS SETOF print_queue AS $$
  UPDATE print_queue
     SET claimed_at = NOW(),
         attempts   = attempts + 1
   WHERE id = (
     SELECT id FROM print_queue
      WHERE order_id = p_order_id
        AND status   = 'pending'
        AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '2 minutes')
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
  RETURNING *;
$$ LANGUAGE sql;

-- ------------------------------------------------
-- 4. Atomic batch claim for the worker poll (used by processPrintQueue)
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION claim_print_jobs(p_batch_size INT, p_max_attempts INT)
RETURNS SETOF print_queue AS $$
  UPDATE print_queue
     SET claimed_at = NOW(),
         attempts   = attempts + 1
   WHERE id IN (
     SELECT id FROM print_queue
      WHERE status = 'pending'
        AND attempts < p_max_attempts
        AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '2 minutes')
      ORDER BY created_at
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
   )
  RETURNING *;
$$ LANGUAGE sql;

-- ------------------------------------------------
-- 5. Print audit log
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS print_audit_log (
  id            BIGSERIAL PRIMARY KEY,
  print_job_id  UUID REFERENCES print_queue(id) ON DELETE SET NULL,
  order_id      UUID,
  event         TEXT NOT NULL,
    -- 'queued' | 'duplicate_blocked' | 'claim_won' | 'claim_lost'
    -- | 'tcp_sent' | 'marked_printed' | 'marked_failed' | 'recovered'
  source        TEXT NOT NULL,
    -- 'webhook' | 'verify_payment' | 'immediate_print'
    -- | 'worker_poll' | 'kitchen_reprint' | 'kitchen_test' | 'recovery'
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_audit_log_order_created
  ON print_audit_log(order_id, created_at);

CREATE INDEX IF NOT EXISTS idx_print_audit_log_event
  ON print_audit_log(event, created_at);

ALTER TABLE print_audit_log ENABLE ROW LEVEL SECURITY;

-- Mirrors the print_queue policy: kitchen + admin can read for diagnostics.
CREATE POLICY "Kitchen and admin can read print audit log" ON print_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
       WHERE users.id = auth.uid()
         AND users.role IN ('kitchen', 'admin')
    )
  );

COMMENT ON TABLE print_audit_log IS
  'Append-only timeline of every print_queue lifecycle event. Diagnose double-prints with: SELECT * FROM print_audit_log WHERE order_id = $1 ORDER BY created_at;';
