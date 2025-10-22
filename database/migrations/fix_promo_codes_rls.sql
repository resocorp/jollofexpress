-- Fix RLS policies for promo_codes table
-- This migration allows service role to manage promo codes (for admin API endpoints)

-- Drop existing policies
DROP POLICY IF EXISTS "Active promo codes are viewable" ON promo_codes;
DROP POLICY IF EXISTS "Admins have full access to promo_codes" ON promo_codes;

-- Allow public read access for active, non-expired promo codes (for validation)
CREATE POLICY "Anyone can view active promo codes" ON promo_codes
    FOR SELECT 
    USING (is_active = true AND (expiry_date IS NULL OR expiry_date > NOW()));

-- Allow service role (used by API routes) to do everything
-- Service role bypasses RLS, but we're being explicit here
CREATE POLICY "Service role can manage promo codes" ON promo_codes
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Note: Admin API endpoints should use service role client
-- This is already configured in lib/supabase/service.ts
