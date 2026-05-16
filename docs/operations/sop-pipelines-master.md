# Master SOP — Every Automated Pipeline

**Single source of truth for every cron, every scheduled job, every "set it and forget it" automation in the codebase.**

Each pipeline has the same 7-field SOP:
- **Schedule** — when it fires
- **Trigger surface** — Vercel cron / launchd / manual
- **What it reads** — input dependencies
- **What it writes** — output side-effects
- **Failure mode** — what happens when it errors
- **Verification** — how to confirm it ran successfully
- **Recovery** — what to do if it's failing

This doc is read on Mondays during the weekly review. If a pipeline is failing repeatedly, find it here, follow Recovery.

---

## Pipeline inventory (12 active, all server-side)

| # | Path | Schedule (UTC) | Lid-state | Purpose |
|---|---|---|---|---|
| 1 | `/api/cron/indexnow-recent` | Daily 07:00 | server | IndexNow ping new URLs (Bing/Yandex) |
| 2 | `/api/cron/submit-urls-bing` | Daily 09:00 | server | Bing direct API submission, smart-rotation |
| 3 | `/api/cron/refresh-latest-updates` | Daily 02:00 | server | Per-tool "Latest from" refresh (top 50) |
| 4 | `/api/cron/refresh-tools` | **Hourly** | server | **200+/day tool refresh — Phase 8 freshness contract** |
| 5 | `/api/cron/ingest-tools` | 01:00 + 13:00 | server | **50 new tools/day target — Phase 8 freshness contract** |
| 6 | `/api/cron/refresh-compare-editorials` | Daily 08:00 | server | **Cascade: regen compare editorials when underlying tools refresh** |
| 7 | `/api/cron/calculate-viability` | Mon 04:00 | server | Recompute viability score per tool |
| 8 | `/api/cron/refresh-faqs` | Mon 05:00 | server | Regenerate stale FAQs via DeepSeek |
| 9 | `/api/cron/resubmit-sitemap-gsc` | Mon 06:00 | server | Tell Google to re-fetch sitemap-index |
| 10 | `/api/cron/scrape-sentiment` | Sun 04:00 | server | Reddit/HN/G2 sentiment quotes per tool |
| 11 | `/api/cron/discover-tutorials` | Sun 05:00 | server | YouTube tutorial discovery per tool |
| 12 | `/api/cron/generate-editorials` | Sun 06:00 | server | Backfill new editorial comparisons |

**Plus 1 manual + 1 quarterly pipeline:**
- `scripts/backfill-tool-data.ts` (Phase 4 SOP full-catalog refresh) — manual monthly via `npm run refresh:apply -- --force`
- `scripts/refresh-latest-updates.ts --all` — manual monthly full-catalog latest-updates refresh

**All Vercel crons require `CRON_SECRET` env var in Vercel project.** No other auth.

---

## 1. IndexNow recent (`/api/cron/indexnow-recent`)

| Field | Value |
|---|---|
| Schedule | Daily 07:00 UTC |
| Trigger | Vercel cron |
| Reads | `tools.created_at`, `tool_comparisons.created_at` (last 7 days) |
| Writes | POST to api.indexnow.org with URL batch |
| Failure mode | IndexNow returns 200 even on garbage; real failures = network errors or 4xx |
| Verification | Vercel deploy logs → search for "indexnow-recent" → expect 200 OK + `submittedCount` field |
| Recovery | If failing 3+ days: check `lib/indexnow.ts` key matches the file at `public/<key>.txt` (Bing validates ownership before accepting submissions) |

**Why it exists:** baseline freshness signal to Bing/Yandex for net-new content. Complements `/api/cron/submit-urls-bing` (which handles older content via smart rotation).

---

## 2. Bing direct API submission (`/api/cron/submit-urls-bing`)

| Field | Value |
|---|---|
| Schedule | Daily 09:00 UTC |
| Trigger | Vercel cron |
| Reads | `bing_submit_state` (single row) + `tools` / `tool_comparisons` / `categories` per current rotation type |
| Writes | POST to Bing SubmitUrlbatch + UPDATE `bing_submit_state` (cursor + lifetime stats) |
| Failure mode | Same-day re-fire is rejected by Bing (400 "Quota exceeded"); cron silently skips when `last_run_utc` matches today |
| Verification | `select * from bing_submit_state` → `last_run_utc` should be today; `lifetime_submitted` should bump by ~100 daily |
| Recovery | If `lifetime_runs` not incrementing: check Vercel logs for "BING_WEBMASTER_API_KEY missing" → re-add to Vercel env. If cron fires but Bing returns 4xx: api key rotated, generate new at https://www.bing.com/webmasters → Settings → API Access |

**Why it exists:** authenticated direct push to Bing gets stronger crawl-priority than IndexNow. Smart rotation auto-cycles compare → tool → alternative → category so the operator never has to think "what did I push yesterday."

**Required Vercel env vars:** `BING_WEBMASTER_API_KEY`, `CRON_SECRET`.

---

## 3. Refresh latest-updates (`/api/cron/refresh-latest-updates`)

| Field | Value |
|---|---|
| Schedule | Daily 02:00 UTC |
| Trigger | Vercel cron |
| Reads | `tools` (top 50 by `last_full_refresh_at ASC` — staleness-first) + vendor changelog + Reddit/HN/blog signal |
| Writes | `tools.latest_updates` JSONB + `tools.latest_updates_at` |
| Failure mode | Per-tool DeepSeek synthesis fails → tool keeps prior `latest_updates`. Logged to `docs/preflight/latest-updates-needs-review.txt`. Cron continues with remaining tools. |
| Verification | `select count(*) from tools where latest_updates_at >= now() - interval '24 hours'` → should be ~50 per day |
| Recovery | If `latest_updates_at` not advancing: check Vercel logs for DeepSeek 5xx storms (DeepSeek API outage). Re-fire on demand: `curl -H "Authorization: Bearer $CRON_SECRET" https://rightaichoice.com/api/cron/refresh-latest-updates` |

**Why it exists:** keeps the "Latest from {Tool}" section under "Our Take" current. Top 50 tools daily; whole catalog refreshed weekly via the Sunday `refresh-latest-full` (TODO if not yet scheduled).

---

## 4. Calculate viability (`/api/cron/calculate-viability`)

| Field | Value |
|---|---|
| Schedule | Mon 04:00 UTC |
| Trigger | Vercel cron |
| Reads | `tools.last_full_refresh_at`, `tools.recent_changes`, `tools.pricing_history`, `tools.review_count` |
| Writes | `tools.viability_score` (0-100), `tools.viability_breakdown` JSONB |
| Failure mode | Algorithmic — no external API. If it errors, the bug is in `lib/viability/calculate.ts`. No transient failures. |
| Verification | `select count(*) from tools where viability_score is null and is_published = true` → should be 0 |
| Recovery | If scores drift unrealistically (cluster around 50): manually inspect `lib/viability/calculate.ts` weighting. May need re-tuning if vendor behavior changes. |

**Why it exists:** powers the "Viability Score" badge + `/viability/at-risk` route + 7O.1 outreach filter (skip vendors with viability < 30).

---

## 5. Refresh FAQs (`/api/cron/refresh-faqs`)

| Field | Value |
|---|---|
| Schedule | Mon 05:00 UTC |
| Trigger | Vercel cron |
| Reads | `tools` with `faqs_long_tail` older than 90 days |
| Writes | `tools.faqs_long_tail` JSONB array |
| Failure mode | Per-tool DeepSeek failure → keeps prior FAQs |
| Verification | `select count(*) from tools where faqs_long_tail is not null` → should grow weekly |
| Recovery | Same as latest-updates: DeepSeek outage is the only realistic failure mode. Manually re-fire route. |

---

## 6. Re-submit GSC sitemap (`/api/cron/resubmit-sitemap-gsc`)

| Field | Value |
|---|---|
| Schedule | Mon 06:00 UTC |
| Trigger | Vercel cron |
| Reads | `GSC_OAUTH_REFRESH_TOKEN` env var |
| Writes | PUT to `https://www.googleapis.com/webmasters/v3/sites/.../sitemaps/sitemap-index.xml` |
| Failure mode | 401 if refresh token expired or revoked. 404 if sitemap URL doesn't exist (it does). |
| Verification | GSC dashboard → Sitemaps → `sitemap-index.xml` row → "Last read" date should advance weekly |
| Recovery | If 401: re-run `npm run gsc:oauth:bootstrap` locally to mint a new refresh token, then update `GSC_OAUTH_REFRESH_TOKEN` in Vercel env |

**Required Vercel env vars:** `GSC_OAUTH_CLIENT_ID`, `GSC_OAUTH_CLIENT_SECRET`, `GSC_OAUTH_REFRESH_TOKEN`, `CRON_SECRET`. Optional: `GSC_SITE_URL`, `GSC_SITEMAP_URL`.

---

## 4. Refresh tools — daily 200+ contract (`/api/cron/refresh-tools`)

| Field | Value |
|---|---|
| Schedule | **Hourly (`0 * * * *`)** |
| Trigger | Vercel cron |
| Reads | 10 stalest `tools` per fire, by `last_verified_at ASC NULLS FIRST` |
| Writes | 9 SEO-load-bearing fields (tagline, description, editorial_verdict, our_views, pricing_type, features[], integrations[], best_for[], not_for[]) + `last_verified_at` + `github_stars`; audit row in `refresh_logs` |
| Failure mode | Per-tool: validation fail → keep prior data (single-corrective-retry first), log to `refresh_logs.status='failed'`. Overall: 300s timeout caps each fire at ~12 tools. |
| Verification | `select count(*) from tools where last_verified_at >= now() - interval '24 hours' and is_published = true` → ≥ 200 |
| Recovery | If 24h count < 100: check Vercel cron logs for DEEPSEEK_API_KEY errors or scraping failures. Fire `?batch=20` manually 5× to clear backlog. |

**Phase 8 freshness contract:** 24 fires × 10 tools = 240 refreshes/day. The full ~1,176 catalog cycles in ~5 days — every tool re-verified at least weekly. Full SOP docs: [`sop-freshness-contract.md`](sop-freshness-contract.md).

**LLM:** DeepSeek V3 (migrated from Claude Sonnet 4.6 on 2026-05-16). Anthropic key remains for fallback. **Cost: ~$15/mo** (was $150 under Claude).

---

## 5. Ingest new tools — TRACTION-GATED (`/api/cron/ingest-tools`)

| Field | Value |
|---|---|
| Schedule | **01:00 + 13:00 UTC daily** |
| Trigger | Vercel cron |
| Reads | Discovery sources via `lib/cron/discover.ts` (Product Hunt, Futurepedia, GitHub trending, etc.); existing `tools.slug` for dedup. Then per-candidate HN Algolia + Reddit JSON probe. |
| Writes | New `tools` rows (`is_published=true`) + `ingestion_logs` per stage + IndexNow ping per inserted slug |
| Failure mode | Per-candidate: enrichment fail → logged + skipped. Traction-hard gate fail → `gated` with `traction-hard:hn=X/reddit=Y/score=Z` reason. Soft criteria < 3/5 → gated. |
| Verification | `select count(*) from tools where created_at >= now() - interval '24 hours'` → 10-50 (lower bound is correct on quiet days) |
| Recovery | If 0 inserts for 2+ days: check `ingestion_logs.error_message` — most likely "traction-hard" rejections (gate too strict) or discovery source down. Threshold tunable in `lib/cron/traction-probe.ts`. |

**Phase 8 traction contract (2026-05-16):**
- Hard gate: must have any one of (HN ≥ 30 points last 30d) OR (≥ 3 Reddit threads last 30d) OR (composite score ≥ 80)
- Soft gate: ≥ 3 of 5 plan criteria (was ≥ 2)
- Yield: 10-50/day (signal-dependent)

**Cost:** ~$0.50/day ($15/mo) DeepSeek + free HN/Reddit probes.

---

## 6. Refresh compare editorials — cascade (`/api/cron/refresh-compare-editorials`)

| Field | Value |
|---|---|
| Schedule | **Daily 08:00 UTC** |
| Trigger | Vercel cron |
| Reads | `v_stale_comparisons` view (any compare where MAX(tool.last_verified_at) > compare.last_reviewed_at), top 20 by staleness DESC |
| Writes | `tool_comparisons.{tldr, verdict, feature_analysis, pricing_analysis, use_cases, faqs, last_reviewed_at}` via DeepSeek synthesis |
| Failure mode | Per-compare: DeepSeek validation fail → keep prior editorial, log in result. Doesn't bump `last_reviewed_at` (so it re-attempts next day). |
| Verification | `select count(*) from tool_comparisons where last_reviewed_at >= now() - interval '24 hours' and is_editorial = true` → 15-25 |
| Recovery | If `v_stale_comparisons` count > 1000: backlog isn't draining. Bump `?batch=40` (needs maxDuration bump) or fire twice daily in vercel.json. |

**Why it exists:** Compare pages already render LIVE pricing/integrations/ratings from tools.* (zero lag). But the editorial verdict + feature-analysis text in `tool_comparisons.*` is pre-generated and goes out of sync when tools change. This cascade re-syncs it within ~24-48h of any tool refresh.

**Cost:** ~$0.10/day ($3/mo) DeepSeek.

---

## 8. Scrape sentiment (`/api/cron/scrape-sentiment`)

| Field | Value |
|---|---|
| Schedule | Sun 04:00 UTC |
| Trigger | Vercel cron |
| Reads | Top N published tools + Reddit + HN + G2 |
| Writes | `tool_sentiment_cache` rows per tool |
| Failure mode | Reddit/HN/G2 rate-limit → backoff + partial success |
| Verification | `select count(distinct tool_id) from tool_sentiment_cache where created_at >= now() - interval '7 days'` |
| Recovery | If empty week-over-week: source sites likely rate-limited or blocked. Inspect `lib/sentiment-scraper.ts` for fetch behavior. |

---

## 9. Discover tutorials (`/api/cron/discover-tutorials`)

| Field | Value |
|---|---|
| Schedule | Sun 05:00 UTC |
| Trigger | Vercel cron |
| Reads | Top N tools + YouTube search |
| Writes | `tool_tutorials` rows per tool |
| Failure mode | YouTube API quota exhausted → partial success |
| Verification | `select count(*) from tool_tutorials where created_at >= now() - interval '7 days'` |
| Recovery | YouTube API key rotation in Google Cloud Console; bump per-day quota if needed. |

---

## 10. Generate editorials (`/api/cron/generate-editorials`)

| Field | Value |
|---|---|
| Schedule | Sun 06:00 UTC |
| Trigger | Vercel cron |
| Reads | Existing `tool_comparisons` rows where `is_editorial = false` but match new editorial criteria |
| Writes | New `tool_comparisons` rows with `is_editorial = true` + full DeepSeek synthesis |
| Failure mode | DeepSeek validation fail → row skipped |
| Verification | `select count(*) from tool_comparisons where is_editorial = true and created_at >= now() - interval '7 days'` |
| Recovery | Manual full run: `npm run compare:apply` (covers any backlog from cron failures) |

---

## Manual / quarterly pipelines

### Monthly: Phase 4 SOP full refresh

- **When**: 1st of every month
- **Command**: `cd rightaichoice && caffeinate -dims npm run refresh:apply -- --force 2>&1 | tee logs/sop-$(date +%Y-%m-%d).log &`
- **Cost**: ~$10 DeepSeek
- **Time**: 6-8h unattended
- **Runbook**: `docs/operations/sop-1-monthly-refresh.md`

### Monthly: Latest-updates full catalog refresh

- **When**: same day as SOP refresh
- **Command**: `npm run latest:apply -- --all`
- **Cost**: ~$5
- **Time**: ~3h
- **Runbook**: `docs/operations/sop-2-weekly-latest.md`

### Monthly: Bing Webmaster direct submission (operator-driven, separate from daily cron)

- **When**: as needed when daily cron rotation finishes a pass
- **Command**: `npm run bing:submit -- --tools` (or other flag)
- **Runbook**: `docs/operations/sop-4-bing-direct-submission.md`

---

## Health-check matrix (run every Monday morning)

For every pipeline above, paste the **Verification** query into Supabase SQL editor. Expected results:

| Pipeline | Expected | Yellow flag | Red flag |
|---|---|---|---|
| 1 IndexNow | Vercel log 200 OK | Repeated 4xx | 3+ days no log |
| 2 Bing direct | `bing_submit_state.last_run_utc` ≈ today | last_run > 2d old | last_run > 7d old or `lifetime_runs` flat for 7d |
| 3 Latest-updates | 50+ rows refreshed/day | <30/day | 0/day |
| 4 Viability | 0 nulls on published tools | <50 nulls | 100+ nulls |
| 5 FAQs | Counts growing weekly | Flat | Decreasing |
| 6 GSC sitemap | "Last read" advancing | >14d stale | 401 in Vercel logs |
| 7 Refresh tools | min(last_full_refresh_at) advances 15/wk | <10/wk | <5/wk |
| 8 Sentiment | 50+ tools refreshed/wk | <20/wk | 0/wk |
| 9 Tutorials | 30+ new rows/wk | <10/wk | 0/wk |
| 10 Editorials | New compares/wk | Flat | 0 + bug in script |

**Track this in `/admin/daily` as a future-state addition.** Today it lives only in this doc.

---

## Adding a new automated pipeline — checklist

Whenever a new cron/automation gets added, copy this checklist into the PR:

- [ ] Created the route at `app/api/cron/<name>/route.ts`
- [ ] Used `validateCronSecret(request)` for auth (matches existing pattern)
- [ ] Added `export const maxDuration = 60` (or 300 if Pro tier + slow job)
- [ ] Added schedule line to `vercel.json` under `crons`
- [ ] Added a section to THIS doc (`sop-pipelines-master.md`) with all 7 SOP fields
- [ ] Updated the Health-check matrix above
- [ ] Verified locally with `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/<name>`
- [ ] Confirmed required env vars are listed AND set in Vercel project settings
