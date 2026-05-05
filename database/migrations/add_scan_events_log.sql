-- Scan Events Audit Log
-- Records every rider QR scan: who scanned, what order, when, and whether
-- the scan took over an order previously assigned to another rider.

CREATE TABLE IF NOT EXISTS scan_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id),

    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    was_override BOOLEAN NOT NULL DEFAULT false,
    previous_driver_id UUID REFERENCES drivers(id),
    previous_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_scan_events_order ON scan_events(order_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_driver ON scan_events(driver_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_overrides ON scan_events(scanned_at DESC) WHERE was_override = true;

ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages scan events" ON scan_events FOR ALL USING (true);
