# Phase 10 (Fable 5 Review) — Senior Director Analyst Plan

**Date:** 2026-06-10
**Author:** Claude (Fable 5) — full-stack review of frontend, CTAs, user journey, tracking, admin panel, automated pipelines, data freshness, and SEO architecture.
**Evidence basis:** 3 deep codebase explorations + live Supabase queries run today against production data. Every headline claim below was verified against the live database, not guessed.

---

## Executive Summary (read this first)

### Non-technical summary

Your instinct was right on all three counts — but the reasons are different from what you feared:

1. **"We get traffic but no conversions"** — TRUE, and now explained. ~100 real visitors/day land mostly on tool pages and comparison pages (people Google "X vs Y" or a tool's name). Our main call-to-action asks them to "plan their AI stack" — but these visitors have *already decided what they're researching*. Result: 1,340 people saw the Plan CTA in 14 days, **only 5 clicked (0.37%)**. Meanwhile, the action they *naturally* want to take — clicking out to the tool's website — happens at a healthy ~9% rate, but we don't monetize or even properly count it. **The site doesn't have a conversion problem; it has a wrong-ask problem.**

2. **"I don't trust the tracking"** — PARTLY justified. Events ARE being recorded correctly (the pipeline works). But your headline "tool visits" number is **~96% bots**: 1,762 of 1,836 "visits" in 14 days were crawlers hitting our redirect links directly, counted as humans. Real human outbound clicks: ~70. Also, your #2 traffic surface (comparison pages) has visit links that **bypass tracking entirely** — those clicks are invisible. And newsletter signups: zero in 14 days, because newsletter forms barely exist where traffic actually lands.

3. **"Are the pipelines running? Is data fresh?"** — MOSTLY YES, with one big exception. Tool data is genuinely fresh (oldest tool data: 7 days; over half refreshed within 3 days; the refresh factory works). But the **freshness cascade** — the hourly job that tells Google "this page changed, come re-crawl it" — has **never successfully run once**: 0 of 2,839 pages ever revalidated. A fix shipped this morning; verifying it actually works is our first task. A few smaller pipelines (Bing submitter, sentiment scraper) are also failing.

**The plan in one line:** Fix the counters first (so we can see truth), then re-architect conversion around what visitors actually do (affiliate-ready outbound clicks, 60% focus) while improving the Plan funnel (40% focus), keep the pipeline factory honest, then use Google's own data to fix why our 64 niche SEO pages get almost zero visits.

### Technical summary

- **Tracking:** `user_events` mirror works end-to-end. Bugs: (a) `/api/tools/[slug]/visit` counts direct bot GETs as human (`referrer='/'`, `distinct_id='anon-<ip>'`, UA-regex insufficient — 1,762/1,836 events); (b) `components/compare/comparison-table.tsx:94` links raw `website_url`, bypassing the visit endpoint; (c) `lib/cta/persist-intent.ts:84-85` silently drops plan intents when Mixpanel is blocked/uninitialized; (d) `lib/admin/plan-conversion.ts:81-91` per-surface PostgREST JSONB filter unverified (parity-test, likely move to RPC); (e) `snapshot-daily-updates` hardcodes Bing=100/IndexNow=0.
- **Pipelines:** `cascade-hubs` shows 0 `pipeline_runs` rows in 7d and `pages_freshness` has `last_revalidated_at IS NULL` for all 2,839 rows. This morning's deploy (Phase 10 #13/#14) must be liveness-verified; note `lib/pipelines/with-logging.ts` validates `CRON_SECRET` *before* inserting the run row, so auth failures are invisible. `submit-urls-bing` failing since Jun 8; `scrape-sentiment` timed out Jun 7; GH `cron-pipelines` wrapper has a 46% timeout rate; SLA/heartbeat alerts firing (triage real vs post-deploy catch-up).
- **Conversion architecture:** affiliate-first plumbing partially exists (`affiliate_url ?? website_url` in the visit route) but: no auto-UTM, no compare-page tracked CTAs, no "visit winner" CTA, no newsletter capture on blog/tool pages, and `/plan` CTA mismatched to landing intent.
- **SEO:** 64 niche `/best` pages ≈ 2 views/14d — diagnose via GSC before touching content. `article:modified_time` not synced to refresh cycle; OG images missing on best/role pages; position-31–50 cohort is the volume opportunity (titles only matter on page 1, per prior GSC analysis).

---

## Live Evidence (queried 2026-06-10)

| Metric (last 14 days unless noted) | Value | Implication |
|---|---|---|
| Human page views (excl. founder admin) | ~1,500 | ~100 visitors/day, real traffic exists |
| Top landing sections | /tools 774, /compare 420, /blog 44, /best 2 | Intent = tool research, not stack planning |
| plan_cta_impression → clicked | 1,340 → 5 (0.37%) | Plan CTA is the wrong ask for this traffic |
| plan_signup_modal_completed | 1 | Funnel end ≈ zero |
| newsletter_subscribed | 0 | No capture where traffic lands |
| tool_visit_redirected | 1,836 total; 1,762 bot-pattern (ref `/`, anon-IP ids) | Headline metric ~96% inflated; real ≈ 70 |
| Real human outbound rate | ~9% of tool-page viewers | The funnel that already works |
| pages_freshness ever revalidated / IndexNow'd | 0 / 2,839 | Freshness cascade never ran once |
| cascade-hubs runs in pipeline_runs (7d) | 0 | Not running or failing before logging |
| Published tools / fresh ≤3d / stale >7d | 1,987 / 1,052 / 1 | Tool refresh pipeline is healthy |
| cron-pipelines GH wrapper | 71 timeouts vs 82 successes | 46% timeout rate |
| submit-urls-bing | failing since Jun 8 | Bing submissions down |
| scrape-sentiment | timed out Jun 7 | Sentiment data possibly stale |

---

## Department 0 — Verification Gate (P0, today)

**Non-technical:** A big batch of fixes shipped this morning (from the parallel Phase 10 bug-fix work). Before building anything new, we confirm the machines it claims to have revived are actually breathing — especially the freshness cascade, which has never worked. We also check whether today's alarm emails are real problems or just the system catching up.

**Technical plan:**
1. **cascade-hubs liveness:** watch `pipeline_runs` for hourly `cascade-hubs` success rows; confirm the 2,839-page backlog drains (`last_revalidated_at` filling in, `ever_indexnow > 0`). If absent after ~2 hours: Vercel cron invocation logs → `CRON_SECRET` env parity (`lib/pipelines/with-logging.ts:73-77` 401s before logging — invisible by design).
2. **Spot-check this morning's SEO fixes on live prod URLs:** sitemap `lastmod` real per-page dates (best/stacks/for), soft-404 compares now 404, empty best-of pages no longer emit broken FAQ/ItemList JSON-LD, AggregateRating clamped.
3. **Alert triage:** `freshness-sla` failures (expected post-deploy catch-up — confirm self-clears ≤48h), `poll-gh-actions-heartbeat` failures, reclassify `submit-urls-bing` quota-429s as `partial` not `failure`.

**Done when:** cascade-hubs ≥1 success/hour and backlog draining; each Phase 10 SEO claim verified live or logged as regressed; alert emails reduced to genuine breaches.

---

## Department A — Tracking Integrity (P0, before anything measurable)

**Non-technical:** Your dashboard says ~1,800 people clicked through to tools — really it was ~70 humans and ~1,760 robots. We fix the counters first, so every later improvement is visible and true. We also fix three smaller bugs that lose or hide real user signals.

**Technical plan:**
1. **Bot-proof the visit endpoint** (`app/api/tools/[slug]/visit/route.ts`): keep redirecting bots (harmless) but mark non-countable any GET lacking same-origin evidence — require the `d` param OR `sec-fetch-site: same-origin` / Referer host match, inside the existing `countable` gate. One-time SQL backfill: mark historical `tool_visit_redirected` rows with `referrer_path='/' AND distinct_id LIKE 'anon-%'` as `bot_likely=true`.
2. **distinct_id fallback** (`lib/cta/persist-intent.ts`): when Mixpanel is blocked, fall back to a locally generated UUID persisted in localStorage so plan intents are never silently dropped.
3. **Surface breakdown parity test** (`lib/admin/plan-conversion.ts:79-98`): per-surface sums must equal the global funnel count for the same window; if the PostgREST `properties->>surface` filter fails, migrate to an RPC like every other admin metric.
4. **Honest daily snapshot** (`app/api/cron/snapshot-daily-updates`): read real Bing/IndexNow counts from `pipeline_runs` instead of hardcoded 100/0.
5. **Conversion KPI honesty:** show OAuth completions AND "skipped with typed goal" as separate labeled numbers (skips are currently invisible in the funnel KPI).

**Done when:** daily visits metric collapses to the human baseline and tracks within ~2× of client-side clicks; uBlock-enabled browser still records a plan intent; parity test passes; dashboard numbers are real.

---

## Department B — Conversion / CTA Architecture (the revenue department)

**Strategy (locked with founder): affiliate-first 60% + improve the /plan funnel 40%.**

**Non-technical:** 100 people a day land on tool and comparison pages ready to pick a tool. Today we ask them to "plan their stack" (they don't click) and let the natural action — visiting the tool — go untracked and unmonetized. We flip the page's job: make every outbound click trackable and affiliate-ready (this is exactly how Futurepedia and Toolify make money), put a "Visit winner" button on comparisons, and capture emails where traffic actually lands. At the same time we *improve* the Plan CTA (better copy, placement, incentive) rather than removing it — it stays our product differentiator.

**Technical plan (affiliate-first, 60%):**
1. **Route compare-table CTAs through tracking:** replace the raw `website_url` anchor at `components/compare/comparison-table.tsx:94` with `VisitWebsiteButton` (`source='compare_table'`).
2. **"Visit winner" CTA** at the comparison verdict section (`app/compare/[slug]/page.tsx`) — the single highest-intent moment on the site.
3. **Auto-UTM on all outbound** in the visit route: append `utm_source=rightaichoice&utm_medium=referral&utm_campaign=<surface>` to `website_url` destinations (leave `affiliate_url` params untouched). Cheap groundwork for affiliate negotiations — vendors see us in their analytics.
4. **Affiliate ops report:** admin card "top 50 tools by human outbound clicks WITHOUT affiliate_url" → the founder's enrollment to-do list. The `affiliate_url ?? website_url` plumbing already works; this is a data-population problem.
5. **Newsletter capture where the traffic is:** inline `NewsletterForm` on `/blog/[slug]` (footer) and a tasteful scroll-triggered variant on tool pages.

**Technical plan (/plan funnel improvement, 40%):**
6. **Copy/value-prop pass on Plan CTAs:** today's card sells a generic "plan your stack"; test concrete value framing (e.g., "Get your free AI stack for [the category you're reading] — 60 seconds, no signup"). Keep prominent placement on homepage + categories; on tool/compare pages, reposition as secondary CTA near related-tools sections where comparison-shopping intent is real.
7. **Measure variants:** per-surface CTR already instrumented (`plan_cta_impression/clicked` by `surface`) — after Dept A fixes, the admin panel becomes the scoreboard.

**Done when:** `tool_visit_redirected` events with `/compare/` referrers appear; UTM visible in redirect Location header; newsletter subs > 0; /plan CTA CTR trend visible per surface and improving from 0.37%.

---

## Department C — Pipelines / Reliability (observation week)

**Non-technical:** The factory got rebuilt this morning. This department watches the first week of operation, fixes the two machines still jamming (Bing submitter, sentiment scraper), and quiets false alarms so a real alarm means something.

**Technical plan:**
1. Monitor cascade-hubs backlog drain daily; raise per-run cap only if drain stalls under the 60s budget.
2. `submit-urls-bing`: distinguish quota-vs-auth errors; quota → `partial` status, not `failure`.
3. `scrape-sentiment`: chunk the weekly run so one timeout doesn't void the whole batch; verify sentiment freshness after next Sunday's run.
4. Verify `poll-gh-actions` reconciliation marks orphaned `running` rows (the 46% GH timeout rate is largely mooted by this morning's OPT-2 move to Vercel crons, but reconciliation must hold).

**Done when:** one full week with cascade-hubs ≥95% hourly success, zero stuck `running` rows, and every alert email corresponding to a real problem.

---

## Department D — SEO / Growth (week 2 — "beat the big directories")

**Non-technical:** Google already sends us visitors for tool and comparison pages. Our 64 "best AI tools for X" pages — the page type competitors monetize hardest — get almost zero visits. Before rewriting anything, we ask Google's own data (Search Console) *why*: are the pages not indexed, or indexed but ranked on page 4? Each answer has a different, cheap fix. We also strengthen pages that are already close to page one instead of churning titles.

**Technical plan:**
1. **GSC-driven /best diagnosis first, fixes second:** indexed? impressions at position 40+? not indexed at all? (cascade-hubs revival + IndexNow already helps the indexing case). No content work until diagnosed.
2. **Internal linking to /best:** "Featured in: Best X for Y" links from tool pages and category pages — the cheapest ranking lever for thin-authority pages.
3. **Position 31–50 push:** content upgrades on tools ranking 31–50 (the proven volume opportunity), NOT title churn (titles only matter on page 1).
4. **Metadata honesty:** sync `article:modified_time` to the refresh cycle (meaningful now that cascade-hubs revalidates); add OG images to best/role pages.

**Done when:** every /best page has a diagnosis label (not-indexed / indexed-low / ranking); internal links live; a measured cohort of pos-31–50 upgrades shipped with before/after GSC tracking in the weekly digest.

---

## Explicitly NOT doing (and why)

- **No title rewrites off page 1** — proven low-value (prior GSC analysis).
- **No new page types or features** (community, reviews, paid placements) until conversion plumbing pays for itself.
- **No analytics replatforming** — Mixpanel + `user_events` works; the problem is classification, not the pipeline.
- **No /plan funnel rebuild-from-scratch** — improve copy/placement cheaply; revisit at 10× traffic.
- **No re-fixing of the prior 77 audit findings** without live evidence a specific one regressed (verify, don't duplicate the parallel Phase 10 stream).
- **No paid traffic.**

---

## Sequencing

| Phase | When | Work (parallel-safe streams) |
|---|---|---|
| 1 | Days 0–2 | Dept 0 verification gate + Dept A tracking integrity |
| 2 | Days 2–7 | Dept B conversion architecture ∥ Dept C pipeline triage |
| 3 | Week 2 | Dept D SEO/growth ∥ founder: affiliate program enrollment (from the Dept B report) |

Dependency logic: A before B (can't measure conversion wins with bot-inflated counters); 0 before D (cascade must be alive before judging /best indexing).

**Git protocol:** code fixes in a dedicated worktree (`../rac-fable5`, branch `fable5-review`), explicit-path staging only, integrated via squash PR. Docs (this folder) commit to `main` directly.

---

## Measurement Plan (how you SEE every improvement)

**Daily admin glance:**
- Human outbound clicks/day (post-bot-fix — the new north star)
- Compare-surface share of outbound clicks
- /plan CTA CTR per surface (improving from 0.37% baseline)
- Newsletter subs/day
- cascade-hubs success streak + freshness backlog count (should read 0)

**Weekly:** GSC impressions/clicks for /best pages and the position-31–50 cohort (weekly digest); pipeline failure-alert count trending to ~0.

**30-day acceptance targets:**
- Visits metric truthful (within ~2× of client-side click events)
- Comparison pages generating ≥20% of outbound clicks
- ≥1 newsletter subscription/day
- ≥10 tools with live `affiliate_url`
- cascade-hubs ≥95% hourly success, 0-page freshness backlog

---

## Build log

All work performed under this plan is documented step-by-step in [`build-log.md`](./build-log.md) in this folder — what was changed, where, how it was verified, and a plain-language note per step.
