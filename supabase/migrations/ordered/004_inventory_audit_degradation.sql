-- 004: Inventory degradation, audit history, and shrinkage analytics.
-- Safe rollout pattern: add nullable/defaulted columns, backfill existing rows, then tighten defaults.

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS lot_number TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS degradation_tracked BOOLEAN;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS received_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS storage_condition TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_degradation_calc DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS hsi_initial DECIMAL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS hsi_current DECIMAL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS hsi_loss_rate DECIMAL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grain_moisture_initial DECIMAL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grain_moisture_current DECIMAL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS ppg_initial DECIMAL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS ppg_current DECIMAL;

UPDATE inventory
SET degradation_tracked = COALESCE(degradation_tracked, FALSE),
    received_date = COALESCE(received_date, CURRENT_DATE),
    storage_condition = COALESCE(storage_condition, 'cool_dry'),
    last_degradation_calc = COALESCE(last_degradation_calc, CURRENT_DATE),
    hsi_loss_rate = COALESCE(hsi_loss_rate, 0.15)
WHERE degradation_tracked IS NULL
   OR received_date IS NULL
   OR storage_condition IS NULL
   OR last_degradation_calc IS NULL
   OR hsi_loss_rate IS NULL;

ALTER TABLE inventory ALTER COLUMN degradation_tracked SET DEFAULT FALSE;
ALTER TABLE inventory ALTER COLUMN received_date SET DEFAULT CURRENT_DATE;
ALTER TABLE inventory ALTER COLUMN storage_condition SET DEFAULT 'cool_dry';
ALTER TABLE inventory ALTER COLUMN last_degradation_calc SET DEFAULT CURRENT_DATE;
ALTER TABLE inventory ALTER COLUMN hsi_loss_rate SET DEFAULT 0.15;

CREATE TABLE IF NOT EXISTS degradation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  hsi_before DECIMAL,
  hsi_after DECIMAL,
  grain_moisture_before DECIMAL,
  grain_moisture_after DECIMAL,
  ppg_before DECIMAL,
  ppg_after DECIMAL,
  change_reason TEXT CHECK (change_reason IN ('auto_calc', 'manual_input', 'storage_change', 'quality_test')) NOT NULL,
  storage_condition_at_time TEXT,
  days_elapsed INTEGER,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  previous_stock DECIMAL NOT NULL,
  current_stock DECIMAL NOT NULL,
  quantity_change DECIMAL NOT NULL,
  change_type TEXT CHECK (change_type IN ('stock_adjustment', 'recipe_usage', 'received', 'waste', 'other')) DEFAULT 'other',
  reason TEXT,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES auth.users(id),
  provenance_ip TEXT,
  provenance_user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS shrinkage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  alert_type TEXT CHECK (alert_type IN ('unusual_single_loss', 'pattern_degradation', 'sudden_spike', 'high_variance', 'variance_threshold_exceeded')) NOT NULL,
  expected_stock DECIMAL NOT NULL,
  actual_stock DECIMAL NOT NULL,
  loss_amount DECIMAL NOT NULL,
  loss_percentage DECIMAL NOT NULL,
  average_monthly_loss DECIMAL,
  z_score DECIMAL,
  confidence_score DECIMAL NOT NULL,
  status TEXT DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  ttb_reportable BOOLEAN DEFAULT false,
  ttb_remarks TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS shrinkage_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  analysis_period_days INTEGER DEFAULT 90,
  sample_count INTEGER,
  average_monthly_loss DECIMAL DEFAULT 0,
  monthly_loss_std_dev DECIMAL DEFAULT 0,
  median_loss_percentage DECIMAL DEFAULT 0,
  loss_threshold_warning DECIMAL DEFAULT 5,
  loss_threshold_critical DECIMAL DEFAULT 15,
  variance_multiplier DECIMAL DEFAULT 2.5,
  last_calculated_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_degradation_logs_inventory_id ON degradation_logs(inventory_id);
CREATE INDEX IF NOT EXISTS idx_degradation_logs_brewery_id ON degradation_logs(brewery_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_inventory_id ON inventory_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_brewery_id ON inventory_history(brewery_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_batch_id ON inventory_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_inventory_id ON shrinkage_alerts(inventory_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_brewery_id ON shrinkage_alerts(brewery_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_status ON shrinkage_alerts(status);
CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_severity ON shrinkage_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_shrinkage_baselines_inventory_id ON shrinkage_baselines(inventory_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_baselines_brewery_id ON shrinkage_baselines(brewery_id);
