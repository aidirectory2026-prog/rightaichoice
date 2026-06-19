# Automated Workflows — RightAIChoice

Complete documentation for every automated pipeline that keeps RightAIChoice fresh
without manual intervention.

> **CURRENT STATE — updated 2026-06-18 (Phase 11 *Website & Content Optimisation*).** This README is the
> authoritative, up-to-date inventory. The per-topic files `01-09` in this folder are older deep-dives
> (April 2026) and are partially stale — trust the tables below for schedules/engines.
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

## 1) Vercel Crons (`vercel.json`) — 17 jobs

| Path | Schedule (UTC) | Purpose |
|------|----------------|---------|
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
| `/api/cron/triage-gsc` | `0 7 * * 1` | GSC diff → weekly action triage. |
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
| `full-refresh` | `0 6 * * *` | **(Phase 11 B2) Deep 22-field SOP** — `backfill-tool-data.ts --cohort=300`, the N stalest by `last_full_refresh_at`. Refreshes ALL fields (FAQs, workflow scenarios, pricing-tier guides, migrations, hidden costs) **and judges `is_wrapper`** → whole catalog every field current within ~7 days. DeepSeek-only; logs `pipeline_key=refresh-tool-data-full` with real $. Own concurrency group. |

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
| `pipeline-heartbeat` | `7 * * * *` | **(Phase 10; Cowork QA expanded — migration 165)** Alert if a previously-working pipeline goes silent. Now **11 keys**: cascade-hubs 3h, onboard-tools 3h, poll-gh-actions 2h, cron-pipelines 6h, freshness-batch 30h, + the daily crons scrape-sentiment / calculate-viability / cleanup-user-events / refresh-freshness-view / snapshot-daily-updates / submit-urls-bing (28h each). A key only alerts once it has a success history, so newly-added keys can't false-alarm. |
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

## Quick reference
- One-page ops runbook (health-check + recovery): [sop-pipelines-master.md](./sop-pipelines-master.md)
- Manual runs: [06-manual-runs.md](./06-manual-runs.md) · Setup: [08-setup-guide.md](./08-setup-guide.md)
- Shared modules: [09-shared-modules.md](./09-shared-modules.md)
- Operator runbooks: [monthly refresh](./sop-1-monthly-refresh.md) · [weekly latest](./sop-2-weekly-latest.md) · [Bing submission](./sop-4-bing-direct-submission.md) · [freshness contract](./sop-freshness-contract.md)
- Full Phase 10 changelog: `docs/Phase 10 (bug fixed opus 4.8)/build-log-phase-10.md`
