-- BrewBrain OS — Canonical Schema
-- Run this in the Supabase SQL Editor to set up or reset the database.
-- All tables use `created_at` for timestamp consistency across the app.

-- BREWERIES
CREATE TABLE IF NOT EXISTS breweries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  license_number TEXT,
  owner_id   UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- TANKS
-- NOTE: column is `capacity` (NOT `capacity_bbl`) to match app code
-- NOTE: `status` column added to track fermenting/empty/cip states
CREATE TABLE IF NOT EXISTS tanks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id       UUID REFERENCES breweries(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  capacity         DECIMAL,              -- Volume in BBL (or chosen unit)
  status           TEXT DEFAULT 'empty', -- 'empty' | 'fermenting' | 'conditioning' | 'cip'
  current_batch_id UUID,                 -- FK to batches, set manually
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- BATCHES
-- NOTE: `created_at` added (was missing from original schema)
-- NOTE: status values are lowercase to match app code
CREATE TABLE IF NOT EXISTS batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id  UUID REFERENCES breweries(id) ON DELETE CASCADE,
  recipe_name TEXT NOT NULL,
  status      TEXT DEFAULT 'fermenting', -- 'fermenting' | 'conditioning' | 'packaging' | 'complete' | 'dumped'
  og          DECIMAL,
  fg          DECIMAL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add FK constraint for tanks.current_batch_id after both tables exist
ALTER TABLE tanks
  ADD CONSTRAINT fk_tanks_current_batch
  FOREIGN KEY (current_batch_id) REFERENCES batches(id)
  ON DELETE SET NULL;

-- INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id    UUID REFERENCES breweries(id) ON DELETE CASCADE,
  item_type     TEXT CHECK (item_type IN ('Hops', 'Grain', 'Yeast', 'Adjunct')),
  name          TEXT NOT NULL,
  current_stock DECIMAL NOT NULL DEFAULT 0,
  unit          TEXT DEFAULT 'kg',
  reorder_point DECIMAL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- SANITATION LOGS
CREATE TABLE IF NOT EXISTS sanitation_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id    UUID REFERENCES tanks(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id),
  notes      TEXT,
  cleaned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- BATCH READINGS (voice-logged sensor data)
-- NOTE: column is `created_at` (was `logged_at` in old schema) to match app code
CREATE TABLE IF NOT EXISTS batch_readings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID REFERENCES batches(id) ON DELETE CASCADE,
  logger_id   UUID REFERENCES auth.users(id),
  temperature DECIMAL,
  gravity     DECIMAL,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────
ALTER TABLE breweries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanitation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_readings  ENABLE ROW LEVEL SECURITY;

-- Breweries: owner can do anything
CREATE POLICY "Owner manages brewery" ON breweries
  FOR ALL USING (auth.uid() = owner_id);

-- Tanks: users who own the brewery can CRUD
CREATE POLICY "Owner manages tanks" ON tanks
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- Batches
CREATE POLICY "Owner manages batches" ON batches
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- Inventory
CREATE POLICY "Owner manages inventory" ON inventory
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

-- Sanitation logs: user must own the tank's brewery
CREATE POLICY "Owner manages sanitation logs" ON sanitation_logs
  FOR ALL USING (
    tank_id IN (
      SELECT t.id FROM tanks t
      JOIN breweries b ON b.id = t.brewery_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Batch readings: user must own the batch's brewery
CREATE POLICY "Owner manages batch readings" ON batch_readings
  FOR ALL USING (
    batch_id IN (
      SELECT b.id FROM batches b
      JOIN breweries br ON br.id = b.brewery_id
      WHERE br.owner_id = auth.uid()
    )
  );
