-- Migration: Add promo_price column to menu_items table
-- This enables promotional pricing for menu items

-- Add promo_price column (nullable - NULL means no promo)
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10, 2) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN menu_items.promo_price IS 'Promotional price for the item. When set, this price is displayed instead of base_price. NULL means no active promotion.';

-- Create index for querying items with active promotions
CREATE INDEX IF NOT EXISTS idx_menu_items_promo ON menu_items(promo_price) WHERE promo_price IS NOT NULL;
