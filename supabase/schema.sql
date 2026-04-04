-- BrewBrain OS — Canonical Schema
-- Run this in the Supabase SQL Editor to set up or reset the database.
-- All tables use `created_at` for timestamp consistency across the app.

-- BREWERIES
CREATE TABLE IF NOT EXISTS breweries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  license_number TEXT,
  owner_id   UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- TANKS
-- NOTE: column is `capacity` (NOT `capacity_bbl`) to match app code
-- NOTE: `status` column added to track fermenting/empty/cip states
CREATE TABLE IF NOT EXISTS tanks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id       UUID REFERENCES breweries(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  capacity         DECIMAL,              -- Volume in BBL (or chosen unit)
  status           TEXT DEFAULT 'empty', -- 'empty' | 'fermenting' | 'conditioning' | 'cip'
  current_batch_id UUID,                 -- FK to batches, set manually
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- BATCHES
-- NOTE: `created_at` added (was missing from original schema)
-- NOTE: status values are lowercase to match app code
CREATE TABLE IF NOT EXISTS batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id  UUID REFERENCES breweries(id) ON DELETE CASCADE,
  recipe_name TEXT NOT NULL,
  status      TEXT DEFAULT 'fermenting', -- 'fermenting' | 'conditioning' | 'packaging' | 'complete' | 'dumped'
  og          DECIMAL,
  fg          DECIMAL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add FK constraint for tanks.current_batch_id after both tables exist
ALTER TABLE tanks
  ADD CONSTRAINT fk_tanks_current_batch
  FOREIGN KEY (current_batch_id) REFERENCES batches(id)
  ON DELETE SET NULL;

-- INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id    UUID REFERENCES breweries(id) ON DELETE CASCADE,
  item_type     TEXT CHECK (item_type IN ('Hops', 'Grain', 'Yeast', 'Adjunct')),
  name          TEXT NOT NULL,
  current_stock DECIMAL NOT NULL DEFAULT 0,
  unit          TEXT DEFAULT 'kg',
  reorder_point DECIMAL DEFAULT 0,
  lot_number    TEXT,                    -- Unique identifier for material batch
  expiration_date DATE,                  -- When the material expires
  manufacturer  TEXT,                    -- Supplier/manufacturer name
  
  -- Degradation Metrics Tracking
  degradation_tracked BOOLEAN DEFAULT FALSE,    -- Is this item tracked for degradation?
  received_date DATE DEFAULT CURRENT_DATE,      -- When ingredient arrived (triggers degradation calc)
  storage_condition TEXT DEFAULT 'cool_dry',    -- 'cool_dry' | 'cool_humid' | 'room_temp' | 'warm'
  last_degradation_calc DATE DEFAULT CURRENT_DATE, -- Last time degradation was recalculated
  
  -- Hop HSI (Hop Storage Index)
  hsi_initial DECIMAL DEFAULT NULL,             -- Initial HSI value (0-100)
  hsi_current DECIMAL DEFAULT NULL,             -- Current HSI value (degrades over time)
  hsi_loss_rate DECIMAL DEFAULT 0.15,           -- Monthly HSI loss % (hops degrade ~0.15% per month)
  
  -- Grain Moisture Content
  grain_moisture_initial DECIMAL DEFAULT NULL,  -- Initial moisture content %
  grain_moisture_current DECIMAL DEFAULT NULL,  -- Current moisture content %
  
  -- PPG (Points Per Pound Per Gallon)
  ppg_initial DECIMAL DEFAULT NULL,             -- Initial PPG (typical range: 30-45)
  ppg_current DECIMAL DEFAULT NULL,             -- Current PPG after losses
  
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- SANITATION LOGS
CREATE TABLE IF NOT EXISTS sanitation_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id    UUID REFERENCES tanks(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id),
  notes      TEXT,
  cleaned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- DEGRADATION LOGS (Audit trail for ingredient freshness tracking)
CREATE TABLE IF NOT EXISTS degradation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  
  -- Before & After snapshots
  hsi_before DECIMAL,
  hsi_after DECIMAL,
  grain_moisture_before DECIMAL,
  grain_moisture_after DECIMAL,
  ppg_before DECIMAL,
  ppg_after DECIMAL,
  
  -- Change metadata
  change_reason TEXT CHECK (change_reason IN ('auto_calc', 'manual_input', 'storage_change', 'quality_test')) NOT NULL,
  storage_condition_at_time TEXT,
  days_elapsed INTEGER,
  
  -- Audit trail
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_degradation_logs_inventory ON degradation_logs(inventory_id);
CREATE INDEX IF NOT EXISTS idx_degradation_logs_brewery ON degradation_logs(brewery_id);
CREATE INDEX IF NOT EXISTS idx_degradation_logs_created ON degradation_logs(created_at);

-- BATCH READINGS (voice-logged sensor data)
-- NOTE: column is `created_at` (was `logged_at` in old schema) to match app code
CREATE TABLE IF NOT EXISTS batch_readings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID REFERENCES batches(id) ON DELETE CASCADE,
  logger_id   UUID REFERENCES auth.users(id),
  temperature DECIMAL,
  gravity     DECIMAL,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- SUBSCRIPTIONS (Stripe billing)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id             UUID REFERENCES breweries(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  tier                   TEXT DEFAULT 'free' CHECK (tier IN ('free','nano','production','multi_site')),
  status                 TEXT DEFAULT 'inactive' CHECK (status IN ('active','past_due','canceled','inactive','trialing')),
  current_period_start   TIMESTAMP WITH TIME ZONE,
  current_period_end     TIMESTAMP WITH TIME ZONE,
  white_glove_paid       BOOLEAN DEFAULT false,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at             TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add subscription_tier column to breweries for quick lookups
ALTER TABLE breweries ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────
ALTER TABLE breweries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanitation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_readings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE degradation_logs ENABLE ROW LEVEL SECURITY;

-- Breweries: owner can do anything
CREATE POLICY "Owner manages brewery" ON breweries
  FOR ALL USING (auth.uid() = owner_id);

-- Tanks: users who own the brewery can CRUD
CREATE POLICY "Owner manages tanks" ON tanks
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- Batches
CREATE POLICY "Owner manages batches" ON batches
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- Inventory
CREATE POLICY "Owner manages inventory" ON inventory
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- Sanitation logs: user must own the tank's brewery
CREATE POLICY "Owner manages sanitation logs" ON sanitation_logs
  FOR ALL USING (
    tank_id IN (
      SELECT t.id FROM tanks t
      JOIN breweries b ON b.id = t.brewery_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Batch readings: user must own the batch's brewery
CREATE POLICY "Owner manages batch readings" ON batch_readings
  FOR ALL USING (
    batch_id IN (
      SELECT b.id FROM batches b
      JOIN breweries br ON br.id = b.brewery_id
      WHERE br.owner_id = auth.uid()
    )
  );

-- Degradation logs: user must own the degradation's brewery
CREATE POLICY "Owner manages degradation logs" ON degradation_logs
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- Subscriptions: user must own the brewery
CREATE POLICY "Owner manages subscriptions" ON subscriptions
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- PUSH SUBSCRIPTIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- SHRINKAGE ALERTS & ANOMALY DETECTION
-- ─────────────────────────────────────────────
-- INVENTORY_HISTORY: Track all stock movements
CREATE TABLE IF NOT EXISTS inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  previous_stock DECIMAL NOT NULL,
  current_stock DECIMAL NOT NULL,
  quantity_change DECIMAL NOT NULL,
  change_type TEXT CHECK (change_type IN (
    'stock_adjustment', 'recipe_usage', 'received', 'waste', 'other'
  )) DEFAULT 'other',
  reason TEXT,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- SHRINKAGE_ALERTS: Anomaly Detection Results
CREATE TABLE IF NOT EXISTS shrinkage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  alert_type TEXT CHECK (alert_type IN (
    'unusual_single_loss', 'pattern_degradation', 'sudden_spike', 'high_variance', 'variance_threshold_exceeded'
  )) NOT NULL,
  expected_stock DECIMAL NOT NULL,
  actual_stock DECIMAL NOT NULL,
  loss_amount DECIMAL NOT NULL,
  loss_percentage DECIMAL NOT NULL,
  average_monthly_loss DECIMAL,
  z_score DECIMAL,
  confidence_score DECIMAL NOT NULL,
  status TEXT DEFAULT 'unresolved' CHECK (status IN (
    'unresolved', 'acknowledged', 'investigating', 'resolved', 'false_positive'
  )),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- SHRINKAGE_BASELINES: Per-item baseline metrics
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

-- Indexes for performance
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

-- RLS
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

-- ─────────────────────────────────────────────
-- FEEDBACK (Telemetry)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);
