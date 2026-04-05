-- Phase 1.3: Compliance Automation 
-- 27 CFR 25.292 Daily Operations Logging, TTB Form 5130.9 tracking, Audit Trails

CREATE TYPE daily_operation_type AS ENUM (
  'removal_taxpaid',
  'removal_tax_free',
  'return_to_brewery',
  'breakage_destruction',
  'other'
);

CREATE TABLE daily_operations_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  operation_type daily_operation_type NOT NULL,
  quantity DECIMAL NOT NULL,
  unit TEXT DEFAULT 'bbl',
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  ttb_reportable BOOLEAN DEFAULT true,
  remarks TEXT,
  logged_by UUID REFERENCES auth.users(id),
  provenance_ip TEXT, 
  provenance_user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- RLS for internal user rules
ALTER TABLE daily_operations_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily operations logs from their breweries" ON daily_operations_logs
  FOR SELECT USING (
    brewery_id IN (
      SELECT id FROM breweries WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert daily operations logs for their breweries" ON daily_operations_logs
  FOR INSERT WITH CHECK (
    brewery_id IN (
      SELECT id FROM breweries WHERE owner_id = auth.uid()
    )
  );

-- Extend Shrinkage Alerts for TTB remarks
ALTER TABLE shrinkage_alerts
ADD COLUMN ttb_reportable BOOLEAN DEFAULT false,
ADD COLUMN ttb_remarks TEXT;

-- Extend Inventory History for Audit Trail
ALTER TABLE inventory_history
ADD COLUMN provenance_ip TEXT,
ADD COLUMN provenance_user_agent TEXT;
