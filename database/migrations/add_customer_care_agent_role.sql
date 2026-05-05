-- Add 'customer_care_agent' to the user_role enum.
-- Agents have read-only access to orders + customers, plus the WhatsApp comms panel.
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction block in Postgres;
-- Supabase's SQL editor handles single ALTER TYPE statements correctly.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer_care_agent';
