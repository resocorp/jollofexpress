-- Migration: Add WhatsApp Notification System
-- Date: 2024-11-14
-- Description: Adds notification settings and logs tables for UltraMsg WhatsApp integration

-- ================================================
-- NOTIFICATION SETTINGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access notification settings
CREATE POLICY "Admins have full access to notification_settings" ON notification_settings
    FOR ALL USING (auth.role() = 'admin');

-- ================================================
-- NOTIFICATION LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('customer', 'admin')),
    event_type TEXT NOT NULL, -- 'order_confirmed', 'kitchen_closed', etc.
    recipient_phone TEXT NOT NULL,
    message_body TEXT NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    ultramsg_id TEXT, -- Message ID from UltraMsg
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_event ON notification_logs(event_type);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can access all notification logs
CREATE POLICY "Admins have full access to notification_logs" ON notification_logs
    FOR ALL USING (auth.role() = 'admin');

-- ================================================
-- UPDATE TRIGGER
-- ================================================
CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- DEFAULT NOTIFICATION SETTINGS
-- ================================================
INSERT INTO notification_settings (key, value) VALUES
('ultramsg', '{
    "instance_id": "",
    "token": "",
    "enabled": false
}'::jsonb),
('customer_notifications', '{
    "order_confirmed": true,
    "order_preparing": true,
    "order_ready": true,
    "order_out_for_delivery": true,
    "order_completed": true,
    "payment_failed": false
}'::jsonb),
('admin_notifications', '{
    "enabled": true,
    "phone_numbers": [],
    "kitchen_capacity_alerts": true,
    "payment_failures": true,
    "daily_summary": true,
    "summary_time": "20:00"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- COMMENTS
-- ================================================
COMMENT ON TABLE notification_settings IS 'Configuration settings for WhatsApp notifications via UltraMsg';
COMMENT ON TABLE notification_logs IS 'Audit log of all WhatsApp notifications sent through the system';
COMMENT ON COLUMN notification_logs.status IS 'pending: queued, sent: sent to UltraMsg, failed: send failed, delivered: confirmed delivery';
COMMENT ON COLUMN notification_logs.ultramsg_id IS 'Unique message ID returned by UltraMsg API';
