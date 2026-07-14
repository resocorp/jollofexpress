-- Add a per-add-on quantity cap to item_addons.
--
-- Why: admins need to limit how many of a given add-on a customer can attach
-- to a single menu item (e.g. "Extra Sauce" capped at 3). Until now the
-- customer add-on selector used a hard-coded ceiling of 50 for every add-on.
--
-- max_quantity is NULL by default = unlimited; the selection UIs fall back to
-- the existing 50 cap when it is unset. Idempotent.

ALTER TABLE item_addons ADD COLUMN IF NOT EXISTS max_quantity INTEGER;
