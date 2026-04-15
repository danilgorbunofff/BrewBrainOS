# Phase 3: Inventory — Degradation, Shrinkage & Data Audit

**Priority:** HIGH — Complex domain logic. Degradation calculations, shrinkage anomaly detection, TTB compliance integration, supplier tracking.  
**Estimated Scope:** 20+ files, 12+ server actions, 8+ components, 3 pure logic libraries, 1 import pipeline  
**Depends On:** Phase 1 (schema patterns), Phase 2 (batch linkage to inventory_history)  
**Depended On By:** Phase 4 (Dashboard — reorder/shrinkage alerts), Phase 5 (Reports — TTB shrinkage)

---

## 3.1 Schema & RLS Verification

### Files to Audit
- `supabase/schema.sql` — `inventory`, `inventory_history`, `degradation_logs`, `shrinkage_alerts`, `shrinkage_baselines`, `reorder_alerts`, `reorder_point_history`, `suppliers` tables
- `src/types/database.ts` — `InventoryItem`, `DegradationMetrics`, `DegradationLog`, `InventoryHistory`, `ShrinkageAlert`, `ShrinkageBaseline`, `Supplier`, related types

### FK & Cascade Checklist

- [ ] `inventory.brewery_id → breweries(id) ON DELETE CASCADE`
- [ ] `inventory.supplier_id → suppliers(id) ON DELETE SET NULL` (inventory survives supplier deletion)
- [ ] `inventory_history.inventory_id → inventory(id) ON DELETE CASCADE`
- [ ] `inventory_history.batch_id → batches(id) ON DELETE SET NULL` (history survives batch deletion)
- [ ] `degradation_logs.inventory_id → inventory(id)` — verify CASCADE behavior
- [ ] `shrinkage_alerts.inventory_id → inventory(id) ON DELETE CASCADE`
- [ ] `shrinkage_baselines.inventory_id → inventory(id) ON DELETE CASCADE` — verify UNIQUE constraint (1 baseline per item)
- [ ] `reorder_alerts.inventory_item_id → inventory(id) ON DELETE CASCADE`
- [ ] `reorder_point_history.inventory_item_id → inventory(id) ON DELETE CASCADE`

### RLS Policies
- [ ] `inventory` → "Owner manages inventory"
- [ ] `inventory_history` → "Owner manages inventory history"
- [ ] `degradation_logs` → "Owner manages degradation logs"
- [ ] `shrinkage_alerts` → "Owner manages shrinkage alerts"
- [ ] `shrinkage_baselines` → "Owner manages shrinkage baselines"
- [ ] `reorder_alerts` → "Owner manages reorder alerts"
- [ ] `reorder_point_history` → "Owner manages reorder point history"

### DB Triggers
- [ ] `reorder_alerts_updated_at_trigger` — BEFORE UPDATE: Sets `updated_at` timestamp. Verify trigger function `update_reorder_alerts_updated_at()` exists and works.
- [ ] `inventory_reorder_point_change_trigger` — AFTER UPDATE on `inventory`: Logs reorder point changes to `reorder_point_history`. Verify trigger function `log_reorder_point_change()` exists. Verify it only fires when `reorder_point` actually changes (not on every update).

### Type Validation
- [ ] **`InventoryType`:** `'Hops' | 'Grain' | 'Yeast' | 'Adjunct' | 'Packaging'` — verify all UI dropdowns match. Note: `addInventoryItem()` uses lowercase `'hop' | 'grain' | 'yeast' | 'adjunct' | 'packaging'` internally and maps via `typeMap` (L63–L69 in `inventory/actions.ts`). Verify mapping is complete and consistent.
- [ ] **`StorageCondition`:** `'cool_dry' | 'cool_humid' | 'room_temp' | 'warm'` — verify all UI selectors and degradation calculators use exactly these values.
- [ ] **`DegradationChangeReason`:** `'auto_calc' | 'manual_input' | 'storage_change' | 'quality_test'` — verify all server actions use valid values.
- [ ] **`ShrinkageAlertType`:** 5 types — verify detection functions return only these types.
- [ ] **`ShrinkageAlertStatus`:** 5 statuses — verify UI transitions are correct: `unresolved → acknowledged → investigating → resolved | false_positive`

---

## 3.2 Degradation Calculation Audit — CRITICAL

### File: `src/lib/degradation.ts`

This is the core domain logic for ingredient quality tracking. Every formula must be verified.

#### Function: `calculateHSI(hsiInitial, receivedDate, storageCondition, monthlyLossRate?)`

- [ ] **Formula Verification:**
  $$HSI_{current} = HSI_{initial} \times (1 - monthlyLossRate \times months \times conditionMultiplier)$$
- [ ] **Default `monthlyLossRate`:** 0.0015 (0.15% per month). Verify this is realistic for hop alpha acids.
- [ ] **Storage Condition Multipliers:**
  | Condition | Multiplier | Meaning |
  |-----------|-----------|---------|
  | `cool_dry` | 1.0 | Baseline |
  | `cool_humid` | 1.3 | 30% faster |
  | `room_temp` | 1.8 | 80% faster |
  | `warm` | 2.5 | 150% faster |
  
  Verify these multipliers are applied correctly in the formula.
- [ ] **Months Calculation:** Verify `months` is calculated as `(now - receivedDate) / 30.44` (average days per month). Edge cases:
  - `receivedDate` in the future → negative months → HSI above initial? Should clamp to 0 months.
  - `receivedDate` is today → 0 months → HSI equals initial. Correct.
- [ ] **Floor at 0:** Verify HSI never goes negative. Clamp to `Math.max(0, result)`.
- [ ] **Ceiling at initial:** If formula yields value > initial due to floating point, clamp to initial.
- [ ] **Null handling:** What if `hsiInitial` is null? Return null or 0?

#### Function: `calculateGrainMoisture(moistureInitial, receivedDate, storageCondition, currentMeasuredMoisture?)`

- [ ] **Manual Override:** If `currentMeasuredMoisture` is provided, return it immediately. **CRITICAL CHECK per repo memory:** This function MUST derive from `grain_moisture_initial` for automatic calculations, NOT from `grain_moisture_current`. The `grain_moisture_current` column should only be updated by this function's output or explicit manual measurement.
- [ ] **Daily Change Rates:**
  | Condition | Rate | Direction |
  |-----------|------|-----------|
  | `cool_dry` | -0.02 | Dehydrates slowly |
  | `cool_humid` | +0.01 | Absorbs slowly |
  | `room_temp` | +0.03 | Absorbs moderately |
  | `warm` | +0.05 | Absorbs rapidly |
  
  Verify these rates and directions.
- [ ] **Days Calculation:** Verify `days = (now - receivedDate) / (1000*60*60*24)`. Same future-date edge case.
- [ ] **Optimal Range:** 8–12% moisture. The function itself shouldn't enforce this (that's `getDegradationHealthStatus()`), but verify the return value is unbounded.
- [ ] **Null handling:** What if `moistureInitial` is null? Return null.

#### Function: `calculatePPG(ppgInitial, hsiLossPct, grainMoistureLoss)`

- [ ] **HSI Impact:** ~0.3% PPG loss per 1% HSI loss. Verify coefficient.
- [ ] **Moisture Impact:**
  - Under 7% (too dry): -0.2 PPG per % below 8%. Verify threshold and rate.
  - Over 13% (too wet): -0.5 PPG per % above 13%. Verify threshold and rate.
- [ ] **Floor:** Never below 10% of original PPG. Verify `Math.max(ppgInitial * 0.1, result)`.
- [ ] **Null handling:** If any input is null, verify return behavior (null or skip calculation).

#### Function: `getDegradationHealthStatus(hsi?, grainMoisture?, ppgLossPct?)`

- [ ] **Scoring System:** Accumulate "issues" based on thresholds. Verify exact scoring:
  - HSI <75: +1 issue
  - HSI <50: +1 more (total +2 for <50)
  - HSI <30: +1 more (total +3 for <30)
  - Moisture >14% or <7%: +1
  - Moisture >16% or <5%: +1 more
  - PPG loss >10%: +1
  - PPG loss >25%: +1 more
- [ ] **Result Mapping:**
  - 0 issues → `'fresh'`
  - 1–2 issues → `'degraded'`
  - 3+ issues → `'critical'`
- [ ] **All Null Inputs:** When all metrics are null, should return `'fresh'` (no evidence of degradation).

#### Function: `generateDegradationAlerts(metrics)`

- [ ] **Thresholds Consistency:** Must align with `getDegradationHealthStatus()` thresholds:
  | Metric | Warning | Critical |
  |--------|---------|----------|
  | HSI | <60% | <30% (70%+ IBU reduction) |
  | Grain Moisture | >13%, <6% | >15% (mold risk, disposal) |
  | PPG Loss | >15% | >30% |
  
  Verify these match the code.
- [ ] **Alert Message Quality:** Messages should be actionable (e.g., "HSI has dropped below 30%. Consider replacing hops — IBU reduction exceeds 70%.").
- [ ] **Item Type Awareness:** Alerts should only fire for relevant types (HSI for Hops, moisture for Grain). Verify the function checks `item_type` correctly.
- [ ] **Return Type:** `Array<{ level: 'warning' | 'critical'; message: string }>`

#### Function: `recalculateDegradationMetrics(item)`

- [ ] **Derives from `_initial` values:** Must call `calculateHSI(item.hsi_initial, ...)`, `calculateGrainMoisture(item.grain_moisture_initial, ...)`, NOT from `_current` values.
- [ ] **Returns new metrics:** `{ hsi_current, grain_moisture_current, ppg_current, hsi_loss_pct, moisture_loss_pct, ppg_loss_pct }`
- [ ] **Does NOT mutate input:** Pure function, no side effects.

---

## 3.3 Shrinkage Detection Audit

### File: `src/lib/shrinkage.ts`

- [ ] **`detectUnusualSingleLoss(history, current_stock, expected_stock, baseline)`**
  - Z-score calculation: $Z = \frac{loss - mean}{std\_dev}$
  - Threshold: |Z| > 2.0 flags anomaly
  - Verify: What if `std_dev` is 0 (no variance)? Division by zero risk.
  - Verify: What if baseline doesn't exist yet (new item)?

- [ ] **`detectPatternDegradation(history, lookback_days?)`**
  - 30-day window analysis
  - Coefficient of variation <0.5 indicates consistent loss pattern
  - Verify: Needs enough data points. What minimum samples are required?
  - Verify: Returns `'pattern_degradation'` type

- [ ] **`detectSuddenSpike(history, baseline)`**
  - Compares recent loss against baseline threshold
  - Verify: What constitutes "sudden"? Multiple readings or single?
  - Verify: Returns `'sudden_spike'` type

- [ ] **`detectHighVariance(history, baseline)`**
  - Detects unstable/volatile stock levels
  - Verify: Uses variance or standard deviation comparison
  - Verify: Returns `'high_variance'` type

- [ ] **`calculateShrinkageBaseline(inventory_history)`**
  - 90-day analysis window
  - Computes: `average_monthly_loss`, `monthly_loss_std_dev`, `median_loss_percentage`
  - Computes: `loss_threshold_warning`, `loss_threshold_critical`
  - Verify: What if <5 data points in 90 days? Insufficient for meaningful baseline.

### File: `src/app/actions/shrinkage.ts`

- [ ] **`recordInventoryChange(inventory_id, previous_stock, current_stock, change_type?, reason?, batch_id?)`**
  - Creates `inventory_history` entry
  - Triggers `recalculateShrinkageBaseline(inventory_id)` — verify this is called
  - Triggers `detectAndCreateShrinkageAlert(inventory_id)` — verify this is called
  - Checks reorder point — verify trigger condition
  - Verify: All operations scoped to brewery

- [ ] **`recalculateShrinkageBaseline(inventory_id)`**
  - Fetches last 90 days of `inventory_history`
  - Calls `calculateShrinkageBaseline()` from pure logic module
  - Upserts into `shrinkage_baselines` table
  - Verify: UPSERT behavior (insert or update?) — does it use `.upsert()` or check existence first?

- [ ] **`detectAndCreateShrinkageAlert(inventory_id)`**
  - Fetches baseline + recent history
  - Runs all anomaly detectors
  - Creates `shrinkage_alerts` for detected anomalies
  - Verify: Does it deduplicate against existing unresolved alerts?
  - Verify: Confidence score calculation

- [ ] **`updateShrinkageAlert(alertId, status, notes?, assignedTo?)`**
  - Status transitions: `unresolved → acknowledged → investigating → resolved | false_positive`
  - Verify: Are invalid transitions prevented (e.g., `resolved → unresolved`)?

---

## 3.4 Server Actions Audit — Inventory CRUD

### File: `src/app/(app)/inventory/actions.ts`

#### Action: `addInventoryItem(formData)` (L22–L89)

- [ ] **Type Mapping Issue:** L39–L47: Uses lowercase `itemType` from form (`'hop'`, `'grain'`) but the DB stores capitalized (`'Hops'`, `'Grain'`). The `typeMap` (L63–L69) handles this. Verify mapping is complete:
  - `hop` → `Hops` ✓
  - `grain` → `Grain` ✓
  - `yeast` → `Yeast` ✓
  - `adjunct` → `Adjunct` ✓
  - `packaging` → `Packaging` ✓
  
- [ ] **Degradation Conditional Logic:** L39–L47:
  - `hsi_initial` only for `itemType === 'hop'`
  - `grain_moisture_initial` only for `itemType === 'grain'`
  - `ppg_initial` only for `itemType === 'grain'`
  - `degradation_tracked` set to `true` only for `'hop'` or `'grain'`
  - **Question:** What about hops that also have moisture data? Or grains with HSI? The current logic is exclusive. Verify this is correct for the domain.

- [ ] **Initial = Current:** L41–L42: `hsi_current` is set to `hsi_initial` value at creation time. Same for grain moisture and PPG. Correct — at creation, current equals initial.

- [ ] **Schema Validation:** Uses `inventorySchema`. Verify the schema matches form fields and includes degradation fields.

- [ ] **Missing `degradation_tracked` in insert:** L71–L84: The insert payload uses spread operator for degradation fields. Verify `degradation_tracked` is included in the insert data.

- [ ] **`hsi_loss_rate` default:** The `DegradationMetrics` interface requires `hsi_loss_rate` but the insert may not include it. Verify the DB has a default value or the insert sets it.

#### Action: `deleteInventoryItem(formData)` (L91–L108)

- [ ] **Simple Delete:** Direct delete with `brewery_id` scoping. FK cascades handle `inventory_history`, `shrinkage_alerts`, `shrinkage_baselines`, `degradation_logs`, `reorder_alerts`.
- [ ] **No Manual Cascade:** Unlike `deleteTank()`, no manual cleanup. Correct — all FKs are CASCADE.

#### Action: `updateStock(formData)` (L110–L143)

- [ ] **Stock Update Flow:**
  1. Updates `current_stock` directly
  2. Re-fetches item to check `reorder_point`
  3. If `newStock <= reorder_point`, sends push notification
- [ ] **Missing Inventory History:** This action updates stock but does **NOT** create an `inventory_history` entry. Compare with `InventoryAdjustmentDialog` which calls `recordInventoryChange()`. Is `updateStock` used elsewhere and should it also create history?
- [ ] **Negative Stock:** No check prevents stock from going negative. Verify if negative stock is valid.

#### Action: `adjustInventoryStock(itemId, adjustment, reason)` (L149–L190)

- [ ] **Floor at 0:** L167: `Math.max(0, (item.current_stock || 0) + adjustment)` — prevents negative stock. Correct.
- [ ] **Missing Inventory History:** Same issue as `updateStock()` — does NOT create `inventory_history` entry. This is a data integrity gap — stock changes won't be tracked in the audit trail or shrinkage detection.
- [ ] **reason parameter unused:** L151: `reason` is accepted but never stored anywhere (no history entry). The `// eslint-disable-next-line @typescript-eslint/no-unused-vars` comment on the function confirms this.

#### Action: `updateDegradationMetrics(itemId, updates, reason)` (L196–L260)

- [ ] **Audit Trail:** Creates `degradation_logs` entry with before/after values. Good.
- [ ] **Alert Generation:** Calls `generateDegradationAlerts()` and potentially `sendInventoryAlert()`. Verify thresholds match.
- [ ] **Reason Enum:** Accepts `'manual_input' | 'storage_change' | 'quality_test'`. Verify all callers pass valid values.

#### Action: `updateStorageCondition(itemId, storageCondition)` 

- [ ] **Triggers Recalculation:** Changing storage condition should trigger degradation recalculation because multipliers change.
- [ ] **Validates Condition:** Verify `storageCondition` is validated against `StorageCondition` enum.

#### Action: `getDegradationHistory(itemId)`

- [ ] **Returns sorted logs:** Verify `order('created_at', { ascending: false })`
- [ ] **Brewery Scope:** Verify brewery-scoped fetch

#### Action: `recalculateAllDegradationMetrics()`

- [ ] **Batch Operation:** Fetches ALL items with `degradation_tracked=true` and recalculates.
- [ ] **Logging Threshold:** Only creates log entries when change >1%. Verify this threshold.
- [ ] **Cron Suitability:** Designed for daily cron job. Verify error handling doesn't abort on single-item failure.
- [ ] **Performance:** Could be slow for large inventories. Verify there's no timeout issue.

---

## 3.5 Component Logic Audit

### File: `src/components/InventoryTable.tsx`

- [ ] **Virtualization:** Uses `@tanstack/react-virtual` when row count >40. Verify threshold matches `BatchesTable`.
- [ ] **Category Tabs:** Tabs for `All`, `Hops`, `Grain`, `Yeast`, `Adjunct`, `Packaging`. Verify tab values match `InventoryType` enum.
- [ ] **Search/Filter:** Client-side filtering by item name. Case-insensitive? Verify.
- [ ] **Degradation Badges:** Each row shows health status badge (fresh/degraded/critical). Verify badge colors:
  - `fresh` → green
  - `degraded` → yellow/amber
  - `critical` → red
- [ ] **Stock Adjustment:** `+`/`-` buttons per row. Verify they open `InventoryAdjustmentDialog` or call adjustment action directly.
- [ ] **CSV Export:** Verify exports include degradation metrics (hsi_current, grain_moisture_current, ppg_current).
- [ ] **Delete Per-Item:** Verify delete uses confirmation dialog.

### File: `src/components/AddInventoryItemDialog.tsx`

- [ ] **Dialog Pattern:** Opens via Button trigger. Verify dialog wrapper uses `Dialog` from `src/components/ui`.
- [ ] **Item Type Selector:** Dropdown for `hop | grain | yeast | adjunct | packaging`. Verify lowercase mapping.
- [ ] **Conditional Fields:** When `hop` selected:
  - Show HSI Initial input
  - Show Storage Condition selector
  - Show Received Date input
  When `grain` selected:
  - Show Grain Moisture Initial input
  - Show PPG Initial input
  - Show Storage Condition selector
  - Show Received Date input
  For other types: Hide degradation fields
- [ ] **BluetoothScale Integration:** Verify the Bluetooth scale panel is conditionally rendered and functions correctly. Is Web Bluetooth API used? Only works in Chrome.
- [ ] **Form Validation:** All required fields validated before submission. Verify:
  - Name required
  - Item type required
  - Current stock required and numeric
  - Unit required
  - Reorder point optional but numeric if provided

### File: `src/components/InventoryAdjustmentDialog.tsx`

- [ ] **Calls `recordInventoryChange()`:** This is the correct action that creates audit trail (unlike `updateStock`/`adjustInventoryStock`). Verify.
- [ ] **Change Type Options:** `'stock_adjustment' | 'recipe_usage' | 'received' | 'waste' | 'other'`. Verify all options shown.
- [ ] **Reason Input:** Free text reason field. Verify it's passed to the action.
- [ ] **Previous/Current Stock Display:** Shows before and after values. Verify calculation is correct.

### File: `src/components/DegradationCard.tsx`

- [ ] **Metric Display:** Shows HSI, Grain Moisture, PPG with current values and trend indicators
- [ ] **Health Status Badge:** Uses `getDegradationHealthStatus()` — verify correct function call
- [ ] **Storage Condition Selector:** Inline selector to change condition. Calls `updateStorageCondition()`.
- [ ] **Alert Display:** Shows alerts from `generateDegradationAlerts()`. Verify rendering matches alert level (warning/critical).
- [ ] **Conditional Rendering:** Only shows relevant metrics per item type (HSI for Hops, moisture+PPG for Grain).

### File: `src/components/DegradationDetailsModal.tsx`

- [ ] **History Table:** Fetches and displays `degradation_logs` via `getDegradationHistory()`. Columns: date, hsi_before/after, moisture_before/after, ppg_before/after, reason, user.
- [ ] **Manual Editing:** Allows manual metric entry. Calls `updateDegradationMetrics()` with `reason: 'manual_input'`.
- [ ] **Degradation Rate Calculation:** Shows rate of change per month. Verify calculation.
- [ ] **Audit Trail Completeness:** Verify every change creates a log entry.

---

## 3.6 Inventory Detail Page Audit

### File: `src/app/(app)/inventory/[id]/page.tsx`

- [ ] **Client Component:** Uses `'use client'` — verify this is necessary (likely for interactive degradation card and adjustment dialogs)
- [ ] **Data Fetching:** Client-side fetch? Or server component with client children? Verify architecture.
- [ ] **Brewery Scope:** Item fetch must include `brewery_id` or rely on RLS
- [ ] **404 Handling:** What happens when item doesn't exist or wrong brewery?
- [ ] **DegradationCard Props:** Verify all required props are passed correctly
- [ ] **Supplier Info:** `InventorySupplierInfo` component. Verify supplier data is fetched.
- [ ] **Stock Adjustment:** Full adjustment flow available from detail page
- [ ] **Delete Item:** Available from detail page with confirmation

---

## 3.7 Import/Export Pipeline Audit

### File: `src/app/actions/import-actions.ts`

#### Function: `importInventory(data: Record<string, unknown>[])`

- [ ] **Required Fields:** `item_type`, `name`, `current_stock`, `unit`. Verify validation.
- [ ] **Type Coercion:** Numeric strings to numbers (`current_stock`, `reorder_point`, etc.). Verify `parseFloat`/`parseInt` handling.
- [ ] **InventoryType Validation:** Verify imported `item_type` matches `'Hops' | 'Grain' | 'Yeast' | 'Adjunct' | 'Packaging'`. Case-insensitive? What about lowercase from CSV?
- [ ] **Degradation Fields in Import:**
  - `degradation_tracked` auto-set for Hops/Grain. Verify.
  - `received_date`, `storage_condition`, `hsi_initial`, `grain_moisture_initial`, `ppg_initial` imported if present. Verify.
  - `hsi_current` = `hsi_initial` at import time. Verify.
- [ ] **Brewery Scope:** Imported items must get `brewery_id` from active brewery. Verify.
- [ ] **Duplicate Handling:** What if an item with the same name already exists? Insert duplicate or skip/update?
- [ ] **Batch Insert:** Verify items are inserted in batch (single query) or individually (multiple queries). Performance concern for large imports.
- [ ] **Column Mapping:** Verify CSV column headers map correctly to DB columns. Case sensitivity?

### CSV Export (ExportCSVButton in InventoryTable)

- [ ] **Exported Columns:** name, item_type, current_stock, unit, reorder_point, lot_number, expiration_date, hsi_current, grain_moisture_current, ppg_current
- [ ] **Null Handling:** Null values export as empty strings, not "null" text
- [ ] **Unicode:** Verify CSV handles special characters in item names

---

## 3.8 Cross-Feature Data Integrity

### Inventory ↔ Batches

- [ ] **`inventory_history.batch_id`:** Links stock changes to batch usage. FK is `SET NULL` on batch delete — history survives but loses batch reference. Verify display handles null batch_id.

### Inventory ↔ Reorder System

- [ ] **Trigger Chain:** Stock change at or below reorder_point → push notification + reorder alert creation
- [ ] **DB Trigger:** `inventory_reorder_point_change_trigger` logs reorder point changes. Verify it fires only on `reorder_point` column changes, not on every inventory update.
- [ ] **ReorderAlertsDashboard:** Verify it fetches alerts correctly and groups by priority

### Inventory ↔ Shrinkage Pipeline

- [ ] **End-to-End:** `recordInventoryChange()` → `inventory_history` INSERT → `recalculateShrinkageBaseline()` → `detectAndCreateShrinkageAlert()` → `shrinkage_alerts` INSERT
- [ ] **Verify all steps execute:** If one fails, do subsequent steps still run? Error isolation?

### Inventory ↔ Analytics

- [ ] **`getInventoryTrends(days)`:** Aggregates `inventory_history` by `change_type`. Verify correct grouping.

### Inventory ↔ TTB Compliance

- [ ] **Shrinkage alerts with `ttb_reportable=true`:** Feed into TTB continuity validation. Verify the flag is correctly set.
- [ ] **`ttb_remarks`:** Free text on shrinkage alerts. Used in compliance page. Verify rendering.

---

## 3.9 Tests — Existing & Missing

### Existing Tests

| Test File | Coverage Area | Run Command |
|-----------|---------------|-------------|
| `__tests__/lib/degradation.test.ts` | Pure degradation logic | `npm run test -- __tests__/lib/degradation.test.ts` |
| `__tests__/lib/shrinkage.test.ts` | Pure shrinkage logic | `npm run test -- __tests__/lib/shrinkage.test.ts` |
| `__tests__/lib/reorder.test.ts` | Reorder logic | `npm run test -- __tests__/lib/reorder.test.ts` |
| `__tests__/components/add-inventory-item-dialog.test.tsx` | Add dialog component | `npm run test -- __tests__/components/add-inventory-item-dialog.test.tsx` |
| `__tests__/components/degradation-card.test.tsx` | Degradation card component | `npm run test -- __tests__/components/degradation-card.test.tsx` |
| `__tests__/api/import-actions.test.ts` | CSV import actions | `npm run test -- __tests__/api/import-actions.test.ts` |

### Verify Existing Test Completeness

For `__tests__/lib/degradation.test.ts`:
- [ ] Tests `calculateHSI()` with all 4 storage conditions
- [ ] Tests `calculateHSI()` with edge cases (future date, 0 months, null initial)
- [ ] Tests `calculateGrainMoisture()` with and without manual override
- [ ] Tests `calculatePPG()` with HSI and moisture impacts
- [ ] Tests `getDegradationHealthStatus()` at each threshold boundary
- [ ] Tests `generateDegradationAlerts()` for each alert type
- [ ] Tests `recalculateDegradationMetrics()` derives from _initial only

For `__tests__/lib/shrinkage.test.ts`:
- [ ] Tests each of the 5 detection functions
- [ ] Tests `calculateShrinkageBaseline()` with sufficient and insufficient data
- [ ] Tests edge case: std_dev = 0 (division by zero in z-score)

### Missing Tests to Write

**1. `__tests__/api/inventory-actions.test.ts`**
```
Test cases:
- addInventoryItem: creates item with brewery_id
- addInventoryItem: sets degradation_tracked for hop/grain
- addInventoryItem: maps lowercase type to capitalized DB type
- addInventoryItem: sets hsi_current = hsi_initial at creation
- deleteInventoryItem: deletes with brewery scoping
- updateStock: updates stock, triggers reorder check
- updateStock: does NOT create inventory_history (known gap)
- adjustInventoryStock: floors stock at 0
- adjustInventoryStock: triggers reorder alert at threshold
- updateDegradationMetrics: creates degradation_log audit entry
- updateDegradationMetrics: triggers alert generation
- updateStorageCondition: triggers degradation recalculation
- recalculateAllDegradationMetrics: processes all tracked items
- recalculateAllDegradationMetrics: only logs changes >1%
```

**2. `__tests__/api/shrinkage-actions.test.ts`**
```
Test cases:
- recordInventoryChange: creates inventory_history entry
- recordInventoryChange: triggers baseline recalculation
- recordInventoryChange: triggers shrinkage detection
- recordInventoryChange: checks reorder point
- recalculateShrinkageBaseline: computes 90-day stats
- detectAndCreateShrinkageAlert: runs all anomaly detectors
- detectAndCreateShrinkageAlert: deduplicates against existing unresolved
- updateShrinkageAlert: transitions status correctly
- updateShrinkageAlert: prevents invalid transitions
```

**3. `__tests__/components/inventory-table.test.tsx`**
```
Test cases:
- Renders items with correct columns
- Tabs filter by item type
- Search filters by name (case-insensitive)
- Degradation badges show correct health status
- CSV export includes degradation metrics
- Virtualization activates above 40 rows
- Delete button shows confirmation dialog
- Stock adjustment buttons are accessible
```

**4. `__tests__/components/inventory-adjustment-dialog.test.tsx`**
```
Test cases:
- Opens dialog with current stock
- Shows change type selector
- Calls recordInventoryChange on submit
- Validates numeric input
- Shows previous and new stock values
```

---

## 3.10 Verification Commands

```bash
# 1. Run existing inventory/degradation/shrinkage tests
npm run test -- __tests__/lib/degradation.test.ts __tests__/lib/shrinkage.test.ts __tests__/lib/reorder.test.ts
npm run test -- __tests__/components/add-inventory-item-dialog.test.tsx __tests__/components/degradation-card.test.tsx
npm run test -- __tests__/api/import-actions.test.ts

# 2. Lint
npm run lint

# 3. Type-check
npm run build

# 4. After writing new tests
npm run test -- __tests__/api/inventory-actions.test.ts __tests__/api/shrinkage-actions.test.ts
npm run test -- __tests__/components/inventory-table.test.tsx __tests__/components/inventory-adjustment-dialog.test.tsx

# 5. Full coverage check
npm run test:coverage
```

---

## 3.11 Pre-Identified Issues

| # | Issue | Severity | File | Line | Action Required |
|---|-------|----------|------|------|----------------|
| 3.1-A | `updateStock()` does NOT create `inventory_history` entry — breaks audit trail | High | `inventory/actions.ts` | L110–L143 | Add `recordInventoryChange()` call |
| 3.1-B | `adjustInventoryStock()` does NOT create history entry, `reason` param is unused | High | `inventory/actions.ts` | L149–L190 | Add history creation, use reason param |
| 3.1-C | Type mapping uses lowercase `'hop'` but DB expects `'Hops'` — fragile mapping | Low | `inventory/actions.ts` | L39–L47, L63–L69 | Verify mapping is complete, consider enum |
| 3.1-D | `addInventoryItem()` may not set `hsi_loss_rate` default — required by DegradationMetrics | Medium | `inventory/actions.ts` | L71–L84 | Verify DB default or add to insert |
| 3.1-E | `calculateGrainMoisture()` manual override precedence must be verified per repo notes | Medium | `degradation.ts` | — | Verify `grain_moisture_initial` derivation |
| 3.1-F | Shrinkage z-score division by zero when std_dev = 0 | Medium | `shrinkage.ts` | — | Add guard for zero std_dev |
| 3.1-G | `recalculateAllDegradationMetrics()` could timeout on large inventories | Low | `inventory/actions.ts` | — | Add batch processing with limits |
| 3.1-H | CSV import may not handle lowercase item types (maps expect specific casing) | Low | `import-actions.ts` | — | Normalize casing in import |

---

## 3.12 Sign-Off Checklist

- [ ] All existing tests pass (degradation, shrinkage, reorder, components, import)
- [ ] Schema FK constraints verified for all 8+ inventory-related tables
- [ ] All RLS policies verified (7 tables)
- [ ] DB triggers verified (reorder_alerts_updated_at, reorder_point_change)
- [ ] Degradation formulas verified (HSI, grain moisture, PPG, health status, alerts)
- [ ] Shrinkage detection verified (5 anomaly detectors + baseline calculation)
- [ ] All 12+ server actions audited line-by-line
- [ ] All 8+ components audited for logic correctness
- [ ] Import/export pipeline verified
- [ ] Cross-feature integrity verified (Inventory↔Batches, ↔Reorder, ↔Shrinkage, ↔Analytics, ↔TTB)
- [ ] Pre-identified issues documented with severity
- [ ] New tests written and passing
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:coverage` meets thresholds
