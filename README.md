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

## Validation

- `npm run test` runs the Vitest suite, including virtualization helper and component-level table tests.
- `npm run test:components` runs only the component tests for `InventoryTable` and `BatchesTable`.
- `npm run benchmark:virtualization` starts a Next dev server via Playwright and records scroll performance against the public benchmark fixture.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
