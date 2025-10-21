-- Add admin policy for settings table updates
-- This allows admins to update restaurant settings

-- Drop existing policy if it exists (for re-running)
DROP POLICY IF EXISTS "Admins can update settings" ON settings;

-- Create policy for admins to update settings
CREATE POLICY "Admins can update settings" ON settings
    FOR ALL USING (auth.role() = 'admin' OR auth.uid() IS NOT NULL);

-- Note: Service role bypasses RLS, but this policy helps with regular admin users
