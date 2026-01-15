-- Enable Supabase Realtime for orders table
-- This allows the Kitchen Display System to receive instant updates

-- Add orders table to the realtime publication
-- Note: Run this in your Supabase SQL editor or via migration
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Optionally enable for order_items as well for detailed updates
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- Verify: You can check enabled tables with:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
