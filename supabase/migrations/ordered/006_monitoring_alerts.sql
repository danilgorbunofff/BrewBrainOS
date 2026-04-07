-- 006: Monitoring, notifications, feedback, and compliance logging.

ALTER TABLE batch_readings ADD COLUMN IF NOT EXISTS external_id UUID;
ALTER TABLE batch_readings ADD COLUMN IF NOT EXISTS ph DECIMAL;
ALTER TABLE batch_readings ADD COLUMN IF NOT EXISTS dissolved_oxygen DECIMAL;
ALTER TABLE batch_readings ADD COLUMN IF NOT EXISTS pressure DECIMAL;
ALTER TABLE batch_readings ADD COLUMN IF NOT EXISTS provenance_ip TEXT;
ALTER TABLE batch_readings ADD COLUMN IF NOT EXISTS provenance_user_agent TEXT;

ALTER TABLE batch_brewing_logs ADD COLUMN IF NOT EXISTS provenance_ip TEXT;
ALTER TABLE batch_brewing_logs ADD COLUMN IF NOT EXISTS provenance_user_agent TEXT;

CREATE TABLE IF NOT EXISTS fermentation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('stuck_fermentation', 'temperature_deviation', 'ph_out_of_range', 'do_spike', 'over_pressure', 'glycol_failure')) NOT NULL,
  severity TEXT CHECK (severity IN ('warning', 'critical')) NOT NULL,
  message TEXT NOT NULL,
  threshold_value DECIMAL,
  actual_value DECIMAL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  stuck_fermentation BOOLEAN DEFAULT true,
  temperature_deviation BOOLEAN DEFAULT true,
  ph_out_of_range BOOLEAN DEFAULT true,
  do_spike BOOLEAN DEFAULT true,
  over_pressure BOOLEAN DEFAULT true,
  glycol_failure BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  severity_filter TEXT DEFAULT 'all' CHECK (severity_filter IN ('all', 'critical_only')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS yeast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  cell_density DECIMAL,
  viability_pct DECIMAL,
  pitch_rate DECIMAL,
  notes TEXT,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS daily_operations_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  operation_type TEXT CHECK (operation_type IN ('removal_taxpaid', 'removal_tax_free', 'return_to_brewery', 'breakage_destruction', 'other')) NOT NULL,
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  ttb_reportable BOOLEAN DEFAULT true,
  remarks TEXT,
  logged_by UUID REFERENCES auth.users(id),
  provenance_ip TEXT,
  provenance_user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_fermentation_alerts_batch_id ON fermentation_alerts(batch_id);
CREATE INDEX IF NOT EXISTS idx_fermentation_alerts_brewery_id ON fermentation_alerts(brewery_id);
CREATE INDEX IF NOT EXISTS idx_fermentation_alerts_status ON fermentation_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fermentation_alerts_severity ON fermentation_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alert_preferences_user_id ON alert_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_preferences_brewery_id ON alert_preferences(brewery_id);
CREATE INDEX IF NOT EXISTS idx_yeast_logs_batch_id ON yeast_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_yeast_logs_brewery_id ON yeast_logs(brewery_id);
CREATE INDEX IF NOT EXISTS idx_daily_operations_logs_brewery_id ON daily_operations_logs(brewery_id);
CREATE INDEX IF NOT EXISTS idx_daily_operations_logs_log_date ON daily_operations_logs(log_date);
