-- Add 'scheduled' status to order_status enum
-- This allows orders to be placed outside operating hours and processed when restaurant opens

-- Add the new value to the enum type
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'scheduled' AFTER 'pending';

-- Add comment explaining the new status
COMMENT ON TYPE order_status IS 'Order status: pending (payment pending), scheduled (paid but outside hours), confirmed (ready to prepare), preparing, ready, out_for_delivery, completed, cancelled';

-- Add notes column to orders table for scheduled order information
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
