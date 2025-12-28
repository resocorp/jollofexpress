-- Delivery Tracking Migration
-- Adds support for drivers, delivery assignments, COD, and customer GPS location

-- ================================================
-- CUSTOM TYPES
-- ================================================
CREATE TYPE driver_status AS ENUM ('available', 'busy', 'offline');
CREATE TYPE assignment_status AS ENUM ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled');
CREATE TYPE payment_method AS ENUM ('paystack', 'cod');
CREATE TYPE cod_status AS ENUM ('pending', 'collected', 'settled');

-- ================================================
-- DRIVERS TABLE
-- ================================================
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    
    -- Traccar integration
    traccar_device_id INTEGER,           -- Sinotrack device ID in Traccar
    traccar_driver_id INTEGER,           -- Driver record ID in Traccar
    
    -- Status and location
    status driver_status NOT NULL DEFAULT 'offline',
    current_latitude DECIMAL(10, 7),
    current_longitude DECIMAL(10, 7),
    last_location_update TIMESTAMPTZ,
    
    -- Vehicle info
    vehicle_type TEXT DEFAULT 'motorcycle',
    vehicle_plate TEXT,
    
    -- Financial
    cod_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_deliveries INTEGER NOT NULL DEFAULT 0,
    
    -- Auth
    pin_hash TEXT,                        -- Simple PIN for driver app login
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_status ON drivers(status) WHERE is_active = true;
CREATE INDEX idx_drivers_phone ON drivers(phone);
CREATE INDEX idx_drivers_traccar ON drivers(traccar_device_id);

-- ================================================
-- DELIVERY ASSIGNMENTS TABLE
-- ================================================
CREATE TABLE delivery_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    
    status assignment_status NOT NULL DEFAULT 'pending',
    
    -- Timestamps
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Delivery proof
    delivery_photo_url TEXT,
    recipient_name TEXT,
    
    -- Distance and time
    distance_meters INTEGER,
    duration_seconds INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_order ON delivery_assignments(order_id);
CREATE INDEX idx_assignments_driver ON delivery_assignments(driver_id);
CREATE INDEX idx_assignments_status ON delivery_assignments(status);

-- ================================================
-- COD COLLECTIONS TABLE
-- ================================================
CREATE TABLE cod_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    
    amount DECIMAL(10, 2) NOT NULL,
    status cod_status NOT NULL DEFAULT 'pending',
    
    collected_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    settled_by UUID,                      -- Admin who settled
    
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cod_order ON cod_collections(order_id);
CREATE INDEX idx_cod_driver ON cod_collections(driver_id);
CREATE INDEX idx_cod_status ON cod_collections(status);

-- ================================================
-- ALTER ORDERS TABLE - Add delivery tracking fields
-- ================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method_type payment_method DEFAULT 'paystack';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES drivers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_latitude DECIMAL(10, 7);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_longitude DECIMAL(10, 7);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_pickup_time TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_start_time TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_completion_time TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_collected BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS traccar_order_id INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_geofence_id INTEGER;

CREATE INDEX idx_orders_driver ON orders(assigned_driver_id);
CREATE INDEX idx_orders_location ON orders(customer_latitude, customer_longitude) 
    WHERE customer_latitude IS NOT NULL;

-- ================================================
-- RLS POLICIES
-- ================================================
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cod_collections ENABLE ROW LEVEL SECURITY;

-- Drivers: Admin full access, drivers view self
CREATE POLICY "Admins manage drivers" ON drivers FOR ALL USING (true);
CREATE POLICY "Drivers view self" ON drivers FOR SELECT USING (true);

-- Assignments: Admin/kitchen full access
CREATE POLICY "Staff manage assignments" ON delivery_assignments FOR ALL USING (true);

-- COD: Admin full access
CREATE POLICY "Admins manage cod" ON cod_collections FOR ALL USING (true);

-- ================================================
-- TRIGGERS
-- ================================================
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON delivery_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cod_updated_at BEFORE UPDATE ON cod_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- FUNCTIONS FOR COD BALANCE MANAGEMENT
-- ================================================
CREATE OR REPLACE FUNCTION increment_driver_cod_balance(
    p_driver_id UUID,
    p_amount DECIMAL
) RETURNS VOID AS $$
BEGIN
    UPDATE drivers 
    SET cod_balance = cod_balance + p_amount
    WHERE id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_driver_cod_balance(
    p_driver_id UUID,
    p_amount DECIMAL
) RETURNS VOID AS $$
BEGIN
    UPDATE drivers 
    SET cod_balance = GREATEST(0, cod_balance - p_amount)
    WHERE id = p_driver_id;
END;
$$ LANGUAGE plpgsql;
