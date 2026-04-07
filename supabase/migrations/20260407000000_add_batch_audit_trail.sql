-- Add compliance audit trails to batch operations
ALTER TABLE batch_brewing_logs
ADD COLUMN IF NOT EXISTS provenance_ip TEXT,
ADD COLUMN IF NOT EXISTS provenance_user_agent TEXT;

ALTER TABLE batch_readings
ADD COLUMN IF NOT EXISTS provenance_ip TEXT,
ADD COLUMN IF NOT EXISTS provenance_user_agent TEXT;
