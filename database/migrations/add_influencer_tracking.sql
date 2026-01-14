-- Migration: Add Influencer Tracking System
-- Description: Adds tables and relationships for influencer promo code tracking,
--              customer attribution, lifetime value tracking, and payout management

-- ================================================
-- COMMISSION TYPE ENUM
-- ================================================
DO $$ BEGIN
    CREATE TYPE commission_type AS ENUM ('percentage', 'fixed_amount');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================
-- PAYOUT STATUS ENUM
-- ================================================
DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================
-- INFLUENCERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS influencers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    
    -- Authentication (simple token-based for dashboard access)
    access_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    
    -- Commission Settings (configurable per influencer)
    commission_type commission_type NOT NULL DEFAULT 'percentage',
    commission_value DECIMAL(10, 2) NOT NULL DEFAULT 5.00, -- 5% or ₦500 depending on type
    
    -- Social/Profile Info
    social_handle TEXT, -- Instagram, TikTok, etc.
    platform TEXT, -- 'instagram', 'tiktok', 'youtube', etc.
    profile_image_url TEXT,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for influencers
CREATE INDEX IF NOT EXISTS idx_influencers_email ON influencers(email);
CREATE INDEX IF NOT EXISTS idx_influencers_phone ON influencers(phone);
CREATE INDEX IF NOT EXISTS idx_influencers_access_token ON influencers(access_token);
CREATE INDEX IF NOT EXISTS idx_influencers_active ON influencers(is_active);

-- ================================================
-- ADD INFLUENCER_ID TO PROMO_CODES
-- ================================================
ALTER TABLE promo_codes 
ADD COLUMN IF NOT EXISTS influencer_id UUID REFERENCES influencers(id) ON DELETE SET NULL;

-- Add description column if not exists
ALTER TABLE promo_codes 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Index for promo codes by influencer
CREATE INDEX IF NOT EXISTS idx_promo_codes_influencer ON promo_codes(influencer_id);

-- ================================================
-- CUSTOMER ATTRIBUTIONS TABLE
-- Tracks which influencer first referred each customer (by phone)
-- ================================================
CREATE TABLE IF NOT EXISTS customer_attributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Customer identification (phone is the key identifier)
    customer_phone TEXT UNIQUE NOT NULL,
    customer_name TEXT,
    customer_email TEXT,
    
    -- Attribution to influencer
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
    first_promo_code TEXT NOT NULL, -- Snapshot of the code used
    
    -- First order info
    first_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    first_order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_order_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Aggregated stats (updated on each order)
    total_orders INTEGER NOT NULL DEFAULT 1,
    total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0,
    last_order_date TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for customer attributions
CREATE INDEX IF NOT EXISTS idx_customer_attributions_phone ON customer_attributions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_customer_attributions_influencer ON customer_attributions(influencer_id);
CREATE INDEX IF NOT EXISTS idx_customer_attributions_first_order_date ON customer_attributions(first_order_date);

-- ================================================
-- INFLUENCER PAYOUTS TABLE
-- Tracks monthly payouts to influencers
-- ================================================
CREATE TABLE IF NOT EXISTS influencer_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Influencer reference
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    
    -- Payout period (monthly)
    payout_month DATE NOT NULL, -- First day of the month (e.g., '2026-01-01')
    
    -- Earnings breakdown
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_revenue_generated DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Total order value from attributed customers
    commission_earned DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Calculated commission
    
    -- Payout details
    status payout_status NOT NULL DEFAULT 'pending',
    paid_amount DECIMAL(10, 2),
    paid_at TIMESTAMPTZ,
    payment_reference TEXT, -- Bank transfer ref, etc.
    payment_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one payout record per influencer per month
    UNIQUE(influencer_id, payout_month)
);

-- Indexes for influencer payouts
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_influencer ON influencer_payouts(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_month ON influencer_payouts(payout_month);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_status ON influencer_payouts(status);

-- ================================================
-- PROMO CODE USAGE LOG TABLE
-- Detailed log of each promo code usage for analytics
-- ================================================
CREATE TABLE IF NOT EXISTS promo_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    influencer_id UUID REFERENCES influencers(id) ON DELETE SET NULL,
    
    -- Customer info (denormalized for analytics)
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    
    -- Order details at time of use
    order_total DECIMAL(10, 2) NOT NULL,
    discount_applied DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Calculated at order time
    
    -- Attribution info
    is_first_order BOOLEAN NOT NULL DEFAULT false, -- First order from this customer
    is_new_customer BOOLEAN NOT NULL DEFAULT false, -- First time using any promo
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for promo code usage
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_promo ON promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_order ON promo_code_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_influencer ON promo_code_usage(influencer_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_customer ON promo_code_usage(customer_phone);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_created ON promo_code_usage(created_at);

-- ================================================
-- TRIGGERS
-- ================================================

-- Update updated_at for influencers
CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON influencers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for customer_attributions
CREATE TRIGGER update_customer_attributions_updated_at BEFORE UPDATE ON customer_attributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for influencer_payouts
CREATE TRIGGER update_influencer_payouts_updated_at BEFORE UPDATE ON influencer_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Enable RLS
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Admin full access policies
CREATE POLICY "Admins have full access to influencers" ON influencers
    FOR ALL USING (true);

CREATE POLICY "Admins have full access to customer_attributions" ON customer_attributions
    FOR ALL USING (true);

CREATE POLICY "Admins have full access to influencer_payouts" ON influencer_payouts
    FOR ALL USING (true);

CREATE POLICY "Admins have full access to promo_code_usage" ON promo_code_usage
    FOR ALL USING (true);

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to calculate commission for an order
CREATE OR REPLACE FUNCTION calculate_influencer_commission(
    p_influencer_id UUID,
    p_order_total DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    v_commission_type commission_type;
    v_commission_value DECIMAL;
    v_commission DECIMAL;
BEGIN
    -- Get influencer commission settings
    SELECT commission_type, commission_value 
    INTO v_commission_type, v_commission_value
    FROM influencers 
    WHERE id = p_influencer_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate commission based on type
    IF v_commission_type = 'percentage' THEN
        v_commission := ROUND((p_order_total * v_commission_value) / 100, 2);
    ELSE
        v_commission := v_commission_value;
    END IF;
    
    RETURN v_commission;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a secure access token
CREATE OR REPLACE FUNCTION generate_influencer_token() 
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- VIEWS FOR ANALYTICS
-- ================================================

-- View: Influencer Performance Summary
CREATE OR REPLACE VIEW influencer_performance AS
SELECT 
    i.id AS influencer_id,
    i.name AS influencer_name,
    i.email,
    i.social_handle,
    i.platform,
    i.commission_type,
    i.commission_value,
    i.is_active,
    pc.id AS promo_code_id,
    pc.code AS promo_code,
    pc.used_count,
    COALESCE(ca_stats.total_customers, 0) AS total_customers,
    COALESCE(ca_stats.total_ltv, 0) AS total_customer_ltv,
    COALESCE(usage_stats.total_orders, 0) AS total_orders,
    COALESCE(usage_stats.total_revenue, 0) AS total_revenue_generated,
    COALESCE(usage_stats.total_commission, 0) AS total_commission_earned,
    COALESCE(usage_stats.avg_order_value, 0) AS avg_order_value
FROM influencers i
LEFT JOIN promo_codes pc ON pc.influencer_id = i.id
LEFT JOIN (
    SELECT 
        influencer_id,
        COUNT(*) AS total_customers,
        SUM(total_spent) AS total_ltv
    FROM customer_attributions
    GROUP BY influencer_id
) ca_stats ON ca_stats.influencer_id = i.id
LEFT JOIN (
    SELECT 
        influencer_id,
        COUNT(*) AS total_orders,
        SUM(order_total) AS total_revenue,
        SUM(commission_amount) AS total_commission,
        AVG(order_total) AS avg_order_value
    FROM promo_code_usage
    GROUP BY influencer_id
) usage_stats ON usage_stats.influencer_id = i.id;

-- View: Customer LTV by Phone
CREATE OR REPLACE VIEW customer_ltv AS
SELECT 
    o.customer_phone,
    MAX(o.customer_name) AS customer_name,
    MAX(o.customer_email) AS customer_email,
    COUNT(*) AS total_orders,
    SUM(o.total) AS lifetime_value,
    AVG(o.total) AS avg_order_value,
    MIN(o.created_at) AS first_order_date,
    MAX(o.created_at) AS last_order_date,
    ca.influencer_id AS attributed_influencer_id,
    i.name AS attributed_influencer_name,
    ca.first_promo_code AS attribution_promo_code
FROM orders o
LEFT JOIN customer_attributions ca ON ca.customer_phone = o.customer_phone
LEFT JOIN influencers i ON i.id = ca.influencer_id
WHERE o.payment_status = 'success'
GROUP BY o.customer_phone, ca.influencer_id, i.name, ca.first_promo_code;

COMMENT ON TABLE influencers IS 'Influencer profiles with commission settings';
COMMENT ON TABLE customer_attributions IS 'Tracks first-touch attribution of customers to influencers';
COMMENT ON TABLE influencer_payouts IS 'Monthly payout records for influencers';
COMMENT ON TABLE promo_code_usage IS 'Detailed log of each promo code usage for analytics';
