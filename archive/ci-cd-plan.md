Plan: PR CI Workflow
TL;DR — Add a GitHub Actions workflow at .github/workflows/ci.yml that runs on pull requests, uses Node 20 with npm cache, and executes npm ci, npm run lint, npm run test, then NODE_ENV=production npm run build. Use placeholder Supabase env values for the build step so the production build can be validated without repo secrets.

Steps

Create the workflow file at .github/workflows/ci.yml.
Trigger: pull_request (no branch filter by default).
Job: runs-on: ubuntu-latest. Steps:
actions/checkout@v4
actions/setup-node@v4 with node-version: 20 and cache: 'npm'
npm ci
npm run lint
npm run test
Build step with NODE_ENV=production and placeholder env vars for Supabase.
Provide non-empty placeholder values for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the build step. Ensure the URL does not include localhost to avoid the production warning in the code.
Keep the initial workflow minimal: no Playwright, artifacts, or deploy steps. If build fails due to runtime secrets, replace placeholders with GitHub secrets in a follow-up change.
Relevant files

package.json — scripts to run (lint, test, build)
package-lock.json — enables npm ci and npm caching
next.config.ts — confirms next build --webpack
vitest.config.ts — confirms npm run test uses Vitest (no Playwright)
server.ts
client.ts
middleware.ts
Verification
Run locally (or inspect CI run) to confirm steps succeed:

Decisions

Node version: 20
Build env: use placeholder NEXT_PUBLIC_SUPABASE_* variables initially
Scope: single PR-validation workflow only (no E2E/Playwright)
Further considerations

If placeholders fail, switch only the build step to use GitHub secrets.
Optionally add Playwright/E2E in a separate workflow later.
Consider adding an engines.node field to package.json to pin Node for developers and CI.