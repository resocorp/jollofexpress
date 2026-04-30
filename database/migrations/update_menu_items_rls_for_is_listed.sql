-- The original public-read RLS policy on menu_items hid every row where
-- is_available=false, which collapses with our new "Sold Out vs. Hidden"
-- distinction: sold-out items (is_listed=true, is_available=false) need to
-- reach the customer storefront so the card can render greyed-out.
--
-- Switch the policy to gate on is_listed instead. is_available is now an
-- application-level concern (rendered as the Sold Out badge), not an RLS
-- concern.

DROP POLICY IF EXISTS "Menu items are viewable by everyone" ON menu_items;

CREATE POLICY "Menu items are viewable by everyone" ON menu_items
    FOR SELECT USING (is_listed = true);
