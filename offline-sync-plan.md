## Plan: Offline sync & Active Brewery race fixes

TL;DR - Fix multi-tab/offline race conditions by adding client-side coordination, server-side idempotency, robust retry semantics, and safer UI fallbacks. Quick mitigations: propagate a client `external_id` for queued actions and add a cross-tab claim to prevent duplicate processing. Medium work: let the Service Worker flush the queue, add exponential backoff and retries, and add DB-side unique keys to make ingest idempotent.

**Steps**
1. Quick mitigations (safe, low-risk)
- Add `external_id` to queued actions and send it to server actions; server should ignore duplicate `external_id` (idempotency). *Depends on Step 4 (DB migration) for full guarantee but useful immediately.*
- Fix `ManualReadingForm` to always clear pending state (try/finally) and add an offline enqueue path to queue manual readings.
- Add a cross-tab claim/lock (BroadcastChannel or IndexedDB lease) around `processQueue()` so only one tab processes at a time.

2. Make Service Worker able to flush the queue when no clients are open (medium risk)
- Move queue storage to an SW-readable IndexedDB store, or duplicate a small reader in SW, and allow SW `sync` handler to POST queued items to the server with `external_id`.

3. Robust retry semantics (medium)
- Add per-item `attempts`, `lastAttemptAt`, and `nextAttemptAt` fields. Classify server errors as transient vs permanent. Use exponential backoff for transient errors and a max attempts cap.

4. Server-side idempotency & DB migration (high impact)
- Add `external_id` (UUID) column to `batch_readings` and create a unique index or a separate `processed_events` table. Make server ingest use upsert/ignore semantics on `external_id`.

5. Optional: Optimistic UI for batch creation (low/medium)
- Add temporary local entries with client-side IDs for `AddBatchForm` and confirm/replace after server response. Rollback on permanent failure.

6. Error handling & UI resilience
- Ensure `FormWithToast` and forms catch server action errors and do not leave UI in a stuck state. Add component-level error boundaries where long-lived components perform network actions.

7. Tests and verification (parallel)
- Unit tests for `enqueueAction()` and `processQueue()` logic (mock `idb-keyval` and server actions).
- Playwright cross-tab test: ensure only one ingestion occurs when two clients/processes attempt to flush the same queue.
- Offline→background sync E2E: record voice/manual reading while offline, simulate background sync, assert single server insert.

**Relevant files**
- [src/lib/offlineQueue.ts](src/lib/offlineQueue.ts) — `enqueueAction()`, `processQueue()`, `useOfflineQueue()` (primary queue logic)
- [src/app/sw.ts](src/app/sw.ts) and [public/sw.js](public/sw.js) — service worker `sync` handler (currently posts messages to clients)
- [src/components/ManualReadingForm.tsx](src/components/ManualReadingForm.tsx) — manual gravity submission UI
- [src/components/AddBatchForm.tsx](src/components/AddBatchForm.tsx) — batch creation UI (optimistic UI candidate)
- [src/components/FormWithToast.tsx](src/components/FormWithToast.tsx) — generic action wrapper; ensure consistent error handling
- [src/app/actions/voice.ts](src/app/actions/voice.ts) and [src/app/(app)/batches/[id]/actions.ts](src/app/(app)/batches/[id]/actions.ts) — server actions that insert `batch_readings` (must accept `external_id` and dedupe)
- [src/lib/active-brewery.ts](src/lib/active-brewery.ts) — active-brewery cookie behavior (note: server-driven; no client queue)
- `supabase/schema.sql` or migrations — add `external_id` unique constraint for `batch_readings`

**Verification**
- Unit: run `pnpm test` (runs `vitest`) and add tests for `offlineQueue` behaviors and `ManualReadingForm` error handling.
- Playwright: run the cross-tab and offline→sync tests (use existing `playwright/virtualization.benchmark.spec.ts` as template).
- Manual checks: simulate connection flapping while submitting a gravity reading to verify UI stays responsive, the reading is queued or retried, and server ends up with a single row.

**Decisions / Assumptions**
- Prefer adding `external_id` and server dedupe first (low surface area, high impact).
- Use `BroadcastChannel` for cross-tab locking as a minimal mitigation; follow-up with IndexedDB lease if more robust recovery needed.
- SW-based queue flushing is more invasive (affects build/deploy) — plan it as second-phase work.

**Further considerations**
1. DB migration strategy: add `external_id` column `NULLABLE` + backfill or use a separate `processed_events` table to avoid downtime.
2. UX: surface queued item counts and retry/failure state in `OfflineSyncBanner` (already present) so users know when items are pending or have permanent errors.

**Next step (suggested)**
- Implement Quick Mitigations first: (A) propagate `external_id` and server dedupe, (B) add cross-tab claim around `processQueue()`, (C) fix `ManualReadingForm` pending handling and offline enqueue. This reduces duplicates and immediate user-facing breakage.

**Files to change in first PR**
- [src/lib/offlineQueue.ts](src/lib/offlineQueue.ts) — add `external_id`, attempt counters, BroadcastChannel claim
- [src/components/ManualReadingForm.tsx](src/components/ManualReadingForm.tsx) — try/finally, enqueue fallback
- [src/app/actions/voice.ts](src/app/actions/voice.ts) and [src/app/(app)/batches/[id]/actions.ts](src/app/(app)/batches/[id]/actions.ts) — accept and dedupe `external_id`
- `supabase/migrations/` or `supabase/schema.sql` — add unique constraint on `batch_readings.external_id`

Saved to session memory at `/memories/session/plan.md` for tracking and iteration.

If you approve, I can switch out of Plan mode and create the file for you.
