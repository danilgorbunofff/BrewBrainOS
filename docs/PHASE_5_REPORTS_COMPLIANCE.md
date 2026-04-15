# Phase 5: Reports & Compliance — Accuracy & Completeness Audit

**Priority:** HIGH — Regulatory compliance. TTB report errors can result in fines. This is the output layer — all upstream data must be verified (Phases 1–4) before this audit is fully meaningful.  
**Estimated Scope:** 8+ files, 3 server actions, 5 components, 0 pure logic libraries (logic is inline in page/components)  
**Depends On:** ALL prior phases — Reports aggregate data from Batches, Tanks, Inventory, Shrinkage  
**Test Coverage:** ZERO existing tests — highest test debt in the project

---

## 5.1 TTB Report Page Audit — CRITICAL

### File: `src/app/(app)/reports/page.tsx`

This page generates the TTB Form 5130.9 (Brewer's Report of Operations). Any bug here could cause regulatory filing errors.

#### Data Fetching (L18–L36)

```typescript
const { data: batches } = await supabase
  .from('batches')
  .select('id, recipe_name, status, og, fg, created_at')
  .eq('brewery_id', brewery.id)
  .order('created_at', { ascending: false })

const { data: tanks } = await supabase
  .from('tanks')
  .select('id, name, capacity')
  .eq('brewery_id', brewery.id)

const { data: sanitationLogs } = await supabase
  .from('sanitation_logs')
  .select('id, tank_id, notes, cleaned_at, user_id')
  .order('cleaned_at', { ascending: false })

const { count: totalReadings } = await supabase
  .from('batch_readings')
  .select('id', { count: 'exact', head: true })
```

- [ ] **No Date Filter on Batches:** Fetches ALL batches for the brewery, ever. For long-running operations, this grows unbounded. Not a bug per se, but a scalability concern.
- [ ] **Sanitation Logs Missing Brewery Scope:** L30–L32: `.order('cleaned_at', ...)` but NO `.eq('brewery_id', ...)` or `.eq('tank_id', ...)` filter. **POTENTIAL BUG:** If RLS is not enforced for sanitation_logs, this could leak other breweries' logs. Verify RLS.
- [ ] **Total Readings Missing Brewery Scope:** L34–L35: Counts ALL `batch_readings` in the system. **POTENTIAL BUG:** No `.eq('brewery_id', ...)` filter. Batch_readings don't have a direct `brewery_id` column — they're scoped through `batches.brewery_id`. RLS must handle this through the FK chain. Verify.
- [ ] **No Parallel Fetching:** 4 sequential awaits. Could use `Promise.all()`.

#### Monthly Aggregation Logic (L40–L115)

```typescript
const monthlyData: Record<string, { ... }> = {}
const avgTankCapacity = allTanks.length > 0
  ? allTanks.reduce((sum, t) => sum + (Number(t.capacity) || 7), 0) / allTanks.length
  : 7
```

- [ ] **Average Tank Capacity Fallback:** Default 7 BBL when no tanks exist. Verify this is reasonable.
- [ ] **Division by Zero:** `allTanks.length > 0` guard prevents division by zero. Correct.
- [ ] **Null Capacity Handling:** `Number(t.capacity) || 7` — if capacity is null or 0, defaults to 7. Is 0 capacity a valid value? If a tank has capacity=0, it becomes 7 in the average. **Edge case** — consider if this should be filtered out instead.

#### Status Counting (L95–L110)

```typescript
if (batch.status === 'complete' || batch.status === 'packaging') {
  m.completedBatches++
  m.estimatedBBL += avgTankCapacity
}
if (batch.status === 'fermenting' || batch.status === 'conditioning') {
  m.activeBatches++
}
if (batch.status === 'dumped') {
  m.dumpedBatches++
}
```

- [ ] **`'dumped'` Status — TYPE BUG CONFIRMED:**
  - `BatchStatus` type in `src/types/database.ts` does NOT include `'dumped'`
  - TypeScript allows `batch.status === 'dumped'` because `status` is typed as `string` from Supabase, not as `BatchStatus`
  - The comparison technically works at runtime if the DB has `'dumped'` values
  - **Action:** Verify if any batch actually has `status = 'dumped'` in production data. If yes, add to type. If no, this code is dead.
  - **Search:** `grep -r "'dumped'" src/` to find all occurrences

- [ ] **BBL Estimation Logic:** `1 batch = 1 tank fill`. Only completed/packaging batches count toward BBL. Active batches don't contribute. Is this correct for TTB? The TTB wants to know total production, which may include in-progress batches.

- [ ] **Gallons Conversion:** L118: `m.estimatedBBL * 31` — `1 BBL = 31 US Gallons`. Correct constant.

- [ ] **Missing Status: `'brewing'`:** The `BatchStatus` type includes `'brewing'` but the report doesn't count it anywhere. If a batch is in `'brewing'` status, it's not counted as completed, active, OR dumped. It falls through all checks silently.

#### OG/FG Average Calculation (L112–L117)

```typescript
const withOG = m.batches.filter(b => b.og)
const withFG = m.batches.filter(b => b.fg)
m.avgOG = withOG.length > 0 ? withOG.reduce((s, b) => s + Number(b.og), 0) / withOG.length : 0
m.avgFG = withFG.length > 0 ? withFG.reduce((s, b) => s + Number(b.fg), 0) / withFG.length : 0
```

- [ ] **Null Filtering:** `b.og` is truthy-check. This correctly skips null but also skips `og = 0`. Is OG=0 valid? No — OG is always positive (typically 1.040–1.100). So truthy-check is acceptable here.
- [ ] **Average Only for Non-Null:** Correct — doesn't distort average with zeros for missing values.

#### Grand Total Computation (L119–L126)

- [ ] **Total BBL:** Sum of all monthly `estimatedBBL`. Correct.
- [ ] **Total Gallons:** `totalBBL * 31`. Correct.
- [ ] **Sanitation Count:** `sanitationLogs?.length || 0`. If RLS is correct, only brewery's logs. Verify.
- [ ] **Total Readings:** `totalReadings || 0`. Same RLS concern as above.

---

## 5.2 TTB Report Table Component

### File: `src/components/TTBReportTable.tsx`

#### Props
- `batches`: All brewery batches
- `avgTankCapacity`: Average tank capacity in BBL
- `breweryName`: For report header
- `licenseNumber`: Optional, for report header

#### Client-Side Aggregation
- [ ] **Month Grouping:** The component re-aggregates batches by month client-side. This should produce the same results as the server-side aggregation. **Potential inconsistency:** Are there any differences in timezone handling between server and client grouping? Server uses UTC, client uses local time. A batch created at 23:59 UTC on Jan 31 might appear in Jan server-side but Feb client-side (for UTC-X timezones).
  - **Audit:** Compare server `monthlyData` with client-side re-aggregation. If they diverge, there's a bug.
  - **Recommendation:** Either pass pre-aggregated data to the component OR do all aggregation on one side.

#### Expandable Rows
- [ ] **Month Expansion:** Each month row expands to show individual batches.
- [ ] **Individual Batch Data:** Shows recipe name, status, OG, FG, BBL estimate.
- [ ] **Verify expansion doesn't break table layout on mobile.**

#### CSV Export (L119+)

- [ ] **Filename:** `TTB-Report-{breweryName}-{YYYY-MM}.csv`
- [ ] **Header Rows:**
  1. Title: "Brewer's Report of Operations (TTB 5130.9)"
  2. Brewery name
  3. License number (if present)
  4. Generated date
  5. Formula note: "1 BBL = 31 US Gallons"
- [ ] **Data Columns:** Month | Total Batches | Completed | Active | Dumped | BBL | Gallons | Avg OG | Avg FG
  - 9 columns. Verify order matches header.
- [ ] **Grand Total Row:** Appended at bottom with totals. Verify summation.
- [ ] **Character Encoding:** UTF-8 BOM for Excel compatibility? Verify.
- [ ] **Blob Download:** Native `Blob` + URL.createObjectURL. No external library dependency. Correct.

#### PDF Export (L162+)

- [ ] **Dynamic Import:** `jsPDF` + `jspdf-autotable` are dynamically imported. Verify they're in `package.json` dependencies.
- [ ] **Layout:**
  - Title: "BrewBrain OS" + "Brewer's Report of Operations (TTB 5130.9)"
  - Metadata section: Brewery, License, Generated date, Formula
  - Table: 9 columns, striped theme, amber/primary color headers
  - Grand Total row: light primary background, bold text
  - Footer: Page numbers with BrewBrain branding
- [ ] **Filename:** `TTB-Report-{breweryName}-{YYYY-MM}.pdf`
- [ ] **Loading State:** Button shows "Building…" while PDF generates. Verify UI feedback.
- [ ] **Error Handling:** What if jsPDF import fails (network error in offline)? Verify fallback.
- [ ] **Data Accuracy:** Verify PDF table data matches the on-screen table data exactly.

#### Mobile Layout
- [ ] **Card Layout:** On mobile, each month renders as a card instead of table row
- [ ] **All Data Visible:** Verify no data is hidden/truncated on mobile
- [ ] **Export Buttons:** Still accessible on mobile

---

## 5.3 Compliance Page Audit

### File: `src/app/(app)/compliance/page.tsx`

This page provides the compliance hub with three sections:
1. TTB Continuity Validator
2. Daily Operations Logger
3. Shrinkage Alert TTB Remarks

- [ ] **Auth + Brewery Check:** Standard guards
- [ ] **Pre-Rendered Data:** `validateTTBContinuity()` is likely called server-side during render. Verify.
- [ ] **Current Month Default:** Validator shows current month. Verify month/year parameters.

---

## 5.4 Compliance Actions Audit

### File: `src/app/(app)/compliance/actions.ts`

#### Action: `logDailyOperation(data)` (L28–L55)

- [ ] **Input Validation:**
  - `logDate`: String in YYYY-MM-DD format. Validated? Or arbitrary string?
  - `operationType`: One of `'removal_taxpaid' | 'removal_tax_free' | 'return_to_brewery' | 'breakage_destruction' | 'other'`. **Server-side validation?** Or accepts any string?
  - `quantity`: Number. Positive only? Or can be negative?
  - `unit`: String. Validated against known units (BBL, Gallons, Liters)?
  - `ttbReportable`: Boolean flag. Verify it's actually boolean, not "true"/"false" string.
- [ ] **Provenance:** L40–L41: Captures IP + user-agent. Correct for audit trail.
- [ ] **User Attribution:** L43: `logged_by: userAuth?.user?.id || null`. Correct.
- [ ] **Auth Pattern:** Uses `createClient()` + `getActiveBrewery()` instead of `requireActiveBrewery()`. Slight inconsistency with other actions. Verify both patterns are equivalent in auth enforcement.
- [ ] **Revalidation:** `revalidatePath('/compliance')`. Correct.

#### Action: `updateShrinkageTTBRemarks(alertId, remarks, ttbReportable)` (L57–L77)

- [ ] **Brewery Scope:** `.eq('id', alertId).eq('brewery_id', brewery.id)` — correct, prevents cross-brewery updates
- [ ] **Fields Updated:** `ttb_remarks` and `ttb_reportable` only. Does not change alert status. Correct — remarks and reportability are metadata on existing alerts.
- [ ] **Input Validation:** No validation on `remarks` length or content. Could accept empty string or very long text. Consider max length for TTB forms.

#### Action: `validateTTBContinuity(month, year)` (L79+)

- [ ] **Formula Verification:** TTB Form 5130.9 continuity check:
  $$\text{Beginning} + \text{Produced} - \text{Removals} - \text{Returns} - \text{Breakage} - \text{Shortages} = \text{Ending}$$
  
  Verify each component:
  
  | Component | Source | Calculation |
  |-----------|--------|-------------|
  | Beginning Inventory | **HARDCODED TO 50 BBL** | `const beginningInventory = 50` |
  | Produced | `batches` table | Count completed batches × avg capacity |
  | Removals | `daily_operations_logs` | Sum where `operation_type = 'removal_taxpaid'` + `'removal_tax_free'` |
  | Returns | `daily_operations_logs` | Sum where `operation_type = 'return_to_brewery'` |
  | Breakage | `daily_operations_logs` | Sum where `operation_type = 'breakage_destruction'` |
  | Shortages | `shrinkage_alerts` | Sum `loss_amount` where `ttb_reportable = true` |
  | Ending | Computed | `beginning + produced - removals + returns - breakage - shortages` |

- [ ] **CRITICAL BUG: Beginning Inventory Hardcoded**
  - `beginningInventory = 50` is a placeholder. In a real TTB filing, beginning inventory for month N must equal ending inventory from month N-1.
  - **Impact:** Every continuity validation will be wrong.
  - **Fix Required:** Implement either:
    1. Snapshot-based: Store ending inventory at each month close
    2. Derived: Calculate from historical daily operations logs
    3. User-input: Let the brewer set beginning inventory per period

- [ ] **Month/Year Parameters:** Verify the query correctly filters daily_operations_logs and batches to the specified month/year.
- [ ] **Unit Consistency:** All values must be in the same unit (BBL). Daily operations accept BBL/Gallons/Liters — verify conversion to BBL for the continuity check.
- [ ] **CBMA Eligibility:** `cbmaEligible: removals <= 60000` — Craft Beverage Modernization Act threshold. Verify this is cumulative annual, not monthly.
- [ ] **`cbmaBarrelsUsed`:** Total barrels removed for the period. Verify this matches TTB reporting requirements.

---

## 5.5 Reports Gate Component

### File: `src/components/ReportsGate.tsx`

- [ ] **Tier Check:** Wraps `UpgradeGate` — requires `'production'` tier subscription
- [ ] **Behavior:** If user is on free/nano tier:
  - Reports content is hidden
  - Upgrade message/CTA is shown
  - Verify the gate fully prevents access (not just visual hiding)
- [ ] **Children Rendering:** Only renders children when tier check passes
- [ ] **Subscription Data Source:** Verify it reads from `subscriptions` table with brewery scope

---

## 5.6 Daily Operations Form Component

### File: `src/components/DailyOperationsForm.tsx`

- [ ] **Form Fields:**
  - Date picker (defaults to today)
  - Operation Type selector: `removal_taxpaid | removal_tax_free | return_to_brewery | breakage_destruction | other`
  - Quantity (numeric input)
  - Unit selector: BBL / Gallons / Liters
  - Batch reference (optional, dropdown of brewery's batches)
  - Inventory reference (optional, dropdown of brewery's items)
  - TTB Reportable checkbox
  - Remarks (text area)
- [ ] **Validation:** Verify all required fields are enforced before submission
- [ ] **Server Action:** Calls `logDailyOperation()`. Verify form data mapping.
- [ ] **Success Feedback:** Toast on success via Sonner. Verify.
- [ ] **Form Reset:** After submit, form should clear. Verify.

---

## 5.7 TTB Remarks Form Component

### File: `src/components/TTBRemarksForm.tsx`

- [ ] **Inline Edit:** Appears next to each shrinkage alert on the compliance page
- [ ] **Fields:** Remarks text area + TTB Reportable toggle
- [ ] **Action:** Calls `updateShrinkageTTBRemarks()`. Verify correct `alertId` is passed.
- [ ] **Optimistic UI:** Does the form show immediate feedback? Or wait for server response?
- [ ] **Validation:** Max chars for remarks? Prevent XSS in remarks text?

---

## 5.8 FSMA / Sanitation Reporting

The Reports page includes a sanitation logs section for FSMA (Food Safety Modernization Act) compliance.

- [ ] **Display:** Shows top 10 sanitation logs with tank name, user, date, notes
- [ ] **Count:** Total sanitation log count shown in KPIs
- [ ] **Missing Features (Known Gaps):**
  - No CSV export for sanitation logs
  - No PDF export for sanitation logs
  - No date range filter for sanitation logs
  - No linkage between sanitation logs and specific FSMA checkpoints
- [ ] **Log Completeness:** Each log should have: tank_id (resolved to name), user_id (resolved to name/email), cleaned_at, notes. Verify joins are correct.
- [ ] **RLS Concern:** Sanitation logs query on reports page (L30–L32) has no apparent brewery filter. Verify RLS handles this.

---

## 5.9 Cross-Feature Data Integrity

### Reports ↔ Batches

- [ ] **All statuses accounted for:** `complete`, `packaging`, `fermenting`, `conditioning`, `dumped`, `brewing`. Currently `brewing` falls through — not counted anywhere.
- [ ] **BBL Only for Completed:** Only `complete`/`packaging` batches contribute to BBL production total. Active batches do not. Verify this is correct for TTB.
- [ ] **Batch → Month Assignment:** Based on `created_at`. For long-running batches (created in Jan, completed in Mar), it's counted in January. TTB may want production counted when completed. **Audit: When does production occur for TTB purposes?**

### Reports ↔ Tanks

- [ ] **Average Capacity:** Used for BBL estimation. If a tank is added or removed mid-period, the average changes retroactively. All historical reports would show different numbers. **This is a known limitation of the estimation approach.**
- [ ] **Zero Tanks:** If no tanks exist, `avgTankCapacity` defaults to 7. All BBL estimates use 7 BBL per batch. Reasonable fallback.

### Reports ↔ Shrinkage

- [ ] **TTB Reportable Alerts:** `shrinkage_alerts` with `ttb_reportable = true` feed into continuity shortages. Verify the flag is correctly set via `updateShrinkageTTBRemarks()`.
- [ ] **Loss Amount Unit:** `shrinkage_alerts.loss_amount` — what unit is this? Items? BBL? Gallons? Must be converted to BBL for TTB continuity. Verify unit handling.

### Reports ↔ Daily Operations

- [ ] **Operation Type Mapping:** Daily operations with specific types feed into specific TTB continuity lines:
  - `removal_taxpaid` + `removal_tax_free` → Removals
  - `return_to_brewery` → Returns
  - `breakage_destruction` → Breakage
  - `other` → not included in continuity? Verify.
- [ ] **Unit Conversion:** If a daily operation is logged in Gallons but continuity calculates in BBL, verify conversion: `gallons / 31 = BBL`.

---

## 5.10 Known Issues & Gaps

| # | Issue | Severity | File | Line | Action Required |
|---|-------|----------|------|------|----------------|
| 5.1-A | **Beginning inventory hardcoded to 50 BBL** | **CRITICAL** | `compliance/actions.ts` | `validateTTBContinuity` | Implement inventory snapshot mechanism |
| 5.1-B | `BatchStatus` type missing `'dumped'` — used in report counting | Medium | `types/database.ts` / `reports/page.tsx` | L108 | Add to type or remove dead code |
| 5.1-C | `'brewing'` status not counted in any report category | Medium | `reports/page.tsx` | L95–L110 | Add to a category or verify it's unused |
| 5.1-D | Sanitation logs query has no brewery filter (relies on RLS only) | Medium | `reports/page.tsx` | L30–L32 | Add explicit `.eq()` filter |
| 5.1-E | Total readings count has no brewery filter (relies on RLS) | Medium | `reports/page.tsx` | L34–L35 | Add explicit batch→brewery join or filter |
| 5.1-F | No date range picker on Reports page | Low | `reports/page.tsx` | — | Add month/date range selector |
| 5.1-G | No month picker for Compliance continuity checks | Medium | `compliance/page.tsx` | — | Expose month/year controls (action supports it) |
| 5.1-H | CBMA eligibility checks annual barrels — but calculation may be monthly | Medium | `compliance/actions.ts` | — | Verify annual vs monthly threshold |
| 5.1-I | Daily operations `unit` not converted for continuity check | Medium | `compliance/actions.ts` | — | Add unit conversion (Gallons/Liters → BBL) |
| 5.1-J | No FSMA sanitation log export (CSV/PDF) | Low | — | — | Add export functionality |
| 5.1-K | Shrinkage `loss_amount` unit unclear for TTB conversion | Medium | `compliance/actions.ts` | — | Verify units and add conversion |
| 5.1-L | Server/client month grouping timezone mismatch risk | Medium | `reports/page.tsx` / `TTBReportTable.tsx` | — | Align aggregation to one side |
| 5.1-M | **ZERO test coverage for Reports and Compliance** | **HIGH** | — | — | Write comprehensive tests |
| 5.1-N | `updateBatchStatus()` has no validation — `'dumped'` can't be officially set | Medium | `batches/[id]/actions.ts` | L23 | Add validation or document flow |
| 5.1-O | `logDailyOperation()` uses `getActiveBrewery()` instead of `requireActiveBrewery()` | Low | `compliance/actions.ts` | L30 | Verify auth equivalence |
| 5.1-P | No input validation for `operationType` in `logDailyOperation()` | Medium | `compliance/actions.ts` | L28 | Add enum validation |

---

## 5.11 Tests to Write — CRITICAL (Zero Existing Coverage)

**1. `__tests__/api/compliance-actions.test.ts`** — Server action tests
```
Test cases:
- logDailyOperation: inserts log with all fields
- logDailyOperation: requires active brewery
- logDailyOperation: captures provenance (IP, user-agent)
- logDailyOperation: validates operation type against enum
- logDailyOperation: validates quantity is positive
- updateShrinkageTTBRemarks: updates remarks and reportable flag
- updateShrinkageTTBRemarks: scopes to brewery (rejects cross-brewery)
- validateTTBContinuity: computes beginning + produced - removals - breakage = ending
- validateTTBContinuity: handles zero daily operations
- validateTTBContinuity: handles zero batches
- validateTTBContinuity: handles CBMA threshold correctly
- validateTTBContinuity: converts units consistently
```

**2. `__tests__/components/ttb-report-table.test.tsx`** — Component test
```
Test cases:
- Renders monthly data in table format
- Expands month row to show individual batches
- Shows grand total row with correct sums
- CSV export generates correct filename
- CSV export includes all 9 columns + header rows
- PDF export button shows loading state
- Mobile layout renders as cards
- Handles 0 batches (empty table)
- Handles batches with null OG/FG (averages skip nulls)
- Counts dumped batches correctly
```

**3. `__tests__/components/daily-operations-form.test.tsx`** — Component test
```
Test cases:
- Renders all form fields
- Operation type dropdown has 5 options
- Unit dropdown has 3 options (BBL, Gallons, Liters)
- Validates required fields
- Submits form data correctly
- Resets form on success
- Shows toast on success
```

**4. `__tests__/components/ttb-remarks-form.test.tsx`** — Component test
```
Test cases:
- Renders inline remarks editor
- Toggles ttb_reportable checkbox
- Calls updateShrinkageTTBRemarks on submit
- Shows existing remarks in textarea
```

**5. `__tests__/components/reports-gate.test.tsx`** — Component test
```
Test cases:
- Renders children when tier is 'production' or higher
- Shows upgrade message when tier is 'free' or 'nano'
- Does not render report content when gated
```

**6. `__tests__/lib/report-aggregation.test.ts`** — Unit test (if monthly aggregation is extracted to a lib)
```
Test cases:
- Groups batches by month correctly
- Counts completed vs active vs dumped correctly
- Handles 'brewing' status (currently uncounted)
- Computes BBL using average tank capacity
- Handles empty tanks array (defaults to 7 BBL)
- Computes OG/FG averages excluding nulls
- Handles zero-capacity tanks in average
- Grand total sums align with individual months
```

---

## 5.12 Verification Commands

```bash
# 1. Lint (this is useful even without tests)
npm run lint

# 2. Type-check (will catch type issues like BatchStatus)
npm run build

# 3. After writing tests
npm run test -- __tests__/api/compliance-actions.test.ts
npm run test -- __tests__/components/ttb-report-table.test.tsx
npm run test -- __tests__/components/daily-operations-form.test.tsx
npm run test -- __tests__/components/ttb-remarks-form.test.tsx
npm run test -- __tests__/components/reports-gate.test.tsx

# 4. Full coverage check (must still meet thresholds)
npm run test:coverage

# 5. Smoke test (if production build works end-to-end)
npm run e2e:smoke:local
```

---

## 5.13 Sign-Off Checklist

- [ ] Reports data fetching verified (queries, brewery scope, RLS reliance)
- [ ] Monthly aggregation logic verified (grouping, counting, BBL estimation)
- [ ] `BatchStatus` type discrepancy resolved (`'dumped'` + `'brewing'` handling)
- [ ] `'brewing'` status classified in report or documented as unused
- [ ] TTB continuity formula verified (all 6 components)
- [ ] Beginning inventory hardcoded issue documented with fix plan
- [ ] Sanitation logs brewery scope verified (explicit filter or confirmed RLS)
- [ ] Total readings brewery scope verified
- [ ] All 3 compliance actions audited (logDailyOperation, updateRemarks, validateContinuity)
- [ ] All 5 components audited (ReportsGate, TTBReportTable, DailyOperationsForm, TTBRemarksForm, sanitation display)
- [ ] CSV export verified (filename, columns, encoding, grand total)
- [ ] PDF export verified (layout, content, loading state, error handling)
- [ ] Cross-feature integrity verified (Reports↔Batches, ↔Tanks, ↔Shrinkage, ↔DailyOps)
- [ ] Known issues documented with severity and fix plan
- [ ] New tests written and passing
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:coverage` meets thresholds
