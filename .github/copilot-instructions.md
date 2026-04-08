# GitHub Copilot Instructions for BrewBrainOS

**Last Updated**: April 8, 2026

## COPILOT EDITS OPERATIONAL GUIDELINES

### PRIME DIRECTIVE
	Preserve BrewBrainOS conventions before inventing new ones.
	Use the current stack and helpers first: Next.js App Router, Supabase SSR helpers, Tailwind CSS v4, Base UI primitives, Sonner, Serwist, Sentry, Vitest, and Playwright.
	Prefer extending existing files and shared utilities over introducing parallel patterns.
	Keep server/client boundaries explicit; do not convert Server Components to client components without a real interactivity or browser-API need.
	Every behavior change must include the narrowest relevant validation before moving on.
	Do not import rules from other projects or instruction files unless the same pattern already exists in BrewBrainOS.

### REQUIRED VALIDATION MINDSET
	Use repository scripts first. Do not invent ad hoc verification commands when a package script already exists.
	Validate the smallest relevant scope first, then expand to broader repo checks when risk warrants it.
	If a change touches environment-sensitive, billing, offline, service-worker, or benchmark behavior, run the matching repo validation commands.
	Treat tests as part of the implementation, not as cleanup work after the fact.

## PROJECT OVERVIEW

BrewBrainOS is a Next.js 16 App Router application for craft brewery operations. The codebase manages brewery-scoped workflows such as batches, tanks, inventory, manual readings, voice logs, degradation tracking, fermentation alerts, analytics, subscriptions, compliance, and offline sync.

### ACTIVE STACK
- Frontend: Next.js 16.2.1, React 19.2.4, TypeScript 5, Tailwind CSS v4.
- Data and auth: Supabase SSR and `@supabase/supabase-js`.
- UI foundation: `@base-ui/react`, `class-variance-authority`, `sonner`, `lucide-react`, `next-themes`, `framer-motion`.
- Offline/PWA: Serwist and `idb-keyval`.
- Billing and integrations: Stripe, web-push, Google Generative AI support.
- Observability: `@sentry/nextjs` plus the local logger.
- Testing: Vitest, Testing Library, Playwright, Axe.

## ARCHITECTURE

### APP ROUTER STRUCTURE
- Use `src/app` as the routing source of truth.
- Keep authenticated application routes inside `src/app/(app)` and public routes outside that group.
- Put Route Handlers in `src/app/api/**/route.ts`.
- Keep shared business and data utilities in `src/lib`.
- Keep shared domain types in `src/types/database.ts`.
- Keep Supabase SSR helpers in `src/utils/supabase`.
- Current API domains include logging, offline sync, Stripe, cron jobs, IoT ingestion, and performance monitoring. Extend those areas instead of creating parallel API surfaces.

### SERVER AND CLIENT BOUNDARIES
- Default to Server Components for pages, layouts, and data reads.
- Add `'use client'` only when a component needs browser APIs, local interactivity, refs, effects, or hooks such as `useFormStatus`.
- Do not move auth, cookie, or server-only Supabase code into client modules.
- Keep middleware lightweight. In this repo, middleware is for session synchronization, not business orchestration.
- Prefer server actions and Route Handlers for writes rather than inventing a client-only fetch layer.

### ROOT RUNTIME PROVIDERS
The root layout already establishes the global runtime stack:
- `ServiceWorkerRegistration`
- `GloveModeScript`
- `GloveModeProvider`
- `ThemeProvider`
- `DeleteConfirmProvider`
- `WebVitalsReporter`
- `Toaster`

Use these existing providers before introducing new global state, new app-wide wrappers, or duplicate infrastructure.

## FRONTEND CONVENTIONS

### COMPONENT LAYERING
- Use `src/components/ui` for reusable UI primitives and low-level composition.
- Use `src/components` for feature components, dialogs, forms, providers, navigation, and page-level building blocks.
- Reuse existing primitives such as `Button`, `Dialog`, `Table`, `Tabs`, `Input`, `Select`, `Badge`, and `Card` before creating custom versions.
- Use existing helper patterns such as `cn` and CVA-based variants instead of duplicating long class strings across components.
- Prefer composition over new abstraction layers when the current component set already solves the problem.

### STYLING AND DESIGN TOKENS
- Style with Tailwind CSS v4 and the tokens defined in `src/app/globals.css`.
- Respect the custom variants already defined in the repo: `dark` and `glove`.
- Use the existing token vocabulary: `background`, `foreground`, `primary`, `card`, `surface`, `divider`, `sidebar`, `muted`, `accent`, `destructive`, `border`, `input`, and `ring`.
- Preserve the current font pairing: `Outfit` for headings and `Inter` for body text.
- Prefer repo-defined utility classes such as `glass`, `glass-hover`, `glow-primary`, and `scrollbar-none` when they fit the current design language.
- Do not introduce a second design system or a separate token namespace.

### NAVIGATION AND LAYOUT
- Follow the current app-shell patterns built around the grouped app layout, sidebar navigation, and command palette behavior.
- Keep route structure aligned with the existing App Router layout instead of introducing alternate shells.
- Preserve responsive behavior across desktop and mobile views.
- Preserve glove-mode accessibility support when touching interaction-heavy UI.
- For empty states, dialogs, tables, and action areas, stay inside the repo's existing visual language rather than switching to generic boilerplate layouts.

### FORMS AND USER FEEDBACK
- Use `FormWithToast` for standard mutation forms when the flow matches the existing pattern.
- Use `SubmitButton` for submit actions that need integrated pending state and `aria-busy` behavior.
- Return standardized `ActionResult<T>`-shaped results for form actions when possible.
- Use Sonner for toast feedback. The root `Toaster` is already configured.
- Preserve the existing `router.refresh()` pattern after successful writes when the mutation affects server-rendered data.
- Keep form payload handling compatible with `FormData` because existing actions and offline sync flows depend on it.

### ACCESSIBILITY
- Continue the repo's accessibility-first testing and markup patterns.
- Prefer semantic HTML and Testing Library queries by role.
- Use `label` and `htmlFor` pairs for form inputs.
- Use `aria-label` for icon-only controls.
- Use `sr-only` text when visual labels are intentionally hidden.
- Preserve `aria-busy`, focus behavior, and keyboard accessibility in dialogs, tables, and form controls.

### DATA-DENSE UI AND PERFORMANCE
- Large tables in this repo already use `@tanstack/react-virtual`; keep that pattern for high-row-count views.
- Reuse helpers in `src/lib/table-virtualization.ts` before inventing new virtualization logic.
- Avoid rendering large unvirtualized lists when the same screen already has a virtualization threshold strategy.
- Use targeted client components, streaming, and server rendering instead of turning entire pages into client-heavy trees.

## DATA, AUTH, AND SECURITY

### SUPABASE AND BREWERY SCOPE
- Supabase is the primary auth and data platform.
- Use the existing server/client Supabase helpers instead of creating parallel client factories.
- Brewery scope matters. For server-side mutations that require an authenticated brewery context, use `requireActiveBrewery()`.
- The active brewery is stored in the `brewbrain_active_brewery` httpOnly cookie and must still belong to the authenticated user.
- Do not add code paths that can operate across breweries without an explicit, reviewed ownership check.

### ROW-LEVEL SECURITY AND SERVICE ROLE USE
- Treat database row-level security as an active security boundary.
- Do not bypass RLS with service-role access in normal user-request flows.
- Keep service-role usage limited to vetted server-side paths such as cron jobs, webhook flows, or backend-only tasks that already require it.
- If a feature can be implemented with the authenticated user context, prefer that over privileged access.

### ROUTE HANDLER SECURITY
- Route Handlers should fail closed when auth, brewery context, secrets, or signatures are missing.
- Preserve the existing secret boundary between `NEXT_PUBLIC_*` variables and server-only secrets.
- Follow the current Stripe webhook, cron-secret, and IoT token patterns instead of inventing weaker alternatives.
- Do not add anonymous mutation endpoints for internal workflows that already depend on auth or bearer-token validation.

### ENVIRONMENT AND SECRET HANDLING
- Use `.env.example` as the canonical environment map.
- Use the existing env verification scripts before build, server, smoke, or migration workflows.
- Do not hardcode secrets, tokens, DSNs, or test credentials in source files, tests, or workflow files.
- When adding new environment variables, update `.env.example` and the relevant validation script profile.

## OFFLINE, PWA, AND OBSERVABILITY

### OFFLINE AND SYNC
- Serwist is the PWA and service-worker layer in this repo. Extend it rather than replacing it.
- Preserve the offline fallback flow and precache validation path.
- Use the existing offline queue infrastructure in `src/lib/offlineQueueShared.ts` for queued manual readings and voice logs.
- Respect the current queue semantics: IndexedDB storage, retry tracking, capped attempts, and exponential backoff.
- Keep the sync endpoints aligned with the existing `/api/sync-voice` and `/api/sync-manual-reading` flow instead of creating ad hoc duplicates.

### MONITORING AND ERROR REPORTING
- Use the existing logger instead of scattering custom `console.*` calls through production paths.
- Keep server-side error capture aligned with the current Sentry integration.
- Keep client-side instrumentation aligned with `src/instrumentation-client.ts` and the current monitoring endpoint pattern.
- If adding telemetry, thread it through the current Sentry or performance-monitoring infrastructure instead of adding a second analytics path.

### FEATURE FLAGS AND BENCHMARKS
- Benchmark and performance-monitoring behavior is already feature-flagged.
- Do not expose benchmark routes or monitoring endpoints broadly without using the current env-flag model.
- When touching benchmark, performance, or offline behavior, validate with the existing Playwright suites and related repo scripts.

## DOMAIN-SPECIFIC GUIDANCE

### BREWERY OPERATIONS DOMAIN
- Reuse the existing domain vocabulary and status unions from `src/types/database.ts`.
- Prefer extending current models for batches, tanks, inventory, readings, degradation, shrinkage, alerts, and subscriptions instead of introducing parallel shapes.
- Keep user-facing behavior brewery-scoped unless a feature is explicitly global.

### DEGRADATION AND INVENTORY NOTES
- Automatic degradation recalculation should continue to derive grain moisture from `grain_moisture_initial`.
- Do not treat `grain_moisture_current` as an implicit manual override unless the schema gains an explicit override flag.
- HSI degraded-state UX should stay aligned with the current warning behavior in inventory views.

## TESTING AND VALIDATION

### TEST REQUIREMENTS
- New behavior is not complete until it has the relevant automated coverage or a documented reason it cannot be covered yet.
- Prefer targeted tests first, but do not skip integration coverage when the feature crosses routing, offline, billing, or auth boundaries.
- Keep tests under `__tests__` using the repo's current structure and naming.

### VITEST
- Use Vitest for unit and component tests.
- Respect the current coverage thresholds:
  - statements: 80
  - branches: 65
  - functions: 75
  - lines: 80
- Use the shared setup file at `__tests__/setup.ts`.
- The repo supports the `@` alias in Vitest config, but if alias resolution becomes unstable in a new test, prefer the simplest reliable import path.

### REACT TESTING LIBRARY
- Prefer queries by role, label, and visible text.
- Mirror the existing component-test style instead of asserting implementation details.
- Use jsdom only where browser behavior is required.
- Favor deterministic mocking with `vi.mock` and keep mock boundaries explicit.

### PLAYWRIGHT
- Use the existing Playwright configuration and repo scripts instead of inventing new browser-test bootstrapping.
- Chromium is the active browser target in this repo.
- Production-mode browser validation matters because offline and service-worker behavior is part of the product.
- For local validation, `next start` after a production build is often more reliable than `next dev` for Playwright runs in this repo.

### REQUIRED VALIDATION COMMANDS
Use the narrowest relevant command first, then escalate when risk increases:
- `npm run test`
- `npm run test:coverage`
- `npm run test:components`
- `npm run test:offline-precache`
- `npm run test:offline-queue`
- `npm run e2e:smoke:local`
- `npm run test:a11y`
- `npm run benchmark:virtualization`
- `npm run lint`
- `npm run build`
- `npm run analyze`
- `npm run verify:env`
- `npm run verify:env:server`
- `npm run verify:env:smoke`
- `npm run verify:env:migrations`
- `npm run verify:sw-precache`

## WORKFLOW AND CI EXPECTATIONS

### LOCAL GUARDRAILS
- Pre-commit currently runs `npm run scan:secrets:staged` and `npx lint-staged`.
- Staged JavaScript and TypeScript files are auto-fixed with ESLint through `.lintstagedrc.json`.
- Preserve these guardrails when modifying local workflow automation.

### CI BEHAVIOR
- Pull request CI currently validates build env, linting, coverage, optional ordered migrations, bundle analysis, and service-worker precache behavior.
- Separate workflows cover smoke testing, accessibility, secret scanning, and security auditing.
- When adding features that touch these areas, keep the matching workflows current rather than letting automation drift behind the implementation.

### CROSS-PLATFORM COMMAND DISCIPLINE
- This repository is actively used on Windows.
- When defining new VS Code tasks or scripted env injection, prefer `options.env`, package scripts, or other cross-platform approaches.
- Do not rely on Unix-only task patterns that break in PowerShell.

## KEY REFERENCE FILES

Use these files as the source of truth before extending a pattern:
- `package.json` for dependencies and repo scripts.
- `README.md` for environment, build, migration, offline, smoke, and benchmark workflows.
- `src/app/layout.tsx` for root providers and app-wide runtime behavior.
- `src/app/(app)/layout.tsx` for the authenticated app shell.
- `src/middleware.ts` for request/session synchronization.
- `src/app/globals.css` for tokens, variants, and typography.
- `src/components/FormWithToast.tsx` and `src/components/SubmitButton.tsx` for mutation-form behavior.
- `src/components/ui/**` for primitive component conventions.
- `src/lib/require-brewery.ts` and `src/lib/active-brewery.ts` for brewery-scoped access rules.
- `src/lib/offlineQueueShared.ts` and `src/app/sw.ts` for offline and sync behavior.
- `src/lib/logger.ts`, `src/lib/sentry.server.ts`, and `src/instrumentation-client.ts` for logging and observability.
- `src/types/database.ts` for domain types and status unions.
- `supabase/schema.sql` for schema, ownership, and policy assumptions.
- `vitest.config.ts` and `playwright.config.ts` for test execution rules.
- `.github/workflows/*.yml` for CI expectations.

## DO NOT INTRODUCE THESE REGRESSIONS
- Do not add a second toast, theme, logging, state-management, or data-fetching stack without an explicit architectural decision.
- Do not replace brewery-scoped auth checks with client-only assumptions.
- Do not bypass existing offline queue and service-worker flows for quick fixes.
- Do not move secrets into `NEXT_PUBLIC_*` variables.
- Do not ship benchmark or debug-only routes as always-on production functionality.
- Do not downgrade accessibility by replacing semantic controls with div-heavy custom widgets when existing primitives already solve the problem.
- Do not copy conventions from unrelated reference projects if the same structure does not already exist in BrewBrainOS.