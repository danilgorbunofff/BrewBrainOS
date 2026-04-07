# Database Migrations

This folder contains SQL migrations for the BrewBrain database.

## How to Apply Migrations

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Open the migration file (e.g., `add_degradation_columns.sql`)
5. Copy all the SQL code
6. Paste it into the query window in Supabase
7. Click **Run**

## Available Migrations

### `add_degradation_columns.sql`
Adds ingredient degradation tracking columns to the inventory table, including:
- Hop HSI (Hop Storage Index) tracking
- Grain moisture content tracking
- PPG (Points Per Pound Per Gallon) tracking
- Storage condition monitoring
- Audit logs for degradation changes

**Status**: Required for the Degradation Metrics feature

---

## Future Migrations

All new schema changes will be documented here as `.sql` files.
