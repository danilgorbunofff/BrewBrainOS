-- 007: Reorder automation, change history, and trigger-based audit.
-- Safe rollout pattern: add columns, backfill defaults, then create triggers.

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(10, 2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS avg_weekly_usage DECIMAL(10, 2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_stock_alert_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS suppress_reorder_alerts BOOLEAN;

UPDATE inventory
SET lead_time_days = COALESCE(lead_time_days, 7),
    suppress_reorder_alerts = COALESCE(suppress_reorder_alerts, FALSE)
WHERE lead_time_days IS NULL
   OR suppress_reorder_alerts IS NULL;

ALTER TABLE inventory ALTER COLUMN lead_time_days SET DEFAULT 7;
ALTER TABLE inventory ALTER COLUMN suppress_reorder_alerts SET DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS reorder_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('reorder_point_hit', 'critical_low', 'stockout_imminent')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  current_quantity DECIMAL(10, 2) NOT NULL,
  reorder_point DECIMAL(10, 2) NOT NULL,
  units_to_reorder DECIMAL(10, 2),
  estimated_stockout_days INTEGER,
  last_order_date TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

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

CREATE INDEX IF NOT EXISTS idx_reorder_alerts_brewery_id ON reorder_alerts(brewery_id);
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_status ON reorder_alerts(brewery_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_inventory_item_id ON reorder_alerts(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_reorder_point_history_inventory_item_id ON reorder_point_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_reorder_point_history_brewery_id ON reorder_point_history(brewery_id);
CREATE INDEX IF NOT EXISTS idx_inventory_suppress_reorder_alerts ON inventory(brewery_id, suppress_reorder_alerts);

CREATE OR REPLACE FUNCTION update_reorder_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reorder_alerts_updated_at_trigger ON reorder_alerts;
CREATE TRIGGER reorder_alerts_updated_at_trigger
BEFORE UPDATE ON reorder_alerts
FOR EACH ROW
EXECUTE FUNCTION update_reorder_alerts_updated_at();

CREATE OR REPLACE FUNCTION log_reorder_point_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reorder_point IS DISTINCT FROM OLD.reorder_point THEN
    INSERT INTO reorder_point_history (
      inventory_item_id,
      brewery_id,
      old_reorder_point,
      new_reorder_point,
      changed_by,
      reason
    )
    VALUES (
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

DROP TRIGGER IF EXISTS inventory_reorder_point_change_trigger ON inventory;
CREATE TRIGGER inventory_reorder_point_change_trigger
AFTER UPDATE ON inventory
FOR EACH ROW
EXECUTE FUNCTION log_reorder_point_change();
