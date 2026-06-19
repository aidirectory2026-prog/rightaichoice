# Master SOP — Every Automated Pipeline

**The single source of truth for every cron, scheduled job, and "set-it-and-forget-it"
automation that keeps RightAIChoice running. Keep this current with EVERY pipeline change.**

Last full review: **2026-06-18** (Phase 11 — freshness root fix, weekly deep refresh,
cost tracking, viability rebuild).

---

## 0. The 60-second non-technical picture (for everyone on the team)

RightAIChoice is a catalog of ~2,070 AI tools that has to stay **accurate and fresh on
its own**, with almost no human touching it day to day. A fleet of small robots
("pipelines") runs on a schedule to do that. In plain English, they:

1. **Find new tools** worth listing (and reject hype with no traction).
2. **Keep every tool's facts current** — what it does, pricing, the latest news — so a
   visitor never reads a stale "100k context" when the real number moved on.
3. **Push that freshness everywhere** the tool is mentioned — its own page, comparison
   pages, category/best pages, and blog posts — so nothing contradicts itself.
4. **Score each tool's survival risk** (the Viability Score) so we can warn buyers off
   tools likely to die.
5. **Tell Google & Bing** about new/changed pages so they get indexed.
6. **Watch itself** — log what every robot did + how much it cost, and email/Slack an
   alert when one breaks.

Two layers of robots run this:
- **Vercel Crons** — lightweight jobs (seconds each). Run straight on our hosting.
- **GitHub Actions** — heavy jobs (minutes to hours, e.g. refreshing hundreds of tools
  with AI). Vercel caps a job at ~5 min, so the big work runs on GitHub's longer budget
  and writes to the same database.

Everything an AI robot does costs a little money (DeepSeek, an AI model ~10× cheaper than
the big names). **Total AI spend is ~$130–200/month**, now tracked per-run in the
database (`pipeline_runs.estimated_cost_usd`) and visible in `/admin/health`.

**If something looks stale or broken:** check `/admin/health` and the `pipeline_runs`
table first (see §4 Health-check). Every robot logs there.

---

## 1. ⚠️ Critical gotchas (read before touching ANY pipeline)

Two production-silent failure modes that have each taken down pipelines. Both look "fine"
on the surface — caught only by checking `pipeline_runs` and the sitemap dashboards.

### 1. Vercel Cron invokes via **GET** — every Vercel-cron route MUST export `GET`
A route that only exports `POST` will **silently 405 on every scheduled fire and never
run** (no `pipeline_runs` row at all). The Phase 8.d.3 wrapper refactor made several
routes POST-only and silently killed 5 crons for weeks. **Rule: export BOTH `GET` and
`POST` from every cron route.** Detection: any `pipeline_key` in `vercel.json` that's
absent/stale in `pipeline_runs` is dead.

### 2. Sitemaps must stay **CDN-cached** — or Bing drops them
A `sitemap.ts` Route Handler is cached by Next 16 **unless it uses a request-time API**.
Calling the cookie-reading `createClient()` (or `force-dynamic`) opts it out → every
crawler fetch is an uncached DB render; when that exceeds Bing's ~2–3s tolerance, Bing
marks the feed "Pending" forever. **Sitemap data MUST come from the cookie-free
`getAdminClient()`.** Verify: `curl -sI .../tools/sitemap.xml | grep x-vercel-cache` → `HIT`.

### 3. (Phase 11) Scrapers fail silently on bot-protected sites — regenerate, don't freeze
The flagship vendor sites (claude.ai, x.ai, perplexity.ai = Cloudflare 403; gemini =
JS-only SPA) **cannot be scraped** by plain fetch. The old refresh "preserved" editorial
on scrape failure → those tools' editorial **froze for months** while the cron logged
"refreshed". Fixed B1.2: when scrape is blocked but news + profile exist, regenerate from
those + model knowledge (honesty guard against restating unconfirmed numbers). Watch the
new `scrapeBlocked` metric in `pipeline_runs.metadata` — a spike = scraper degraded.

---

## 2. Full inventory — every pipeline in schedule order

Authoritative trigger sources: **`vercel.json` → crons** (Vercel, GET) and
**`.github/workflows/*.yml`** (GitHub Actions, POST/script). Live status: `/admin/health`
+ `pipeline_runs`. All Vercel crons require `CRON_SECRET`; GH jobs require the Supabase +
DeepSeek secrets in repo settings.

### A. Vercel Crons (`vercel.json`) — lightweight, run on Vercel

| Schedule (UTC) | Pipeline | What it does |
|---|---|---|
| `*/10` | `poll-gh-actions` | Mirror GitHub Actions run status into `pipeline_runs` |
| `*/15` | `new-signup-alert` | Email/Slack any new auth.users not yet alerted |
| `*/30` | `alert-failed-pipelines` | Scan `pipeline_runs`; alert on failures/stalls |
| `0 * * * *` (hourly) | `cascade-hubs` | **Propagation engine** — revalidate pages whose tools changed + IndexNow ping |
| `7,37 * * * *` | `onboard-tools` | Fast onboard of queued candidate tools (2×/hr) |
| `17,47 * * * *` | `onboard-tools?mode=sop` | Premium gated onboard SOP on draft tools (2×/hr) |
| `30 0 * * *` | `calculate-viability` | Recompute Viability Score, 300 stalest/day |
| `15 3 * * *` | `cleanup-user-events` | Prune old raw analytics events |
| `0 4 * * *` | `scrape-sentiment` | Refresh sentiment cache (paid Sentiment Checker) |
| `0 9 * * *` | `submit-urls-bing` | Bing direct-API URL submission (smart rotation) |
| `45 23 * * *` | `refresh-freshness-view` | Rebuild the `pages_freshness` materialized view |
| `55 23 * * *` | `snapshot-daily-updates` | Snapshot the day's tool updates for the digest |
| `0 6 * * 1` | `resubmit-sitemap-gsc` | Tell Google to re-fetch the sitemap index (Mon) |
| `30 6 * * 1` | `snapshot-gsc` | Pull GSC performance into our DB (Mon) |
| `0 7 * * 1` | `triage-gsc` | Flag GSC coverage/indexing regressions (Mon) |
| `0 8 * * 1` | `email-weekly-digest` | Weekly digest email (Mon) |
| `30 8 * * 1` | `seo-impact` | Attribute SEO movement to shipped changes (Mon) |
| `0 10 * * 2` | `indexnow-unindexed` | IndexNow ping for still-unindexed URLs (Tue) |

### B. GitHub Actions — heavy jobs (minutes–hours), write to the same DB

| Schedule (UTC) | Workflow · job | What it does | Cost |
|---|---|---|---|
| `0 2` + `0 14` | freshness-batch · **refresh-tools** | **Lite refresh** — 9 core editorial fields, 500 stalest/fire, news-grounded (B1) | ~$0.0016/tool, ~$48/mo |
| `0 3` | freshness-batch · **refresh-latest-updates** | Mine news/changelog/HN/Reddit → `latest_updates`; change-detector skips unchanged | ~$40/mo |
| `0 4` | freshness-batch · **ingest-tools** | Discover + traction-gate + onboard new tools | ~$30/mo |
| `0 5` | freshness-batch · **cascade-editorials** | Regenerate stale compare prose (news-grounded, B1) | ~$10/mo |
| `40 5` | freshness-batch · **backfill-logos** | Fetch/verify/rehost logos for tools missing one (no LLM) | $0 |
| `0 6` | freshness-batch · **full-refresh** | **Deep 22-field SOP** — 300 stalest/day → whole catalog every field ≤7 days (B2) | ~$50–90/mo |
| `0 6 */2` | cron-pipelines · refresh-faqs | Regenerate stale FAQs (curl → Vercel route) | small |
| `30 1 *` | cron-pipelines · calculate-viability (alt trigger) | Same viability route, GH-driven backstop | — |
| `0 5 * * 1` | cron-pipelines · generate-editorials | Backfill new editorial comparisons (Mon) | small |
| `0 7 * * 2,5` | cron-pipelines · discover-tutorials | YouTube tutorial discovery (Tue/Fri) | small |
| `0 1 * * 0` | cron-pipelines · submit-indexnow | Bulk IndexNow submission (Sun) | $0 |
| `15 1 * * *` | sync-mentions | Rebuild `page_tool_mentions` (code + blog frontmatter + db-join) — the map that drives propagation | $0 |
| `0 8 * * *` | tracking-watchdog | Verify analytics event registry + tracking health | $0 |
| `0 21 * * *` | nightly-verify | Build + Playwright smoke of key routes | $0 (CI mins) |
| manual | retry-failed-tools | Re-run refresh for an explicit slug list | per-run |

---

## 3. The catalog-freshness system (how a tool change reaches every page)

This is the heart of the product and the most-asked "how does it work". Four moving parts:

1. **Capture** — two refreshers keep `tools.*` current:
   - *Lite* (`refresh-tools`, 2×/day): 9 core editorial fields, fast/cheap, news-grounded.
   - *Deep* (`full-refresh`, daily cohort): all 22 fields incl. FAQs, workflow scenarios,
     pricing-tier guides, migrations — whole catalog every ≤7 days. Also sets `is_wrapper`.
   - *News* (`refresh-latest-updates`, daily): fills `tools.latest_updates` from the open
     web. **Both refreshers now read this news and let it override stale vendor copy** —
     the Phase 11 root fix for "why is the data old?".
2. **Map** — `sync-mentions` (nightly) builds `page_tool_mentions`: every (tool → page)
   relationship across tool/compare/category/best/role/stack/blog (~30k rows).
3. **Mark** — a DB trigger on `tools` calls `propagate_freshness()`, which stamps every
   mapped page in `pages_freshness` as "needs refresh".
4. **Refresh** — `cascade-hubs` (hourly) reads `pages_freshness`, `revalidatePath()`s each
   changed page, and pings IndexNow. Compare prose re-gens via `cascade-editorials`.

**Page types and how they update:**
- Tool / compare / category / best / for / stack pages → query `tools.*` **live** → update
  the instant the cascade revalidates them.
- Compare editorial prose → regenerated by `cascade-editorials` (news-grounded).
- **Blog posts (static MDX)** → were the gap. Now use the live `<ToolFact slug field>`
  component (Phase 11 B3) so inline facts (pricing, models) re-read the DB on revalidation
  instead of staying frozen as prose. The cascade already revalidates the 16 mapped blog
  pages on a tool change.

---

## 4. Observability, cost & health-checks

- **Every pipeline logs one `pipeline_runs` row** (status, items, duration, tokens, $).
  GH bulk scripts use `runScriptedPipeline`; Vercel routes use `cronRoute`. (Phase 11 B5
  closed the gap where GH bulk runs never logged + scrape-blocked tools were miscounted as
  succeeded.)
- **Cost** is recorded per run (`estimated_cost_usd`, from DeepSeek token usage). Was $0
  across the board before Phase 11 — now real. Check spend:
  `select pipeline_key, sum(estimated_cost_usd) from pipeline_runs where started_at > now() - interval '30 days' group by 1 order by 2 desc;`
- **Failures** are caught by `alert-failed-pipelines` (every 30 min → email/Slack).
- **Monday health-check:** open `/admin/health`; for any red pipeline, find it in §2 and
  follow its workflow file / route. Key sanity queries:
  - Freshness: `select count(*) from tools where last_verified_at > now() - interval '48 hours'` (lite) and `... last_full_refresh_at > now() - interval '8 days'` (deep) — both should approach the published count.
  - Scrape health: `select metadata->>'scrapeBlocked' from pipeline_runs where pipeline_key='refresh-tools' order by started_at desc limit 1` — a sudden jump = scraper degraded.
  - Viability: `select count(*) from tools where viability_score is null and is_published` → 0.

---

## 5. The Viability Score (Phase 11 C rebuild)

Measures shutdown/abandonment risk, 0–100. **Old model was broken** — it clustered every
tool 72–90 (nothing below 72, at-risk page empty) because two signals were hardcoded
constants and a third (`is_wrapper`) was never populated.

**New 4-signal model** (`lib/cron/viability.ts`):

| Signal | Weight | Source |
|---|---|---|
| Momentum | 40% | recency of the newest item in `latest_updates` (is it shipping?) |
| Wrapper dependency | 30% | `is_wrapper` — now set by the deep SOP's LLM judgment |
| Funding runway | 20% | `pricing_type` (paid/freemium = revenue) |
| Website health | 10% | has a live site |

`is_wrapper` is judged per-tool by the deep SOP ("thin wrapper over a foundation model
with no moat?"), so it populates over the ~7-day deep cycle — at-risk fills with genuine
thin-wrapper / stale tools as it does. Bands: ≥70 safe, 40–69 moderate, <40 at-risk.
(C3 backlog: real per-category mortality + hyperscaler-overlap RSS monitoring.)

---

## 6. Adding / changing a pipeline — checklist (copy into the PR)

- [ ] Route at `app/api/cron/<name>/route.ts` **exports BOTH `GET` and `POST`** (Gotcha #1)
- [ ] Auth via `validateCronSecret(request)` / `cronRoute`
- [ ] `export const maxDuration` set (≤300 on Vercel; heavy work → a GH Actions job instead)
- [ ] Schedule added to `vercel.json` (daily/sub-daily light) **or** a job in a
      `.github/workflows/*.yml` (heavy/long)
- [ ] Wrapped in `cronRoute` / `runScriptedPipeline` so it logs to `pipeline_runs`
- [ ] Records `ctx.recordTokens(...)` if it calls an LLM (so cost is tracked, not $0)
- [ ] **Updated THIS doc** — inventory table (§2) + any relevant section, in schedule order
- [ ] Updated `/admin/resources` if it changes something the team should understand
- [ ] Env vars listed here AND set in Vercel project / GH repo secrets
