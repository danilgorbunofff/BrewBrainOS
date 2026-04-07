# Supabase Migration Reconciliation

## Strategy

This repository now has two migration tracks:

- `supabase/migrations/*.sql`: legacy feature migrations preserved as historical artifacts.
- `supabase/migrations/ordered/*.sql`: the canonical clean-install and rollout sequence derived from `supabase/schema.sql` plus the preserved feature patches.

The legacy top-level files are intentionally preserved, but they are not a safe chronological bootstrap path by themselves.

## Legacy Mapping

| Legacy file | Canonical ordered file(s) | Notes |
| --- | --- | --- |
| `add_degradation_columns.sql` | `004_inventory_audit_degradation.sql` | Canonical file keeps the same columns and degradation log table, with safer backfill/default handling. |
| `add_shrinkage_alerts.sql` | `004_inventory_audit_degradation.sql` | Folded into the inventory audit phase because the tables are tightly coupled to stock history. |
| `add_supplier_tracking.sql` | `005_purchasing_suppliers.sql` | Preserved, but canonical file aligns constraints and indexes with the current schema dump. |
| `add_process_optimization.sql` | `003_recipes_and_brewing_logs.sql` | Canonical file avoids enum types and adds the `batches.recipe_id` link explicitly. |
| `add_batch_monitoring.sql` | `006_monitoring_alerts.sql` | Canonical file keeps batch reading extensions, yeast logs, and fermentation alerts together. |
| `20260407000000_add_batch_audit_trail.sql` | `006_monitoring_alerts.sql` | Provenance columns are folded into the canonical monitoring phase. |
| `20260407103000_add_batch_reading_external_id.sql` | `006_monitoring_alerts.sql`, `008_indexes_concurrent.sql` | Column addition stays in monitoring; the unique partial index moves to the concurrent-index phase. |
| `20260407120000_create_webhook_events.sql` | `001_init_core_tables.sql` | Billing idempotency support is part of the canonical bootstrap because `subscriptions` already lives there. |
| `add_reorder_alerts.sql` | `007_reorder_alerts_and_triggers.sql`, `008_indexes_concurrent.sql` | Canonical path uses trigger functions and a partial unique index for active alerts only. |
| `add_compliance_logs.sql` | `006_monitoring_alerts.sql`, `010_rename_quantity_to_current_stock.sql` | Canonical path standardizes on `daily_operations_logs`; compatibility file handles old singular naming. |
| `add_iot_webhook_token.sql` | `001_init_core_tables.sql`, `002_batch_and_tank_relations.sql` | Canonical bootstrap now includes the token column and index. |
| `fix_inventory_column_name.sql` | `010_rename_quantity_to_current_stock.sql` | Replaced by a non-destructive compatibility migration; legacy file is not safe on a fresh database. |

## Reconciliation Findings

- `schema.sql` previously omitted entire feature areas that already had legacy migrations: reorder automation, supplier fields on inventory, billing webhook idempotency, the IoT webhook token, and the `batches.recipe_id` relationship.
- `schema.sql` and `add_compliance_logs.sql` disagreed on the compliance table name: `daily_operation_logs` vs `daily_operations_logs`.
- `fix_inventory_column_name.sql` assumes a legacy `inventory.quantity` column exists and is therefore not safe on a clean install.
- Several production-facing indexes are safer to build concurrently during rollout, so they are isolated in `008_indexes_concurrent.sql`.

## Risk Flags

- Destructive cleanup is intentionally deferred.
  - `010_rename_quantity_to_current_stock.sql` backfills `current_stock` from `quantity` when needed, but does not auto-drop `quantity`.
  - If a legacy `daily_operation_logs` table exists, the canonical path renames or copies it forward without auto-dropping the old table in the merge case.
- `008_indexes_concurrent.sql` must run outside an explicit transaction.
- If historical duplicates already exist in `batch_readings.external_id` or active `reorder_alerts`, resolve them before applying the concurrent unique indexes.

## Verification Queries

Run these against dev before promoting to staging:

```sql
-- Duplicate external IDs that would block the unique partial index
SELECT external_id, COUNT(*)
FROM batch_readings
WHERE external_id IS NOT NULL
GROUP BY external_id
HAVING COUNT(*) > 1;

-- Duplicate active reorder alerts that would block the partial unique index
SELECT brewery_id, inventory_item_id, alert_type, COUNT(*)
FROM reorder_alerts
WHERE status IN ('open', 'acknowledged')
GROUP BY brewery_id, inventory_item_id, alert_type
HAVING COUNT(*) > 1;

-- Rows that would fail the current_stock compatibility backfill assumption
SELECT id
FROM inventory
WHERE current_stock IS NULL AND quantity IS NULL;

-- Foreign key orphan check for recipe links
SELECT b.id, b.recipe_id
FROM batches b
LEFT JOIN recipes r ON r.id = b.recipe_id
WHERE b.recipe_id IS NOT NULL AND r.id IS NULL;
```

## Rollout Sequence

1. Back up production.
2. Apply `001` through `007` on dev.
3. Run the verification queries above.
4. Apply `008_indexes_concurrent.sql` separately.
5. Apply `009_rls_and_policies.sql` after data shape is verified.
6. Apply `010_rename_quantity_to_current_stock.sql` if the database has legacy inventory/compliance objects.
7. Repeat on staging.
8. Promote to production with the same order, monitoring index build time and constraint validation time.

## CI

The repository includes a canonical migration helper script and optional CI hook for the ordered track.

- Local: set `SUPABASE_DB_URL` and run `npm run db:migrate:ordered`.
- CI: set the `SUPABASE_MIGRATION_DB_URL` repository secret to enable the gated ordered-migration validation step in `.github/workflows/ci.yml`.
