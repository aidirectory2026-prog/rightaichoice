# 15 — Automation Reliability & Observability

> **Ownership note (2026-05-30):** this was Phase **9.F** in the parallel Opus
> 4.8 Review plan. It moved here because the 40+ scheduled jobs are dominated by
> the **SEO cron fleet** (GSC / Bing / IndexNow / freshness / weekly digest) that
> Smart SEO owns and keeps extending. Putting reliability + observability where
> the crons live stops the two Phase-9 efforts colliding on the same files
> (`vercel.json`, `lib/pipelines/with-logging.ts`, `/admin/health`).

## Why this matters for SEO specifically

The whole Smart SEO growth loop is now **automated and unattended** ("best
outcome without my laptop on"): every Monday, `snapshot-gsc → triage-gsc →
email-weekly-digest` runs, plus weekly `indexnow-unindexed`, daily Bing submit,
the freshness cascade, and nightly catalog refresh. If any link silently fails,
double-fires, or burns an API quota, **we lose the feedback loop and don't know
it.** A title rewrite whose recrawl signal never fired looks like "SEO didn't
work." So reliability *is* an SEO concern, not just ops hygiene.

## The SEO cron fleet (what we're protecting)

| Job | Schedule | Risk if it breaks |
| --- | --- | --- |
| `snapshot-gsc` (+ `refresh_gsc_tool_positions`) | Mon 06:30 UTC | No fresh GSC data → triage + ranking-bias go stale |
| `triage-gsc` | Mon 07:00 | No weekly action proposals |
| `email-weekly-digest` | Mon 08:00 | Operator never sees the week's work |
| `indexnow-unindexed` | Tue 10:00 | 540 buried tools stop getting re-pinged |
| `submit-urls-bing` | daily | Bing cursor stalls / double-submits |
| `indexnow-recent` | — | new/changed URLs not announced |
| `cascade-hubs`, `refresh-compare-editorials`, `snapshot-daily-updates` | — | freshness signals drift |
| `alert-failed-pipelines` | — | **the watchdog itself** — if it dies, failures go silent |
| GH Actions: `sync-mentions.yml`, `tracking-watchdog.yml` | manual/weekly | freshness bridge + tracking checks |

All wrapped by `cronRoute()` in `lib/pipelines/with-logging.ts`, logging to
`pipeline_runs` (+ `pipeline_alerts_sent` for dedup).

## Workstream (from 9.F, contextualised)

1. **Idempotency / advisory locks.** Wrap cursor-based jobs (`submit-urls-bing`
   cursor, `snapshot-daily-updates`, `poll-gh-actions`, the IndexNow cursors) in
   Postgres advisory locks so an overlapping or retried run can't double-process
   or corrupt the cursor. (Same pattern as the atomic `increment_view_count`
   work in 9.A/9.C.)
2. **Stagger + quota preflight.** Keep the Monday chain spaced (06:30 → 07:00 →
   08:00 already buffered); add an 80%-of-quota preflight check for Bing /
   IndexNow / GSC / Apify / YouTube so a job aborts cleanly instead of
   half-failing mid-run.
3. **Retry/backoff + transient classification** in `lib/pipelines/with-logging.ts`;
   add timeouts to every external call (GSC, Bing, IndexNow, DeepSeek) so a hung
   upstream can't pin a function for the full 300s.
4. **`/admin/health` dashboard** — last run + status per job, 24h failure count,
   staleness (e.g. "snapshot-gsc hasn't succeeded in 8 days"), and quota
   headroom. Reads `pipeline_runs`. This is the single pane of glass for the
   unattended loop.
5. **Consolidate fragile GH-Actions batches → Vercel Fluid Compute** where it
   buys reliability (no runner cold-starts, native Node, 300s timeout). Candidate:
   `sync-mentions` (today manual GH Action) → a cron so the freshness bridge
   refreshes on schedule.
6. **GSC OAuth auto-refresh** (the refresh token must not silently expire — it
   would kill the entire weekly loop) + a `docs/OPERATIONS.md` runbook per job
   (what it does, how to re-run, what its failure looks like) + monthly cost
   reconciliation (Bing/Apify/DeepSeek/Vercel).

## Reliability invariants specific to what we just shipped

- **Freshness must not over-bump.** Fixed 2026-05-30 (`mig 126`): the tools
  freshness trigger is now content-aware. Add a health check that alerts if a
  single day stamps `pages_freshness = now()` for an implausible share of tools
  (the inflation signature) — so a future regression is caught.
- **Recrawl signal actually fires.** When a Tier-1 title is approved we bump
  freshness + ping IndexNow. Log the IndexNow response; alert on a run of
  failures (silent IndexNow = changes invisible to Bing).
- **The Monday chain is all-or-nothing-visible.** If `snapshot-gsc` fails,
  `triage-gsc` should detect "no fresh snapshot" and the digest should say so,
  not send a stale/empty digest that reads as "nothing to do."

## Status (2026-05-30)

- ✅ **#4 `/admin/health` dashboard** — shipped. Reads `pipeline_health()` (mig 130); per job: last status, last-success age, failures 24h/7d, avg duration, 7d cost, last error; sorted worst-first; flags failing + stale (no success in 8d). **Immediately surfaced a real outage: `submit-urls-bing` has failed 6/6 runs this week and never succeeded** — investigate next.
- ✅ **#6 GSC OAuth auto-refresh** — already handled in code: `lib/seo/gsc-client.ts` uses `google-auth-library` to exchange the refresh_token for a fresh access_token on every call. Remaining risk is *refresh-token* expiry if the Google OAuth app is in "testing" mode (7-day expiry) — **operator action: ensure the OAuth consent screen is "In production"**, not testing. No code needed.
- ⏳ Remaining: advisory locks on cursor jobs (#1), quota preflight (#2), retry/backoff (#3), GH-Actions→Fluid migration (#5), runbooks. Lower urgency; do after the active growth work.

## Verify

Force a failure (revoke a token, kill mid-run) → exactly **one** alert fires (no
duplicate spam, no silence). Re-run a cursor job concurrently → no double-process
(advisory lock holds). `/admin/health` shows accurate last-run + staleness for
every job. GSC OAuth refresh survives token rotation. Quota preflight aborts
cleanly at 80%.

## Sequencing

Lower urgency than the active growth work (Tier-1 measurement, Tier-2 content) —
but **rising**: the more of the loop runs unattended, the more a silent failure
costs. Target: ship `/admin/health` + GSC OAuth auto-refresh + advisory locks
first (they protect the loop we depend on weekly), then the rest.
