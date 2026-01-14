-- WhatsApp Ordering System Migration
-- Adds tables for managing WhatsApp conversation sessions and order flow

-- WhatsApp Sessions table - stores conversation state and cart
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  customer_name VARCHAR(100),
  state VARCHAR(50) DEFAULT 'IDLE',
  cart JSONB DEFAULT '[]'::jsonb,
  selected_category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  selected_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  pending_variation_selection JSONB DEFAULT NULL,
  delivery_address TEXT,
  delivery_region_id UUID REFERENCES delivery_regions(id) ON DELETE SET NULL,
  customer_latitude DECIMAL(10, 8),
  customer_longitude DECIMAL(11, 8),
  pending_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  last_message_id VARCHAR(100),
  message_context JSONB DEFAULT '{}'::jsonb,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_state ON whatsapp_sessions(state);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_last_activity ON whatsapp_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_pending_order ON whatsapp_sessions(pending_order_id);

-- WhatsApp message log for debugging and analytics
CREATE TABLE IF NOT EXISTS whatsapp_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type VARCHAR(20) DEFAULT 'text',
  message_body TEXT,
  media_url TEXT,
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  ultramsg_id VARCHAR(100),
  state_before VARCHAR(50),
  state_after VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_session ON whatsapp_message_log(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_phone ON whatsapp_message_log(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_created ON whatsapp_message_log(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS whatsapp_sessions_updated_at ON whatsapp_sessions;
CREATE TRIGGER whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_session_timestamp();

-- Function to cleanup stale sessions (call periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_stale_whatsapp_sessions(timeout_minutes INT DEFAULT 60)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM whatsapp_sessions
  WHERE last_activity < NOW() - (timeout_minutes || ' minutes')::INTERVAL
    AND state NOT IN ('PAYMENT_PENDING', 'ORDER_COMPLETE')
    AND pending_order_id IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add order_source column to orders table to track WhatsApp orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_source'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_source VARCHAR(20) DEFAULT 'web';
  END IF;
END $$;

-- Add whatsapp_session_id to orders for linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'whatsapp_session_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN whatsapp_session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for service role (backend only)
DROP POLICY IF EXISTS whatsapp_sessions_service_all ON whatsapp_sessions;
CREATE POLICY whatsapp_sessions_service_all ON whatsapp_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_message_log_service_all ON whatsapp_message_log;
CREATE POLICY whatsapp_message_log_service_all ON whatsapp_message_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE whatsapp_sessions IS 'Stores WhatsApp conversation sessions for ordering';
COMMENT ON TABLE whatsapp_message_log IS 'Logs all WhatsApp messages for debugging and analytics';
COMMENT ON COLUMN whatsapp_sessions.state IS 'Current conversation state: IDLE, BROWSING_MENU, VIEWING_CATEGORY, SELECTING_VARIATIONS, SELECTING_ADDONS, CART_REVIEW, COLLECTING_ADDRESS, SELECTING_REGION, CONFIRMING_DETAILS, PAYMENT_PENDING, ORDER_COMPLETE';
COMMENT ON COLUMN whatsapp_sessions.cart IS 'JSON array of cart items with item_id, quantity, variations, addons';
