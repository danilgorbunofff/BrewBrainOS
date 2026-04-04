-- Ingredient Sourcing & Supplier Tracking Feature
-- Adds tables, indexes, and relationships for comprehensive supplier management

-- ─────────────────────────────────────────────
-- SUPPLIERS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  
  -- Contact Information
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Supply Information
  website TEXT,
  supplier_type TEXT NOT NULL CHECK (supplier_type IN ('Distributor', 'Direct', 'Cooperative')),
  
  -- Partnership Details
  years_partnered INTEGER,
  specialty TEXT, -- e.g., 'Hops', 'Grain', 'Yeast', 'All'
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Performance Baseline (calculated/cached)
  avg_quality_rating DECIMAL(3, 2) DEFAULT 0,
  avg_delivery_days DECIMAL(5, 1) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  
  -- Constraint: unique per brewery
  UNIQUE(brewery_id, name)
);

-- ─────────────────────────────────────────────
-- PURCHASE ORDERS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  
  -- Order Details
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Status & Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'canceled')),
  
  -- Order Contents (JSON summary)
  items_summary JSONB, -- Array of {inventory_id, item_name, quantity, unit, price}
  
  -- Financials
  total_cost DECIMAL(10, 2),
  invoice_number TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  
  -- Quality Assessment
  quality_rating DECIMAL(3, 2) DEFAULT NULL CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
  quality_notes TEXT,
  any_issues BOOLEAN DEFAULT false,
  issue_description TEXT,
  
  -- Audit Trail
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  
  -- Constraint: unique order number per brewery
  UNIQUE(brewery_id, order_number)
);

-- ─────────────────────────────────────────────
-- PURCHASE ORDER ITEMS TABLE (Line Items)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  
  -- Item Details
  item_name TEXT NOT NULL,
  quantity_ordered DECIMAL(10, 2) NOT NULL,
  quantity_received DECIMAL(10, 2) DEFAULT 0,
  unit TEXT NOT NULL, -- 'kg', 'lb', 'oz', 'ea', 'bbl', etc.
  unit_price DECIMAL(10, 2) NOT NULL,
  
  -- Quality Tracking
  lot_number TEXT,
  expiration_date DATE,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────
-- SUPPLIER RATINGS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  
  -- Ratings (1-5 scale)
  quality_rating DECIMAL(3, 2) NOT NULL CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating DECIMAL(3, 2) NOT NULL CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  reliability_rating DECIMAL(3, 2) NOT NULL CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
  pricing_rating DECIMAL(3, 2) NOT NULL CHECK (pricing_rating >= 1 AND pricing_rating <= 5),
  
  -- Feedback
  comments TEXT,
  would_order_again BOOLEAN DEFAULT true,
  
  -- Context
  rating_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  rated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────
-- UPDATE INVENTORY TABLE
-- ─────────────────────────────────────────────
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_contact TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS purchase_price DECIMAL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_order_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_from_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_suppliers_brewery ON suppliers(brewery_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(brewery_id, is_active);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_brewery ON purchase_orders(brewery_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(brewery_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_inventory ON purchase_order_items(inventory_id);

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_brewery ON supplier_ratings(brewery_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier ON supplier_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_date ON supplier_ratings(rating_date);

CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder_supplier ON inventory(reorder_from_supplier_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

-- Enable RLS on new tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;

-- Suppliers: Users can only see their own brewery's suppliers
DROP POLICY IF EXISTS "Users can view own brewery suppliers" ON suppliers;
CREATE POLICY "Users can view own brewery suppliers" ON suppliers
  FOR SELECT USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert suppliers to own brewery" ON suppliers;
CREATE POLICY "Users can insert suppliers to own brewery" ON suppliers
  FOR INSERT WITH CHECK (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own brewery suppliers" ON suppliers;
CREATE POLICY "Users can update own brewery suppliers" ON suppliers
  FOR UPDATE USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own brewery suppliers" ON suppliers;
CREATE POLICY "Users can delete own brewery suppliers" ON suppliers
  FOR DELETE USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- Purchase Orders: Users can only see their own brewery's orders
DROP POLICY IF EXISTS "Users can view own brewery purchase orders" ON purchase_orders;
CREATE POLICY "Users can view own brewery purchase orders" ON purchase_orders
  FOR SELECT USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert purchase orders for own brewery" ON purchase_orders;
CREATE POLICY "Users can insert purchase orders for own brewery" ON purchase_orders
  FOR INSERT WITH CHECK (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own brewery purchase orders" ON purchase_orders;
CREATE POLICY "Users can update own brewery purchase orders" ON purchase_orders
  FOR UPDATE USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own brewery purchase orders" ON purchase_orders;
CREATE POLICY "Users can delete own brewery purchase orders" ON purchase_orders
  FOR DELETE USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- Purchase Order Items: Inherits security from purchase_orders (via FK)
DROP POLICY IF EXISTS "Users can view purchase order items" ON purchase_order_items;
CREATE POLICY "Users can view purchase order items" ON purchase_order_items
  FOR SELECT USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders 
      WHERE brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert purchase order items" ON purchase_order_items;
CREATE POLICY "Users can insert purchase order items" ON purchase_order_items
  FOR INSERT WITH CHECK (
    purchase_order_id IN (
      SELECT id FROM purchase_orders 
      WHERE brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update purchase order items" ON purchase_order_items;
CREATE POLICY "Users can update purchase order items" ON purchase_order_items
  FOR UPDATE USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders 
      WHERE brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
    )
  )
  WITH CHECK (
    purchase_order_id IN (
      SELECT id FROM purchase_orders 
      WHERE brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete purchase order items" ON purchase_order_items;
CREATE POLICY "Users can delete purchase order items" ON purchase_order_items
  FOR DELETE USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders 
      WHERE brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
    )
  );

-- Supplier Ratings: Users can only see their own brewery's ratings
DROP POLICY IF EXISTS "Users can view own brewery supplier ratings" ON supplier_ratings;
CREATE POLICY "Users can view own brewery supplier ratings" ON supplier_ratings
  FOR SELECT USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert supplier ratings for own brewery" ON supplier_ratings;
CREATE POLICY "Users can insert supplier ratings for own brewery" ON supplier_ratings
  FOR INSERT WITH CHECK (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own brewery supplier ratings" ON supplier_ratings;
CREATE POLICY "Users can update own brewery supplier ratings" ON supplier_ratings
  FOR UPDATE USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own brewery supplier ratings" ON supplier_ratings;
CREATE POLICY "Users can delete own brewery supplier ratings" ON supplier_ratings
  FOR DELETE USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );
