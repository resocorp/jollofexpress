-- Migration: Add Delivery Regions
-- Date: 2024-12-28
-- Description: Adds support for region-based delivery pricing with grouping, ordering, and free delivery thresholds

-- ================================================
-- DELIVERY REGION GROUPS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS delivery_region_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_region_groups_active ON delivery_region_groups(is_active, display_order);

-- ================================================
-- DELIVERY REGIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS delivery_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES delivery_region_groups(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    free_delivery_threshold DECIMAL(10, 2), -- NULL means no free delivery for this region
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Geofencing support (for future use)
    geofence_coordinates JSONB, -- Array of lat/lng coordinates defining the polygon
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_regions_active ON delivery_regions(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_delivery_regions_group ON delivery_regions(group_id);

-- ================================================
-- UPDATE ORDERS TABLE
-- ================================================
-- Add delivery_region_id to orders for tracking which region was selected
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_region_id UUID REFERENCES delivery_regions(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_region_name TEXT;

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_orders_delivery_region ON orders(delivery_region_id);

-- ================================================
-- TRIGGERS FOR updated_at
-- ================================================
CREATE TRIGGER update_delivery_region_groups_updated_at BEFORE UPDATE ON delivery_region_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_regions_updated_at BEFORE UPDATE ON delivery_regions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================
ALTER TABLE delivery_region_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_regions ENABLE ROW LEVEL SECURITY;

-- Public can view active region groups
CREATE POLICY "Active region groups are viewable by everyone" ON delivery_region_groups
    FOR SELECT USING (is_active = true);

-- Public can view active regions
CREATE POLICY "Active regions are viewable by everyone" ON delivery_regions
    FOR SELECT USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins have full access to delivery_region_groups" ON delivery_region_groups
    FOR ALL USING (auth.role() = 'admin');

CREATE POLICY "Admins have full access to delivery_regions" ON delivery_regions
    FOR ALL USING (auth.role() = 'admin');

-- ================================================
-- SEED INITIAL REGION GROUPS
-- ================================================
INSERT INTO delivery_region_groups (name, description, display_order, is_active) VALUES
('Near', 'Close proximity areas with lower delivery fees', 1, true),
('Medium', 'Medium distance areas', 2, true),
('Far', 'Far distance areas with higher delivery fees', 3, true),
('Campus', 'University campus locations', 4, true)
ON CONFLICT DO NOTHING;

-- ================================================
-- SEED INITIAL REGIONS (Awka)
-- ================================================

-- Get group IDs for insertion
DO $$
DECLARE
    near_group_id UUID;
    medium_group_id UUID;
    far_group_id UUID;
    campus_group_id UUID;
BEGIN
    SELECT id INTO near_group_id FROM delivery_region_groups WHERE name = 'Near' LIMIT 1;
    SELECT id INTO medium_group_id FROM delivery_region_groups WHERE name = 'Medium' LIMIT 1;
    SELECT id INTO far_group_id FROM delivery_region_groups WHERE name = 'Far' LIMIT 1;
    SELECT id INTO campus_group_id FROM delivery_region_groups WHERE name = 'Campus' LIMIT 1;

    -- Near zones (₦1,000 - ₦1,500)
    INSERT INTO delivery_regions (group_id, name, delivery_fee, free_delivery_threshold, display_order, is_active) VALUES
    (near_group_id, 'Aroma, Tempsite, Regina Axis', 1000, 15000, 1, true),
    (near_group_id, 'Amaenyi, Eke-Awka Axis', 1500, 15000, 2, true),
    (near_group_id, 'Amikwo', 1500, 15000, 3, true),
    (near_group_id, 'Ifite Awka Axis', 1500, 15000, 4, true),
    (near_group_id, 'Kwata/Udoka Estate', 1500, 15000, 5, true)
    ON CONFLICT DO NOTHING;

    -- Medium zones (₦1,800 - ₦2,000)
    INSERT INTO delivery_regions (group_id, name, delivery_fee, free_delivery_threshold, display_order, is_active) VALUES
    (medium_group_id, 'Agu-Awka/Quarters Axis', 1800, 20000, 1, true),
    (medium_group_id, 'Ngozika Estate Axis', 1800, 20000, 2, true),
    (medium_group_id, 'Amansea', 2000, 20000, 3, true),
    (medium_group_id, 'Amawbia', 2000, 20000, 4, true),
    (medium_group_id, 'Isuaniocha/Awka North', 2000, 20000, 5, true),
    (medium_group_id, 'Mgbakwu Axis', 2000, 20000, 6, true),
    (medium_group_id, 'Nise Axis', 2000, 20000, 7, true),
    (medium_group_id, 'Nibo Axis', 2000, 20000, 8, true),
    (medium_group_id, 'Okpuno', 2000, 20000, 9, true)
    ON CONFLICT DO NOTHING;

    -- Far zones (₦2,500+)
    INSERT INTO delivery_regions (group_id, name, delivery_fee, free_delivery_threshold, display_order, is_active) VALUES
    (far_group_id, 'Umuokpu', 2500, 25000, 1, true)
    ON CONFLICT DO NOTHING;

    -- Campus zones (with gate/inside distinction)
    INSERT INTO delivery_regions (group_id, name, delivery_fee, free_delivery_threshold, display_order, is_active) VALUES
    (campus_group_id, 'Unizik Gate', 1500, 15000, 1, true),
    (campus_group_id, 'Unizik Inside School', 2000, 20000, 2, true),
    (campus_group_id, 'Igbariam Gate', 3000, 30000, 3, true),
    (campus_group_id, 'Igbariam Inside School', 4000, 40000, 4, true)
    ON CONFLICT DO NOTHING;
END $$;

-- ================================================
-- COMMENTS
-- ================================================
COMMENT ON TABLE delivery_region_groups IS 'Groups for organizing delivery regions (Near, Medium, Far, etc.)';
COMMENT ON TABLE delivery_regions IS 'Delivery regions with pricing and free delivery thresholds';
COMMENT ON COLUMN delivery_regions.free_delivery_threshold IS 'Cart amount above which delivery is free. NULL means no free delivery.';
COMMENT ON COLUMN delivery_regions.geofence_coordinates IS 'Future: Array of {lat, lng} points defining the delivery zone polygon';
COMMENT ON COLUMN orders.delivery_region_id IS 'Reference to the delivery region selected at checkout';
COMMENT ON COLUMN orders.delivery_region_name IS 'Snapshot of region name at time of order (for analytics)';
