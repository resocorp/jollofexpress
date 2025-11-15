-- JollofExpress Database Schema
-- PostgreSQL (Supabase)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('customer', 'kitchen', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'scheduled', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE order_type AS ENUM ('delivery', 'carryout');
CREATE TYPE print_status AS ENUM ('pending', 'printed', 'failed');
CREATE TYPE dietary_tag AS ENUM ('veg', 'non_veg', 'vegan', 'halal', 'none');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');
CREATE TYPE address_type AS ENUM ('house', 'office', 'hotel', 'church', 'school', 'other');

-- ================================================
-- USERS TABLE
-- ================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ================================================
-- MENU CATEGORIES TABLE
-- ================================================
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_categories_active ON menu_categories(is_active, display_order);

-- ================================================
-- MENU ITEMS TABLE
-- ================================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    dietary_tag dietary_tag NOT NULL DEFAULT 'none',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);

-- ================================================
-- ITEM VARIATIONS TABLE (sizes, spice levels, etc.)
-- ================================================
CREATE TABLE item_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    variation_name TEXT NOT NULL, -- e.g., "Size", "Spice Level"
    options JSONB NOT NULL, -- [{name: "Small", price_adjustment: -50}, {name: "Large", price_adjustment: 50}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_item_variations_item ON item_variations(item_id);

-- ================================================
-- ITEM ADDONS TABLE (extras)
-- ================================================
CREATE TABLE item_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_item_addons_item ON item_addons(item_id);

-- ================================================
-- ORDERS TABLE
-- ================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_phone_alt TEXT,
    customer_email TEXT,
    
    -- Order type and delivery info
    order_type order_type NOT NULL DEFAULT 'delivery',
    delivery_city TEXT,
    delivery_address TEXT,
    address_type address_type,
    unit_number TEXT,
    delivery_instructions TEXT,
    
    -- Order status and financials
    status order_status NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    
    -- Payment info
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_reference TEXT,
    payment_method TEXT DEFAULT 'paystack',
    
    -- Promo and timing
    promo_code TEXT,
    estimated_prep_time INTEGER, -- in minutes
    notes TEXT, -- Additional notes (e.g., scheduled order information)
    
    -- Print tracking
    print_status print_status NOT NULL DEFAULT 'pending',
    print_attempts INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_print_status ON orders(print_status);

-- ================================================
-- ORDER ITEMS TABLE
-- ================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL, -- Snapshot of item name
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    selected_variation JSONB, -- {name: "Size", option: "Large", price_adjustment: 50}
    selected_addons JSONB, -- [{name: "Extra Cheese", price: 100}, ...]
    special_instructions TEXT,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ================================================
-- PROMO CODES TABLE
-- ================================================
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2),
    max_discount DECIMAL(10, 2), -- For percentage discounts
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    expiry_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active);

-- ================================================
-- PRINT QUEUE TABLE
-- ================================================
CREATE TABLE print_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    print_data JSONB NOT NULL, -- Formatted receipt data
    status print_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_print_queue_status ON print_queue(status);
CREATE INDEX idx_print_queue_created_at ON print_queue(created_at);

-- ================================================
-- SETTINGS TABLE
-- ================================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
('restaurant_info', '{
    "name": "JollofExpress",
    "phone": "+234 XXX XXX XXXX",
    "address": "123 Main Street, Awka",
    "logo_url": "",
    "banner_url": "",
    "description": "Delicious Nigerian cuisine delivered to your doorstep"
}'::jsonb),
('operating_hours', '{
    "monday": {"open": "09:00", "close": "21:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "21:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "21:00", "closed": false},
    "thursday": {"open": "09:00", "close": "21:00", "closed": false},
    "friday": {"open": "09:00", "close": "22:00", "closed": false},
    "saturday": {"open": "10:00", "close": "22:00", "closed": false},
    "sunday": {"open": "10:00", "close": "21:00", "closed": false}
}'::jsonb),
('delivery_settings', '{
    "enabled": true,
    "cities": ["Awka"],
    "min_order": 500,
    "delivery_fee": 200
}'::jsonb),
('payment_settings', '{
    "tax_rate": 7.5
}'::jsonb),
('order_settings', '{
    "default_prep_time": 30,
    "auto_close_when_busy": false,
    "is_open": true,
    "current_prep_time": 30
}'::jsonb);

-- ================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    date_str TEXT;
    counter INTEGER;
BEGIN
    date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get the count of orders today
    SELECT COUNT(*) + 1 INTO counter
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    order_num := 'ORD-' || date_str || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read access for menu (unauthenticated users)
CREATE POLICY "Menu categories are viewable by everyone" ON menu_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Menu items are viewable by everyone" ON menu_items
    FOR SELECT USING (is_available = true);

CREATE POLICY "Item variations are viewable by everyone" ON item_variations
    FOR SELECT USING (true);

CREATE POLICY "Item addons are viewable by everyone" ON item_addons
    FOR SELECT USING (is_available = true);

-- Settings are viewable by everyone (public info)
CREATE POLICY "Settings are viewable by everyone" ON settings
    FOR SELECT USING (true);

-- Customers can create orders
CREATE POLICY "Anyone can create orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Customers can view their own orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (
        customer_phone = current_setting('request.jwt.claims', true)::json->>'phone'
        OR auth.role() IN ('kitchen', 'admin')
    );

-- Kitchen and admin can update orders
CREATE POLICY "Kitchen and admin can update orders" ON orders
    FOR UPDATE USING (auth.role() IN ('kitchen', 'admin'));

-- Order items follow order policies
CREATE POLICY "Anyone can create order items" ON order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view order items for their orders" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
            AND (o.customer_phone = current_setting('request.jwt.claims', true)::json->>'phone'
                OR auth.role() IN ('kitchen', 'admin'))
        )
    );

-- Promo codes validation (public read for active codes)
CREATE POLICY "Active promo codes are viewable" ON promo_codes
    FOR SELECT USING (is_active = true AND (expiry_date IS NULL OR expiry_date > NOW()));

-- Admin-only policies
CREATE POLICY "Admins have full access to menu_categories" ON menu_categories
    FOR ALL USING (auth.role() = 'admin');

CREATE POLICY "Admins have full access to menu_items" ON menu_items
    FOR ALL USING (auth.role() = 'admin');

CREATE POLICY "Admins have full access to promo_codes" ON promo_codes
    FOR ALL USING (auth.role() = 'admin');

CREATE POLICY "Kitchen and admin can access print queue" ON print_queue
    FOR ALL USING (auth.role() IN ('kitchen', 'admin'));

-- ================================================
-- SAMPLE DATA (Optional - for testing)
-- ================================================

-- Sample menu categories
INSERT INTO menu_categories (name, description, display_order, is_active) VALUES
('Appetizers', 'Start your meal right', 1, true),
('Main Course', 'Our signature dishes', 2, true),
('Sides', 'Perfect complements', 3, true),
('Desserts', 'Sweet endings', 4, true),
('Beverages', 'Refresh yourself', 5, true);

-- Sample menu items
INSERT INTO menu_items (category_id, name, description, base_price, dietary_tag, is_available, display_order)
SELECT 
    c.id,
    'Jollof Rice',
    'Our signature spicy Nigerian jollof rice with tender chicken',
    2500.00,
    'non_veg',
    true,
    1
FROM menu_categories c WHERE c.name = 'Main Course';

INSERT INTO menu_items (category_id, name, description, base_price, dietary_tag, is_available, display_order)
SELECT 
    c.id,
    'Fried Rice',
    'Delicious fried rice with mixed vegetables and protein',
    2200.00,
    'non_veg',
    true,
    2
FROM menu_categories c WHERE c.name = 'Main Course';

INSERT INTO menu_items (category_id, name, description, base_price, dietary_tag, is_available, display_order)
SELECT 
    c.id,
    'Pepper Soup',
    'Spicy and flavorful Nigerian pepper soup',
    1800.00,
    'non_veg',
    true,
    1
FROM menu_categories c WHERE c.name = 'Appetizers';

INSERT INTO menu_items (category_id, name, description, base_price, dietary_tag, is_available, display_order)
SELECT 
    c.id,
    'Plantain',
    'Fried ripe plantain',
    800.00,
    'veg',
    true,
    1
FROM menu_categories c WHERE c.name = 'Sides';

INSERT INTO menu_items (category_id, name, description, base_price, dietary_tag, is_available, display_order)
SELECT 
    c.id,
    'Chapman',
    'Refreshing Nigerian cocktail drink',
    1200.00,
    'veg',
    true,
    1
FROM menu_categories c WHERE c.name = 'Beverages';

-- Sample variations for Jollof Rice
INSERT INTO item_variations (item_id, variation_name, options)
SELECT 
    id,
    'Portion Size',
    '[
        {"name": "Regular", "price_adjustment": 0},
        {"name": "Large", "price_adjustment": 500}
    ]'::jsonb
FROM menu_items WHERE name = 'Jollof Rice';

INSERT INTO item_variations (item_id, variation_name, options)
SELECT 
    id,
    'Protein',
    '[
        {"name": "Chicken", "price_adjustment": 0},
        {"name": "Beef", "price_adjustment": 200},
        {"name": "Fish", "price_adjustment": 300},
        {"name": "Goat Meat", "price_adjustment": 400}
    ]'::jsonb
FROM menu_items WHERE name = 'Jollof Rice';

-- Sample addons
INSERT INTO item_addons (item_id, name, price, is_available)
SELECT 
    id,
    'Extra Protein',
    500.00,
    true
FROM menu_items WHERE name = 'Jollof Rice';

INSERT INTO item_addons (item_id, name, price, is_available)
SELECT 
    id,
    'Extra Sauce',
    200.00,
    true
FROM menu_items WHERE name = 'Jollof Rice';

-- Sample promo code
INSERT INTO promo_codes (code, discount_type, discount_value, min_order_value, is_active, expiry_date)
VALUES ('WELCOME10', 'percentage', 10.00, 1000.00, true, NOW() + INTERVAL '30 days');

COMMENT ON TABLE orders IS 'Main orders table storing customer orders';
COMMENT ON TABLE menu_items IS 'Menu items with pricing and availability';
COMMENT ON TABLE print_queue IS 'Queue for managing kitchen receipt printing';
