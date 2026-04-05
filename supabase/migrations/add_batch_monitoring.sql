-- BrewBrain OS — Batch Monitoring Migration
-- Phase 1.2: Vessel & Batch Management
-- Adds: pH, dissolved oxygen, pressure columns to batch_readings
--       yeast_logs table for viability tracking
--       fermentation_alerts table for anomaly detection
--       alert_preferences table for per-user notification settings

-- ─────────────────────────────────────────────
-- 1. EXTEND batch_readings with new sensor columns
-- ─────────────────────────────────────────────
ALTER TABLE batch_readings
  ADD COLUMN IF NOT EXISTS ph                DECIMAL,  -- pH level (typical range 4.0–5.5)
  ADD COLUMN IF NOT EXISTS dissolved_oxygen  DECIMAL,  -- DO in ppm (target < 0.1 ppm post-ferment)
  ADD COLUMN IF NOT EXISTS pressure          DECIMAL;  -- Tank pressure in PSI

-- ─────────────────────────────────────────────
-- 2. YEAST LOGS — cell density & viability tracking
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS yeast_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id       UUID REFERENCES batches(id)    ON DELETE CASCADE NOT NULL,
  brewery_id     UUID REFERENCES breweries(id)  ON DELETE CASCADE NOT NULL,
  cell_density   DECIMAL,        -- million cells per mL (target: ~1M cells/mL/°P)
  viability_pct  DECIMAL,        -- % viable cells (ideal: >85%)
  pitch_rate     DECIMAL,        -- million cells / mL / °Plato
  notes          TEXT,
  logged_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_yeast_logs_batch    ON yeast_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_yeast_logs_brewery  ON yeast_logs(brewery_id);
CREATE INDEX IF NOT EXISTS idx_yeast_logs_created  ON yeast_logs(created_at);

ALTER TABLE yeast_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages yeast logs" ON yeast_logs
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- 3. FERMENTATION ALERTS — anomaly detection results
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fermentation_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID REFERENCES batches(id)   ON DELETE CASCADE NOT NULL,
  brewery_id      UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  alert_type      TEXT NOT NULL CHECK (alert_type IN (
    'stuck_fermentation',
    'temperature_deviation',
    'ph_out_of_range',
    'do_spike',
    'over_pressure',
    'glycol_failure'
  )),
  severity        TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'critical')),
  message         TEXT NOT NULL,
  threshold_value DECIMAL,   -- the configured threshold that was breached
  actual_value    DECIMAL,   -- the value that triggered the alert
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'acknowledged', 'resolved'
  )),
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ferm_alerts_batch    ON fermentation_alerts(batch_id);
CREATE INDEX IF NOT EXISTS idx_ferm_alerts_brewery  ON fermentation_alerts(brewery_id);
CREATE INDEX IF NOT EXISTS idx_ferm_alerts_status   ON fermentation_alerts(status);
CREATE INDEX IF NOT EXISTS idx_ferm_alerts_severity ON fermentation_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ferm_alerts_created  ON fermentation_alerts(created_at);

ALTER TABLE fermentation_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages fermentation alerts" ON fermentation_alerts
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- 4. ALERT PREFERENCES — per-user notification settings
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_preferences (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  brewery_id           UUID REFERENCES breweries(id)  ON DELETE CASCADE NOT NULL,
  -- Fermentation alert toggles
  stuck_fermentation   BOOLEAN DEFAULT true,
  temperature_deviation BOOLEAN DEFAULT true,
  ph_out_of_range      BOOLEAN DEFAULT true,
  do_spike             BOOLEAN DEFAULT false,
  over_pressure        BOOLEAN DEFAULT true,
  glycol_failure       BOOLEAN DEFAULT true,
  -- Delivery method
  push_enabled         BOOLEAN DEFAULT true,
  in_app_enabled       BOOLEAN DEFAULT true,
  -- Severity filter: 'all' | 'critical_only'
  severity_filter      TEXT DEFAULT 'all' CHECK (severity_filter IN ('all', 'critical_only')),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_alert_prefs_user    ON alert_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_prefs_brewery ON alert_preferences(brewery_id);

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert preferences" ON alert_preferences
  FOR ALL USING (auth.uid() = user_id);
