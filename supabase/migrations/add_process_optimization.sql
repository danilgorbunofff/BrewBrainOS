-- Phase 1.4: Process Optimization Schema

CREATE TYPE recipe_ingredient_type AS ENUM (
  'grain',
  'hop',
  'yeast',
  'adjunct',
  'water_treatment'
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  style TEXT,
  target_og DECIMAL,
  target_fg DECIMAL,
  target_ibu DECIMAL,
  target_abv DECIMAL,
  batch_size_bbls DECIMAL NOT NULL DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view recipes for their brewery" ON recipes
  FOR SELECT USING (brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert recipes for their brewery" ON recipes
  FOR INSERT WITH CHECK (brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update recipes for their brewery" ON recipes
  FOR UPDATE USING (brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid()));
CREATE POLICY "Users can delete recipes for their brewery" ON recipes
  FOR DELETE USING (brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid()));

CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  ingredient_type recipe_ingredient_type NOT NULL,
  amount DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  timing TEXT, -- e.g. "60 min boil", "dry hop 3 days"
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage recipe ingredients via brewery" ON recipe_ingredients
  FOR ALL USING (recipe_id IN (SELECT id FROM recipes WHERE brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())));

CREATE TABLE batch_brewing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE,
  log_type TEXT CHECK (log_type IN ('brew_day', 'condition_check', 'packaging')) DEFAULT 'brew_day',
  mashing_ph DECIMAL,
  boil_off_rate_pct DECIMAL,
  water_chemistry_notes TEXT,
  actual_ibu_calculated DECIMAL,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE batch_brewing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage brew logs" ON batch_brewing_logs
  FOR ALL USING (brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid()));

-- Link recipes onto batches
ALTER TABLE batches
ADD COLUMN recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;
