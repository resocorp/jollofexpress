-- Adds is_listed to menu_items so we can distinguish:
--   is_listed = true,  is_available = true   → normal, orderable
--   is_listed = true,  is_available = false  → shows on storefront greyed-out as "Sold Out"
--   is_listed = false                         → hidden from storefront entirely (discontinued)
--
-- All existing rows default to listed so behavior is unchanged at deploy time.
-- Kitchen toggles is_available; admin controls is_listed.

ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS is_listed BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_menu_items_listed ON menu_items(is_listed);

COMMENT ON COLUMN menu_items.is_listed IS 'Whether this item is published on the customer storefront. False hides it entirely (discontinued/seasonal off). Independent of is_available, which means in stock right now.';
COMMENT ON COLUMN menu_items.is_available IS 'Whether this item is currently in stock. Listed items with is_available=false render as Sold Out on the storefront. Kitchen toggles this.';
