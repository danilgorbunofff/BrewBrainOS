# Phase 2: Batches — Full Pipeline Audit

**Priority:** HIGH — Central operational entity. Batches connect to Tanks, Readings, Alerts, IoT, Offline Sync, Analytics, and Reports.  
**Estimated Scope:** 18+ files, 8 server actions, 10+ components, 2 API routes, 1 pure logic library  
**Depends On:** Phase 1 (Vessels — Tank↔Batch linkage verified)  
**Depended On By:** Phase 4 (Dashboard), Phase 5 (Reports)

---

## 2.1 Schema, Types & RLS Verification

### Files to Audit
- `supabase/schema.sql` — `batches`, `batch_readings`, `fermentation_alerts`, `yeast_logs`, `batch_brewing_logs` tables
- `src/types/database.ts` L14–L18 — `BatchStatus` union type

### Checklist

- [ ] **FK: `batches.brewery_id → breweries(id) ON DELETE CASCADE`**
- [ ] **FK: `batches.recipe_id → recipes(id) ON DELETE SET NULL`** — batch survives recipe deletion
- [ ] **FK: `batch_readings.batch_id → batches(id) ON DELETE CASCADE`** — readings auto-delete with batch
- [ ] **FK: `batch_readings.external_id UNIQUE`** — deduplication constraint for offline sync
- [ ] **FK: `fermentation_alerts.batch_id → batches(id) ON DELETE CASCADE`**
- [ ] **FK: `fermentation_alerts.brewery_id → breweries(id)`** — verify CASCADE or no action
- [ ] **FK: `yeast_logs.batch_id → batches(id) ON DELETE CASCADE`**
- [ ] **FK: `yeast_logs.brewery_id → breweries(id)`** — verify CASCADE behavior
- [ ] **FK: `batch_brewing_logs.batch_id → batches(id) ON DELETE CASCADE`**
- [ ] **RLS:** Verify policies exist for ALL 5 tables:
  - `batches` → "Owner manages batches"
  - `batch_readings` → "Owner manages batch readings"
  - `fermentation_alerts` → verify policy name
  - `yeast_logs` → verify policy name
  - `batch_brewing_logs` → verify policy name

### CRITICAL: BatchStatus Type Discrepancy

**File:** `src/types/database.ts` L14–L18
```typescript
export type BatchStatus = 
  | 'brewing' 
  | 'fermenting' 
  | 'conditioning' 
  | 'packaging' 
  | 'complete'
```

**Issue:** The `'dumped'` status is used in:
- `src/app/(app)/reports/page.tsx` L108: `if (batch.status === 'dumped') m.dumpedBatches++`
- Reports monthly aggregation counts dumped batches
- The TTB report table shows a "Dumped" column

But `'dumped'` is **NOT** in the `BatchStatus` type union. This means:
1. TypeScript doesn't enforce or validate this status
2. The status comparison `=== 'dumped'` is technically comparing against an impossible value per the type

**Audit Actions:**
- [ ] Search the entire codebase for `'dumped'` usage: `grep -r "dumped" src/`
- [ ] Check if `'dumped'` is used in `updateBatchStatus()` — can a user actually set this status?
- [ ] Check `schema.sql` — is there a CHECK constraint limiting batch statuses?
- [ ] **Decision:** Either add `'dumped'` to `BatchStatus` type OR remove dumped batch logic from reports

---

## 2.2 Server Actions Audit

### File: `src/app/(app)/batches/actions.ts`

#### Action: `addBatch(formData)` (L27–L58)

- [ ] **Auth Gate:** `requireActiveBrewery()` → `{ supabase, brewery }`
- [ ] **Recipe Name Validation:** L36–L38: Manual check for empty/whitespace name. No Zod schema used (unlike `addTank` which uses `tankSchema`). **Inconsistency** — consider if schema validation would be better.
- [ ] **OG Parsing:** L40: `parseFloat(ogText)` — returns `NaN` for invalid input, which becomes `null` via conditional. Correct edge case handling.
- [ ] **Default Status:** L44: `status: 'fermenting'` — all new batches start as fermenting. Verify this is the correct default (shouldn't it be `'brewing'` first?). **Audit brewers' workflow:** Is a batch created only when it enters the fermenter?
- [ ] **Optimistic ID:** L29: Accepts optional client-side UUID via `formData.get('id')`. Same pattern as `addTank`. Verify no overwrite risk.
- [ ] **FG Default:** L46: `fg: null` — correct, FG is set later during fermentation
- [ ] **Insert + Select:** `.insert(insertPayload).select().single()` — returns the created batch for optimistic UI reconciliation. Correct pattern.
- [ ] **Revalidation:** `revalidatePath('/batches')` — correct

#### Action: `deleteBatch(formData)` (L60–L96)

- [ ] **Tank Cleanup:** L69–L73: Manually clears `tanks.current_batch_id` and resets `status` to `'ready'` before deleting the batch. This is **necessary** because the FK `ON DELETE SET NULL` only nullifies `current_batch_id` — it can't reset the tank status. **Correct design.**
- [ ] **Brewery Scope:** Both the tank update and batch delete use `.eq('brewery_id', brewery.id)` — correct
- [ ] **Redirect Handling:** L86–L88: Optional `redirectTo` param triggers `redirect()`. The `isNextRedirectError()` helper (L8–L22) catches Next.js redirect errors that look like thrown exceptions. This is the standard Next.js 15+ pattern. Verify `isNextRedirectError` covers all redirect error shapes.
- [ ] **Cascade Sufficiency:** Deleting the batch cascades to `batch_readings`, `fermentation_alerts`, `yeast_logs`, `batch_brewing_logs`. No manual cleanup needed for those. Only `tanks.current_batch_id` needs manual handling (done above).

### File: `src/app/(app)/batches/[id]/actions.ts`

#### Action: `updateBatchStatus(formData)` (L15–L38)

- [ ] **No Status Validation:** L23: `const status = formData.get('status') as string` — accepts ANY string as status. **No validation** against `BatchStatus` enum or any server-side check. A malicious client could set status to `'hacked'` or any arbitrary value.
  - **Severity:** Medium — RLS prevents cross-brewery, but invalid statuses could corrupt data
  - **Recommendation:** Validate `status` against allowed values server-side
- [ ] **No Transition Guards:** No check for valid transitions (e.g., `complete → fermenting` should probably be prevented). The UI likely restricts this with a dropdown, but server-side validation is missing.
- [ ] **Dual Revalidation:** L34–L35: Revalidates both `/batches/${batchId}` and `/batches`. Correct.

#### Action: `updateBatchFG(formData)` (L40–L76)

- [ ] **FG Validation:** L48: `parseFloat(fg)` with `isNaN` check. Correct.
- [ ] **Auto-Reading Creation:** L60–L67: After updating FG, creates a `batch_readings` entry with `gravity: fg` and `notes: 'Manual gravity log'`. This ensures the chart reflects the FG update. **Good design.**
- [ ] **Missing Alert Check:** After creating the reading, `runFermentationAlertCheck()` is **NOT called**. Other reading-creation paths (IoT, manual reading form) do trigger alert detection. **POTENTIAL BUG:** A FG update that brings gravity below stuck fermentation thresholds won't trigger an alert.
  - **Location:** After L67, should add `await runFermentationAlertCheck(batchId)`
- [ ] **Provenance Capture:** L56–L57: Captures IP and user-agent. Correct.
- [ ] **Dashboard Revalidation:** L73: Also revalidates `/dashboard`. Good — gravity changes affect dashboard sparkline.

#### Action: `logManualReading(formData)` (L83–L131)

- [ ] **External ID Dedup:** L90: Accepts optional `external_id` for offline sync deduplication
- [ ] **All Fields Optional:** L93–L99: `parseOptional()` helper allows all sensor fields (temperature, gravity, ph, dissolved_oxygen, pressure) to be null. A reading with ALL nulls would be valid — is this intended?
- [ ] **Unique Violation Handling:** L114–L116: If `external_id` already exists (unique constraint), returns `success: true` (idempotent). **Correct for offline sync** — re-syncing a queued reading shouldn't fail.
- [ ] **Alert Check After Insert:** L121: `await runFermentationAlertCheck(batchId)` — correctly triggers alert detection after each new reading
- [ ] **Provenance:** IP + user-agent captured. Correct.

#### Action: `logYeastViability(formData)` (L137–L170)

- [ ] **Brewery Scope:** `brewery_id: brewery.id` included in insert payload. Correct.
- [ ] **User Attribution:** `logged_by: user?.id ?? null`. Correct.
- [ ] **All Fields Optional:** `cell_density`, `viability_pct`, `pitch_rate` all optional. A log with all nulls and only notes would be valid. Questionable but not broken.

#### Action: `runFermentationAlertCheck(batchId)` (L176–L237)

- [ ] **Batch Config Fetch:** L181–L185: Fetches `target_temp` from batch. Used by temperature deviation detection. Null target_temp means no temp alerts possible — verify this is handled in the detection logic.
- [ ] **Reading Fetch:** L188–L193: Last 50 readings ordered by `created_at` desc. This provides enough data for trend analysis.
- [ ] **Active Alert Dedup:** L198–L202: Fetches currently active alerts to avoid duplicates. Only `status: 'active'` alerts are considered — acknowledged/resolved alerts don't block new detections. Correct.
- [ ] **Detection Engine:** L207–L209: Calls `detectFermentationAlerts()` pure function with readings and config
- [ ] **Alert Insertion:** L212–L225: Inserts new alerts with `status: 'active'`. Each alert gets `brewery_id` for RLS.
- [ ] **Push Notifications:** L228–L232: Fires push notifications for each new alert. Uses `.catch()` to prevent notification failures from breaking the alert flow. **Good fault tolerance.**
- [ ] **Revalidation:** L235: Revalidates batch detail page. Correct.

#### Action: `acknowledgeAlert(formData)` (L242–L271)

- [ ] **Status Guard:** L257: `.eq('status', 'active')` — can only acknowledge active alerts. Can't re-acknowledge. Correct.
- [ ] **User Attribution:** L254: `acknowledged_by: user?.id ?? null` + `acknowledged_at` timestamp. Correct audit trail.
- [ ] **Brewery Scope:** `.eq('brewery_id', brewery.id)` — correct

---

## 2.3 Fermentation Alert Logic Audit

### File: `src/lib/fermentation-alerts.ts` — Pure function, no side effects

- [ ] **Function Signature:** `detectFermentationAlerts(readings: BatchReadingInput[], config: BatchConfig): DetectedAlert[]`
- [ ] **Input Types:** Verify `BatchReadingInput` matches `BatchReading` from database types

#### Detection Rules — Verify Each:

**1. Stuck Fermentation**
- [ ] Rule: Less than 0.001 gravity change over 3+ consecutive readings
- [ ] Verify: What if gravity values are null? Should skip nulls and only compare non-null values.
- [ ] Severity: Should be `'warning'` initially, `'critical'` after extended period

**2. Temperature Deviation**
- [ ] Rule: Temperature differs from `config.target_temp` by more than ±2°C
- [ ] Verify: What if `target_temp` is null? Detection should be skipped entirely.
- [ ] Verify: What if reading temperature is null? Should skip that reading.
- [ ] Severity: `'warning'` for 2–4°C deviation, `'critical'` for >4°C

**3. pH Out of Range**
- [ ] Rule: pH falls outside 4.0–5.5
- [ ] Verify: Handles null pH values by skipping
- [ ] Severity: `'warning'` for slight deviation, `'critical'` below 3.5 or above 6.0

**4. DO (Dissolved Oxygen) Spike**
- [ ] Rule: DO exceeds 0.3 ppm
- [ ] Verify: Handles null DO values
- [ ] Severity: `'warning'` for 0.3–0.5, `'critical'` for >0.5

**5. Over Pressure**
- [ ] Rule: Pressure exceeds 15 PSI
- [ ] Verify: Handles null pressure values
- [ ] Severity: Based on PSI threshold

**6. Glycol Failure**
- [ ] Rule: Verify detection logic — likely based on temperature rising when it should maintain or drop
- [ ] Verify: What readings are needed? Multiple temperature readings showing consistent rise?

#### Edge Cases to Verify:
- [ ] Empty readings array → returns `[]`
- [ ] Single reading → no trend analysis possible, should skip trend-based alerts
- [ ] All fields null in all readings → returns `[]`
- [ ] Readings already sorted by `created_at` desc (from query) — verify function expects this order

---

## 2.4 Component Logic Audit

### File: `src/components/BatchesExperience.tsx`

- [ ] **Client Component:** `'use client'` directive
- [ ] **Optimistic Reducer:** Uses `useOptimistic()` with add/remove actions
  - `addBatch`: Adds temporary batch to list
  - `removeBatch`: Filters out deleted batch
- [ ] **Search State:** Client-side filtering by recipe name and status
- [ ] **Composition:** Renders `AddBatchForm` + `BatchesTable` + `PaginationControls`

### File: `src/components/BatchesTable.tsx`

- [ ] **Virtualization:** Uses `@tanstack/react-virtual` when row count >40 (desktop view)
- [ ] **Desktop vs Mobile:** Table layout on desktop, card layout on mobile
- [ ] **Search/Filter:** Client-side filtering by recipe name and status. Verify filter is case-insensitive.
- [ ] **CSV Export:** Verify exported columns match displayed columns. Verify the CSV uses the `ExportCSVButton` component.
- [ ] **Delete Per-Batch:** Each row has a delete button. Verify it uses `DeleteConfirmDialog` or equivalent.
- [ ] **Status Badge:** Verify all batch statuses render with appropriate colors. Check if `'dumped'` has a badge color defined.
- [ ] **Link to Detail:** Each batch links to `/batches/{id}`. Verify href format.

### File: `src/components/BatchReadingsTable.tsx`

- [ ] **Pagination:** Page sizes: 5, 10, 20, 50. Default: 5. Verify the default is appropriate.
- [ ] **Color-Coded Cells:** Verify thresholds:
  - pH: green 4.0–5.5, yellow outside, red far outside
  - DO: green <0.3, yellow 0.3–0.5, red >0.5
  - Pressure: green <15, yellow 15–20, red >20
- [ ] **Range Summary:** Shows min/max/avg for each sensor column. Verify calculation is correct (handles nulls).
- [ ] **Empty State:** "No readings yet" message when no data

### File: `src/components/ManualReadingForm.tsx`

- [ ] **Expandable Form:** Starts collapsed, expands on click. Verify collapse/expand state.
- [ ] **All Fields Optional:** Gravity, temperature, pH, DO, pressure, notes all nullable
- [ ] **Offline Queue:** Calls `enqueueAction()` from `offlineQueueShared.ts` when offline. Verify:
  - Action type identifer is correct
  - FormData is serialized properly for IndexedDB storage
  - External ID is generated for deduplication on sync
- [ ] **Online Submission:** When online, calls `logManualReading()` server action directly
- [ ] **Pending State:** Shows loading indicator during submission

### File: `src/components/FermentationAlertsPanel.tsx`

- [ ] **Collapsible Panel:** Expandable section showing alerts
- [ ] **Alert Grouping:** Active alerts shown first, acknowledged below
- [ ] **Severity Icons:** Different icons/colors for `warning` vs `critical`
- [ ] **Acknowledge Button:** Calls `acknowledgeAlert()` server action. Verify correct `alertId` and `batchId` are passed.
- [ ] **Empty State:** "No active alerts" when no alerts exist

### File: `src/components/GravityChart.tsx`

- [ ] **Recharts LineChart:** Dual Y-axes (gravity left, temperature right)
- [ ] **Data Points:** Up to 20 readings. Verify readings are ordered chronologically (ascending) for the chart.
- [ ] **Expected Gravity Line:** Interpolates from OG → FG over target fermentation days. Verify:
  - What if OG is null? Line should not render.
  - What if FG is null? Line should stop at last known gravity.
  - What if target days is unknown? Sensible default or skip line.
- [ ] **Responsive:** Uses `ResponsiveContainer` for 100% width
- [ ] **Dark Mode:** Colors adapt to theme via `useTheme()`
- [ ] **SSR Safety:** Uses `useHasMounted()` to avoid SSR rendering of Recharts

### File: `src/components/YeastViabilityCard.tsx`

- [ ] **Latest Log Display:** Shows most recent yeast log entry
- [ ] **Health Status:** Color-coded based on viability percentage:
  - Green: >90% viability
  - Yellow: 70–90%
  - Red: <70%
  - Verify exact thresholds
- [ ] **Form:** Inline form to log new viability data. Calls `logYeastViability()`.
- [ ] **Cell Density & Pitch Rate:** Displayed if available. Verify null handling.

---

## 2.5 Batch Detail Page Audit

### File: `src/app/(app)/batches/[id]/page.tsx`

- [ ] **Auth + Brewery Check:** Standard auth guard + `requireActiveBrewery()` or `getActiveBrewery()`
- [ ] **UUID Validation:** Check if batch ID format is validated (like tank detail does)
- [ ] **404 Handling:** What happens when batch doesn't exist or belongs to different brewery?
- [ ] **Parallel Data Fetches:** Are batch, readings, chart data, alerts, and yeast logs fetched in parallel (`Promise.all`) or sequentially?
- [ ] **Paginated Readings:** Default 5 per page. Verify `searchParams` for page/limit.
- [ ] **Chart Data:** Last 20 readings for fermentation curve. Separate query from paginated readings? Verify.
- [ ] **RealtimeRefresh:** Should listen on `batch_readings`, `fermentation_alerts`, `yeast_logs` tables. Verify subscription config.
- [ ] **Status Update Dropdown:** Verify available status options. Are all `BatchStatus` values shown? Is `'dumped'` an option?
- [ ] **FG Update Form:** Inline form calling `updateBatchFG()`. Verify input validation (positive number).

---

## 2.6 Offline Sync Pipeline

### End-to-End Flow

```
1. User fills ManualReadingForm while offline
2. enqueueAction() → IndexedDB (idb-keyval) with:
   - action: 'logManualReading'
   - formData: serialized fields
   - external_id: generated UUID for dedup
   - retry_count: 0
   - max_retries: 5 (verify)
3. Service worker detects connectivity
4. Sync handler reads queue from IndexedDB
5. POST /api/sync-manual-reading with reading data
6. Server calls logManualReading() server action
7. external_id unique constraint prevents duplicate insertion
8. On success: remove from queue
9. On failure: increment retry_count, exponential backoff
```

### Files to Audit
- `src/lib/offlineQueueShared.ts` — `enqueueAction()` function
- `src/app/api/sync-manual-reading/route.ts` — sync endpoint
- `src/app/sw.ts` — service worker sync handler
- `src/components/ManualReadingForm.tsx` — offline-aware form

### Checklist
- [ ] **Queue Structure:** Verify queued item includes all necessary fields (batchId, sensor values, external_id, timestamps)
- [ ] **External ID Generation:** UUID generated client-side before queueing. Must be deterministic per reading attempt (so re-queue doesn't generate new ID).
- [ ] **Sync Endpoint Auth:** `/api/sync-manual-reading` must require authentication. Verify it doesn't accept anonymous requests.
- [ ] **Dedup Behavior:** When `external_id` already exists in DB, `logManualReading()` returns `success: true`. The sync flow should treat this as success and dequeue.
- [ ] **Retry Logic:** Verify exponential backoff delays. Verify max retry cap (5?). Verify what happens after max retries (discard or mark as failed).
- [ ] **Conflict with IoT:** If the same reading arrives via IoT and offline sync, `external_id` dedup handles it IF they share the same external_id. If they don't (IoT doesn't use external_id), both readings are inserted. Is this correct behavior? **Audit: Does the IoT endpoint set `external_id`?**

---

## 2.7 IoT Integration Audit

### File: `src/app/api/iot/log/route.ts`

- [ ] **Auth:** Bearer token validation against `iot_webhook_token`. Verify token lookup from `breweries` table.
- [ ] **Input:** Accepts JSON body with `tank_id` OR `batch_id` + sensor readings
- [ ] **Tank Resolution:** If `tank_id` provided, fetches `tanks.current_batch_id`. If null (no assigned batch), verify error response.
- [ ] **All 5 Sensor Fields:** temperature, gravity, pH, dissolved_oxygen, pressure. Verify all handled.
- [ ] **Reading Insert:** Creates `batch_readings` entry with provenance info
- [ ] **Alert Trigger:** Calls `runFermentationAlertCheck()` after insertion. Same flow as manual readings.
- [ ] **Response Codes:** 200 on success, 401 on bad token, 400 on missing data, 404 on bad tank/batch. Verify all paths.
- [ ] **Rate Limiting:** Is there any rate limiting? IoT devices could flood the endpoint. Consider if this is a concern.

---

## 2.8 Cross-Feature Data Integrity

### Batch ↔ Tank Bidirectional Consistency

- [ ] **Assign (from tank side):** `tank/[id]/actions.ts` → `assignBatch()` sets `tanks.current_batch_id`. No update to `batches` table. Correct — the relationship is stored on the tank side only.
- [ ] **Delete batch (from batch side):** `batches/actions.ts` → `deleteBatch()` clears ALL tanks with this `current_batch_id`. Correct.
- [ ] **Delete tank (from tank side):** No effect on batch — the batch persists without a tank.
- [ ] **Multiple tanks per batch:** Schema allows this (no UNIQUE on `current_batch_id`). Verify this is intentional for batch-split scenarios.

### Batch ↔ Recipe

- [ ] **`recipe_id` SET NULL on recipe delete:** Batch survives, just loses recipe reference. Verify batch display handles null recipe_id gracefully.
- [ ] **Recipe name stored redundantly:** `batches.recipe_name` is a denormalized copy. When recipe is renamed, batch keeps old name. Is this intentional?

### Batch ↔ Activity Logs

- [ ] **Activity log creation:** `src/app/api/activity-logs/route.ts` queries batches for activity display. Verify it includes batch creation events. Is the activity log a derived view (querying batches table) or a separate events table?

---

## 2.9 Tests — Existing & Missing

### Existing Tests to Verify

| Test File | Run Command |  
|-----------|-------------|
| `__tests__/components/add-batch-form.test.tsx` | `npm run test -- __tests__/components/add-batch-form.test.tsx` |
| `__tests__/components/batch-readings-table.test.tsx` | `npm run test -- __tests__/components/batch-readings-table.test.tsx` |
| `__tests__/components/fermentation-alerts-panel.test.tsx` | `npm run test -- __tests__/components/fermentation-alerts-panel.test.tsx` |
| `__tests__/components/gravity-chart.test.tsx` | `npm run test -- __tests__/components/gravity-chart.test.tsx` |
| `__tests__/components/manual-reading-form.test.tsx` | `npm run test -- __tests__/components/manual-reading-form.test.tsx` |
| `__tests__/components/yeast-viability-card.test.tsx` | `npm run test -- __tests__/components/yeast-viability-card.test.tsx` |
| `__tests__/lib/gravity-trend.test.ts` | `npm run test -- __tests__/lib/gravity-trend.test.ts` |
| `__tests__/api/logs.test.ts` | `npm run test -- __tests__/api/logs.test.ts` |
| `__tests__/api/activity-logs.test.ts` | `npm run test -- __tests__/api/activity-logs.test.ts` |

### Missing Tests to Write

**1. `__tests__/api/batch-actions.test.ts`** — Server action tests
```
Test cases:
- addBatch: creates batch with brewery_id, recipe_name, status='fermenting'
- addBatch: rejects empty recipe name
- addBatch: handles optional OG (null when empty, parsed when numeric)
- addBatch: accepts optional client-side UUID
- deleteBatch: clears tanks referencing this batch first
- deleteBatch: deletes batch with brewery scoping
- deleteBatch: redirects when redirectTo provided
```

**2. `__tests__/api/batch-detail-actions.test.ts`** — Server action tests
```
Test cases:
- updateBatchStatus: updates status field
- updateBatchStatus: SHOULD validate against BatchStatus enum (test expectation for fix)
- updateBatchFG: updates FG and creates batch_reading
- updateBatchFG: rejects NaN gravity values
- updateBatchFG: captures provenance (IP, user-agent)
- logManualReading: inserts reading with all sensor fields
- logManualReading: handles all-null sensor values
- logManualReading: deduplicates by external_id (returns success)
- logManualReading: triggers runFermentationAlertCheck
- logYeastViability: inserts with brewery_id and logged_by
- acknowledgeAlert: sets status='acknowledged' with timestamp
- acknowledgeAlert: only works on 'active' alerts
```

**3. `__tests__/lib/fermentation-alerts.test.ts`** — Pure logic tests
```
Test cases:
- detectFermentationAlerts: returns empty for no readings
- detectFermentationAlerts: returns empty for single reading
- detectFermentationAlerts: detects stuck fermentation (flat gravity)
- detectFermentationAlerts: detects temperature deviation (>2°C from target)
- detectFermentationAlerts: skips temp check when target_temp is null
- detectFermentationAlerts: detects pH out of range (<4.0, >5.5)
- detectFermentationAlerts: detects DO spike (>0.3 ppm)
- detectFermentationAlerts: detects over-pressure (>15 PSI)
- detectFermentationAlerts: handles all-null readings gracefully
- detectFermentationAlerts: handles mixed null/valid readings
- detectFermentationAlerts: assigns correct severity levels
```

**4. `__tests__/api/sync-manual-reading.test.ts`** — Offline sync endpoint test
```
Test cases:
- Rejects unauthenticated requests (401)
- Processes synced reading successfully
- Handles duplicate external_id idempotently
- Returns appropriate error for invalid batch_id
```

---

## 2.10 Verification Commands

```bash
# 1. Run all existing batch-related tests
npm run test -- __tests__/components/add-batch-form.test.tsx __tests__/components/batch-readings-table.test.tsx __tests__/components/fermentation-alerts-panel.test.tsx __tests__/components/gravity-chart.test.tsx __tests__/components/manual-reading-form.test.tsx __tests__/components/yeast-viability-card.test.tsx

# 2. Run related lib tests
npm run test -- __tests__/lib/gravity-trend.test.ts

# 3. Run API tests
npm run test -- __tests__/api/logs.test.ts __tests__/api/activity-logs.test.ts

# 4. Lint
npm run lint

# 5. Type-check (catches BatchStatus discrepancy)
npm run build

# 6. Offline queue tests
npm run test:offline-queue

# 7. After writing new tests
npm run test -- __tests__/api/batch-actions.test.ts __tests__/api/batch-detail-actions.test.ts __tests__/lib/fermentation-alerts.test.ts __tests__/api/sync-manual-reading.test.ts
```

---

## 2.11 Pre-Identified Issues

| # | Issue | Severity | File | Line | Action Required |
|---|-------|----------|------|------|----------------|
| 2.1-A | `BatchStatus` type missing `'dumped'` — used in Reports but not in type union | Medium | `types/database.ts` | L14 | Add `'dumped'` to union or audit usage |
| 2.1-B | `updateBatchStatus()` accepts any string as status, no server-side validation | Medium | `batches/[id]/actions.ts` | L23 | Add status validation against allowed values |
| 2.1-C | `updateBatchFG()` creates a reading but does NOT trigger `runFermentationAlertCheck()` | Medium | `batches/[id]/actions.ts` | L67 | Add alert check after FG reading creation |
| 2.1-D | `addBatch()` defaults to `'fermenting'` — should it start as `'brewing'`? | Low | `batches/actions.ts` | L44 | Verify with domain workflow |
| 2.1-E | No transition guards for batch status changes | Low | `batches/[id]/actions.ts` | L27 | Consider adding valid transition matrix |
| 2.1-F | All readings can have all sensor fields null — pointless reading | Low | `batches/[id]/actions.ts` | L93 | Consider requiring at least one non-null field |
| 2.1-G | IoT and offline sync may create duplicate readings if external_id not shared | Low | Various | — | Verify IoT endpoint sets external_id |

---

## 2.12 Sign-Off Checklist

- [ ] All existing batch tests pass
- [ ] Schema FK constraints verified for all 5 batch-related tables
- [ ] All RLS policies verified
- [ ] `BatchStatus` type discrepancy resolved
- [ ] All 8 server actions audited line-by-line
- [ ] Fermentation alert detection logic verified with edge cases
- [ ] All 10+ components audited for logic and rendering correctness
- [ ] Offline sync pipeline verified end-to-end
- [ ] IoT integration verified (auth, resolution, reading creation, alert trigger)
- [ ] Cross-feature integrity verified (Batch↔Tank, Batch↔Recipe, Batch↔Activity)
- [ ] New tests written and passing
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:offline-queue` passes
