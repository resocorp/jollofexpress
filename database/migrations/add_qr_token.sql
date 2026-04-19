-- Add qr_token column to orders for rider scan-to-dispatch
-- Token is a short HMAC-signed value encoded in the receipt QR code.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS qr_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_qr_token_unique
  ON orders(qr_token)
  WHERE qr_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_qr_token_lookup
  ON orders(qr_token);
