# BrewBrainOS — Master Audit Plan

**Objective:** Systematic code audit of all core features to guarantee data integrity, logical correctness, zero regressions, and no dead/unnecessary code.

**Approach:** Bottom-up, phase-by-phase — validate data foundations first (Vessels, Batches, Inventory), then derived views (Dashboard, Analytics), then aggregated outputs (Reports).

---

## Phase Execution Order

```
Phase 1: Vessels ─────┐
Phase 2: Batches ─────┤──▶ Phase 4: Dashboard & Analytics ──▶ Phase 5: Reports & Compliance
Phase 3: Inventory ───┘
```

Phases 1–3 can be audited in parallel. Phase 4 depends on 1–3. Phase 5 depends on all prior phases.

---

## Phase Files

| Phase | File | Scope | Priority |
|-------|------|-------|----------|
| 1 | [PHASE_1_VESSELS.md](PHASE_1_VESSELS.md) | Tanks CRUD, sanitation logs, tank↔batch linkage, detail page, 5 server actions, 6 components | MEDIUM |
| 2 | [PHASE_2_BATCHES.md](PHASE_2_BATCHES.md) | Batches CRUD, status transitions, readings, fermentation alerts, offline sync, IoT pipeline, 8 server actions, 10+ components | HIGH |
| 3 | [PHASE_3_INVENTORY.md](PHASE_3_INVENTORY.md) | Inventory CRUD, degradation (HSI/moisture/PPG), shrinkage detection, reorder alerts, import/export, 12+ server actions, 8+ components | HIGH |
| 4 | [PHASE_4_DASHBOARD_ANALYTICS.md](PHASE_4_DASHBOARD_ANALYTICS.md) | Dashboard KPIs, analytics charts, supplier scorecard, gravity trend, reorder/shrinkage dashboards | MEDIUM |
| 5 | [PHASE_5_REPORTS_COMPLIANCE.md](PHASE_5_REPORTS_COMPLIANCE.md) | TTB Form 5130.9, compliance continuity validator, daily operations, CSV/PDF export, FSMA | **CRITICAL** |

---

## Pre-Identified Cross-Phase Issues

These issues span multiple phases and should be tracked globally:

| # | Issue | Phases | Severity |
|---|-------|--------|----------|
| X-1 | `BatchStatus` type missing `'dumped'` — used in Reports (Phase 5) but not defined in `src/types/database.ts` (Phase 2) | 2, 5 | Medium |
| X-2 | `'brewing'` status not counted in any report category — batches in this status are invisible to TTB reports | 2, 5 | Medium |
| X-3 | `updateStock()` / `adjustInventoryStock()` don't create `inventory_history` entries — breaks audit trail used by Analytics and Shrinkage | 3, 4 | Medium |
| X-4 | Dashboard `RealtimeRefresh` only subscribes to `'batches'` table — misses tank/inventory changes | 1, 3, 4 | Low |
| X-5 | Beginning inventory hardcoded to 50 BBL in TTB continuity validation — affects all compliance calculations | 5 | **Critical** |
| X-6 | Sanitation logs query on Reports page has no explicit brewery filter — depends entirely on RLS | 1, 5 | Medium |
| X-7 | `deleteTank()` manual cascade may be redundant with FK `ON DELETE CASCADE` | 1 | Low |
| X-8 | `assignBatch()` hardcodes `'fermenting'` status on tank — incorrect if batch is `'conditioning'` | 1, 2 | Medium |
| X-9 | Daily operations `unit` field not converted to BBL for continuity checks | 5 | Medium |
| X-10 | No transition guards on `updateBatchStatus()` — any status can be set from any status | 2, 5 | Medium |

---

## Test Coverage Gaps (Summary)

Current coverage: **81.71% lines** (threshold: 80%). Barely meets minimum.

### Zero-Coverage Areas (No Test Files Exist)

| Area | Phase | Estimated Tests Needed |
|------|-------|----------------------|
| Reports page & TTBReportTable | 5 | ~15 tests |
| Compliance actions | 5 | ~12 tests |
| DailyOperationsForm | 5 | ~7 tests |
| TTBRemarksForm | 5 | ~4 tests |
| ReportsGate | 5 | ~3 tests |
| Tank CRUD server actions | 1 | ~8 tests |
| Tank detail components (AssignBatchSelect) | 1 | ~5 tests |
| Batch CRUD server actions | 2 | ~10 tests |
| Inventory CRUD server actions | 3 | ~10 tests |
| Shrinkage actions pipeline | 3 | ~8 tests |
| Dashboard KPI computations | 4 | ~6 tests |
| ReorderAlertsDashboard | 4 | ~5 tests |
| ShrinkageDashboard | 4 | ~5 tests |
| Analytics server actions | 4 | ~6 tests |
| Supplier analytics components | 4 | ~8 tests |

**Total estimated new tests: ~110+**

---

## Verification Ladder

Run these commands in order after completing each phase, expanding scope as risk increases:

```bash
# Per-phase (narrow scope)
npm run lint
npm run test -- <phase-specific test files>

# After Phases 1-3 complete
npm run test:coverage
npm run build

# After Phase 4
npm run test:coverage
npm run benchmark:virtualization

# After Phase 5 (full validation)
npm run test:coverage          # Must meet thresholds
npm run lint                   # Zero errors
npm run build                  # Clean production build
npm run e2e:smoke:local        # Smoke tests pass
npm run test:a11y              # Accessibility compliance
npm run verify:sw-precache     # Service worker valid
npm run test:offline-precache  # Offline precache OK
npm run test:offline-queue     # Offline queue OK
```

---

## How to Use This Plan

1. **Open the phase file** for the area you're auditing
2. **Work through each numbered section** — audit items are checkboxes `- [ ]`
3. **Check off each item** as you verify it (or note the bug/fix needed)
4. **Write the tests** listed in the "Tests to Write" section of each phase
5. **Run verification commands** at the bottom of each phase file
6. **Complete the sign-off checklist** before moving to the next phase
7. **Track cross-phase issues** in the table above — resolve after all phases

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `src/types/database.ts` | All TypeScript domain types |
| `supabase/schema.sql` | DB schema, FKs, RLS policies, triggers |
| `src/lib/degradation.ts` | Degradation calculation formulas |
| `src/lib/shrinkage.ts` | Shrinkage anomaly detection |
| `src/lib/fermentation-alerts.ts` | Fermentation alert detection |
| `src/lib/gravity-trend.ts` | Gravity trend sparkline builder |
| `src/lib/table-virtualization.ts` | Table virtualization helpers |
| `src/lib/offlineQueueShared.ts` | Offline queue infrastructure |
| `src/lib/require-brewery.ts` | Brewery-scoped auth guard |
| `vitest.config.ts` | Test configuration + coverage thresholds |
| `playwright.config.ts` | E2E test configuration |
