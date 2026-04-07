# Security Policy

## Reporting a Vulnerability

Do not open a public issue with a live secret, exploit payload, or reproduction that exposes customer data.

- Preferred: use GitHub private vulnerability reporting if this repository is hosted on GitHub.
- Fallback: contact the repository owner or deployment owner directly and share only the minimum detail required to reproduce the issue.
- Include the affected environment, the file or endpoint involved, when the issue was discovered, and whether any credential appears to have been exposed.

## Secret Exposure Response

If a secret is committed or published anywhere in this repository, treat it as compromised.

1. Contain the incident.
   Stop any automation or integrations that rely on the exposed credential if misuse is possible.
2. Rotate the credential at the provider before changing git history.
   Assume the old value can no longer be trusted.
3. Update deployment secret stores.
   Replace the old value in GitHub Actions, Vercel, Supabase, cron providers, and any local `.env` files.
4. Remove the secret from the repository.
   Clean the working tree first, then rewrite history with `git-filter-repo` or BFG if the value was ever committed.
5. Re-run scans.
   Use the local scan script, the PR workflow, and a history scan to confirm the cleanup.

## Rotation Notes By Provider

- Supabase: rotate project API credentials or the JWT signing secret in the Supabase dashboard, then replace any affected `SUPABASE_SERVICE_ROLE_KEY` values in deployment stores.
- Stripe: rotate restricted or secret API keys in the Stripe dashboard and regenerate any `STRIPE_WEBHOOK_SECRET` values for affected webhook endpoints.
- Web Push: generate a fresh VAPID keypair with `npx web-push generate-vapid-keys`, then update both `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
- Cron authentication: generate a new secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and replace `CRON_SECRET` anywhere it is used.
- Gemini or other third-party API keys: revoke or rotate the exposed key in the provider console and update deployment stores before re-enabling traffic.

## Repository Guardrails

- `.env*` files are ignored by git, with `.env.example` kept as the committed template.
- `npm run scan:secrets` scans the current working tree with `gitleaks`.
- `npm run scan:secrets:staged` scans only staged content and is wired into the Husky pre-commit hook.
- `.github/workflows/secrets-scan.yml` blocks pull requests on working-tree findings and can scan full git history on `main` or manual dispatch.

## History Rewrite Guidance

If a real secret was committed in the past, cleaning the current working tree is not enough.

1. Rotate the credential first.
2. Mirror-clone the repository.
3. Rewrite history with `git-filter-repo --replace-text` or BFG.
4. Force-push the rewritten history.
5. Require collaborators to re-clone.
6. Re-run the history scan workflow.

## Verification

- `npm run scan:secrets`
- `npm run scan:secrets:staged`
- For ad hoc JSON reports, write them outside the repository or into a temporary directory so the report itself does not become a secret-bearing artifact.
- `git grep -n "API_KEY\|SECRET\|PRIVATE_KEY\|SUPABASE_SERVICE_ROLE_KEY\|STRIPE_SECRET_KEY\|VAPID_PRIVATE_KEY\|CRON_SECRET" || true`
- GitHub Actions workflow: `Secrets Scan`