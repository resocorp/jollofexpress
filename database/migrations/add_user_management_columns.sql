-- User-management columns to support the new admin /admin/users UI.
-- - disabled: soft-delete; auth gate rejects logins where this is true
-- - must_change_password: forces redirect to /admin/account on first login

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_disabled ON users(disabled);
