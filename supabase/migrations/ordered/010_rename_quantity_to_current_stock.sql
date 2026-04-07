-- 010: Legacy compatibility normalization.
-- This file intentionally avoids destructive cleanup so rollout can be validated first.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory'
      AND column_name = 'quantity'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inventory'
        AND column_name = 'current_stock'
    ) THEN
      ALTER TABLE inventory ADD COLUMN current_stock DECIMAL;
    END IF;

    EXECUTE 'UPDATE inventory SET current_stock = COALESCE(current_stock, quantity) WHERE quantity IS NOT NULL';
    ALTER TABLE inventory ALTER COLUMN current_stock SET DEFAULT 0;
    UPDATE inventory SET current_stock = COALESCE(current_stock, 0) WHERE current_stock IS NULL;
  END IF;
END $$;

DO $$
DECLARE
  singular_exists BOOLEAN;
  plural_exists BOOLEAN;
  plural_count BIGINT;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'daily_operation_logs'
  ) INTO singular_exists;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'daily_operations_logs'
  ) INTO plural_exists;

  IF singular_exists AND NOT plural_exists THEN
    ALTER TABLE daily_operation_logs RENAME TO daily_operations_logs;
  ELSIF singular_exists AND plural_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM daily_operations_logs' INTO plural_count;

    IF plural_count = 0 THEN
      INSERT INTO daily_operations_logs (
        id,
        brewery_id,
        log_date,
        operation_type,
        quantity,
        unit,
        batch_id,
        inventory_id,
        ttb_reportable,
        remarks,
        logged_by,
        provenance_ip,
        provenance_user_agent,
        created_at
      )
      SELECT
        id,
        brewery_id,
        log_date,
        operation_type,
        quantity,
        unit,
        batch_id,
        inventory_id,
        ttb_reportable,
        remarks,
        logged_by,
        provenance_ip,
        provenance_user_agent,
        created_at
      FROM daily_operation_logs;
    END IF;
  END IF;
END $$;
