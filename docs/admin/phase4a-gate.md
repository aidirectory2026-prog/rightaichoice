# Phase 4 chunk A gate — pixels changed, numbers didn't

**Date:** 2026-06-12 (IST) · **Branch:** `phase10-admin` · **Baseline:** `post-phase2.json` (gen 2026-06-11T09:59Z) vs `post-phase4a.json` (gen 2026-06-11T19:27Z)

## Result

| Check | Result |
| --- | --- |
| Pinned keys compared | 39 / 39 |
| Pinned values changed by this chunk | **0** |
| Pinned values drifted by a pre-existing DB-side bug | 2 (one sub-field, `avg_days_between`, +0.1 each — see below) |
| Snapshot errors / nondeterministic | 0 / 0 |
| `npx tsc --noEmit` | clean |
| `npm run build` | passes (249 static-gen entries; +1 from new `/admin/resources`, rest unchanged) |
| Nav route check (30 routes, dev server) | all 307 → `/login` (auth gate renders), **0 × 5xx** |
| Trust-banner query live probe | OK — latest `tracking_health` batch = 11 checks, worst = `warn` (amber banner renders) |

## The 2 "changed" keys are environment drift, not a regression

`insights.getReturningSummary.humans` and `.withBots` changed **only** in the
`avg_days_between` sub-field (12.2→12.3 and 9.3→9.4). All counts
(`total`, `new_count`, `returning_count`, `returning_pct`) are byte-identical.

Proof this chunk didn't cause it:

1. **Code innocence:** `git diff 2ad993b..HEAD` over the snapshot's complete
   import graph (`app/admin/insights/queries.ts`, `lib/admin/range.ts`,
   `lib/admin/plan-conversion.ts`, `lib/cron/supabase-admin.ts`,
   `scripts/audit/snapshot-admin-metrics.ts`) is **empty** — the snapshot ran
   byte-identical query code to main @ 2ad993b. This chunk only touched
   layout/sidebar/chart-kit/redirect files, which the snapshot never imports.
2. **Root cause is in the database function**, not in app code:
   `insights_returning_visitors` (supabase/migrations/149_window_membership_fixes.sql)
   computes the `lifetime` CTE as `max(ue.created_at) AS last_seen` with **no
   `p_end` cap**, and `avg_days_between = avg(last_seen − first_seen)` over
   returning visitors. So for a pinned historical window, any returning
   visitor who is *still active today* keeps extending `last_seen`, and the
   average creeps up in real time. The two baselines were generated 9.5 h
   apart — exactly the observed +0.1 d drift.
3. **Stable intra-day:** an immediate re-run (`drift-probe`, deleted after
   diffing) matched `post-phase4a.json` on **all 39 pinned keys (0 diffs)**,
   and every snap is executed twice inside the harness (deterministic=true) —
   so this is monotonic wall-clock drift, not flakiness.

**Follow-up (Phase 5b, numbers-allowed chunk):** either cap `last_seen` at
`p_end` in the RPC (makes the metric window-pure) or move `avg_days_between`
to the snapshot's `volatile` section. Out of scope here — this chunk is
explicitly pixels-not-numbers and must not alter live metrics or apply DDL.

## Route check detail

Every route in `lib/admin/nav.ts` plus the two legacy redirects
(`/admin/insights/charts-test`, `/admin/analytics`) was curled against the
dev server unauthenticated: all 30 returned `307 → /login` (the layout's auth
gate, i.e. the route renders); no 404s, no 500s. All nav routes existed on
disk; the only one created was `/admin/resources` (placeholder, per spec) —
none omitted.
