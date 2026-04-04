-- Reorder Automation Feature
-- Adds tables and indexes for automatic reorder point monitoring

-- ─────────────────────────────────────────────
-- REORDER ALERTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reorder_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  
  -- Alert classification
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'reorder_point_hit',
    'critical_low',
    'stockout_imminent'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN (
    'info',
    'warning',
    'critical'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'acknowledged',
    'resolved'
  )),
  
  -- Inventory context at time of alert
  current_quantity DECIMAL(10, 2) NOT NULL,
  reorder_point DECIMAL(10, 2) NOT NULL,
  units_to_reorder DECIMAL(10, 2),
  estimated_stockout_days INTEGER,
  
  -- Order tracking
  last_order_date TIMESTAMP,
  
  -- User actions
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  
  -- Prevent duplicate open alerts for the same item
  CONSTRAINT unique_open_alert UNIQUE (brewery_id, inventory_item_id, alert_type)
    DEFERRABLE INITIALLY DEFERRED
);

-- ─────────────────────────────────────────────
-- REORDER POINT HISTORY TABLE (audit trail)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reorder_point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  old_reorder_point DECIMAL(10, 2),
  new_reorder_point DECIMAL(10, 2) NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────
-- ENHANCE INVENTORY TABLE
-- ─────────────────────────────────────────────
-- Add columns to inventory table if they don't already exist
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS supplier_id UUID,
ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS avg_weekly_usage DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS last_stock_alert_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS suppress_reorder_alerts BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────
-- INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_brewery 
  ON reorder_alerts(brewery_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reorder_alerts_status 
  ON reorder_alerts(brewery_id, status, severity);

CREATE INDEX IF NOT EXISTS idx_reorder_alerts_item 
  ON reorder_alerts(inventory_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reorder_point_history_inventory 
  ON reorder_point_history(inventory_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reorder_point_history_brewery 
  ON reorder_point_history(brewery_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_alert_suppression 
  ON inventory(brewery_id, suppress_reorder_alerts);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE reorder_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_point_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages reorder alerts" ON reorder_alerts
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owner manages reorder point history" ON reorder_point_history
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- FUNCTION: Auto-update updated_at timestamp
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_reorder_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reorder_alerts_updated_at_trigger
BEFORE UPDATE ON reorder_alerts
FOR EACH ROW
EXECUTE FUNCTION update_reorder_alerts_updated_at();

-- ─────────────────────────────────────────────
-- FUNCTION: Log reorder point changes
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_reorder_point_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.reorder_point IS DISTINCT FROM OLD.reorder_point) THEN
    INSERT INTO reorder_point_history (
      inventory_item_id,
      brewery_id,
      old_reorder_point,
      new_reorder_point,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      NEW.brewery_id,
      OLD.reorder_point,
      NEW.reorder_point,
      auth.uid(),
      'Updated via inventory settings'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_reorder_point_change_trigger
AFTER UPDATE ON inventory
FOR EACH ROW
EXECUTE FUNCTION log_reorder_point_change();
