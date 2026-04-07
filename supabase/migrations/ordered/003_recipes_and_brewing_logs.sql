-- 003: Recipe management and brew-day logging.

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  style TEXT,
  target_og DECIMAL,
  target_fg DECIMAL,
  target_ibu DECIMAL,
  target_abv DECIMAL,
  batch_size_bbls DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  ingredient_type TEXT CHECK (ingredient_type IN ('grain', 'hop', 'yeast', 'adjunct', 'water_treatment')) NOT NULL,
  amount DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  timing TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS batch_brewing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE NOT NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  log_type TEXT CHECK (log_type IN ('brew_day', 'condition_check', 'packaging')) NOT NULL,
  mashing_ph DECIMAL,
  boil_off_rate_pct DECIMAL,
  water_chemistry_notes TEXT,
  actual_ibu_calculated DECIMAL,
  logged_by UUID REFERENCES auth.users(id),
  provenance_ip TEXT,
  provenance_user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS recipe_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_batches_recipe'
      AND conrelid = 'batches'::regclass
  ) THEN
    ALTER TABLE batches
      ADD CONSTRAINT fk_batches_recipe
      FOREIGN KEY (recipe_id)
      REFERENCES recipes(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

ALTER TABLE batches VALIDATE CONSTRAINT fk_batches_recipe;

CREATE INDEX IF NOT EXISTS idx_recipes_brewery_id ON recipes(brewery_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_inventory_item_id ON recipe_ingredients(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_batch_brewing_logs_batch_id ON batch_brewing_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_brewing_logs_brewery_id ON batch_brewing_logs(brewery_id);
CREATE INDEX IF NOT EXISTS idx_batches_recipe_id ON batches(recipe_id);
