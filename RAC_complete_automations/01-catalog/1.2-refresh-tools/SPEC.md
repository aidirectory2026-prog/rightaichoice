# 1.2 — refresh-tools (tuned for deep refresh)

> **Status:** EXISTING (tune — major upgrade from lite to deep refresh)
> **Type:** Cron + scraper + LLM synthesis
> **Runtime:** GitHub Actions
> **Schedule:** `0 2 * * *` (nightly, 02:00 UTC)
> **Decisions locked:** 2026-05-25 conversation

---

## 1. Purpose

Keep every tool's full editorial record current — every section, every detail. Not just the homepage 9-field lite refresh, but the complete picture: features, pricing, integrations, FAQs, recent changes, tutorials, screenshots, viability inputs — everything a buyer would want to see.

**Why this is upgraded from the current state:**
Today's lite refresh updates 9 fields. The remaining ~13 fields (FAQs, workflow scenarios, recent_changes, pricing_plan_guides, etc.) only update when you manually run the heavy job — so most tools have stale deep-detail sections. This automation makes every refresh a *complete* refresh.

---

## 2. Locked decisions (2026-05-25)

| # | Decision |
|---|---|
| Q1 | **400 tools/day** — full catalog (~2,400) cycles every 6 days |
| Q2 | **Scrape failure handling:** try one alternate fetch method (different user-agent / fetch lib), then fall back to DeepSeek synthesizing from training-data knowledge — never skip silently |
| Q3 | **Deep refresh always.** Every refresh covers ALL sections (no lite/full split). Field list in §4 |
| Q3a | **Smart multi-page crawl + YouTube cache.** Per tool, try fetching: homepage, `/changelog` (or `/whats-new` / `/releases`), `/docs` landing, `/pricing`, recent `/blog` posts → feed combined content to DeepSeek. Also pull top YouTube tutorial results so tutorials section stays current. |
| Q3b | **Budget approved:** ~$96/month base + ~$12/month YouTube = ~$108/month |
| Q4 | **Priority queue:** 350 stalest + 50 trending (top by 7-day view_count) = 400 total |
| Q5 | **No manual locks** — refresh runs against every published tool |

---

## 3. Trigger / runtime

- **Trigger:** GitHub Actions cron `0 2 * * *` (`freshness-batch.yml` → `refresh-tools` job)
- **Manual:** `workflow_dispatch` with `pipeline: refresh-tools-batch` (already wired)
- **Entry:** `scripts/refresh-tools-batch.ts` → `lib/cron/refresh.ts` → existing `runRefresh()` (will be extended)
- **Wall-clock budget:** ~3 hours for 400 deep refreshes (still fits 6h GH Actions limit)
- **Cost budget:** ~$3.20/day DeepSeek + ~$0.40/day YouTube ≈ $108/month
- **Triggers downstream:** every tool UPDATE fires the **1.1 freshness-cascade** trigger, so all mentioning pages cascade automatically

---

## 4. Inputs

### Fields refreshed (every tool, every run — locked Q3)

Existing 9 lite fields:
- `tagline`, `description`, `editorial_verdict`, `our_views`, `pricing_type`, `features`, `integrations`, `best_for`, `not_for`

Additional deep fields:
- `long_description`, `pricing_details`, `pricing_plan_guides`, `pricing_json`
- `faqs_long_tail`, `workflow_scenarios`, `recent_changes`, `latest_updates`
- `youtube_tutorials` (from YouTube cache), `tutorials` (vendor-blog tutorials)
- `viability_score`, `viability_breakdown` (recomputed from inputs)
- `screenshots` (if `/screenshots` or `/gallery` URL exists)
- `github_stars`, `last_github_sync` (existing side-fetch, kept)
- `last_verified_at`, `updated_at`

### Multi-page scrape strategy (locked Q3a — Option C)

Per tool, attempt to fetch (in this order, parallel where safe):

| # | URL pattern | Purpose | Failure handling |
|---|---|---|---|
| 1 | `<website_url>` (homepage) | Primary content | If fails → try alt-fetch → if still fails, no source content |
| 2 | `<website_url>/changelog`, `/whats-new`, `/releases`, `/release-notes` | `recent_changes` + `latest_updates` | Try in order; first 200 wins; if none → skip |
| 3 | `<website_url>/docs` or `<website_url>/documentation` | Deep features + integrations | If fails → skip |
| 4 | `<website_url>/pricing` (if separate from homepage) | `pricing_details` truth | If fails → use homepage pricing |
| 5 | `<website_url>/blog?limit=5` (latest 5 posts) | `latest_updates` corroboration | Skip if no blog |
| 6 | YouTube Data API: search `"<tool name> tutorial"` top 5 results | `youtube_tutorials` (id, title, channel, views) | Cache 7d; quota-aware fallback to scraping YouTube search HTML |

All fetched text is concatenated (capped at 24k chars total — 2× current limit) and fed to a single DeepSeek call. DeepSeek prompt is rewritten to expect this multi-source input and produce the full deep-field schema.

### Scrape failure fallback (locked Q2)

In `lib/cron/scrape.ts`:

```ts
async function fetchPageText(url: string): Promise<string> {
  try {
    return await fetchWithDefault(url)              // current behavior
  } catch {
    try {
      return await fetchWithAlternativeUA(url)      // alt user-agent + fetch lib
    } catch {
      return ''                                     // empty → DeepSeek synthesizes from training
    }
  }
}
```

DeepSeek prompt updated: "If page_text is empty, synthesize from your training-data knowledge of `<tool_name>`; mark fields with confidence in metadata."

### Priority queue (locked Q4 — 350 stalest + 50 trending)

`runRefresh()` is extended to fetch in two passes:

```sql
-- Pass 1: 350 stalest
SELECT … FROM tools
WHERE is_published = true
ORDER BY last_verified_at ASC NULLS FIRST
LIMIT 350;

-- Pass 2: 50 trending (excluding any already in pass 1)
SELECT … FROM tools t
WHERE t.is_published = true
  AND t.id NOT IN (<pass 1 IDs>)
ORDER BY (
  SELECT COUNT(*) FROM tool_views v
  WHERE v.tool_id = t.id
    AND v.created_at >= NOW() - INTERVAL '7 days'
) DESC
LIMIT 50;
```

If `tool_views` table doesn't exist, fall back to `tools.view_count` (lifetime, less ideal but functional).

---

## 5. Outputs

### Tool row updated atomically per refresh
All fields in §4 written in one `UPDATE tools` statement (idempotent re-runs safe). Trigger fires → **1.1 freshness-cascade** propagates to every mentioning page.

### `refresh_logs` row per tool per run
Existing table; fields_updated array now lists ~20 fields instead of 9.

### YouTube cache: `tool_youtube_cache` (NEW small table)
```sql
CREATE TABLE tool_youtube_cache (
  tool_id      UUID PRIMARY KEY REFERENCES tools(id) ON DELETE CASCADE,
  videos       JSONB NOT NULL,           -- [{ id, title, channel, views, published_at }, …]
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
Refresh job reads cache if `fetched_at < 7 days ago`; otherwise re-fetches and updates.

### Cron run summary (existing telemetry)
- Total processed / refreshed / failed
- Cost estimate (tokens × DeepSeek price + YouTube units × API price)
- Logged in `pipeline_runs` + visible on `/admin/updates`

---

## 6. Dependencies

### Upstream
- `tools` table with all the deep fields (most exist; confirm any new ones during build)
- Existing `lib/cron/refresh.ts` + `lib/cron/scrape.ts`
- DeepSeek V3 API (existing)

### New
- YouTube Data API v3 key (need to provision — free 10k units/day; we'll hit limit at 400 tools/day × 100 units = 40k units, so will need either paid quota or HTML-scrape fallback)
- Alternative fetch helper (lib that uses different UA / fetch primitive — for retry)

### Env vars (additions)
- `YOUTUBE_API_KEY` — Google Cloud project, YouTube Data v3 enabled
- (existing) `DEEPSEEK_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Downstream effects
- **1.1 freshness-cascade** — fires every refresh, propagates to mentioning pages
- **1.5 cascade-comparisons** — picks up tool changes when regenerating compare editorials
- **2.x SEO** — sitemap dates honest; "Last updated" labels truthful
- Newsletter feature pool (3.x) — `latest_updates_at` populated for top-50 weekly digest

---

## 7. Manager touchpoints

**Zero during normal operation.**

**One-time setup:**
- Provision YouTube API key + add to GH Actions secrets
- Approve the prompt changes (new system prompt covers ~20 fields instead of 9 — review before first prod run)

**Alerts (via 8.1 kpi-anomaly):**
- "Refresh-tools nightly job failed 2 runs in a row" → infra
- "All-failures-rate >20% in last 7 days" → vendor blocking or prompt drift
- "Daily DeepSeek cost >$5" → cost spike (e.g., prompt got too long)

---

## 8. Failure modes

| Symptom | Likely cause | Recovery |
|---|---|---|
| Tool refreshed but new deep fields blank | DeepSeek output missing fields (validation tolerated nulls) | Prompt tune — add explicit field requirements |
| YouTube quota exhausted mid-run | 400/day × 100 units > 10k free quota | HTML fallback already wired; alerts when fallback hit >100×/day |
| Scrape blocked on a vendor → alt-fetch also blocks | Vendor is actively hostile (e.g., Cloudflare CAPTCHA) | Job logs the vendor, manager decides to skip / unpublish that tool |
| Trending list empty (no `tool_views` table) | Fallback to lifetime view_count | Acceptable; no alert |
| Multi-page scrape hits a 404 on `/changelog` | Vendor doesn't have one | Already handled — silent skip |
| Run takes >4h | Vendor rate-limits cascade | Reduce concurrency in script; current is sequential which is already safe |
| Cost spike | Prompt regressed (too many tokens) | Anomaly alert; check `pipeline_runs.metadata.cost_estimate` |

---

## 9. Files to create / modify

### Create
- `lib/cron/scrape-multipage.ts` — multi-URL crawl helper (homepage + changelog + docs + pricing + blog)
- `lib/cron/youtube-cache.ts` — YouTube Data API client + 7-day cache layer + HTML fallback
- `supabase/migrations/096_tool_youtube_cache.sql` — cache table

### Modify
- `lib/cron/refresh.ts` — extend Zod schema to ~20 fields; rewrite system prompt; new query path for `runRefresh()` (350 stalest + 50 trending); call multi-page scraper
- `lib/cron/scrape.ts` — add `fetchWithAlternativeUA()` fallback layer
- `scripts/refresh-tools-batch.ts` — bump default `--batch` from 200 to 400; log cost estimate
- `.github/workflows/freshness-batch.yml` — `timeout-minutes: 240` for refresh-tools job (currently 180)
- `app/admin/updates/page.tsx` — show new deep-field coverage stats

### Reuse
- DeepSeek client (existing in `lib/cron/refresh.ts`)
- Supabase admin client
- `refresh_logs` audit trail

---

## 10. Acceptance test

After deploy:

1. **Manual trigger via workflow_dispatch with `batch_size=5`** → completes in <10 min.
2. **Pick a tool**, inspect:
   - `tagline`, `description`, `our_views` — refreshed (lite fields)
   - `faqs_long_tail`, `workflow_scenarios`, `recent_changes` — refreshed (deep fields, previously stale)
   - `youtube_tutorials` — populated from cache
   - `tool_youtube_cache` row exists with `fetched_at` recent
3. **Verify multi-page scrape happened:** check `refresh_logs.metadata` shows which URLs were tried + which returned content.
4. **Simulate scrape block:** point a test tool's `website_url` at a 403 endpoint → confirm alt-fetch retry happens, then DeepSeek synthesizes from training, log shows `scrape_source='training_knowledge'`.
5. **Trending query:** verify 50 trending tools appear in the run separate from the 350 stalest (cross-check IDs).
6. **Cascade fires:** trigger refresh on tool X → 1.1's `pages_freshness` rows for every page mentioning X get bumped.
7. **Cost log:** `pipeline_runs.metadata.cost_estimate` populated; matches expected ~$3-4/run.
8. **Run nightly for 6 days** → confirm full catalog cycled (every published tool has `last_verified_at` updated within last 6 days).

---

## 11. Build order

1. `tool_youtube_cache` migration + `lib/cron/youtube-cache.ts`
2. `lib/cron/scrape-multipage.ts` + alt-fetch fallback
3. Rewrite DeepSeek system prompt + extend Zod schema in `lib/cron/refresh.ts`
4. New query path (350 + 50) in `runRefresh()`
5. Bump batch size + workflow timeout
6. Manual workflow_dispatch test run (`batch_size=5`)
7. Full prod cutover (`batch_size=400`)
8. Monitor first nightly run via `/admin/updates`

Estimated dev: 1–2 days.

---

## Decisions deferred (not blocking)

- Whether to also scrape changelogs from third-party trackers (Sitejabber, G2 News, etc.) — defer; multi-page vendor crawl should cover most cases.
- Whether to cache homepage HTML for diffing ("did anything change since last refresh?") — defer; nice-to-have for cost optimization later.
