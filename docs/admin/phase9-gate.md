# Phase 10.9 gate — permanent nightly verification (FINAL phase)

Date: 2026-06-13. Branch `phase10-admin` (worktree `rac-phase10-admin`), built
on `8a5b869` (Phase 10.8 merged). All gates run locally before staging; the
orchestrator commits + runs the prod smoke + the destructive negative test.

## What shipped (units)

1. **tracking_health writer + nightly orchestrator**
   - `lib/cron/tracking-health-writer.ts` — single typed helper to upsert a
     `tracking_health` row (`writeHealthRow` / `writeHealthRows`) via the
     service-role admin client. Column contract lives here.
   - `scripts/audit/nightly-verify.ts` — runs the full cycle in order and lands
     ONE row per mean under a SINGLE shared `run_at`: `V_registry`, `V_schema`
     (reads I9 from the in-DB batch), `V_synthetic`, `V_filters`, `V_mixpanel`,
     `V_invariants` (rolls up the latest pg_cron I* batch). Resilient: a thrown
     mean → a `fail` row, never a crash that skips the rest; all rows written
     before exit; non-zero exit on any fail. Reuses the existing scripts
     verbatim (child process), never reimplements the suites.
   - `package.json` — `tracking:nightly` script.
2. **Nightly workflow** — `.github/workflows/nightly-verify.yml`: 21:00 UTC
   (after the 19:30 UTC pg_cron invariants) + `workflow_dispatch`. checkout →
   node 20 → npm ci → install Chrome → build → start `next start` (background,
   `wait-on`) → run the orchestrator against localhost with repo secrets → stop
   server. The existing `tracking-watchdog.yml` (8AM UTC reader/alerter) is
   untouched.
3. **/admin/tracking-health rebuilt** — `app/admin/tracking-health/page.tsx`:
   latest-cycle table (V_* + I* of the newest batch), invariant history (last
   30 batches as pass/warn/fail strips), schema-violation trend (I9 over recent
   runs, DailyChart), and the per-event verified wall (every fired event ×
   synthetic-coverage.json with last status/mode/lifecycle; green wall = all
   proven). Single existing route — already in `lib/admin/nav.ts`, no nav change.

## Iron rule

No events/properties touched — 97/97 unchanged. New `V_*` check_keys are
tracking_health rows, not analytics events (no schema needed); documented above.

## Gates

| # | Gate | Result |
|---|------|--------|
| 1 | `npm run tracking:schema` | GREEN — 147 defined, **97 fired = 97 schema'd**, callsites clean (123 sites, gen.json unchanged — new page introduces no false firing sites) |
| 2 | `npm run tracking:synthetic` (full) | GREEN — **97/97**, dedup 3/3, negative PASS, channel probes PASS; cleanup verified 0 rows remain |
| 3 | Snapshot vs `post-phase8.json` | **0 changed / 0 added / 0 removed** (53 pinned). `post-phase9.json` written |
| 4 | `npm run tracking:filters` | **36/36** GREEN (15 combos × 2 + 6 extended) |
| 5 | authed-smoke (prod build, localhost) | All routes 200/307 incl `/admin/tracking-health` (200) |
| 6 | `npm run build` | exit 0 |
| 7 | Full nightly cycle locally (server running) | GREEN — see rows below; wrote 6 rows under `run_at=2026-06-13T12:35:18.047Z` |
| 8 | Negative test (banner goes red) | PASS — see procedure below |
| 9 | No stray servers/Chrome/test rows | server stopped, no stray procs, negative-test row deleted (0 remaining) |

### Gate 7 — nightly cycle green rows (`run_at=2026-06-13T12:35:18.047Z`)

Verified in prod DB:

```
V_registry    pass   value=—   event registry consistent — ADMIN_CONSUMED⊆FIRED, FIRED⟷EVENT_SCHEMAS …
V_schema      pass   value=0   schema_valid=false rate over last 24h = 0% (warn >1, fail >5) — from I9
V_synthetic   pass   value=—   synthetic suite GREEN — 97/97, dedup 3/3, negative pass, channel probes pass
V_filters     pass   value=—   filter matrix GREEN — every combo matches independent raw SQL (36 checks)
V_mixpanel    pass   value=—   Mixpanel reconciliation — service-account auth + /track ingestion verified
V_invariants  warn   value=13  13 invariants — warn: I8_affiliate_bot_share, I10_session_coverage
```

All five V_* verification means are PASS. `V_invariants` is WARN because the
in-DB invariant batch carries two pre-existing SOFT warns (I8 affiliate bot
share, I10 session coverage) that exist independent of this phase — not a fail.
The banner therefore renders AMBER for this batch, which is correct.

### Gate 8 — negative test (procedure + result)

Goal: prove an intentionally-broken check produces a `fail` row under a fresh
`run_at` such that `getTrackingTrustStatus()` (app/admin/layout.tsx) returns
'fail' and the banner goes red. Done as a reversible simulation (the spec's
allowed path):

1. Insert one tagged fail row under a future `run_at` so it is the newest batch:
   `insert into tracking_health(run_at, check_key, status, value, threshold, detail)
    values ('2026-06-13T23:59:59.000Z', 'V_NEGATIVE_TEST', 'fail', 1, 0, '… intentional …');`
2. Reproduce the banner logic exactly (newest run_at batch; fail wins):
   result `newest_run_at=2026-06-13 23:59:59`, `has_fail=true`,
   **`banner_status=fail`** → banner would render RED ("Tracking trust check
   failing — see Tracking health").
3. Delete the row: `delete from tracking_health where check_key='V_NEGATIVE_TEST'`.
   Verified `negtest_rows_remaining=0`; newest batch reverts to the real cycle
   `2026-06-13 12:35:18.047` with `banner_now=warn`.

Alternative live path (for the orchestrator to optionally run): temporarily
break one event recipe / point the synthetic suite at a deliberately-wrong
expectation → `nightly-verify.ts` writes `V_synthetic=fail` under a fresh
run_at → banner red → revert the break, re-run, banner green again.

## Deviations / notes

- The admin Supabase client is generically typed and does not carry
  `tracking_health`, so the writer casts `getAdminClient() as any` for inserts —
  the same pattern the audit scripts already use for RPC calls.
- `docs/admin/synthetic-coverage.json` was regenerated by gate 2 (same 97
  events / same statuses; only runid/timestamps/ms churn). It is the data source
  for the verified wall, so the refreshed copy is staged.
- No migration applied — `tracking_health` already exists (migration 164 etc.);
  this phase adds no DDL.
- `wait-on` is invoked via `npx` in CI (not added as a dep) — standard pattern.
