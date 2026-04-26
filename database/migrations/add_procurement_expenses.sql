-- Procurement / Expenses tracking
-- - `expense_categories`: editable categories (Cleaning, Packaging, etc.)
-- - `expenses`: one row per purchase (item, qty, unit cost, vendor, date, ...)
-- - Trigger keeps `item_name_normalized = lower(trim(item_name))` for cycle grouping
-- - The "consumption cycle" (e.g. "1 bottle of soap took 100 shawarmas before re-buy")
--   is computed in the analytics endpoint by counting completed orders between
--   consecutive purchases of the same normalized item name.

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  item_name TEXT NOT NULL,
  item_name_normalized TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT,
  unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(12,2) NOT NULL CHECK (total_cost >= 0),
  vendor TEXT,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_purchase_date ON expenses(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_item_norm ON expenses(item_name_normalized, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active, display_order);

-- Trigger: auto-populate item_name_normalized + maintain updated_at
CREATE OR REPLACE FUNCTION set_expense_item_name_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW.item_name_normalized := lower(trim(NEW.item_name));
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_normalize ON expenses;
CREATE TRIGGER trg_expense_normalize
BEFORE INSERT OR UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION set_expense_item_name_normalized();

CREATE OR REPLACE FUNCTION set_expense_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER trg_expense_categories_updated_at
BEFORE UPDATE ON expense_categories
FOR EACH ROW EXECUTE FUNCTION set_expense_categories_updated_at();

-- RLS: service role only (admin/kitchen UI hits the server-side API which uses service client)
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on expense_categories" ON expense_categories;
CREATE POLICY "Service role full access on expense_categories"
  ON expense_categories
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on expenses" ON expenses;
CREATE POLICY "Service role full access on expenses"
  ON expenses
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed default categories (skip if already present by name)
INSERT INTO expense_categories (name, display_order)
VALUES
  ('Ingredients', 10),
  ('Packaging', 20),
  ('Cleaning Supplies', 30),
  ('Utilities', 40),
  ('Equipment', 50),
  ('Transport / Logistics', 60),
  ('Miscellaneous', 99)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE expenses IS 'Procurement / business expense entries logged by kitchen + admin.';
COMMENT ON COLUMN expenses.item_name_normalized IS 'Lowercased/trimmed item_name. Used to group purchases of the same item across time for cycle analytics.';
COMMENT ON COLUMN expenses.total_cost IS 'Snapshot of quantity * unit_cost at submission time (allows manual adjustments e.g. discounts).';
