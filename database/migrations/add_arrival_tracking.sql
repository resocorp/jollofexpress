-- Geofence auto-complete: track when rider enters customer radius and when the
-- order was auto-completed on exit.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS arrived_at_customer TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS orders_arrived_at_customer_idx
  ON orders(arrived_at_customer)
  WHERE arrived_at_customer IS NOT NULL;
