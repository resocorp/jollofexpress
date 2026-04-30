-- ================================================
-- Migration: batches.total_orders counts only ACTIVE orders
-- ================================================
-- Before: total_orders incremented on every INSERT into orders, decremented
-- only when status transitioned to 'cancelled'. Result: abandoned checkouts
-- (status='pending', payment_status='pending') inflated the count, so the
-- /admin/batches badge was much higher than the actual number of real orders.
--
-- After: total_orders = COUNT(*) of orders in the batch whose status is in
-- the "active" set: confirmed, preparing, ready, out_for_delivery, completed.
-- This matches the filter already used by /api/admin/batch/[id]/orders
-- (the drill-in view), so the badge and the drill-in agree.
--
-- Mechanism: one trigger on INSERT OR UPDATE OF status/batch_id that
-- detects transitions in/out of the active set and adjusts the count.
-- ================================================

-- Drop the old triggers + functions (replaced wholesale)
DROP TRIGGER IF EXISTS trigger_increment_batch_orders ON orders;
DROP TRIGGER IF EXISTS trigger_decrement_batch_orders_on_cancel ON orders;
DROP FUNCTION IF EXISTS increment_batch_order_count();
DROP FUNCTION IF EXISTS update_batch_order_count_on_cancel();

-- New: status-aware sync function
CREATE OR REPLACE FUNCTION sync_batch_active_order_count()
RETURNS TRIGGER AS $$
DECLARE
    active_statuses TEXT[] := ARRAY['confirmed','preparing','ready','out_for_delivery','completed'];
    was_active BOOLEAN;
    is_active BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- orders.status is an ENUM (order_status); cast to TEXT to compare with TEXT[]
        is_active := NEW.status::TEXT = ANY(active_statuses);
        IF is_active AND NEW.batch_id IS NOT NULL THEN
            UPDATE batches SET total_orders = total_orders + 1 WHERE id = NEW.batch_id;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        was_active := OLD.status::TEXT = ANY(active_statuses);
        is_active := NEW.status::TEXT = ANY(active_statuses);

        IF OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
            -- Batch reassignment: subtract from old, add to new
            IF was_active AND OLD.batch_id IS NOT NULL THEN
                UPDATE batches SET total_orders = GREATEST(total_orders - 1, 0)
                WHERE id = OLD.batch_id;
            END IF;
            IF is_active AND NEW.batch_id IS NOT NULL THEN
                UPDATE batches SET total_orders = total_orders + 1
                WHERE id = NEW.batch_id;
            END IF;
        ELSIF NEW.batch_id IS NOT NULL THEN
            -- Same batch: adjust on activeness transition
            IF was_active AND NOT is_active THEN
                UPDATE batches SET total_orders = GREATEST(total_orders - 1, 0)
                WHERE id = NEW.batch_id;
            ELSIF NOT was_active AND is_active THEN
                UPDATE batches SET total_orders = total_orders + 1
                WHERE id = NEW.batch_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_batch_active_orders
    AFTER INSERT OR UPDATE OF status, batch_id ON orders
    FOR EACH ROW
    EXECUTE FUNCTION sync_batch_active_order_count();

-- Backfill: recalculate every batch's total_orders from current order rows
UPDATE batches b SET total_orders = (
    SELECT COUNT(*) FROM orders o
    WHERE o.batch_id = b.id
      AND o.status IN ('confirmed','preparing','ready','out_for_delivery','completed')
);
