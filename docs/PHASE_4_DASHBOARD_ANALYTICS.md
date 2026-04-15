# Phase 4: Dashboard & Analytics — Aggregation Correctness Audit

**Priority:** MEDIUM — Derived views. No data mutation, but incorrect aggregation misleads business decisions.  
**Estimated Scope:** 12+ files, 4+ server actions, 8+ components, 2 pure logic libraries  
**Depends On:** Phase 1 (Vessels), Phase 2 (Batches), Phase 3 (Inventory) — all data sources must be verified first  
**Depended On By:** Phase 5 (Reports overlaps with dashboard KPIs)

---

## 4.1 Dashboard Page Audit

### File: `src/app/(app)/dashboard/page.tsx`

#### Page Configuration (L28–L31)
- [ ] **`force-dynamic`:** `export const dynamic = 'force-dynamic'` — no caching. Every page load fetches fresh data. Correct for a real-time dashboard.
- [ ] **`revalidate = 0` + `fetchCache = 'force-no-store'`:** Triple-ensures no stale data. Slightly redundant but safe.

#### Auth & Brewery Setup (L33–L45)
- [ ] **Auth Check:** Redirects to `/login` if no user. Standard.
- [ ] **Active Brewery:** `getActiveBrewery()` — if null, shows the initialization form (empty state). The dashboard is the landing page for new users.
- [ ] **Logger Call:** L43: `logger.info('Dashboard accessed...')` — confirms logging is active. Verify this doesn't include PII beyond email.
- [ ] **Trial Tier:** `searchParams.trial` — accepts a tier parameter. Verify this is only used for the `InitializeBreweryForm` and doesn't bypass subscription checks.

#### Data Fetching: `DashboardContent` (L74–L84)

```typescript
const [batchRes, tankRes, inventoryRes] = await Promise.all([
  supabase.from('batches').select('id, recipe_name, status, created_at, og, fg')
    .eq('brewery_id', breweryId).order('created_at', { ascending: false }),
  supabase.from('tanks').select('id, name, status, current_batch_id')
    .eq('brewery_id', breweryId),
  supabase.from('inventory').select('id, name, current_stock, reorder_point, unit, item_type')
    .eq('brewery_id', breweryId),
])
```

- [ ] **Parallel Fetching:** Three queries run in `Promise.all()`. Correct for performance.
- [ ] **Brewery Scope:** All three queries filter by `brewery_id`. Correct.
- [ ] **No Pagination on Dashboard:** All batches, tanks, and inventory items are fetched. For large breweries, this could be slow. Verify there's a practical upper limit (most breweries have <100 batches, <20 tanks, <200 inventory items).
- [ ] **Missing Readings Fetch for Gravity Trend:** The gravity trend sparkline needs `batch_readings`. Verify if there's a 4th fetch below this block for readings.
- [ ] **Error Handling:** What happens if one of the three queries fails? Does `Promise.all` reject and crash the page? Should use `Promise.allSettled` or individual error handling.

#### KPI Cards (verify computation logic)

- [ ] **Active Batches:** Count batches where `status IN ('fermenting', 'conditioning')`. Verify the filter.
- [ ] **Total Tanks:** Count all tanks. Or just tanks with specific statuses? Verify.
- [ ] **Low Stock Items:** Count inventory where `current_stock <= reorder_point`. Verify the comparison uses `<=` not `<`. Edge case: What if `reorder_point` is 0 or null?
- [ ] **Total Readings / Recent Activity:** Verify what metric is shown in the 4th KPI card.

#### Sections to Verify

**1. Onboarding Checklist (`OnboardingChecklist` component)**
- [ ] Visibility logic: When should it show? Only when some data is missing (0 batches, 0 tanks)?
- [ ] Dismiss behavior: Can the user hide it permanently?

**2. Reorder Alerts (`ReorderAlertsDashboard` component)**
- [ ] Data source: Fetches from `reorder_alerts` table or computes from inventory data?
- [ ] Tab grouping: By severity? By item type?
- [ ] Manual refresh button: Triggers re-fetch. Verify it works with `router.refresh()`.

**3. Production Table**
- [ ] Shows recent batches with tank assignment and reading count
- [ ] Verify join between batch and tank (via `tanks.current_batch_id`)
- [ ] Verify reading count is fetched or computed correctly

**4. Gravity Trend Sparkline**
- [ ] Uses `buildGravityTrend()` from `src/lib/gravity-trend.ts`
- [ ] Input: Last 14 readings for the most recent active batch? Or across all batches?
- [ ] Output: Array of 0–100% bar heights
- [ ] Verify: What if no readings exist? Empty sparkline or "-" placeholder.

**5. Low Stock Warnings**
- [ ] Shows inventory items below or at reorder point
- [ ] Links to inventory detail page for each item
- [ ] Verify: Items with `reorder_point = null` or `reorder_point = 0` — are they included?

**6. Quick Actions**
- [ ] Links to: Add Batch, Add Tank, View Inventory, View Reports
- [ ] Verify all navigations target correct routes

#### Empty State Handling
- [ ] **0 batches:** Production table shows empty state, KPI shows "0"
- [ ] **0 tanks:** Tank count shows "0", no errors
- [ ] **0 inventory:** Low stock section is empty, KPI shows "0"
- [ ] **0 readings:** Gravity trend shows placeholder
- [ ] **Deleted tank with batch still active:** Dashboard doesn't crash if a batch's assigned tank no longer exists

#### RealtimeRefresh
- [ ] L47: `<RealtimeRefresh table="batches" breweryId={brewery?.id || ''} />` — listens on batches table changes. Triggers page refresh on INSERT/UPDATE/DELETE.
- [ ] Verify: Should also listen on `tanks` and `inventory` tables for dashboard to be truly real-time. Currently only `batches`.

---

## 4.2 Analytics Page Audit

### File: `src/app/(app)/analytics/page.tsx`

- [ ] **Auth + Brewery Check:** Standard guards
- [ ] **KPIs:** Verify what 3 KPIs are displayed and how they're computed
- [ ] **Charts Container:** Uses `Suspense` for chart loading? Or client-side `useHasMounted`?

### BatchPerformanceChart

**File:** `src/components/analytics/BatchPerformanceChart.tsx`

- [ ] **Data Source:** `getBatchPerformance()` from `analytics-actions.ts`
- [ ] **Chart Type:** Recharts `BarChart` — Actual OG vs Target OG bars
- [ ] **Mash Efficiency:** Calculated as `(actualOG / targetOG) * 100`. Verify:
  - What if `targetOG` is null or 0? Division by zero risk.
  - What if `actualOG` is null? Skip that batch or show as 0?
- [ ] **Batch Limit:** Shows last 10 or 20 batches. Verify limit.
- [ ] **Dark Mode:** Verify `useTheme()` switches bar colors correctly
- [ ] **Empty State:** No batches → show "No data" placeholder, not a broken chart
- [ ] **ResponsiveContainer:** 100% width, min-height 300px

### InventoryTrendChart

**File:** `src/components/analytics/InventoryTrendChart.tsx`

- [ ] **Data Source:** `getInventoryTrends(days)` from `analytics-actions.ts`
- [ ] **Chart Type:** Recharts `AreaChart` — Production Usage vs Shrinkage/Waste over time
- [ ] **Time Window:** Default 90 days. Verify parameter.
- [ ] **Aggregation:** Groups `inventory_history` by day or week. Change types:
  - `recipe_usage` → production line
  - `waste` → shrinkage/waste line
  - `received` → additions (may or may not be on chart)
- [ ] **Null/Empty Data:** 0 history entries → empty chart or "No data"
- [ ] **Dark Mode:** Color palette switches

---

## 4.3 Analytics Actions Audit

### File: `src/app/actions/analytics-actions.ts`

#### Function: `getInventoryTrends(days?)`

- [ ] **Default days:** Verify default (90?)
- [ ] **Query:** Fetches `inventory_history` for brewery, last N days
- [ ] **Aggregation:** Groups by date and `change_type`. Computes totals per period.
- [ ] **In-Memory Reduction:** Aggregation happens in JavaScript, not SQL. Verify:
  - Performance with large datasets (>10,000 history entries)
  - Correctness of grouping logic
  - Handling of timezone-sensitive dates
- [ ] **Return Type:** Array of `{ date, usage, waste, additions }` or similar

#### Function: `getBatchPerformance()`

- [ ] **Query:** Joins `batches` → `recipes` for target OG. Verify join is correct.
- [ ] **Mash Efficiency:** `(actualOG / targetOG) * 100`. Verify formula.
- [ ] **Null Recipe:** If `recipe_id` is null (SET NULL from recipe delete), how is target OG obtained? From the recipe itself? If recipe is deleted, target OG is lost.
- [ ] **Batch Limit:** `limit(10)` or `limit(20)`. Verify.
- [ ] **Return Type:** `BatchPerformanceData[]` — verify interface matches chart expectations

---

## 4.4 Supplier Analytics Audit

### Route: `src/app/(app)/analytics/performance-trends/page.tsx`

- [ ] **Data Source:** `getSupplierTrends()` from `supplier-actions.ts`
- [ ] **Chart:** `PerformanceTrendChart` — multi-series line chart
- [ ] **Time Window:** Verify analysis period
- [ ] **Empty State:** No suppliers → appropriate message

### Route: `src/app/(app)/analytics/suppliers/[id]/page.tsx`

- [ ] **UUID Validation:** Verify supplier ID format validation
- [ ] **404 Handling:** Supplier doesn't exist → appropriate error
- [ ] **Brewery Scope:** RLS must prevent cross-brewery access

### Component: `src/components/SupplierScorecard.tsx`

- [ ] **Rating Dimensions:**
  - Quality Rating (1–5 stars)
  - Delivery Rating (1–5 stars)
  - Reliability Rating (1–5 stars)
  - Pricing Rating (1–5 stars)
- [ ] **Averages:** Computed from `supplier_ratings` table. Verify aggregation.
- [ ] **Visual:** Star display or numeric. Verify rendering.

### Component: `src/components/QualityAnalysisPanel.tsx`

- [ ] **Data Source:** `getSupplierQualityIssues()` from `supplier-actions.ts`
- [ ] **Breakdown:** Issues by category. Verify categories match domain.
- [ ] **Empty State:** No issues → positive message

### Server Actions: `src/app/actions/supplier-actions.ts`

- [ ] **`getSupplierAnalytics()`:** Fetch supplier overview stats. Verify brewery scope.
- [ ] **`getSupplierTrends()`:** Time-series supplier data. Verify aggregation.
- [ ] **`getSupplierQualityIssues()`:** Issue history. Verify filters.
- [ ] **Auth:** All actions require authenticated brewery context. Verify.

---

## 4.5 Charting Library Audit

All charts use **Recharts**. Common concerns:

- [ ] **SSR Safety:** All chart components MUST use `useHasMounted()` or equivalent to avoid rendering on server (Recharts uses browser APIs). Verify each chart component.
- [ ] **ResponsiveContainer:** All charts should wrap in `ResponsiveContainer width="100%" height={...}`. Verify:
  - Min heights: 300px for analytics, 250px for trends. Verify actual values.
  - No zero-height containers (causes invisible charts)
- [ ] **Dark Mode:** Color palette switches based on `useTheme()`. Verify:
  - Light mode: appropriate contrast colors
  - Dark mode: lighter/brighter colors against dark background
  - No hardcoded colors that break in opposite theme
- [ ] **Tooltip Formatting:** Custom tooltips format values correctly (numbers, percentages, dates). Verify.
- [ ] **Legend:** Charts with multiple series have legends. Verify labels are descriptive.
- [ ] **Empty Data Rendering:** When data arrays are empty, Recharts may render axes with no data, or throw. Verify each chart handles this with a placeholder.

---

## 4.6 ReorderAlertsDashboard Audit

### File: `src/components/ReorderAlertsDashboard.tsx`

- [ ] **Data Fetch:** Uses `getReorderAlerts()` or `getReorderAlertsSummary()` from `reorder-actions.ts`
- [ ] **Tab Structure:** Grouped by priority (info/warning/critical)? Or by item type?
- [ ] **Alert Count Badge:** Total alerts shown. Verify count.
- [ ] **Manual Refresh:** Button that re-fetches. Verify it calls `router.refresh()` or re-runs the data fetch.
- [ ] **Alert Acknowledgment:** Can alerts be acknowledged from the dashboard? If so, verify action.
- [ ] **Empty State:** "All stock levels healthy" or similar when no alerts

### Reorder Actions: `src/app/actions/reorder-actions.ts`

- [ ] **`checkAndCreateReorderAlert()`:** Triggered on stock changes. Verify trigger conditions.
- [ ] **`getReorderAlerts()`:** Fetches alerts for brewery. Verify sorting (most urgent first).
- [ ] **`getReorderAlertsSummary()`:** Aggregate counts by severity. Verify computation.
- [ ] **Deduplication:** Are duplicate alerts for the same item prevented? Verify.

---

## 4.7 ShrinkageDashboard Audit

### File: `src/components/ShrinkageDashboard.tsx`

- [ ] **Stats Display:** Shows shrinkage statistics:
  - Total loss (BBL or units)
  - Number of active alerts
  - Most affected items
- [ ] **Alert List:** Active shrinkage alerts with severity badges
- [ ] **Status Transitions:** Can update alert status from dashboard (unresolved → acknowledged → resolved)
- [ ] **Manual Refresh:** Re-fetches data
- [ ] **TTB Link:** Links to compliance page for TTB-reportable alerts

### Shrinkage Stats: `src/app/actions/shrinkage.ts`

- [ ] **`getShrinkageAlerts()`:** Fetches alerts ordered by date. Verify brewery scope.
- [ ] **`getShrinkageStats()`:** Aggregate statistics. Verify computation handles edge cases (0 alerts).

---

## 4.8 Gravity Trend Library Audit

### File: `src/lib/gravity-trend.ts`

#### Function: `buildGravityTrend(readings)`

- [ ] **Input:** Array of readings with `gravity` and `created_at`
- [ ] **Processing:**
  1. Takes last 14 readings
  2. Normalizes gravity values to 0–100% scale
  3. Returns array of bar heights for sparkline
- [ ] **Normalization Formula:** `(gravity - minGravity) / (maxGravity - minGravity) * 100`
  - What if all gravities are identical (max == min)? Division by zero → all bars 50%?
  - What if only 1 reading? Single bar at 50% or 100%?
- [ ] **Null Gravities:** Readings with null gravity should be filtered out before normalization
- [ ] **Sort Order:** Readings should be sorted ascending (oldest first) for left-to-right display
- [ ] **Return Type:** `number[]` (array of heights 0–100)

---

## 4.9 Tests — Existing & Missing

### Existing Tests

| Test File | Coverage | Run Command |
|-----------|----------|-------------|
| `__tests__/components/analytics-charts.test.tsx` | Chart card sizing, ResponsiveContainer | `npm run test -- __tests__/components/analytics-charts.test.tsx` |
| `__tests__/lib/gravity-trend.test.ts` | `buildGravityTrend()` logic | `npm run test -- __tests__/lib/gravity-trend.test.ts` |
| `__tests__/lib/reorder.test.ts` | Reorder classification logic | `npm run test -- __tests__/lib/reorder.test.ts` |

### Missing Tests to Write

**1. `__tests__/components/dashboard-kpis.test.tsx`**
```
Test cases:
- Renders correct active batch count (fermenting + conditioning)
- Renders correct total tank count
- Renders correct low stock count (current_stock <= reorder_point)
- Handles 0 items for all KPIs without error
- Handles null reorder_point in low stock calculation
```

**2. `__tests__/api/analytics-actions.test.ts`**
```
Test cases:
- getInventoryTrends: aggregates by change_type correctly
- getInventoryTrends: handles empty history (returns empty array)
- getInventoryTrends: respects days parameter
- getBatchPerformance: joins batch to recipe for target OG
- getBatchPerformance: handles null targetOG (no division by zero)
- getBatchPerformance: handles null actualOG
- getBatchPerformance: limits to 10/20 recent batches
```

**3. `__tests__/components/reorder-alerts-dashboard.test.tsx`**
```
Test cases:
- Renders alerts grouped by priority
- Shows empty state when no alerts
- Manual refresh triggers re-fetch
- Alert count badge shows correct total
```

**4. `__tests__/components/shrinkage-dashboard.test.tsx`**
```
Test cases:
- Renders shrinkage statistics
- Shows active alerts with severity badges
- Status transition updates alert
- Empty state renders correctly
```

**5. `__tests__/api/supplier-actions.test.ts`**
```
Test cases:
- getSupplierAnalytics: returns supplier stats with brewery scope
- getSupplierTrends: aggregates over time period
- getSupplierQualityIssues: filters by supplier ID
```

---

## 4.10 Verification Commands

```bash
# 1. Run existing analytics/dashboard tests
npm run test -- __tests__/components/analytics-charts.test.tsx
npm run test -- __tests__/lib/gravity-trend.test.ts
npm run test -- __tests__/lib/reorder.test.ts

# 2. Lint
npm run lint

# 3. Type-check
npm run build

# 4. After writing new tests
npm run test -- __tests__/components/dashboard-kpis.test.tsx
npm run test -- __tests__/api/analytics-actions.test.ts
npm run test -- __tests__/components/reorder-alerts-dashboard.test.tsx
npm run test -- __tests__/components/shrinkage-dashboard.test.tsx
```

---

## 4.11 Pre-Identified Issues

| # | Issue | Severity | File | Line | Action Required |
|---|-------|----------|------|------|----------------|
| 4.1-A | Dashboard only subscribes to `batches` table — misses tank/inventory changes | Low | `dashboard/page.tsx` | L47 | Consider adding `tanks` and `inventory` subscriptions |
| 4.1-B | Dashboard fetches ALL batches/tanks/inventory no pagination — slow for large data | Low | `dashboard/page.tsx` | L74–L84 | Add limits or pagination for large breweries |
| 4.1-C | `getBatchPerformance()` division by zero if `targetOG` is null/0 | Medium | `analytics-actions.ts` | — | Add null guard in efficiency calculation |
| 4.1-D | `getInventoryTrends()` aggregates in-memory not SQL — performance concern | Low | `analytics-actions.ts` | — | Consider SQL aggregation for scale |
| 4.1-E | No dedicated dashboard tests exist | Medium | — | — | Write KPI computation tests |
| 4.1-F | `Promise.all` in dashboard may crash page if one query fails | Medium | `dashboard/page.tsx` | L74 | Consider `Promise.allSettled` or error boundaries |

---

## 4.12 Sign-Off Checklist

- [ ] All existing analytics tests pass
- [ ] Dashboard data fetching verified (parallel, brewery-scoped, error-handled)
- [ ] KPI computations verified (active batches, tanks, low stock, readings)
- [ ] Gravity trend sparkline logic verified (normalization, edge cases)
- [ ] BatchPerformanceChart verified (data source, formula, null handling)
- [ ] InventoryTrendChart verified (aggregation, time window, grouping)
- [ ] Supplier analytics verified (scorecard, trends, quality issues)
- [ ] ReorderAlertsDashboard verified (fetch, grouping, refresh)
- [ ] ShrinkageDashboard verified (stats, alerts, transitions)
- [ ] Charting library patterns verified (SSR safety, dark mode, empty state)
- [ ] Empty state handling verified for all dashboard/analytics sections
- [ ] New tests written and passing
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
