-- ENABLE RLS (Row Level Security) ON ALL TABLES
CREATE TABLE breweries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT,
  owner_id UUID REFERENCES auth.users(id)
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id),
  item_type TEXT CHECK (item_type IN ('Hops', 'Grain', 'Yeast', 'Adjunct')),
  name TEXT NOT NULL,
  current_stock DECIMAL NOT NULL,
  unit TEXT DEFAULT 'kg',
  reorder_point DECIMAL
);

CREATE TABLE tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id),
  name TEXT NOT NULL, -- e.g., "FV-01"
  capacity_bbl DECIMAL,
  current_batch_id UUID -- Null if empty
);

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id),
  recipe_name TEXT NOT NULL,
  status TEXT DEFAULT 'Fermenting', -- 'Mashing', 'Fermenting', 'Conditioning', 'Finished'
  og DECIMAL, -- Original Gravity
  fg DECIMAL  -- Final Gravity
);

CREATE TABLE sanitation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID REFERENCES tanks(id),
  user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  cleaned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE batch_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id),
  logger_id UUID REFERENCES auth.users(id),
  temperature DECIMAL,
  gravity DECIMAL,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
