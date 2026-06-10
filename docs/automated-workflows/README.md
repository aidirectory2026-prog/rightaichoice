# Automated Workflows — RightAIChoice

Complete documentation for every automated pipeline that keeps RightAIChoice fresh
without manual intervention.

> **CURRENT STATE — updated 2026-06-10 (Phase 10).** This README is the authoritative,
> up-to-date inventory. The per-topic files `01-09` in this folder are older deep-dives
> (April 2026) and are partially stale — trust the tables below for schedules/engines.
> Key shifts since those were written: **DeepSeek** (not Anthropic) powers data-layer
> synthesis; the refresh pipeline is **tier-aware with a ≤3-day SLA**; reliability/
> freshness **monitoring runs in Postgres via pg_cron**; and the frequent monitors run as
> **native Vercel crons** (GitHub throttles frequent schedules).

## Architecture (three schedulers)

```
1) Vercel Cron  ──► /api/cron/*  ──► lib/cron/*  ──► Supabase + DeepSeek/Anthropic + external
   (reliable, any frequency on Pro; auth via CRON_SECRET bearer that Vercel injects)

2) GitHub Actions ──► curl -X POST /api/cron/*  (heavy/long jobs that exceed Vercel's
   function runtime — e.g. the nightly refresh batch). Auth via CRON_SECRET.

3) pg_cron (in Supabase) ──► SQL run inside the DB. Used for maintenance + monitoring that
   must NOT depend on an HTTP layer (it's what catches a dead HTTP cron).
```

Every HTTP cron is wrapped by `withPipelineLogging`/`cronRoute` → one row per run in
`pipeline_runs` (status, timing, tokens, cost, errors), surfaced at `/admin/updates`.

---

## 1) Vercel Crons (`vercel.json`) — 17 jobs

| Path | Schedule (UTC) | Purpose |
|------|----------------|---------|
| `/api/cron/cascade-hubs` | `0 * * * *` (hourly) | Freshness cascade — ISR-revalidate changed pages + IndexNow ping. **(Phase 10: revived — was orphaned/broken.)** |
| `/api/cron/onboard-tools` | `7,37 * * * *` | Fast lane — finish onboarding already-published tools. |
| `/api/cron/onboard-tools?mode=sop` | `17,47 * * * *` | **(Phase 10)** Draft gate — publish `is_published=false` tools only once all quality gates pass. |
| `/api/cron/poll-gh-actions` | `*/10 * * * *` | **(Phase 10: moved here from GH)** Sync GH Actions runs → `pipeline_runs` + reconcile in-flight runs. |
| `/api/cron/alert-failed-pipelines` | `*/30 * * * *` | **(Phase 10: moved here from GH)** Email/Slack failure + stuck-running alerts. |
| `/api/cron/calculate-viability` | `30 0 * * *` | Recompute viability scores (batch). |
| `/api/cron/cleanup-user-events` | `15 3 * * *` | Prune old analytics events. |
| `/api/cron/scrape-sentiment` | `0 4 * * 0` | Weekly sentiment cache refresh (top tools). |
| `/api/cron/submit-urls-bing` | `0 9 * * *` | Bing direct URL submission. |
| `/api/cron/indexnow-unindexed` | `0 10 * * 2` | Re-ping un-indexed URLs. |
| `/api/cron/resubmit-sitemap-gsc` | `0 6 * * 1` | Resubmit sitemap to GSC. |
| `/api/cron/snapshot-gsc` | `30 6 * * 1` | Weekly GSC snapshot. |
| `/api/cron/triage-gsc` | `0 7 * * 1` | GSC diff → weekly action triage. |
| `/api/cron/email-weekly-digest` | `0 8 * * 1` | Operator weekly digest email. |
| `/api/cron/seo-impact` | `30 8 * * 1` | Weekly SEO impact report. |
| `/api/cron/refresh-freshness-view` | `45 23 * * *` | Refresh the freshness materialized view. |
| `/api/cron/snapshot-daily-updates` | `55 23 * * *` | Daily activity rollup (`daily_update_summaries`). |

## 2) GitHub Actions — heavy/long jobs

**`.github/workflows/freshness-batch.yml`** (the freshness SOP engine; 300-min budget):

| Job | Schedule (UTC) | Purpose |
|-----|----------------|---------|
| `refresh-tools` | `0 2 * * *` **and** `0 14 * * *` | **(Phase 10)** Tier-aware refresh, **batch 500, twice daily** → daily-tier ≤24h, standard tier ≤3 days. |
| `refresh-latest-updates` | `0 3 * * *` | "Latest from" per-tool updates (change-detector). |
| `ingest-tools` | `0 4 * * *` | Discover + ingest new tools (now insert as **draft**, traction-gated). |
| `cascade-editorials` | `0 5 * * *` | Regenerate stale compare editorials. |
| `backfill-logos` | `40 5 * * *` | Fetch/rehost missing logos (missing-only). |

**`.github/workflows/cron-pipelines.yml`** (lightweight curl-to-Vercel):
`refresh-faqs` (`0 6 */2 * *`), `generate-editorials` (`0 5 * * 1`), `discover-tutorials`
(`0 7 * * 2,5`), `submit-indexnow` (`0 1 * * 0`), `submit-indexnow-recent` (`30 1 * * *`).
**Phase 10:** `poll-gh-actions` + `alert-failed-pipelines` were REMOVED from here (GitHub
throttles `*/10`/`*/30` schedules) and moved to Vercel crons above; their jobs remain for
manual `workflow_dispatch`.
Other workflows: `sync-mentions.yml`, `retry-failed-tools.yml`, `tracking-watchdog.yml`.

## 3) pg_cron (Supabase) — maintenance & monitoring — 7 jobs

| Job | Schedule (UTC) | Purpose |
|-----|----------------|---------|
| `tracking-invariants-nightly` | `30 19 * * *` | Analytics-tracking invariant checks. |
| `rate-limit-prune` | `0 * * * *` | **(Phase 10)** Prune expired `rate_limit_counters`. |
| `pipeline-stuck-sweep` | `*/15 * * * *` | **(Phase 10)** Mark dead `running` rows → `timeout` (15 min Vercel / 210 min GH thresholds). |
| `pipeline-heartbeat` | `7 * * * *` | **(Phase 10)** Alert if a previously-working pipeline goes silent (cascade-hubs 3h, freshness-batch 30h, poll-gh-actions 2h, onboard-tools 3h). |
| `refresh-top-tools-weekly` | `0 5 * * 1` | **(Phase 10)** Re-rank the data-driven half of the daily-150 tier. |
| `freshness-sla-monitor` | `0 */2 * * *` | **(Phase 10)** Alert if any daily-tier tool >24h or >25 published tools >3d. |
| `draft-stuck-alert` | `23 * * * *` | **(Phase 10)** Alert if a non-merged draft is stuck unpublished >48h. |

---

## The Real-Time Data SOP (Phase 10)

- **Two tiers** on `tools.refresh_tier`: **`daily`** (the top-150 — refreshed every day) and
  **`standard`** (everything else — refreshed within 3 days on a rotation).
- **Top-150 = hybrid:** 75 operator-curated marquee brands (`curated_top=true`, sticky) + 75
  data-driven (blended demand: GSC impressions + views + saves + viability), re-ranked weekly
  by `refresh_top_tools()`.
- **Throughput:** `refresh-tools` runs twice daily at batch 500 → ~150 daily + ~850 standard/day
  (long-tail cycle ≈2.2 days). `runRefresh` (lib/cron/refresh.ts) selects due daily-tier tools
  first, then fills with stalest standard.
- **Enforcement:** `freshness-sla-monitor` (pg_cron) raises an alert the moment the SLA slips.
- **Quality at the source:** new tools are **draft-until-green** (publish only after gates pass);
  enrich no longer fabricates pricing; refresh won't overwrite editorial content from a failed
  scrape; dedup, news-matching, GitHub-stars auth, and FAQ-guard fixes prevent bad/lost data.

## Engines

- **DeepSeek** (`deepseek-chat`) — tool refresh/enrichment, editorials, FAQs, latest-updates,
  sentiment synthesis, the planner. (~8× cheaper than the old Anthropic path at parity.)
- **Anthropic Claude (Sonnet)** — user-facing `/ai-chat`, the recommender, the tool AI panel.
- **Apify** (`APIFY_TOKEN`) — X/Twitter signal. **DataForSEO** — Trustpilot/G2 reviews.
- **Discovery (Phase 10):** ProductHunt GraphQL API + GitHub Search API (replaced brittle HTML scraping).

## Reliability & monitoring

- Every HTTP cron self-logs to `pipeline_runs` (Knowledge Room at `/admin/updates`).
- `poll-gh-actions` syncs GH runs and **reconciles** in-flight ones; `pipeline-stuck-sweep`
  (pg_cron) is the backstop for hard-killed runs.
- `alert-failed-pipelines` emails (Resend) + optional Slack on `failure`/`timeout` within a
  120-min lookback, deduped via `pipeline_alerts_sent`.
- Three pg_cron **heartbeats** detect *silence* (a job that stopped running entirely), which the
  failure-only alerter can't see.

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `CRON_SECRET` | Vercel + GitHub Secrets | Authenticates all cron requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + GitHub | Bypasses RLS for cron writes |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + GitHub | DB connection |
| `DEEPSEEK_API_KEY` | Vercel + GitHub | Data-layer synthesis |
| `ANTHROPIC_API_KEY` | Vercel | Chat/recommend/ai-panel |
| `GITHUB_REPO_TOKEN` | Vercel | poll-gh-actions reads the Actions API; GitHub-stars refresh |
| `APIFY_TOKEN` | GitHub | X/Twitter scraping |
| `RESEND_API_KEY` + `ALERT_EMAIL` | Vercel | Failure-alert emails (+ optional `SLACK_WEBHOOK_URL`, `ALERT_FROM_EMAIL`) |
| `RAZORPAY_WEBHOOK_SECRET`, `PAYPAL_WEBHOOK_ID` | Vercel | Payment webhooks (Phase 10) |
| `PRODUCTHUNT_TOKEN` | GitHub | PH GraphQL discovery + sentiment |

## Quick reference
- Manual runs: [06-manual-runs.md](./06-manual-runs.md) · Setup: [08-setup-guide.md](./08-setup-guide.md)
- Shared modules: [09-shared-modules.md](./09-shared-modules.md)
- Full Phase 10 changelog: `docs/Phase 10 (bug fixed opus 4.8)/build-log-phase-10.md`
- Master SOP: `docs/operations/sop-pipelines-master.md`
