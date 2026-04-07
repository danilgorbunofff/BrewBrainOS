ALTER TABLE batch_readings
  ADD COLUMN IF NOT EXISTS external_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_readings_external_id
  ON batch_readings(external_id)
  WHERE external_id IS NOT NULL;