# Ordered Migration Track

This directory is the canonical, clean-install migration path for BrewBrain.

Why this exists:
- The top-level `supabase/migrations/*.sql` files were created as feature patches over time.
- Several of those files overlap each other and do not form a reliable clean-install sequence.
- The ordered track keeps those legacy files preserved while giving dev, staging, CI, and fresh environments one explicit path.

Apply order:
1. `001_init_core_tables.sql`
2. `002_batch_and_tank_relations.sql`
3. `003_recipes_and_brewing_logs.sql`
4. `004_inventory_audit_degradation.sql`
5. `005_purchasing_suppliers.sql`
6. `006_monitoring_alerts.sql`
7. `007_reorder_alerts_and_triggers.sql`
8. `008_indexes_concurrent.sql`
9. `009_rls_and_policies.sql`
10. `010_rename_quantity_to_current_stock.sql`

Operational notes:
- `008_indexes_concurrent.sql` must run outside an explicit transaction.
- `010_rename_quantity_to_current_stock.sql` is a compatibility migration for legacy databases and intentionally does not drop old objects automatically.
- See `supabase/migrations/RECONCILIATION.md` for object mapping, rollout guidance, and verification queries.
