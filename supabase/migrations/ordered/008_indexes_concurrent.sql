-- 008: Concurrent indexes for large existing tables.
-- IMPORTANT: execute this file outside an explicit transaction.
-- The canonical CI helper applies each file individually via psql so CONCURRENTLY is allowed.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_readings_external_id
  ON batch_readings(external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_degradation_logs_created_at
  ON degradation_logs(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_history_created_at
  ON inventory_history(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shrinkage_alerts_detected_at
  ON shrinkage_alerts(detected_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yeast_logs_created_at
  ON yeast_logs(created_at);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_reorder_alerts_open_unique
  ON reorder_alerts(brewery_id, inventory_item_id, alert_type)
  WHERE status IN ('open', 'acknowledged');
