-- Fix order_items RLS policy to allow service role access
-- This ensures that server-side API calls can always fetch order items

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view order items for their orders" ON order_items;

-- Create new policy that explicitly allows service role
CREATE POLICY "Users can view order items for their orders" ON order_items
    FOR SELECT USING (
        -- Service role bypasses this, but for regular users:
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
            AND (
                -- Allow if customer phone matches (for unauthenticated access via phone verification)
                o.customer_phone = current_setting('request.jwt.claims', true)::json->>'phone'
                -- Allow for kitchen and admin roles
                OR auth.role() IN ('kitchen', 'admin')
            )
        )
        -- Explicitly allow service role (though it should bypass RLS anyway)
        OR auth.role() = 'service_role'
    );

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view order items for their orders" ON order_items IS 
'Allows users to view order items for their own orders (matched by phone), kitchen/admin staff to view all order items, and service role to bypass RLS';
