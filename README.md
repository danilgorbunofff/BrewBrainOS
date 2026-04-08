This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment

Use `.env.example` as the canonical env map for local development, CI, and deployment.

- Copy `.env.example` to `.env.local` for local work and fill in only the values you actually need.
- The `npm run verify:env*` scripts load the same `.env.local` and `.env.*` files that Next.js reads, so they work before `npm run build` as long as your local env file is populated.
- `NEXT_PUBLIC_*` values are intentionally browser-visible; keep server-only secrets such as `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, and `VAPID_PRIVATE_KEY` in GitHub Actions secrets or your deployment secret manager.
- `npm run verify:env` checks the minimum build prerequisites, `npm run verify:env:server` checks the critical server-only runtime secrets, `npm run verify:env:smoke` checks local smoke-test credentials, and `npm run verify:env:migrations` checks ordered migration prerequisites.
- CI build placeholders live in `.github/workflows/ci.yml`; replace them with repository variables or secrets when you want CI to exercise real integrations instead of pure build coverage.
- After editing `.env.local` or any other Next env file, restart `npm run dev` or rerun the build so the updated values are picked up.

## Virtualization Fixture

Run the development server, then open `/dev/virtualization` while signed in to exercise the large-table fixture route.

- The route renders 1,200 inventory rows and 900 batch rows with deterministic data.
- Desktop table virtualization activates once a list exceeds 100 rows.
- The fixture is development-only and returns `404` in production builds.

## Benchmark Route

For automated scroll benchmarks, run the development server and open `/benchmarks/virtualization`.

- The benchmark route is public and development-only so Playwright can exercise the fixture without an authenticated app shell.
- Use `npm run benchmark:virtualization` to capture frame timings and DOM row counts for both virtualized tables.
- The Playwright benchmark attaches a JSON artifact with average frame time, `p95` frame time, dropped frames, and rendered row counts.

## Performance Monitoring

The app now ships a lightweight monitoring path using `src/instrumentation-client.ts`, `useReportWebVitals`, and a local ingestion endpoint.

- `NEXT_PUBLIC_ENABLE_PERF_MONITORING=1` enables beaconing metrics to `/api/monitoring/performance` in production-like environments.
- `NEXT_PUBLIC_PERF_CONSOLE_LOGGING=1` mirrors captured metrics to the browser console.
- `ENABLE_BENCHMARK_ROUTES=1` can be used to expose the benchmark routes outside development if needed for QA builds.

## Error Reporting

Sentry is wired into both browser instrumentation and server-side route handlers via `@sentry/nextjs`.

- Set `SENTRY_DSN` to enable server-side captures for route handlers, cron endpoints, and server logger errors.
- Set `NEXT_PUBLIC_SENTRY_DSN` to enable browser-side captures from `src/instrumentation-client.ts`.
- `SENTRY_ENV` and `SENTRY_TRACES_SAMPLE_RATE` configure server events; `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` configures browser traces.
- Source map upload is not enabled by default; if you want release artifacts in Sentry, add `sentry-cli` and `SENTRY_AUTH_TOKEN` in CI as a follow-up.

## Validation

- `npm run verify:env` confirms the minimum production build env is present before you run `npm run build`, using shell variables plus the local Next env files when present.
- `npm run verify:env:server` confirms the server-only secrets required by cron, Stripe, and service-role flows.
- `npm run verify:env:smoke` confirms the dedicated Playwright account is configured locally.
- `npm run verify:env:migrations` confirms ordered migration validation has a database target.
- `npm run test` runs the Vitest suite, including virtualization helper and component-level table tests.
- `npm run test:components` runs only the component tests for `InventoryTable` and `BatchesTable`.
- `npm run db:migrate:ordered` applies the canonical ordered SQL track in `supabase/migrations/ordered` to the database referenced by `SUPABASE_DB_URL`.
- `npm run verify:sw-precache` checks the generated `public/sw.js` after a production build and fails if any precache entry still uses `revision: null` or if the offline fallback is missing.
- `npm run test:offline-precache` starts the production server from an existing build and verifies the service worker serves the offline fallback during a disconnected navigation.
- `npm run test:offline-queue` starts the production server from an existing build and verifies queued voice logs flush correctly, including the cross-tab processing lock.
- `npm run e2e:smoke:local` starts the production server from an existing build and runs the lightweight Playwright smoke suite for login, batch creation, and offline sync.
- `npm run benchmark:virtualization` starts a Next dev server via Playwright and records scroll performance against the public benchmark fixture.

## Database Migrations

The repository keeps legacy feature migrations in `supabase/migrations`, but the canonical clean-install path now lives in `supabase/migrations/ordered`.

- Use `supabase/migrations/ordered` for fresh environments and staged rollouts.
- See `supabase/migrations/RECONCILIATION.md` for the legacy-to-canonical mapping, rollout sequence, and verification queries.
- `008_indexes_concurrent.sql` must be applied outside an explicit transaction.
- CI can validate the ordered track when `SUPABASE_MIGRATION_DB_URL` is configured as a repository secret.

## Smoke E2E Setup

The CI smoke workflow builds the production app, boots `next start`, and runs `playwright/ci/smoke.spec.ts` against Chromium only.

- Start from `.env.example`, then run `npm run verify:env` before `npm run build` and `npm run verify:env:smoke` before any production-mode Playwright run.
- Optional error reporting secrets for build/runtime: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENV`, `SENTRY_TRACES_SAMPLE_RATE`, and `SENTRY_AUTH_TOKEN` if you later enable source-map uploads.
- Benchmark fixture prerequisite: export `ENABLE_BENCHMARK_ROUTES=1` for the smoke suite so the public offline-sync benchmark route remains available in production-mode Playwright runs.
- Offline queue local verification: after `npm run build`, run `npm run test:offline-queue` to exercise the dedicated offline queue E2E coverage against `next start`.
- Test account prerequisites: export `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD` for a dedicated Supabase user that already owns at least one brewery.
- Local run sequence: `npm run build` and then `npm run e2e:smoke:local`.
- GitHub Actions secrets required by `.github/workflows/playwright-smoke.yml`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `E2E_TEST_USER_EMAIL`, and `E2E_TEST_USER_PASSWORD`.
- GitHub Actions repository secrets or variables recommended for `.github/workflows/ci.yml`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, and `SUPABASE_MIGRATION_DB_URL` when ordered migration validation is enabled.
- Rotation guidance: keep the smoke account isolated from real brewery data, store only the public Supabase URL and anon key in repo secrets, and rotate the password or replace the account whenever CI access changes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
