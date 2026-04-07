## Plan: Launch-ready AI prompts

TL;DR - A compact, prioritized catalog of ready-to-paste AI prompts to help polish, harden, and prepare your app for launch. Use these prompts to (a) audit, (b) generate patches/tests/configs, and (c) verify changes. Start with the High-priority items.

**Steps**
1. Pick 1–3 High-priority prompts (Build/CI, PWA/SW, Tests, Security).  
2. For each prompt: run the AI, request a patch/PR, apply, and run the verification command.  
3. Open a PR per logical change, run CI, and deploy to staging for smoke tests.  
4. Iterate on Medium and Low items after staging approval.

**Relevant files**
- [package.json](package.json) — scripts and deps.  
- [next.config.ts](next.config.ts) — Next.js runtime and build flags.  
- [public/sw.js](public/sw.js) — service worker precache/runtime.  
- [public/manifest.json](public/manifest.json) — PWA metadata.  
- [src/app/sw.ts](src/app/sw.ts) — Serwist/Service Worker config.  
- [supabase/schema.sql](supabase/schema.sql) — DB schema.  
- [supabase/migrations/](supabase/migrations/) — DB migrations.  
- [__tests__/](__tests__/) — unit/integration tests.  
- [vitest.config.ts](vitest.config.ts) — unit test config.  
- [playwright.config.ts](playwright.config.ts) — E2E config.  
- [src/lib/offlineQueue.ts](src/lib/offlineQueue.ts) — offline sync queue.  
- [src/instrumentation-client.ts](src/instrumentation-client.ts) — telemetry init.  
- [eslint.config.mjs](eslint.config.mjs) — lint rules.  
- [README.md](README.md) — onboarding and deploy notes.

**Verification**
- `npm run build` — production build success.  
- `npm run lint` — linting clean.  
- `npm run test` — unit tests pass & coverage.  
- `npx playwright test` — E2E smoke.  
- `npm audit --json` — dependency vulnerabilities.

**Decisions / Assumptions**
- Target deployment (Vercel vs Docker) will affect CI and Dockerfile needs.  
- I assume PR-based workflow (GitHub); confirm if you use another CI.  
- Confirm if I should implement patches/PRs or only produce task lists.

**Top Prompts (copy-paste-ready)**

- **Build & CI — Audit build**: "Run a production build for this repo and return warnings or errors, focusing on service-worker and webpack/Serwist build warnings. Provide a short remediation checklist and the exact file locations to change."  
  - Expected: build log + remediation checklist.  
  - Verify: `npm run build`

- **Build & CI — Add CI**: "Create a GitHub Actions workflow `.github/workflows/ci.yml` that runs `npm ci`, `npm run lint`, `npm run test`, and `NODE_ENV=production npm run build` for PRs. Return the workflow file as a patch."  
  - Expected: workflow file patch.  
  - Verify: open PR & observe CI run

- **PWA & Service Worker — Fix precache**: "Audit `public/sw.js` for precache entries with missing `revision`. Update `src/app/sw.ts` (Serwist config) so precache uses hashed asset keys or explicit revisions; add an `/offline` fallback page if missing. Return code patches and a short test plan."  
  - Expected: code patches + test plan.  
  - Verify: `npm run build` and SW precache warnings resolved

- **Tests — Coverage audit**: "Run Vitest with coverage and list files with coverage <80%, then propose 3 high-impact unit tests to add (include filenames and brief test bodies)."  
  - Expected: coverage report + test TODOs or test code snippets.  
  - Verify: `npm run test`

- **Tests — Add CI E2E**: "Add a CI job to run a minimal Playwright smoke suite (login, create batch, offline sync) against a production build. Produce workflow patch + test scaffold."  
  - Expected: workflow patch + test scaffold.  
  - Verify: `npx playwright test`

- **Security — Repo secrets & audit**: "Scan the repo for likely secrets (API_KEY, SECRET, PRIVATE_KEY patterns). List offending files and provide remediation steps (rotate keys, add .env.example)."  
  - Expected: secrets audit + remediation checklist.  
  - Verify: `git grep -n "API_KEY\|SECRET\|PRIVATE_KEY" || true`

- **Security — Add audit job**: "Add a GitHub Action that runs `npm audit --audit-level=moderate` and an optional secrets scan (trufflehog or similar). Return workflow patch."  
  - Expected: workflow patch.  
  - Verify: CI run or `npm audit --json`

+=================================

- **Supabase — Migrations plan**: "Convert `supabase/schema.sql` to ordered migration files in `supabase/migrations/`. Flag any destructive operations and recommend safety steps. Return migration plan and file list."  
  - Expected: migration plan + suggested migration files.  
  - Verify: apply to a dev DB or run migration sanity checks

- **Observability — Add error reporting**: "Add minimal Sentry initialization in `src/instrumentation-client.ts` and add server-side error capturing wrappers for API routes. Provide code patches and a test that simulates an error to ensure capture."  
  - Expected: patch + test steps.  
  - Verify: `npm run build` and synthetic test

- **Offline sync — E2E test**: "Add a Playwright test that simulates offline data entry, returns online, and verifies the offline queue flushes successfully in `src/lib/offlineQueue.ts`. Return test file patch."  
  - Expected: E2E test patch.  
  - Verify: `npx playwright test` (offline spec)

  =============================
Doing task
- **Stripe — Webhook safety**: "Audit Stripe webhook handlers and patch to use `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` and idempotency keys. Return code patch."  
  - Expected: webhook handler patch.  
  - Verify: `npm run build`

- **ESLint / Prettier — Enforce**: "Run ESLint and list top 30 auto-fixable problems; update `package.json` scripts and add a Husky pre-commit hook to run lint-staged for staged files. Return patches."  
  - Expected: lint fix list + config patch.  
  - Verify: `npm run lint`

- **Accessibility — AXE audit**: "Run an axe-core accessibility scan via Playwright on core pages (AddBatchForm, BatchesTable) and return top 10 issues with exact code fixes (e.g., missing labels, ARIA attributes)."  
  - Expected: report + precise fix suggestions.  
  - Verify: `npx playwright test`

  ===============================

- **Performance — Bundle analysis**: "Run a Next production build with bundle analysis and list the top 10 largest modules; recommend immediate refactors (dynamic import, tree-shake)."  
  - Expected: bundle report + suggestions.  
  - Verify: `npm run build`

- **Docs & Onboarding — .env.example**: "Generate a `.env.example` listing required env vars (NEXT_PUBLIC_*, STRIPE_*, SUPABASE_*, etc.) based on code usage. Return file content."  
  - Expected: `.env.example` content.  
  - Verify: open `.env.example`

**Verification checklist (quick)**
- `npm run build`
- `npm run lint`
- `npm run test`
- `npx playwright test` (smoke)
- `npm audit --json`

**Further considerations**
1. Decide deployment target: Vercel (simpler) or Docker (control).  
2. Confirm whether I should implement patches/PRs or only produce guidance.  
3. Which third-party services to use for error reporting (Sentry) and secrets scanning.
