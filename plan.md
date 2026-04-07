## **Plan: Accessibility — AXE audit**

TL;DR - Add Playwright-driven axe-core scans for the core pages that surface `AddBatchForm` and `BatchesTable` (initial targets: `/batches`, `/benchmarks/virtualization`). Produce structured reports (JSON + human-friendly top-10) and precise code-fix suggestions; run locally with `npx playwright test` and add a CI/reporting job for PRs.

**Steps**
1. Install dev dependency: add `@axe-core/playwright` (and `axe-core` if needed) to devDependencies. (*depends on confirming Node environment*)
2. Add a small axe helper: create a Playwright helper `playwright/a11y/axe-helper.ts` that wraps `@axe-core/playwright` (or injects `axe.min.js`) and exposes `runAxe(page, opts)` returning full violation objects and a sorted, severity-first list.
3. Add E2E a11y tests (two scaffolds):
   1. `playwright/a11y/batches.a11y.spec.ts` — use existing `loginAsTestUser(page)` (from [playwright/helpers.ts](playwright/helpers.ts)); navigate to `/batches`, ensure `AddBatchForm`/`BatchesTable` are visible, run `runAxe`, save results.
   2. `playwright/a11y/virtualization.a11y.spec.ts` — navigate to `/benchmarks/virtualization` (feature-flagged) and run `runAxe` after ensuring virtualization renders rows.
   - For virtualization, ensure the test scrolls/expands enough rows so axe has meaningful DOM to evaluate.
4. Add a report formatter: `playwright/a11y/format-axe-report.ts` that consumes axe results and writes:
   - full JSON to `test-results/a11y/<target>.json`
   - a `top-10` Markdown summary `test-results/a11y/<target>-summary.md` with one-line issue descriptions, impact, failing selectors, and precise suggested code fixes (file path candidates where the fix should be applied).
5. Run a local baseline: execute `npx playwright test playwright/a11y` (or the single spec) and iterate until tests run reliably (address auth, flags, or mocks). Capture the initial top-10.
6. Triage & patch: for the top-10 issues, produce focused code patches addressing each violation. Example fixes (map violations → exact edits):
   - Missing form labels → add `<label htmlFor=...>` and `id` on inputs in [src/components/AddBatchForm.tsx](src/components/AddBatchForm.tsx).
   - Buttons/controls missing accessible names → add `aria-label` or visible text in [src/components/BatchesTable.tsx](src/components/BatchesTable.tsx).
   - Dialogs/modal missing `aria-modal`/focus trap → add attributes and focus management in the dialog wrapper used by `AddBatchForm`.
   - Images lacking `alt` → add descriptive `alt` in relevant component files.
   - Color contrast issues → update CSS variables or classes referenced in `base.css`/component styles to meet contrast ratios.
7. CI integration (non-blocking first): add a GitHub Actions job that runs the a11y Playwright specs after the app build. Upload JSON reports as artifacts and post the summary to the PR. Optionally, set policy to fail CI for `critical` violations only after initial stabilization.
8. Repeat verification: re-run the a11y tests and confirm the top-10 regressions are resolved; include the a11y report in the PR.

**Relevant files**
- **Playwright config:** [playwright.config.ts](playwright.config.ts) — webServer, base URL, timeouts.
- **Playwright helpers:** [playwright/helpers.ts](playwright/helpers.ts) — contains `loginAsTestUser(page)` and other fixtures to reuse.
- **Existing E2E tests (examples):** [playwright/ci/smoke.spec.ts](playwright/ci/smoke.spec.ts), [playwright/virtualization.benchmark.spec.ts](playwright/virtualization.benchmark.spec.ts).
- **Batches page route:** [src/app/(app)/batches/page.tsx](src/app/(app)/batches/page.tsx) — renders the `BatchesExperience` containing both targets.
- **Component targets:** [src/components/AddBatchForm.tsx](src/components/AddBatchForm.tsx), [src/components/BatchesTable.tsx](src/components/BatchesTable.tsx).
- **Unit tests (component-level):** [__tests__/components/add-batch-form.test.tsx](__tests__/components/add-batch-form.test.tsx), [__tests__/components/virtualized-tables.test.tsx](__tests__/components/virtualized-tables.test.tsx).
- **Feature flags:** [src/lib/feature-flags.ts](src/lib/feature-flags.ts) — controls `/benchmarks` availability.
- **Project plan reference:** [LAUNCH_PLAN.md](LAUNCH_PLAN.md) — requested AXE audit.

**Suggested new files** (to create)
- `playwright/a11y/axe-helper.ts` — wrapper for `@axe-core/playwright` that returns parsed violations.
- `playwright/a11y/batches.a11y.spec.ts` — test that logs in and scans `/batches`.
- `playwright/a11y/virtualization.a11y.spec.ts` — public/dev fixture scan.
- `playwright/a11y/format-axe-report.ts` — produce JSON + top-10 Markdown with suggested fixes.

**Verification**
1. Local run: `npx playwright test playwright/a11y` — expect JSON in `test-results/a11y/` and a readable top-10 summary with file candidates.
2. Single spec: `npx playwright test playwright/a11y/batches.a11y.spec.ts` (fast iteration).
3. CI run: PR job executes `npm ci && npm run build && npx playwright test --config=playwright.config.ts --reporter=list playwright/a11y` and uploads `test-results/a11y` artifacts.
4. Triage: confirm fixes remove reported violations in repeated runs; close PR after CI artifacts show top-10 cleared or downgraded.

**Decisions / Assumptions**
- Use `@axe-core/playwright` for minimal scaffold and stable API; fallback: inject `axe.min.js` if preferred.
- `/batches` requires a test account; plan assumes `E2E_TEST_USER_*` env vars or `loginAsTestUser(page)` fixture are available. If not, we will either (A) add a lightweight auth bypass route in dev only, or (B) stub API responses in the Playwright run.
- Initial CI behavior should be non-blocking (report-only) until the baseline fixes are merged.

**Further Considerations**
1. Policy choice: Block on `critical` violations only or treat any violation as a warning? Recommendation: fail CI only for `critical` initially.
2. Do you want me to scaffold the tests + helper files and run a baseline locally, or produce only the plan and proposed file edits? Option A: scaffold + run → I will create files and run tests. Option B: plan only → you or someone on the team implements.
3. If you want automated fix suggestions (patch files), confirm whether I should generate PRs with suggested edits for the top-10 issues.

Estimated effort: scaffold + baseline run — 1–2 hours; triage & targeted fixes for top-10 — 2–6 hours depending on auth/feature-flag complexity.

---

If you approve, I can scaffold the helper and the two a11y Playwright specs next and run a baseline. Would you like me to proceed with scaffolding and a local run?

**User responses (2026-04-07)**
- **Scaffold & Run**: Plan only — do not create files or run tests now.
- **CI policy**: Fail on critical violations only (report-only for lower severities).
- **Auth strategy**: Unspecified (user answered "idk"); recommend using E2E env vars if available or stubbing network calls in Playwright.

**Next steps (based on your choice)**
1. Finalize the plan and hand off the scaffolding to an implementer, or
2. When ready, request scaffolding and I will produce the test helper + specs and run a local baseline.

---
