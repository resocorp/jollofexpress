-- Vehicles and Driver Shifts Migration
-- Supports company-owned bikes with shift-based driver assignment

-- ================================================
-- VEHICLES TABLE (Company Bikes with GPS)
-- ================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                    -- e.g., "Bike 1", "Honda CG 125"
    plate_number TEXT,                     -- License plate
    
    -- Traccar integration
    traccar_device_id INTEGER UNIQUE,      -- Device ID in Traccar
    traccar_unique_id TEXT,                -- IMEI or unique identifier
    
    -- Status
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')),
    
    -- Current assignment (denormalized for quick lookup)
    current_driver_id UUID REFERENCES drivers(id),
    
    -- Location (cached from Traccar)
    current_latitude DECIMAL(10, 7),
    current_longitude DECIMAL(10, 7),
    last_location_update TIMESTAMPTZ,
    
    -- Metadata
    vehicle_type TEXT DEFAULT 'motorcycle',
    notes TEXT,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_traccar ON vehicles(traccar_device_id);
CREATE INDEX idx_vehicles_status ON vehicles(status) WHERE is_active = true;
CREATE INDEX idx_vehicles_driver ON vehicles(current_driver_id);

-- ================================================
-- DRIVER SHIFTS TABLE (Check-in/Check-out)
-- ================================================
CREATE TABLE IF NOT EXISTS driver_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    
    -- Shift timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- Stats for this shift
    deliveries_completed INTEGER NOT NULL DEFAULT 0,
    total_distance_meters INTEGER,
    cod_collected DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shifts_driver ON driver_shifts(driver_id);
CREATE INDEX idx_shifts_vehicle ON driver_shifts(vehicle_id);
CREATE INDEX idx_shifts_active ON driver_shifts(driver_id) WHERE ended_at IS NULL;

-- ================================================
-- UPDATE DRIVERS TABLE - Remove permanent device link
-- ================================================
-- Keep traccar_device_id for backwards compatibility but it's now optional
-- The active device comes from driver_shifts

-- Add function to get driver's current vehicle
CREATE OR REPLACE FUNCTION get_driver_current_vehicle(p_driver_id UUID)
RETURNS UUID AS $$
DECLARE
    v_vehicle_id UUID;
BEGIN
    SELECT vehicle_id INTO v_vehicle_id
    FROM driver_shifts
    WHERE driver_id = p_driver_id AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;
    
    RETURN v_vehicle_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- RLS POLICIES
-- ================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage vehicles" ON vehicles FOR ALL USING (true);
CREATE POLICY "Staff manage shifts" ON driver_shifts FOR ALL USING (true);

-- ================================================
-- TRIGGERS
-- ================================================
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON driver_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- HELPER FUNCTION: Start driver shift
-- ================================================
CREATE OR REPLACE FUNCTION start_driver_shift(
    p_driver_id UUID,
    p_vehicle_id UUID
) RETURNS UUID AS $$
DECLARE
    v_shift_id UUID;
BEGIN
    -- End any existing shift for this driver
    UPDATE driver_shifts 
    SET ended_at = NOW()
    WHERE driver_id = p_driver_id AND ended_at IS NULL;
    
    -- Mark vehicle as in use
    UPDATE vehicles 
    SET status = 'in_use', current_driver_id = p_driver_id
    WHERE id = p_vehicle_id;
    
    -- Update driver status
    UPDATE drivers 
    SET status = 'available'
    WHERE id = p_driver_id;
    
    -- Create new shift
    INSERT INTO driver_shifts (driver_id, vehicle_id)
    VALUES (p_driver_id, p_vehicle_id)
    RETURNING id INTO v_shift_id;
    
    RETURN v_shift_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- HELPER FUNCTION: End driver shift
-- ================================================
CREATE OR REPLACE FUNCTION end_driver_shift(
    p_driver_id UUID
) RETURNS VOID AS $$
DECLARE
    v_vehicle_id UUID;
BEGIN
    -- Get current vehicle
    SELECT vehicle_id INTO v_vehicle_id
    FROM driver_shifts
    WHERE driver_id = p_driver_id AND ended_at IS NULL;
    
    -- End the shift
    UPDATE driver_shifts 
    SET ended_at = NOW()
    WHERE driver_id = p_driver_id AND ended_at IS NULL;
    
    -- Release vehicle
    IF v_vehicle_id IS NOT NULL THEN
        UPDATE vehicles 
        SET status = 'available', current_driver_id = NULL
        WHERE id = v_vehicle_id;
    END IF;
    
    -- Update driver status
    UPDATE drivers 
    SET status = 'offline'
    WHERE id = p_driver_id;
END;
$$ LANGUAGE plpgsql;
