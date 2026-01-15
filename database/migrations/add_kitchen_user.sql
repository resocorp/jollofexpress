-- Add dedicated kitchen staff user
-- Run this in Supabase SQL Editor

-- First, create the auth user via Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add user" > "Create new user"
-- 3. Email: kitchen@jollofexpress.app
-- 4. Password: Kitchen@123
-- 5. Click "Create user"
-- 6. Copy the user ID from the created user

-- Then run this SQL to add the user profile with kitchen role:
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from step 6

-- INSERT INTO users (id, email, phone, name, role)
-- VALUES (
--   'ee2e7c70-73ac-4168-8cd1-485952887419',
--   'kitchen@jollofexpress.app',
--   '+234000000001',
--   'Kitchen Staff',
--   'kitchen'
-- );

-- Alternative: If you want to create directly via SQL (advanced)
-- Note: This requires the user to already exist in auth.users

-- Quick reference for kitchen login:
-- Email: kitchen@jollofexpress.app
-- Password: Kitchen@123
-- Access: /kitchen/login
