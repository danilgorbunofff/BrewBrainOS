-- 009: Row-level security and policies.

ALTER TABLE breweries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanitation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_brewing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE degradation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shrinkage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shrinkage_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fermentation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_operations_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_point_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages brewery" ON breweries;
CREATE POLICY "Owner manages brewery" ON breweries
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner manages tanks" ON tanks;
CREATE POLICY "Owner manages tanks" ON tanks
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages batches" ON batches;
CREATE POLICY "Owner manages batches" ON batches
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages inventory" ON inventory;
CREATE POLICY "Owner manages inventory" ON inventory
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages sanitation logs" ON sanitation_logs;
CREATE POLICY "Owner manages sanitation logs" ON sanitation_logs
  FOR ALL USING (
    tank_id IN (
      SELECT t.id
      FROM tanks t
      JOIN breweries b ON b.id = t.brewery_id
      WHERE b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner manages batch readings" ON batch_readings;
CREATE POLICY "Owner manages batch readings" ON batch_readings
  FOR ALL USING (
    batch_id IN (
      SELECT b.id
      FROM batches b
      JOIN breweries br ON br.id = b.brewery_id
      WHERE br.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner manages subscriptions" ON subscriptions;
CREATE POLICY "Owner manages subscriptions" ON subscriptions
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages recipes" ON recipes;
CREATE POLICY "Owner manages recipes" ON recipes
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages recipe_ingredients" ON recipe_ingredients;
CREATE POLICY "Owner manages recipe_ingredients" ON recipe_ingredients
  FOR ALL USING (
    recipe_id IN (
      SELECT r.id
      FROM recipes r
      WHERE r.brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner manages batch_brewing_logs" ON batch_brewing_logs;
CREATE POLICY "Owner manages batch_brewing_logs" ON batch_brewing_logs
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages degradation logs" ON degradation_logs;
CREATE POLICY "Owner manages degradation logs" ON degradation_logs
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages inventory history" ON inventory_history;
CREATE POLICY "Owner manages inventory history" ON inventory_history
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages shrinkage alerts" ON shrinkage_alerts;
CREATE POLICY "Owner manages shrinkage alerts" ON shrinkage_alerts
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages shrinkage baselines" ON shrinkage_baselines;
CREATE POLICY "Owner manages shrinkage baselines" ON shrinkage_baselines
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages suppliers" ON suppliers;
CREATE POLICY "Owner manages suppliers" ON suppliers
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages purchase_orders" ON purchase_orders;
CREATE POLICY "Owner manages purchase_orders" ON purchase_orders
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages purchase_order_items" ON purchase_order_items;
CREATE POLICY "Owner manages purchase_order_items" ON purchase_order_items
  FOR ALL USING (
    purchase_order_id IN (
      SELECT po.id
      FROM purchase_orders po
      WHERE po.brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner manages supplier_ratings" ON supplier_ratings;
CREATE POLICY "Owner manages supplier_ratings" ON supplier_ratings
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages fermentation_alerts" ON fermentation_alerts;
CREATE POLICY "Owner manages fermentation_alerts" ON fermentation_alerts
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users manage own alert_preferences" ON alert_preferences;
CREATE POLICY "Users manage own alert_preferences" ON alert_preferences
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner manages yeast_logs" ON yeast_logs;
CREATE POLICY "Owner manages yeast_logs" ON yeast_logs
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users manage their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage their own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert feedback" ON feedback;
CREATE POLICY "Users can insert feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner manages daily_operations_logs" ON daily_operations_logs;
CREATE POLICY "Owner manages daily_operations_logs" ON daily_operations_logs
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages reorder alerts" ON reorder_alerts;
CREATE POLICY "Owner manages reorder alerts" ON reorder_alerts
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages reorder point history" ON reorder_point_history;
CREATE POLICY "Owner manages reorder point history" ON reorder_point_history
  FOR ALL USING (
    brewery_id IN (SELECT id FROM breweries WHERE owner_id = auth.uid())
  );
