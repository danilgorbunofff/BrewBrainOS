-- 002: Batch/tank foreign keys and compatibility indexes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tanks_current_batch'
      AND conrelid = 'tanks'::regclass
  ) THEN
    ALTER TABLE tanks
      ADD CONSTRAINT fk_tanks_current_batch
      FOREIGN KEY (current_batch_id)
      REFERENCES batches(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

ALTER TABLE tanks VALIDATE CONSTRAINT fk_tanks_current_batch;

CREATE INDEX IF NOT EXISTS idx_tanks_brewery_id ON tanks(brewery_id);
CREATE INDEX IF NOT EXISTS idx_tanks_current_batch_id ON tanks(current_batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_brewery_id ON batches(brewery_id);
CREATE INDEX IF NOT EXISTS idx_batch_readings_batch_id ON batch_readings(batch_id);
CREATE INDEX IF NOT EXISTS idx_sanitation_logs_tank_id ON sanitation_logs(tank_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_brewery_id ON subscriptions(brewery_id);
CREATE INDEX IF NOT EXISTS idx_breweries_iot_webhook_token ON breweries(iot_webhook_token);
