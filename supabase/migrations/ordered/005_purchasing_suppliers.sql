-- 005: Supplier management and purchasing.

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT NOT NULL,
  website TEXT,
  supplier_type TEXT CHECK (supplier_type IN ('Distributor', 'Direct', 'Cooperative')) NOT NULL,
  years_partnered DECIMAL,
  specialty TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  avg_quality_rating DECIMAL DEFAULT 0,
  avg_delivery_days DECIMAL DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE (brewery_id, name)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'canceled')),
  items_summary JSONB,
  total_cost DECIMAL,
  invoice_number TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  quality_rating DECIMAL,
  quality_notes TEXT,
  any_issues BOOLEAN DEFAULT false,
  issue_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE (brewery_id, order_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity_ordered DECIMAL NOT NULL,
  quantity_received DECIMAL DEFAULT 0,
  unit TEXT NOT NULL,
  unit_price DECIMAL NOT NULL,
  lot_number TEXT,
  expiration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS supplier_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5) NOT NULL,
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5) NOT NULL,
  reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5) NOT NULL,
  pricing_rating INTEGER CHECK (pricing_rating >= 1 AND pricing_rating <= 5) NOT NULL,
  comments TEXT,
  would_order_again BOOLEAN NOT NULL,
  rating_date TIMESTAMP WITH TIME ZONE NOT NULL,
  rated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_contact TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS purchase_price DECIMAL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_order_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_from_supplier_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_inventory_supplier'
      AND conrelid = 'inventory'::regclass
  ) THEN
    ALTER TABLE inventory
      ADD CONSTRAINT fk_inventory_supplier
      FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

ALTER TABLE inventory VALIDATE CONSTRAINT fk_inventory_supplier;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_inventory_reorder_supplier'
      AND conrelid = 'inventory'::regclass
  ) THEN
    ALTER TABLE inventory
      ADD CONSTRAINT fk_inventory_reorder_supplier
      FOREIGN KEY (reorder_from_supplier_id)
      REFERENCES suppliers(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

ALTER TABLE inventory VALIDATE CONSTRAINT fk_inventory_reorder_supplier;

CREATE INDEX IF NOT EXISTS idx_suppliers_brewery_id ON suppliers(brewery_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(brewery_id, is_active);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_brewery_id ON purchase_orders(brewery_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(brewery_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_inventory_id ON purchase_order_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_brewery_id ON supplier_ratings(brewery_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier_id ON supplier_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_rating_date ON supplier_ratings(rating_date);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder_from_supplier_id ON inventory(reorder_from_supplier_id);
