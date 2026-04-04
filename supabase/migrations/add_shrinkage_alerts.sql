-- Add Shrinkage Alerts & Anomaly Detection for BrewBrain
-- This migration adds tables and functions for tracking inventory shrinkage and anomalies

-- ─────────────────────────────────────────────
-- INVENTORY_HISTORY: Track all stock movements
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  
  -- Stock change details
  previous_stock DECIMAL NOT NULL,
  current_stock DECIMAL NOT NULL,
  quantity_change DECIMAL NOT NULL,              -- Can be positive or negative
  
  -- Change categorization
  change_type TEXT CHECK (change_type IN (
    'stock_adjustment',    -- Manual entry adjustment
    'recipe_usage',        -- Used in batch
    'received',            -- New purchase/delivery
    'waste',               -- Intentional disposal
    'other'                -- Uncategorized
  )) DEFAULT 'other',
  
  -- Details about what triggered the change
  reason TEXT,                                   -- Description: "Used in Hazy IPA batch", "Delivered from supplier"
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────
-- SHRINKAGE_ALERTS: Anomaly Detection Results
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shrinkage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  
  -- Alert severity and categorization
  severity TEXT CHECK (severity IN (
    'low',                 -- Minor discrepancy (0-5%)
    'medium',              -- Moderate loss (5-15%)
    'high',                -- Significant shrinkage (15-30%)
    'critical'             -- Severe loss (30%+)
  )) DEFAULT 'medium',
  
  -- Anomaly details
  alert_type TEXT CHECK (alert_type IN (
    'unusual_single_loss',       -- One large unexplained stock reduction
    'pattern_degradation',       -- Gradual consistent loss pattern
    'sudden_spike',              -- Sudden drop in stock
    'high_variance',             -- Inconsistent/volatile stock levels
    'variance_threshold_exceeded' -- Normal variance exceeded threshold
  )) NOT NULL,
  
  -- Numerical metrics
  expected_stock DECIMAL NOT NULL,               -- Expected based on history
  actual_stock DECIMAL NOT NULL,
  loss_amount DECIMAL NOT NULL,                  -- Absolute loss quantity
  loss_percentage DECIMAL NOT NULL,              -- Loss as % of expected
  
  -- Statistical context
  average_monthly_loss DECIMAL,                  -- Baseline loss rate for this item
  z_score DECIMAL,                               -- Statistical anomaly score (|Z| > 2.5 = anomaly)
  confidence_score DECIMAL NOT NULL,             -- 0-100: How confident is the detection
  
  -- User action tracking
  status TEXT DEFAULT 'unresolved' CHECK (status IN (
    'unresolved',          -- New alert
    'acknowledged',        -- User reviewed but didn't act
    'investigating',       -- User is looking into it
    'resolved',            -- Issue addressed
    'false_positive'       -- Detection was wrong
  )),
  
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────
-- SHRINKAGE_BASELINES: Per-item baseline metrics
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shrinkage_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  
  -- Historical analysis windows
  analysis_period_days INTEGER DEFAULT 90,      -- Look back this many days
  sample_count INTEGER,                          -- How many data points analyzed
  
  -- Baseline metrics (calculated from history)
  average_monthly_loss DECIMAL DEFAULT 0,        -- Typical loss rate (kg/month or units/month)
  monthly_loss_std_dev DECIMAL DEFAULT 0,        -- Standard deviation of losses
  median_loss_percentage DECIMAL DEFAULT 0,      -- Median % loss per month
  
  -- Thresholds for alerts
  loss_threshold_warning DECIMAL DEFAULT 5,      -- Alert if loss > this % in a period
  loss_threshold_critical DECIMAL DEFAULT 15,    -- Critical alert threshold
  variance_multiplier DECIMAL DEFAULT 2.5,       -- Alert if variance > baseline × this
  
  -- Tracking
  last_calculated_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────
-- INDEXES for Performance
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_history_inventory ON inventory_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_brewery ON inventory_history(brewery_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created ON inventory_history(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_history_batch ON inventory_history(batch_id);

CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_inventory ON shrinkage_alerts(inventory_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_brewery ON shrinkage_alerts(brewery_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_status ON shrinkage_alerts(status);
CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_severity ON shrinkage_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_created ON shrinkage_alerts(detected_at);

CREATE INDEX IF NOT EXISTS idx_shrinkage_baselines_inventory ON shrinkage_baselines(inventory_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_baselines_brewery ON shrinkage_baselines(brewery_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shrinkage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shrinkage_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages inventory history" ON inventory_history
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owner manages shrinkage alerts" ON shrinkage_alerts
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owner manages shrinkage baselines" ON shrinkage_baselines
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );
