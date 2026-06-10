# Plan — Phase 10 (Bug-Fix + Real-Time Data SOP) · Opus 4.8

> Authoritative plan for Phase 10. Source audit: `docs/full-bug-audit-2026-06-07.md` (77 findings).
> Progress is tracked in `build-log-phase-10.md` (same folder).
> CODE changes are made in the isolated worktree `../rac-phase10` (branch `phase10-bugfix`) and
> integrated to `main` via a squash PR. These DOCS live in the main repo so they're easy to read.

## Objective

1. Permanently fix all **77 audit findings** across every department, each designed (via a
   blast-radius dependency map) not to break a working feature.
2. Guarantee **real-time tool data**: every published tool refreshed across **every section** with
   max staleness **3 days**, plus a **daily top-150** (hybrid: 75 operator-curated + 75 data-driven),
   enforced by **strict, monitored SOPs** so nothing goes stale silently.

## Locked decisions
- Top-150 = **hybrid 75 curated + 75 data-driven** (views + GSC impressions/position + saves +
  viability); data half re-ranked weekly, curated half sticky.
- **Throughput ~doubles** to ~765 tools/day to meet the ≤3-day SLA (~2x AI/scrape spend accepted).
- **Rate limiter = Postgres-backed** (Supabase) — no new vendor.
- **New tools = draft-until-green** — insert unpublished; publish only after all quality gates pass.

## Governing SOP (every step)
**Isolate → Implement → Verify → Re-verify → Log → Report → Commit.** A step is "done" only after a
build-log entry with verification evidence. **Report:** after every step, summarise what changed in
plain, non-technical language and ask the operator whether they want any change BEFORE moving on.
Every migration ships with its reverse; behavioral changes are guarded so they can be disabled
without a code redeploy where practical. Stage only explicit paths; commit each unit immediately;
rebase before push; never `git add -A`.

## Architecture facts that shape the work
- `last_verified_at` is the real freshness source of truth (current); `last_full_refresh_at` is
  legacy — do not resurrect. Refresh ordering is stalest-first on `last_verified_at`.
- `refresh.ts` updates 9 editorial fields + github stars; other sections are separate jobs
  (latest-updates, FAQs, editorials, sentiment, viability, tutorials, logos). Columns `models`,
  `community_links`, `docs_url`, `workflow_scenarios`, `setup_time_text`, `migration_in/out`,
  `recent_changes`, `pricing_plan_guides` are on **no periodic job** today → must be covered (S5.4).
- `pages_freshness` (sitemap/ISR/IndexNow) is fed by DB triggers on tool UPDATEs + the dead
  cascade-hubs cron. Fixing cascade-hubs (S4.1) drains the 2,830-row backlog.
- Throughput gated by GH Actions runtime (180 min, ~25s/tool) + DeepSeek limits; nightly batch ~500
  staggered into 2 runs ≈ 765/day within budget.

---

## Pro-tier optimizations (Vercel Pro + Supabase Pro) — woven into the streams below
We have **Vercel Pro** (40 cron jobs, any frequency incl. minute-level; longer function durations;
Fluid Compute; observability) and **Supabase Pro** (no auto-pause; bigger compute/connections;
**pg_cron already installed** — confirmed running `tracking-invariants-nightly`; PITR available as
an add-on). This turns several fixes from "work around a limit" into "do it the clean way":

- **OPT-1 — DB-native maintenance via `pg_cron`** (instead of cron-over-HTTP, which is what leaks):
  - **Stuck-row sweeper** (S4): SQL job every 15 min marks `pipeline_runs` stuck `running` >90 min
    as `timeout`. No HTTP layer to hard-kill → removes the root cause of the 195-row leak instead of
    just patching the poller.
  - **Weekly top-150 re-rank** (S5.2) + `refresh_gsc_tool_positions()` run as pg_cron SQL.
  - **Materialized-view refresh** (refresh-freshness-view) moves to pg_cron (no Vercel round-trip).
  - **Freshness-SLA check** (S5.5) runs as pg_cron, writing breaches to an alerts table the Vercel
    alerter emails (optionally `pg_net` straight to a webhook).
- **OPT-2 — Native Vercel Pro crons for sub-daily jobs** (cascade-hubs hourly, alerter, indexnow):
  pushed to GitHub Actions only because Hobby capped crons at daily. On Pro they run natively and
  **self-log via `withPipelineLogging`**, so they never need GH polling → smaller leak surface.
  `poll-gh-actions` is then scoped to ONLY the heavy GH batch jobs (refresh/ingest).
- **OPT-3 — Bigger Vercel refresh batches** (S5.3): Fluid Compute + higher `maxDuration` (Pro) lets
  the hourly Vercel refresh fire process ~30–50 tools (vs 10), supplementing staggered nightly GH
  runs so ~765/day has headroom.
- **OPT-4 — Supabase compute/connection headroom** (S5/S8): Pro pooling absorbs the 2x write load
  from doubled refresh throughput.
- **OPT-5 — Enable PITR before destructive cleanups** (S8): point-in-time recovery (Pro add-on,
  operator toggle) as a safety net before merging duplicates / re-enriching / deleting soft-404s.
- **OPT-6 — Vercel Observability + Speed Insights** (S10): perf/browser verification + ongoing
  pipeline monitoring; complements the static-rendering fix (#63).
- **OPT-7 — No auto-pause** (Supabase Pro): the DB never sleeps → pg_cron + crons stay reliable.

Operator actions these imply (I'll flag when reached): enable `pg_net` (migration), enable PITR in
the Supabase dashboard, confirm Fluid Compute is on for the Vercel project.

---

## S1 — Security & data exposure
- **1.1 #60** Enable RLS on `tracked_niche_pages` + policies (admin/service write; public read only
  if intended). Verify: anon-key write blocked; admin path works.
- **1.2 #20** Hash API keys at rest (`key_hash` unique + `key_prefix`; sha256; return raw once).
  Verify: DB stores no raw key.
- **1.3 #25** Send `email_domain` only to Mixpanel (`auth-provider.tsx`→`analytics.ts`).
- **1.4 #34** Unsubscribe: service-role client + signed HMAC token + rate limit.

## S2 — Money-path hardening
- **2.1 #24** Reconcile `claim_sentiment_scan(p_user,p_free_limit)` vs migration (introspect prod
  first; add missing migration). Verify: a scan claim succeeds.
- **2.2 #5** Bind Razorpay verify to the order: assert `razorpay_order_id===gateway_order_id` +
  server-fetch payment, assert captured + amount before granting.
- **2.3 #6** Payment webhooks (Razorpay + PayPal): verify signature on raw body, grant idempotently.
- **2.4 #23** Harden free-scan geo (no forgeable header raises a paid limit off-edge).
- **2.5** Rate-limit capture/verify routes (after S3.1).

## S3 — Cost-control & abuse (+ rate-limiter foundation)
- **3.1 #19** Postgres-backed rate limiter behind a `getRateLimitStore()` factory (signature stays).
- **3.2 #1** Gate the report generator (auth/quota) + stop auto-firing from the indexable page.
- **3.3 #2** AI timeouts everywhere (Anthropic client timeout+retries; DeepSeek `timeout_ms`;
  client `AbortController` ~25–30s).
- **3.4 #3** Move `/recommend` AI behind the rate-limited API + params cache + `noindex`/Disallow.
- **3.5 #22** ai-panel auth; **#15** plan/intent rate-limit + opaque errors; **#33** autocomplete
  rate-limit; **#16** chat opaque errors.
- **3.6 #35** report-client defaults + error boundary; **#10** stale-`generating` recovery.

## S4 — Automation reliability (prerequisite for S5)
- **4.1 #4/#13/#14** Revive cascade-hubs: `GET=POST` + schedule `0 * * * *` + fix `.or()` via view/RPC.
- **4.2 #12/#36/#37** Alerter: stuck-running sweep (→timeout+alert) + no-success-in-N-hours heartbeat
  + widen lookback ~70 min.
- **4.3** poll-gh-actions: reconcile previously-`running` rows against GH API (root-cause the 195 leak).
- **4.4 #40** Derive snapshot date from `now-5min` (day-boundary safety).
- **4.5 #58** Discovery: official PH GraphQL API + per-source min-yield assertion + 0-yield alert.
- **4.6** One-time: mark the 195 stuck rows `timeout`.

## S5 — Real-Time Data SOP (≤3 days for all; daily top-150 hybrid 75/75)
- **5.1 Schema:** `tools.refresh_tier ('daily'|'standard')` + `curated_top boolean` + index
  `(refresh_tier, is_published, last_verified_at)`.
- **5.2 Populate top-150:** 75 curated (operator list, editable) + 75 data-driven (page_views +
  `gsc_tool_positions` + save_count + viability); weekly re-rank of the data half.
- **5.3 Throughput ~765/day:** nightly batch ~500 split into 2 staggered GH runs; tier-aware select:
  always all 150 daily + fill stalest standard (~1,850 ÷ ~615/day ≈ 3-day cycle).
- **5.4 Cover EVERY section within SLA:** fold uncovered columns into refresh/deep-refresh; per-section
  jobs get tier-aware cadence (daily-tier daily, standard ≤3 days).
- **5.5 Strict freshness SLA monitor:** alert if any published tool >3 days, any daily-tier >24h, or
  any section-refresher behind cadence.
- **5.6 Change-detector hygiene:** daily-tier always re-synthesizes; standard skips unchanged.

## S6 — Pipeline data-quality (stop bad data at source)
- **6.1 #51** Draft-until-green (ingest `is_published:false`; harden onboard publish-on-green; demote
  on later gate-fail).
- **6.2 #52/#62** Enrich strict mode (no fabricated pricing/skill; retry then flag for review).
- **6.3 #53** Refresh `scrapeFailed` guard (don't overwrite editorial fields from an empty scrape).
- **6.4 #54** News regex single-escape fix. **6.5 #55** FAQ min-count guard / upsert.
- **6.6 #56** Traction gate: probe-failed ≠ no-buzz; OAuth Reddit probe.
- **6.7 #57** Dedup: stop keying on aggregator URL; consistent name+slug normalization.
- **6.8 #64** GitHub token + type guard. **6.9** #65 dead criterion, #66 onboard backoff, #67
  latest-updates schema/date, #69 unify slugify + NFKD, #70 APIFY alert, #71 Trustpilot dates.
- **6.10** Scripts: #73 non-zero exit, #74 applied-only IndexNow, #75 dry-run, #77 scoped-run docs.

## S7 — SEO / schema correctness
- **7.1 #8** Sitemap real lastmod (best/stacks/for). **7.2 #9** Guard empty ItemList/FAQ on 0-tool.
- **7.3 #27/#68** Compare soft-404 → `notFound()`/noindex. **7.4 #28** rating clamp 1–5;
  **#43/#7** JSON-LD angle-bracket escaping (closes saved-stack XSS).
- **7.5** #41 single tool-count, #42 omit synth dates, #44 OG/twitter, #45 rel next/prev + noindex
  filtered, #46 robots `/mp`, #47 not-found metadata, #48 env validation.

## S8 — Live data cleanup (one-time, after S6)
- 8.1 398 missing logos → backfill. 8.2 262 contact-mislabel → re-enrich. 8.3 11 dup pairs → merge
  + 410. 8.4 14 soft-404 compares. 8.5 195 stuck rows → timeout. 8.6 2,830 freshness backlog drains
  via cascade-hubs. 8.7 viability variance/copy.

## S9 — UX / journeys / components
- #17 saveStack validation, #18 pagination clamp, #29 review/question forms, #30 saved-stack links,
  #31 silent save errors, #32 incrementStackView, #21 sentiment-synthesis schema, #49 chat cards,
  #50 planner empty, #72 ToolLogo onError, #76 hydration; **#63** Suspense → static rendering.

## S10 — Global verification & integration
- 10.1 build gate (`tsc` + `next build` + `eslint`). 10.2 live-DB re-audit (metrics moved).
  10.3 browser run-through. 10.4 full RLS policy review. 10.5 squash-merge to `main` via PR.

## Findings completeness index (all 77 → stream)
S1: 20,25,34,60 · S2: 5,6,23,24 · S3: 1,2,3,10,15,16,19,22,33,35 · S4: 4,12,13,14,36,37,40,58 ·
S5: 39 + SOP work · S6: 26,51,52,53,54,55,56,57,62,64,65,66,67,69,70,71,73,74,75,77 ·
S7: 7,8,9,27,28,41,42,43,44,45,46,47,48,68 · S8: 11,59,61,(57/62/68/12/4 data) ·
S9: 17,18,21,29,30,31,32,49,50,63,72,76 · S10: verification + browser run + RLS policy review.

## Risks & mitigations
2x throughput → stagger + withRetry + token monitoring · draft-until-green → demote + "stuck >48h"
alert · enrich strict → review queue · rate-limiter → factory + in-memory fallback · JSON-LD → per-
template validation · concurrent sessions → worktree + narrow staged paths + rebase-before-push.
