# Automated Workflows — RightAIChoice

Complete documentation for every automated pipeline that keeps RightAIChoice fresh
without manual intervention.

> **CURRENT STATE — re-verified 2026-06-23 against live `vercel.json`, `.github/workflows/`, and
> `cron.job`.** Two drifts corrected: Vercel crons **17 → 18** (added the Phase 11.1 `new-signup-alert`
> that was running but undocumented) and pg_cron **7/8 → 10** (added `event-rollups-hourly` +
> `bot-behavioral-classifier`). This README is the authoritative, up-to-date inventory. The per-topic
> files `01-09` in this folder are older deep-dives (April 2026) and are partially stale — trust the
> tables below for schedules/engines.
>
> **Phase 11 changes (2026-06-18) — see the changelog at the bottom:** the **stale-data root cause** is
> fixed — the refresh now feeds fresh `latest_updates` news into the editorial prompt (so it stops
> reasserting facts like "100k context"), and **regenerates scrape-blocked flagships** (claude.ai/x.ai/
> perplexity = 403, gemini = JS SPA) from profile+news instead of freezing them. A new **deep 22-field
> refresh** (`full-refresh`) runs nightly → every field of every tool current within ~7 days. **Real
> cost tracking** now lands in `pipeline_runs` (was $0 — token usage was never recorded; ~$130-200/mo
> total). The GH bulk scripts now **log to pipeline_runs** + expose a `scrapeBlocked` metric. The
> **Viability Score was rebuilt** on real signals (momentum + a real `is_wrapper` flag the deep SOP now
> sets). Blog posts get a live `<ToolFact>` so their inline facts auto-update via the cascade.
> Key shifts since those were written: **DeepSeek** (not Anthropic) powers data-layer
> synthesis; the refresh pipeline is **tier-aware with a ≤3-day SLA**; reliability/
> freshness **monitoring runs in Postgres via pg_cron**; and the frequent monitors run as
> **native Vercel crons** (GitHub throttles frequent schedules).
>
> **Cowork QA changes (2026-06-17) — see the changelog at the bottom:** fixed the
> draft-onboarding **head-of-line block** (73 real tools were stuck unpublished);
> `poll-gh-actions` now watches **all 6** GitHub workflows (was 2); the `pipeline-heartbeat`
> covers **11** daily-or-more crons (was 4); `scrape-sentiment` **self-heals** stale
> `generating` rows; `freshness-batch`/`retry-failed-tools` share a **concurrency group**;
> alert recipient now falls back `ALERT_EMAIL → ALERT_EMAIL_TO → ADMIN_EMAIL`; **PayPal is
> disabled** (paywall bypass). Migrations **163–168** (admin lock, allowlist, heartbeat, insights
> guard, FK indexes, RPC EXECUTE lockdown) applied live.

---

## 📂 What's in this folder

This folder is the **single home for everything about RightAIChoice's automated pipelines.**
Start here (this README) — the authoritative, current, end-to-end playbook. The other files are
supporting detail this README links to:

- **`README.md`** (this file) — the master playbook: every pipeline in schedule order, what + why,
  non-technical + technical, the freshness/propagation system, observability, cost, viability.
- **`sop-pipelines-master.md`** — one-page operational runbook (Monday health-check + recovery).
- **`sop-1-monthly-refresh.md`, `sop-2-weekly-latest.md`, `sop-4-bing-direct-submission.md`** — how to
  run the manual/operator jobs.
- **`sop-freshness-contract.md`, `sop-3-view-counts.md`** — the freshness SLA + view-count debugging.
- **`01`–`10`** — original per-pipeline deep-dives (April 2026; partially stale — trust this README for
  schedules/engines, the deep-dives for code-level internals). `06-manual-runs.md` = on-demand triggers;
  `09-shared-modules.md` = shared infra.
- **`11-geo-and-authority.md`** — **(Phase 13, 2026-06-27)** GEO citation tracking + authority/directory
  engine + the self-refreshing `/llms.*` + `/state-of-ai-tools` data surfaces.
- **`12-tool-page-health.md`** — **(Phase 12 Bug-4, 2026-06-27)** the weekly link-health sweep
  (`tools.dead_links`), the on-demand stack viability audit, and the self-healing data-correctness
  guarantees (feature/modality coverage, hidden costs, integrations) that ride the existing refresh + SOP.

---

## 0. The 60-second non-technical picture (for everyone on the team)

RightAIChoice is a catalog of ~2,070 AI tools that has to stay **accurate and fresh on its own**, with
almost no human touching it day to day. A fleet of small scheduled programs ("pipelines") does that.
In plain English they:

1. **Find new tools** worth listing (and reject hype with no real traction).
2. **Keep every tool's facts current** — what it does, pricing, the latest news — so a visitor never
   reads a stale "100k context" after the real number moved on.
3. **Push that freshness everywhere** the tool is mentioned — its own page, comparison pages,
   category/best pages, and blog posts — so nothing contradicts itself.
4. **Score each tool's survival risk** (the Viability Score) to warn buyers off tools likely to die.
5. **Tell Google & Bing** about new/changed pages so they get indexed.
6. **Watch itself** — log what every pipeline did + what it cost, and alert (email/Slack) when one breaks.

Three schedulers run this (diagram below): **Vercel Cron** (light, frequent), **GitHub Actions**
(heavy AI jobs needing minutes–hours), and **pg_cron** (DB-level safety nets). Everything an AI step
does costs a little (DeepSeek, ~8–10× cheaper than the big names) — **total ~$130–200/month**, now
tracked per run in `pipeline_runs.estimated_cost_usd` and visible at `/admin/health`. **If something
looks stale/broken, check `/admin/health` + the `pipeline_runs` table first.**

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

## 1) Vercel Crons (`vercel.json`) — 20 jobs

| Path | Schedule (UTC) | Purpose |
|------|----------------|---------|
| `/api/cron/new-signup-alert` | `*/15 * * * *` | **(Phase 11.1)** New-signup alert — finds accounts in `auth.users` with no `signup_alerts_sent` row (brand-new signups), emails you a digest (Resend) + optional Slack, records them so they're never re-alerted. Reads `auth.users` directly, so it catches a signup even if its analytics event never fired. |
| `/api/cron/cascade-hubs` | `0 * * * *` (hourly) | Freshness cascade — ISR-revalidate changed pages + IndexNow ping. **(Phase 10: revived; verified live 2026-06-10. Fable-5 Dept C: `maxDuration` 60→300 — a full 500-page pass exceeded 60s.)** |
| `/api/cron/onboard-tools` | `7,37 * * * *` | Fast lane — finish onboarding already-published tools. |
| `/api/cron/onboard-tools?mode=sop` | `17,47 * * * *` | **(Phase 10)** Draft gate — publish `is_published=false` tools only once all quality gates pass. **(Fable-5 Dept C: 240s time-budget.) (Cowork QA fix: the failed-attempt counter now keys on `published`, not `onboarded` — a draft that ran the SOP fine but couldn't clear a HARD gate used to sit at the front of the oldest-first queue forever, starving the other ~68 drafts. Now it hits `MAX_ONBOARD_ATTEMPTS` and is skipped so the queue advances. Description HARD gate eased 300→250 chars.)** |
| `/api/cron/poll-gh-actions` | `*/10 * * * *` | **(Phase 10: moved here from GH)** Sync GH Actions runs → `pipeline_runs` + reconcile in-flight runs. **(Cowork QA: now polls ALL 6 workflows — added `nightly-verify`, `retry-failed-tools`, `sync-mentions`, `tracking-watchdog`, which previously had no failure visibility.)** |
| `/api/cron/alert-failed-pipelines` | `*/30 * * * *` | **(Phase 10: moved here from GH)** Email/Slack failure + stuck-running alerts. |
| `/api/cron/calculate-viability` | `30 0 * * *` | Recompute viability scores (batch). |
| `/api/cron/cleanup-user-events` | `15 3 * * *` | Prune old analytics events. |
| `/api/cron/scrape-sentiment` | `0 4 * * *` | Sentiment cache refresh (top tools). **(Fable-5 Dept C: weekly→daily + 240s time-budget — only re-scrapes tools whose 7-day cache expired.) (Cowork QA fix: a `generating` row is now skipped only if <30 min old; a row left `generating` by a killed run self-heals on the next pass instead of wedging that tool's sentiment forever.)** |
| `/api/cron/submit-urls-bing` | `0 9 * * *` | Bing direct URL submission. **(Fable-5 Dept C: Bing "quota exceeded" is recorded as `partial` with the cursor advanced past accepted URLs — an expected daily condition, not a failure email.)** |
| `/api/cron/indexnow-unindexed` | `0 10 * * 2` | Re-ping un-indexed URLs. |
| `/api/cron/resubmit-sitemap-gsc` | `0 6 * * 1` | Resubmit sitemap to GSC. |
| `/api/cron/snapshot-gsc` | `30 6 * * 1` | Weekly GSC snapshot. |
| `/api/cron/triage-gsc` | `0 7 * * 1` | GSC diff → weekly action triage → `weekly_loop_actions` (reviewed at `/admin/seo-pulse`). **(2026-06-28)** Skips `title_rewrite` candidates for pages that already carry an active `title_override` (re-suggesting a curated title was the main queue-noise source). title_rewrite rows on `/admin/seo-pulse` now have a working **"Apply title →"** field that writes a live `title_overrides` row (canonical tier1 apply: soft-revert + insert + GSC baseline + recrawl) and marks the action executed — previously Accept/Mark-executed only changed status, never a live title. |
| `/api/cron/track-geo-citations` | `15 7 * * 1` | **(Phase 13 D3.4)** GEO citation scoreboard — asks a web-searching AI (free Gemini engine; Anthropic/Perplexity/OpenAI scaffolded) the target prompts in `lib/geo/target-prompts.ts` and writes one row per `(date, engine, prompt)` to `geo_citation_snapshots`: are we cited, rank, competitors, share-of-voice. The GEO analogue of `snapshot-gsc`. Surfaced at `/admin/ai-citations`. Gracefully records `partial` (no false alert) if no engine key is set. See `11-geo-and-authority.md`. |
| `/api/cron/authority-check` | `30 7 * * 1` | **(Phase 13 D2.4)** Backlink monitor — re-fetches each submitted/live directory listing in `directory_submissions`, detects a link back to rightaichoice.com, and logs confirmed backlinks into `referring_domains` (channel `other`, note `directory:<key>`) → `/admin/authority`. See `11-geo-and-authority.md`. |
| `/api/cron/email-weekly-digest` | `0 8 * * 1` | Operator weekly digest email. |
| `/api/cron/seo-impact` | `30 8 * * 1` | Weekly SEO impact report. |
| `/api/cron/refresh-freshness-view` | `45 23 * * *` | Refresh the freshness materialized view. |
| `/api/cron/snapshot-daily-updates` | `55 23 * * *` | Daily activity rollup (`daily_update_summaries`). |

## 2) GitHub Actions — heavy/long jobs

**`.github/workflows/freshness-batch.yml`** (the freshness SOP engine; 300-min budget):

| Job | Schedule (UTC) | Purpose |
|-----|----------------|---------|
| `refresh-tools` | `0 2 * * *` **and** `0 14 * * *` | **Lite refresh** — 9 core editorial fields, tier-aware, **batch 500, twice daily** → daily-tier ≤24h, standard ≤3 days. **(Phase 11 B1/B1.2: now feeds fresh `latest_updates` news into the prompt + regenerates scrape-blocked tools from profile+news instead of freezing. Logs to `pipeline_runs` with real $ + a `scrapeBlocked` metric.)** |
| `refresh-latest-updates` | `0 3 * * *` | "Latest from" per-tool news (change-detector). **(Phase 11 B5: GH script now logs to `pipeline_runs`.)** Feeds the freshness used by refresh-tools + full-refresh + viability. |
| `ingest-tools` | `0 4 * * *` | Discover + ingest new tools (insert as **draft**, traction-gated). |
| `cascade-editorials` | `0 5 * * *` | Regenerate stale compare editorials. **(Phase 11 B1: news-grounded.)** |
| `backfill-logos` | `40 5 * * *` | Fetch/rehost missing logos (missing-only). |
| `full-refresh` | `0 6 * * *` | **(Phase 11 B2; Phase 12 Bug-2 SHARDED) Deep 22-field SOP** — `backfill-tool-data.ts --cohort=300 --shard=i --shards=3`, the N stalest by `last_full_refresh_at`, run as a **3-shard matrix** (hash-partitioned by slug). Refreshes ALL fields (FAQs, workflow scenarios, pricing-tier guides, migrations, hidden costs) **and judges `is_wrapper`** → whole catalog every field current within ~7 days. **Phase 12 Bug-2:** un-sharded `--cohort=300` took ~64s/tool (19-URL scrape) → ~5.3h > the 300-min timeout, so it was killed every night and froze 71% of the catalog ~27 days. Now scrape trimmed 19→5 URLs (~30s/tool) + 3 shards (~100 each, ~50 min) → reliably completes; logs a `running` row at START so a timeout is visible. DeepSeek-only; `pipeline_key=refresh-tool-data-full` with real $. Per-shard concurrency group. |
| `check-link-health` | `0 7 * * 0` (weekly, Sun) | **(Phase 12 Bug-4.6)** `check-link-health.ts` — HTTP-only (no DeepSeek): probes every published tool's external resource links (docs/changelog/github/website/tutorials/community) and writes `tools.dead_links`. The tool page filters dead URLs out of Resources & Guides + the sidebar; a tool with no live resources skips the section. **Conservative** — only a clear 404/410 or a DNS/connection failure on BOTH HEAD and GET counts as dead (401/403/429/timeouts/5xx are kept, to avoid hiding bot-blocked-but-live links). Self-healing both ways (a revived link drops out next run). Covers newly onboarded tools automatically. `pipeline_key=check-link-health`. |

**`.github/workflows/cron-pipelines.yml`** (lightweight curl-to-Vercel):
`refresh-faqs` (`0 6 */2 * *`), `generate-editorials` (`0 5 * * 1`), `discover-tutorials`
(`0 7 * * 2,5`), `submit-indexnow` (`0 1 * * 0`), `submit-indexnow-recent` (`30 1 * * *`).
**Phase 10:** `poll-gh-actions` + `alert-failed-pipelines` were REMOVED from here (GitHub
throttles `*/10`/`*/30` schedules) and moved to Vercel crons above; their jobs remain for
manual `workflow_dispatch`.
Other workflows: `sync-mentions.yml`, `retry-failed-tools.yml`, `tracking-watchdog.yml`.

**On-demand audits (run manually / periodically, not crons):** `npm run stacks:audit`
(`scripts/audit-stacks.ts`, **Phase 12 Bug-4.9**) — resolves every curated stack's tool slugs against live
DB health (published / merged / viability) and flags stacks whose picks are non-viable; the stack page
already renders missing/merged picks as plain text (no 404) via `getLiveToolSlugs`. `npm run links:check:dry`
(**Bug-4.6**) — dry-run of the link-health sweep for spot-checks.

## 3) pg_cron (Supabase) — maintenance & monitoring — 10 jobs

| Job | Schedule (UTC) | Purpose |
|-----|----------------|---------|
| `event-rollups-hourly` | `10 * * * *` | Roll up the last 3 days of `user_events` into `event_rollup_daily`/`dau_rollup_daily` (`compute_event_rollups(3)`) so the admin dashboards read pre-aggregated counts. |
| `bot-behavioral-classifier` | `45 19 * * *` | Nightly `classify_bot_behavior()` — re-tags events as bot from BEHAVIOR (not just UA), catching stealth-headless traffic the UA regex misses. |
| `tracking-invariants-nightly` | `30 19 * * *` | Analytics-tracking invariant checks. |
| `rate-limit-prune` | `0 * * * *` | **(Phase 10)** Prune expired `rate_limit_counters`. |
| `pipeline-stuck-sweep` | `*/15 * * * *` | **(Phase 10)** Mark dead `running` rows → `timeout` (15 min Vercel / 210 min GH thresholds). |
| `pipeline-heartbeat` | `7 * * * *` | **(Phase 10; Cowork QA expanded — migration 165)** Alert if a previously-working pipeline goes silent. Now **11 keys**: cascade-hubs 3h, onboard-tools 3h, poll-gh-actions 2h, cron-pipelines 6h, freshness-batch 30h, + the daily crons scrape-sentiment / calculate-viability / cleanup-user-events / refresh-freshness-view / snapshot-daily-updates / submit-urls-bing (28h each). A key only alerts once it has a success history, so newly-added keys can't false-alarm. |
| `refresh-top-tools-weekly` | `0 5 * * 1` | **(Phase 10)** Re-rank the data-driven half of the daily-150 tier. |
| `freshness-sla-monitor` | `0 */2 * * *` | **(Phase 10)** Alert if any daily-tier tool >24h or >25 published tools >3d (watches the LITE `last_verified_at`). |
| `deep-refresh-sla-monitor` | `0 12 * * *` | **(Phase 12 Bug-2, migration 170)** Alert if >25% of published tools have `last_full_refresh_at` >10d — the watcher for the DEEP refresh that was missing (the deep job stalled for weeks unseen). |
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
| `RESEND_API_KEY` + alert recipient | Vercel | Failure-alert emails. **(Cowork QA: recipient resolves `ALERT_EMAIL ?? ALERT_EMAIL_TO ?? ADMIN_EMAIL` so Vercel crons and GH scripts agree — previously half the alerting silently no-op'd.)** (+ optional `SLACK_WEBHOOK_URL`, `ALERT_FROM_EMAIL`) |
| `RAZORPAY_WEBHOOK_SECRET` | Vercel | Razorpay payment webhook (India). |
| `PAYPAL_ENABLED` (+ `PAYPAL_WEBHOOK_ID`) | Vercel | **(Cowork QA: PayPal DISABLED — default off.)** PayPal capture/webhook never validated the paid amount (paywall bypass), so the gateway is off until re-hardened. Set `PAYPAL_ENABLED=true` to re-enable. Razorpay unaffected. |
| `PRODUCTHUNT_TOKEN` | GitHub | PH GraphQL discovery + sentiment |

## ⚠️ Three critical gotchas (read before touching ANY pipeline)

1. **Vercel Cron invokes via GET — export BOTH `GET` and `POST` from every cron route.** A POST-only
   route silently 405s on every scheduled fire and never runs (no `pipeline_runs` row at all). A 2026-06
   refactor made 5 routes POST-only and killed them for weeks. Detection: any `pipeline_key` in
   `vercel.json` that's absent/stale in `pipeline_runs` is dead.
2. **Sitemaps must stay CDN-cached or Bing drops them.** A `sitemap.ts` is cached by Next 16 *unless* it
   uses a request-time API; calling the cookie-reading `createClient()` (or `force-dynamic`) makes every
   crawler fetch an uncached DB render → exceeds Bing's ~2–3s tolerance → feed stuck "Pending" forever.
   **Sitemap data MUST come from the cookie-free `getAdminClient()`.** Verify `x-vercel-cache: HIT`.
3. **(Phase 11) Scrapers fail silently on bot-protected sites — regenerate, don't freeze.** The flagship
   vendor sites can't be scraped by plain fetch (claude.ai/x.ai/perplexity = Cloudflare 403, gemini = JS
   SPA). The old refresh *preserved* editorial on scrape failure → those tools froze for months while the
   cron logged "refreshed". Now the refresh regenerates from profile + news + model knowledge when scrape
   is blocked. Watch `pipeline_runs.metadata->>'scrapeBlocked'` on `refresh-tools` — a spike = scraper degraded.

## The freshness & propagation system (how a tool change reaches every page)

The heart of the product. Four moving parts:

1. **Capture** — `refresh-tools` (lite, 9 fields, 2×/day) + `full-refresh` (deep, 22 fields, ~7-day cycle)
   keep `tools.*` current; `refresh-latest-updates` fills `tools.latest_updates` from the open web. **Both
   refreshers read that news and let it override stale vendor copy** (the Phase 11 root fix for stale data).
2. **Map** — `sync-mentions` (nightly) builds `page_tool_mentions`: every (tool → page) relationship across
   tool/compare/category/best/role/stack/blog (~30k rows).
3. **Mark** — a DB trigger on `tools` calls `propagate_freshness()`, stamping every mapped page in
   `pages_freshness` as "needs refresh".
4. **Refresh** — `cascade-hubs` (hourly) reads `pages_freshness`, `revalidatePath()`s each changed page,
   and pings IndexNow. Compare prose re-gens via `cascade-editorials`.

**How each page type updates:** tool/compare/category/best/for/stack pages query `tools.*` **live** (update
on revalidation); compare editorial prose is regenerated by `cascade-editorials`; **blog posts** (static MDX)
use the live `<ToolFact slug field>` component (Phase 11 B3) so inline facts (pricing, models) re-read the DB
on revalidation instead of freezing — the cascade already revalidates the 16 mapped blog pages on a change.

## The Viability Score (rebuilt — Phase 11 C)

Shutdown/abandonment risk, 0–100, computed by `calculate-viability` (`lib/cron/viability.ts`). The old model
clustered every tool 72–90 (at-risk page empty) because two signals were hardcoded constants and `is_wrapper`
was never populated. **New 4-signal model:** Momentum 40% (recency of newest `latest_updates` item) + Wrapper
dependency 30% (the real `is_wrapper`, now judged per-tool by the deep SOP's LLM) + Funding 20% (`pricing_type`)
+ Website 10%. `is_wrapper` populates over the ~7-day deep cycle, so the at-risk page fills with genuine
thin-wrapper / stale tools. Bands: ≥70 safe, 40–69 moderate, <40 at-risk. (C3 backlog: real per-category
mortality + hyperscaler-overlap RSS monitoring.)

## Changelog — Phase 12 Bug-4 (Tool-page overhaul + platform health), 2026-06-27

Tool-page overhaul delivered as rolling sub-bugs (full detail in
`Phase 12 (user journey bugs)/build-log.md`). Pipeline-relevant changes:

- **New automation `check-link-health` (Bug-4.6)** — weekly GH Actions job (Sun 07:00 UTC) +
  `scripts/check-link-health.ts` + `npm run links:check[:dry]`. Probes every published tool's external
  resource links and writes `tools.dead_links` (migration 173) so the tool page never shows a dead
  Resources/Guides link. Covers newly onboarded tools automatically (it sweeps the whole published set).
  `pipeline_key=check-link-health` in `pipeline_runs`.
- **New on-demand audit `audit-stacks` (Bug-4.9)** — `npm run stacks:audit` resolves curated-stack picks
  against live tool health. The stack page now renders missing/merged picks as plain text (no 404) via the
  new `getLiveToolSlugs()`.
- **Durable data-correctness via existing pipelines (Bug-4.3/4.4)** — NO new automation; the synthesis
  prompts in `backfill-tool-data.ts` + `lib/cron/refresh.ts` were tightened (exhaustive feature/modality
  coverage incl. voice/vision/etc., friendlier hidden-costs, documented-only integrations). Because the
  onboarding SOP (`onboard.ts`) and the nightly lite/full refresh both call these, **every new tool and
  every refresh inherits the corrected synthesis automatically** — the self-healing guarantee.
- **Not added to `pipeline-heartbeat`:** `check-link-health` is weekly, so the 28–30h heartbeat thresholds
  would false-alarm; a missed weekly sweep is non-critical (only delays dead-link detection). Revisit if a
  weekly-aware monitor is added.
- ⚠️ **Operational note (2026-06-27):** DeepSeek API returned **402 Insufficient Balance** during this work
  — the data-synthesis pipelines (refresh/onboard/categorize) are paused until the key is topped up. The
  Bug-4.3/4.4 prompt fixes won't repopulate the catalog until then.

## Changelog — Phase 13 (GEO & SEO upgrades), 2026-06-27

Added **2 Vercel crons** (17→… well, 18→20 incl. the Phase-11 backfill) and **2 operator scripts**, plus
turned the static `public/llms*.txt` into **self-refreshing routes**. Full detail in
[`11-geo-and-authority.md`](./11-geo-and-authority.md) and the phase docs in
`docs/Phase 13 (GEO AND SEO upgrades)/`.

- **`track-geo-citations`** (Vercel cron, Mon 07:15 UTC) — GEO citation scoreboard → `geo_citation_snapshots`
  → `/admin/ai-citations`. Free Gemini engine (Google Search grounding); Anthropic/Perplexity/OpenAI
  scaffolded behind their keys. Baseline run 2026-06-27: **0/12 prompts cited us**.
- **`authority-check`** (Vercel cron, Mon 07:30 UTC) — directory backlink monitor → `referring_domains` →
  `/admin/authority`.
- **Operator scripts (on-demand, pipeline_runs-logged):** `geo:track[:dry]` (same as the cron, manual);
  `authority:seed|next|mark|check|status` (the directory submission workflow — `lib/authority/`);
  `pr:angles|draft[:dry]|status` (**D2.2b digital-PR engine** — `lib/pr/*`: derive live-data angles →
  DeepSeek-draft pitches → `pr_pitches` approval queue + CSV; the #1 DA mover via earned editorial links).
- **New tables (round 2):** `directory_submissions` (mig 174), `pr_pitches` (mig 175).
- **Self-refreshing data surfaces (ISR routes, not crons):** `/llms.txt`, `/llms-full.txt`, `/llms.jsonl`,
  and `/state-of-ai-tools` now regenerate from the live DB hourly/daily (replacing the static, stale
  `public/llms*.txt`). They carry a live freshness banner — our core GEO signal.
- **New tables:** `geo_citation_snapshots` (migration 172), `directory_submissions` (migration 174 — renumbered from 173 to avoid colliding with main's `173_link_health.sql`).
- **No conversion-funnel automation was built this phase.** D4 was a read-only funnel *diagnosis* (leak =
  ~0.2% plan-CTA click-rate; affiliate out-clicks are the real money path). Recommended fixes are scoped
  for a later phase — nothing automated shipped, so there is nothing funnel-related to register here.

## Changelog — Phase 12 Bug-2 (Real-time freshness), 2026-06-22

**Root cause of persistent stale data (found with live DB evidence, not the docs):** the lite
refresh + news + cascade were all HEALTHY (`last_verified_at` ≤2 days, news ≤7 days, page backlog ~24),
but the **deep 22-field refresh (`refresh-tool-data-full`) was silently broken**: it scraped **19
URLs/tool → ~64s/tool**, so `--cohort=300` needed ~5.3h but GitHub's job timeout is **300 min** → it was
**killed every night** after ~260 tools, **never logged a success row**, and couldn't be seen by any
monitor. Result: **71% of the catalog (~1,414 tools) was last deep-refreshed 2026-05-26 (~27 days)**;
**311 paid tools had no structured pricing tiers at all**. And `pricing_details` (the pricing tables
users read) was written ONLY by that broken deep job — the lite refresh wrote `pricing_type` but not the
tiers. Fixes:

- **FAST lane — structured pricing on the daily lite refresh.** `lib/cron/refresh.ts` now synthesizes
  `pricing_details` (the `{plan, price, features}` tiers) too, grounded in a dedicated **`/pricing` page
  scrape** + news, with an honesty guard (empty tiers rather than a guessed price; `contact` tools → []).
  So the pricing tables stay **≤2-3 days fresh catalog-wide** instead of being gated behind the deep job.
- **HEAVY lane — the deep refresh now actually completes (sharded).** `full-refresh` in
  `freshness-batch.yml` is a **3-shard matrix** (`--shard=i --shards=3`, hash-partitioned by slug in
  `backfill-tool-data.ts`), ~100 tools/shard; the per-tool scrape is **trimmed 19→5 URLs** (homepage,
  /pricing, /changelog, /release-notes, /docs) → ~30s/tool → each shard ~50 min, well under timeout.
  Whole catalog still cycles ~7 days, but now COMPLETING. The script also **logs a `running` row at
  START** (was end-only), so a timeout is visible as a stuck run, not silence.
- **Observability (migration 170).** New **`deep-refresh-sla-monitor`** (pg_cron, daily) alerts when
  >25% of published tools have `last_full_refresh_at` >10 days (the watcher that was missing);
  `refresh-tool-data-full` added to `pipeline-heartbeat` (36h). Reuses the `alert-failed-pipelines` path.
- **Plan My Stack — read-time cache invalidation.** `app/api/plan/route.ts` now busts a cached plan the
  moment any tool it recommended was re-verified after the plan was built (was a blind 24h TTL), so a
  pricing/data refresh shows immediately. (Inline pricing tiers inside the plan card = deferred follow-up;
  the plan's pricing badge is now fresh and each tool links to its fresh tier table.)

## Changelog — Phase 11 (Website & Content Optimisation), 2026-06-18

- **Stale-data root cause fixed (B1/B1.2).** `refresh-tools` + `cascade-editorials` now feed fresh
  `latest_updates` news into the editorial prompt with a "news overrides stale vendor copy" rule. And the
  refresh **regenerates scrape-blocked flagships** (403/JS-SPA) from profile + news + model knowledge instead
  of freezing them — the real reason claude said "100k context" for months. Verified on prod (claude "100k" → gone).
- **Deep 22-field refresh automated, weekly (B2).** New `full-refresh` GH job runs `backfill-tool-data.ts
  --cohort=300` nightly → every field of every tool current within ~7 days (was manual/monthly).
- **Real cost tracking.** Token usage is now recorded → `pipeline_runs.estimated_cost_usd` (was $0 — never
  captured). `refresh-tools` ≈ $0.0016/tool; total AI spend ≈ $130–200/mo, now visible.
- **Observability (B5).** GH bulk scripts (`refresh-tools-batch`, `refresh-latest-updates`) now log to
  `pipeline_runs`; a `scrapeBlocked`/`preserved` metric surfaces a scraper degradation (it was counted as
  success before, which hid the freeze).
- **Viability rebuilt (C).** See the section above — real signals + LLM `is_wrapper` from the deep SOP.
- **Blog propagation (B3).** Live `<ToolFact>` component so blog inline facts auto-update via the cascade.

## Changelog — Phase 10 (Cowork QA), 2026-06-17

Pipeline-relevant fixes from the QA audit pass (`Phase 10 (Cowork QA)/BUILD_LOG.md`):

- **Draft-onboarding head-of-line block (the big one).** 73 real tools (Gemini, Canva, Harvey,
  Otter, v0, Notion AI…) were stuck unpublished for weeks. The draft lane processes the 5 oldest
  drafts each run; the failed-attempt counter only incremented when a tool wasn't *onboarded*. Five
  tools ran the SOP fine but failed the 300-char description gate by a few chars, so they were never
  counted as failures and sat at the front of the queue every run, starving the rest. **Fix:** count
  an attempt whenever a draft doesn't *publish* → stuck drafts hit `MAX_ONBOARD_ATTEMPTS` (6) and are
  skipped; queue advances. Description gate eased 300→250. Self-heals over a few hours after deploy.
- **Alerting coverage (H7).** `poll-gh-actions` extended 2→6 workflows; `pipeline-heartbeat` extended
  4→11 keys (migration 165). A cron that silently stops firing now alerts.
- **Sentiment self-heal (H10).** `scrape-sentiment` skips a `generating` row only if <30 min old, so a
  run killed mid-scrape no longer wedges that tool forever.
- **Concurrency (P2).** `freshness-batch` `refresh-tools` + `retry-failed-tools` share a concurrency
  group → no double-processing of the same queue.
- **Alert env (P2).** Recipient fallback `ALERT_EMAIL → ALERT_EMAIL_TO → ADMIN_EMAIL`.
- **Security (P0–P2, migrations 163–168):** `is_admin` write-lock; admin = exactly two allowlisted
  emails (auto-grant on signup); `insights_live_sessions` admin guard; revoked anon EXECUTE on
  server-only + admin RPCs; FK indexes; constant-time `CRON_SECRET` compare.
- **Cost/abuse:** PayPal disabled (paywall bypass); free `/report` retired → redirects to the paid
  checker, generate endpoint locked to `CRON_SECRET`; global daily LLM spend ceiling on chat + plan.
- **Error noise:** client error tracker now drops browser-extension / opaque cross-origin errors, so
  the admin error view shows only real bugs.
- **Health snapshot (2026-06-17):** 19/22 pipelines green; freshness backlog cleared (944→~3);
  cron-pipelines timeouts stopped 2026-06-10; `freshness-sla`/`draft-stuck` are *watchdogs* (they
  "fail" to alert, not because they're broken).

## Phase 13 — Social Media Automation (2026-06-30)

In-house, approval-gated social posting across LinkedIn / X / Instagram / Reddit. The brain drafts from
live data + branded graphics, the founder approves in `/admin/social`, and these crons post from the
cloud. **Full deep-dive (every file, per-platform process, strict SOPs, what/why/how):
[13-social-automation.md](./13-social-automation.md).** Design + build log:
`docs/Phase 13 Social Media Automation/`. Turn-on steps:
`docs/Phase 13 Social Media Automation/operator-setup.md`.

| Cron (Vercel) | Schedule | What it does |
|---|---|---|
| `social-strategy` | `0 4 * * 1` | weekly: per-platform strategy from last week + insights, goal-aligned → feeds the brain |
| `social-publish` | `*/15 * * * *` | posts APPROVED+due posts; re-checks SOPs at post time; skips unconnected platforms |
| `social-draft` | `0 5 * * *` | refills the queue with drafts from live data (X budget-gated), steered by the weekly strategy |
| `social-metrics` | `0 */6 * * *` | appends per-post engagement → `social_metrics` |
| `social-approval-digest` | `0 9 * * *` | emails+Slacks the founder the pending-approval queue |
| `social-token-refresh` | `0 3 * * *` | refreshes platform OAuth tokens before expiry |

- **Engine:** DeepSeek (copy) + `next/og` (graphics, $0) · **Tables:** `social_posts`, `social_accounts`,
  `social_metrics` (migration 178) · **SOPs:** `lib/social/sops.ts` (X budget cap, Reddit ban-avoidance,
  voice gate, variety/dedup, scheduling) · **Insights loop:** `lib/social/insights.ts` weights drafts by
  what performed. **Safe-by-default:** every platform OFF until its `*_ENABLED` flag + a connected account.
- **CLI:** `social:pool` / `social:draft` / `social:status` / `social:preview` / `social:insights`.

## Quick reference
- One-page ops runbook (health-check + recovery): [sop-pipelines-master.md](./sop-pipelines-master.md)
- Manual runs: [06-manual-runs.md](./06-manual-runs.md) · Setup: [08-setup-guide.md](./08-setup-guide.md)
- Shared modules: [09-shared-modules.md](./09-shared-modules.md)
- Operator runbooks: [monthly refresh](./sop-1-monthly-refresh.md) · [weekly latest](./sop-2-weekly-latest.md) · [Bing submission](./sop-4-bing-direct-submission.md) · [freshness contract](./sop-freshness-contract.md)
- Full Phase 10 changelog: `docs/Phase 10 (bug fixed opus 4.8)/build-log-phase-10.md`
