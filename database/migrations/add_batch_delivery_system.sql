-- ================================================
-- BATCH DELIVERY SYSTEM MIGRATION
-- Adds delivery windows, batches, feature flags,
-- notification templates, and order batch columns
-- ================================================

-- ================================================
-- DELIVERY WINDOWS (reusable daily schedule templates)
-- ================================================
CREATE TABLE IF NOT EXISTS delivery_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    order_open_time TIME NOT NULL,
    cutoff_time TIME NOT NULL,
    delivery_start TIME NOT NULL,
    delivery_end TIME NOT NULL,
    max_capacity INT NOT NULL DEFAULT 50,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    days_of_week JSONB, -- null=every day, [1,2,3,4,5]=Mon-Fri, [0,6]=weekends
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_window_open_before_cutoff CHECK (order_open_time < cutoff_time),
    CONSTRAINT chk_window_cutoff_before_delivery CHECK (cutoff_time <= delivery_start),
    CONSTRAINT chk_window_delivery_start_before_end CHECK (delivery_start < delivery_end)
);

CREATE INDEX idx_delivery_windows_active ON delivery_windows(is_active, display_order);

-- Trigger for updated_at
CREATE TRIGGER update_delivery_windows_updated_at
    BEFORE UPDATE ON delivery_windows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- BATCHES (daily instances created from windows)
-- ================================================
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_window_id UUID REFERENCES delivery_windows(id) ON DELETE SET NULL,
    delivery_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepting'
        CHECK (status IN ('accepting', 'cutoff', 'preparing', 'dispatching', 'completed', 'cancelled')),
    total_orders INT NOT NULL DEFAULT 0,
    max_capacity INT NOT NULL DEFAULT 50,
    override_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_batch_window_date UNIQUE (delivery_window_id, delivery_date)
);

CREATE INDEX idx_batches_date ON batches(delivery_date);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_date_status ON batches(delivery_date, status);

-- Trigger for updated_at
CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- FEATURE FLAGS
-- ================================================
CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- NOTIFICATION TEMPLATES (WhatsApp message templates)
-- ================================================
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_event TEXT NOT NULL UNIQUE,
    template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ALTER ORDERS TABLE — add batch columns
-- ================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_window TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Delivery windows: public read for active, admin full access
ALTER TABLE delivery_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active delivery windows are viewable by everyone"
    ON delivery_windows FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins have full access to delivery_windows"
    ON delivery_windows FOR ALL
    USING (auth.role() = 'admin');

-- Batches: public read, admin full access
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Batches are viewable by everyone"
    ON batches FOR SELECT
    USING (true);

CREATE POLICY "Admins have full access to batches"
    ON batches FOR ALL
    USING (auth.role() = 'admin');

-- Feature flags: public read, admin full access
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feature flags are viewable by everyone"
    ON feature_flags FOR SELECT
    USING (true);

CREATE POLICY "Admins have full access to feature_flags"
    ON feature_flags FOR ALL
    USING (auth.role() = 'admin');

-- Notification templates: admin only
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to notification_templates"
    ON notification_templates FOR ALL
    USING (auth.role() = 'admin');

-- ================================================
-- SEED DATA
-- ================================================

-- Default delivery window: Afternoon Batch
INSERT INTO delivery_windows (name, order_open_time, cutoff_time, delivery_start, delivery_end, max_capacity, is_active, display_order)
VALUES ('Afternoon Batch', '08:00', '14:00', '16:00', '18:00', 50, true, 1)
ON CONFLICT DO NOTHING;

-- Feature flags
INSERT INTO feature_flags (key, label, description, enabled) VALUES
    ('whatsapp_notifications_enabled', 'WhatsApp Notifications (Baileys)', 'Send WhatsApp notifications via Baileys', false),
    ('countdown_timer_enabled', 'Countdown Timer on Menu', 'Show countdown timer to next order cutoff on menu page', false),
    ('preorder_mode_enabled', 'Pre-order Mode (after cutoff)', 'Allow customers to pre-order for the next delivery window after cutoff', true),
    ('capacity_warnings_enabled', 'Capacity Warnings', 'Show "almost sold out" messaging when batch nears capacity', false),
    ('early_bird_promo_enabled', 'Early Bird Promo (before 11AM)', 'Auto-apply early bird discount for orders before 11AM', false),
    ('how_it_works_enabled', 'How It Works Strip', 'Show "How It Works" information strip on menu page', false)
ON CONFLICT (key) DO NOTHING;

-- Notification templates
INSERT INTO notification_templates (trigger_event, template, is_active) VALUES
    ('order_placed', 'My Shawarma Express: Order #{{order_id}} confirmed! Your shawarma will be delivered {{delivery_date}} between {{delivery_window}}. Total: ₦{{total}}', true),
    ('batch_preparing', 'My Shawarma Express: Your shawarma is on the grill! 🔥 We''re preparing today''s fresh batch. Expect delivery between {{delivery_window}}.', true),
    ('order_dispatched', 'My Shawarma Express: Order #{{order_id}} is on its way! 🛵 Your rider is heading to you now. Estimated arrival: 30-45 mins.', true),
    ('order_delivered', 'My Shawarma Express: Delivered! ✅ Enjoy your shawarma. Questions? Call +2348106828147. Order again: myshawarma.express', true),
    ('preorder_reminder', 'My Shawarma Express: Reminder - your order #{{order_id}} is scheduled for delivery today between {{delivery_window}}.', true)
ON CONFLICT (trigger_event) DO NOTHING;

-- ================================================
-- FUNCTION: Increment batch order count
-- ================================================
CREATE OR REPLACE FUNCTION increment_batch_order_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.batch_id IS NOT NULL THEN
        UPDATE batches
        SET total_orders = total_orders + 1
        WHERE id = NEW.batch_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_batch_orders
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION increment_batch_order_count();

-- ================================================
-- PROMO CODE ENHANCEMENTS (early bird, free item)
-- ================================================
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS promo_type TEXT DEFAULT 'standard';
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS free_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS valid_before_time TIME;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_uses_per_day INT;

-- ================================================
-- FUNCTION: Decrement batch order count on cancel
-- ================================================
CREATE OR REPLACE FUNCTION update_batch_order_count_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' AND NEW.batch_id IS NOT NULL THEN
        UPDATE batches
        SET total_orders = GREATEST(total_orders - 1, 0)
        WHERE id = NEW.batch_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_batch_orders_on_cancel
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_order_count_on_cancel();
