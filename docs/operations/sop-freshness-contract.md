# SOP — Data Freshness Contract

**Premise:** stale data with 2-week lag kills the business. Every published tool must be re-verified within ≤ 7 days. Every compare page must reflect tool data within 24 hours. Every new tool worth listing must enter the catalog within 24 hours of going live somewhere on the public web.

This SOP defines three production pipelines that enforce that contract — what they do, what guarantees they make, how to verify them, and what to do when they break.

---

## Pipeline 1 — Daily 200+ tool refresh

**Contract:** ≥ 200 published tools refreshed every 24 hours. No tool stays stale past 7 days.

**How:** [`/api/cron/refresh-tools`](../../app/api/cron/refresh-tools/route.ts) fires hourly (`0 * * * *` UTC). Each fire processes the 10 stalest tools by `last_verified_at ASC NULLS FIRST`. 24 hourly fires × 10 = **240 refreshes/day** (20% headroom over the 200 target).

**Per-tool work** (~25 seconds): scrape vendor homepage → **DeepSeek V3** synthesizes 9 SEO-load-bearing fields → single-corrective-retry on zod fail → atomic write → audit row in `refresh_logs`.

**Fields refreshed (9 + 2 timestamps + GitHub stars):**
- `tagline` (20-140 char hero-line, MUST include the tool's primary capability keyword)
- `description` (3-4 paragraph, 1500-2000 chars; leads with what+who, references 3-5 features, closes with vs-alternatives positioning)
- `editorial_verdict` (2-3 sentence opinionated take, ≤ 500 chars)
- `our_views` (5-8 paragraph long-form editorial, 800-1800 chars — long-tail keyword-rich)
- `pricing_type` (free/freemium/paid/contact)
- `features[]` (8-15, concrete verb+noun strings, search-able)
- `integrations[]` (8-15 named integrations, no generic categories)
- `best_for[]` (3-5 ideal personas/use-cases, scannable like sub-headers)
- `not_for[]` (3-5 anti-fit scenarios — honest, lists real limitations)
- `last_verified_at` (timestamp — drives the cascade)
- `github_stars` (when applicable)

**Why 9 fields not 7:** the tool detail page's hero + sidebar + comparison rail all read from `tagline` + `our_views` directly. Adding those two to the hourly cron means every product-page section stays current within ≤1 day, not just the body.

**Deeper fields** (`workflow_scenarios`, `faqs_long_tail`, `pricing_plan_guides`, `recent_changes`, `setup_time_text`, `migration_in/out`, `hidden_costs`, `skip_if`, `limitations`, `seo_keywords`, `use_cases`) get monthly Phase 4 SOP via `npm run refresh:apply -- --force`.

**LLM choice:** DeepSeek V3 (`deepseek-chat`). Migrated from Claude Sonnet 4.6 on 2026-05-16 (user request + cost). ~10× cheaper for structured extraction with no quality drop in our zod-validated pipeline. Anthropic key is still present for fallback if DeepSeek has an outage.

### Verification (every Monday morning)

```sql
-- Count tools refreshed in the last 24 hours
SELECT count(*) FROM tools
WHERE is_published = true AND last_verified_at >= now() - interval '24 hours';
-- Expected: ≥ 200

-- Count tools stale > 7 days
SELECT count(*) FROM tools
WHERE is_published = true AND last_verified_at < now() - interval '7 days';
-- Expected: < 50 (catalog of 1,176 / 240 per day = full cycle in ~5 days)

-- Stalest 10 tools (should never be older than 7 days)
SELECT slug, last_verified_at FROM tools
WHERE is_published = true
ORDER BY last_verified_at ASC NULLS FIRST
LIMIT 10;
```

### Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Refresh count flat for 24h | Vercel cron disabled or CRON_SECRET rotated | Vercel → Settings → Crons → re-enable; verify env var |
| Tools stuck at "failed" in `refresh_logs` for 3+ runs | Vendor site changed structure, scrape failing | Manual fire with `?batch=1&id=<id>` to see error; if persistent, exclude from cron via `is_published=false` |
| All refreshes 4xx from Anthropic | ANTHROPIC_API_KEY expired | Rotate at console.anthropic.com, update Vercel env |
| Refresh takes > 290s per fire | Vendor pages too large or DeepSeek slow | Lower `?batch=8`; investigate which tool is slow |

### Cost (after 2026-05-16 DeepSeek migration)

- DeepSeek V3 at ~$0.27 input / $1.10 output per 1M tokens
- ~3k input + 1.5k output per tool ≈ $0.002/tool
- **240 tools/day × $0.002 = ~$0.50/day = ~$15/month**
- (Was $150/month under Claude Sonnet — ~90% cost reduction at parity quality.)

### Recovery — what to do if catalog goes stale (>7 days for >50 tools)

1. Manually fire 5 batches sequentially to clear backlog:
   ```
   for i in 1 2 3 4 5; do
     curl -H "Authorization: Bearer $CRON_SECRET" \
       "https://rightaichoice.com/api/cron/refresh-tools?batch=20"
     sleep 60
   done
   ```
2. If still backlogged, run the heavy Phase 4 SOP locally:
   ```
   caffeinate -dims npm run refresh:apply -- --force
   ```

---

## Pipeline 2 — Daily 50 new tools added (TRACTION-GATED)

**Contract:** Up to 50 net-new tools/day, **all with measurable real-world traction** (HN points, Reddit threads, or composite score). Generic "appeared on a list" picks are rejected.

**How:** [`/api/cron/ingest-tools`](../../app/api/cron/ingest-tools/route.ts) fires twice daily at 01:00 + 13:00 UTC. Each fire enriches up to 25 candidates → **50 inserts/day target**.

**Pipeline stages per fire:**
1. **Discover** — pull from sources in `lib/cron/discover.ts` (Product Hunt daily, Futurepedia newest, GitHub trending, etc.)
2. **Dedup** — drop any name/domain already in `tools` table or `merged_into` chain
3. **Enrich** — DeepSeek fills tagline + description + categories + features
4. **Traction probe (NEW 2026-05-16)** — for each candidate, in parallel:
   - HN Algolia search (last 30d, free): max story points + comment count
   - Reddit JSON search (last 30d, free): unique threads mentioning the name
   - Composite score: `hn_max_points + reddit_threads × 30 + reddit_upvotes × 0.1`
5. **Curate** — hard-traction gate + soft criteria gate
   - **Hard gate (NEW):** rejects unless any one of:
     - HN story ≥ 30 points in last 30d, OR
     - ≥ 3 unique Reddit threads in last 30d, OR
     - Composite score ≥ 80
   - **Soft gate:** raised from ≥ 2/5 → **≥ 3/5** plan criteria (trending, growing, in-use, category-gap, viability)
6. **Insert** — `is_published=true` + IndexNow ping → URL pushed to Bing/Yandex within minutes

**Yield expectation:** the hard gate cuts noise aggressively. On a typical day:
- 50-100 raw discoveries → ~30-50 pass dedup → ~15-30 pass traction probe → ~10-25 pass soft criteria → INSERTED
- Some days the gate admits 5; some days 35. We never force-feed a tool that didn't earn its place via measurable buzz.

**Honest caveat:** the AI-tool space adds ~20-50 genuinely-new tools per day globally with measurable traction. The "50/day" target is a ceiling. Yield = real-world signal; lower numbers on quiet days are correct behavior, not a bug.

### Verification

```sql
-- Inserts per day (last 7 days)
SELECT date_trunc('day', created_at)::date AS day, count(*) AS new_tools
FROM tools
WHERE is_published = true AND created_at >= now() - interval '7 days'
GROUP BY 1 ORDER BY 1 DESC;
-- Expected: 30-50 per day; some days 10-25 is normal

-- Discovery yield by source (last 7 days)
SELECT source, count(*) FROM ingestion_logs
WHERE status = 'discovered' AND created_at >= now() - interval '7 days'
GROUP BY source ORDER BY 2 DESC;
```

### Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| 0 new tools for 2 days | Discovery source down (PH API outage, GitHub rate-limit) | Check `ingestion_logs` for source field; manually run `npm run mine:reddit:apply` etc to widen sources |
| All discoveries gated/duplicate | Sources are recycling old picks | Expand source list in `lib/cron/discover.ts` |
| Insert rate well below 50/day for a week | Need more sources | Add: AlternativeTo new arrivals, Slashdot, BetaList, etc. |

### Cost

- Enrichment: ~$0.005/tool DeepSeek + ~$0.005/tool Anthropic curation
- **50 tools/day × $0.01 = ~$0.50/day = ~$15/month**
- Apify usage (discovery sources) may add ~$5/month if Reddit/PH free tier exhausts

---

## Cascade coverage map — every page touched when a tool refreshes

When `lib/cron/refresh.ts` writes to `tools.*` for tool X, here's exactly which pages reflect the new data and how fast:

| Page / surface | Where it reads from | Cache | Lag after refresh |
|---|---|---|---|
| `/tools/[slug]` (tool detail) | `tools.*` direct | ISR 5 min | **≤ 5 min** |
| `/tools/[slug]/alternatives` | `tools.*` + alternatives table | ISR 5 min | **≤ 5 min** |
| `/tools/[slug]/report` | `tools.*` direct | ISR 5 min | **≤ 5 min** |
| `/tools` (listing) | `tools.*` direct | ISR 5 min | ≤ 5 min |
| `/categories/[slug]` (category page) | `tools.*` direct | ISR 5 min | **≤ 5 min** |
| `/compare/[slug]` — live data (pricing, integrations, ratings, view count) | `tools.*` direct (`getToolsForComparisonByIds`) | `force-dynamic` | **immediate** |
| `/compare/[slug]` — editorial text (tldr, verdict, feature_analysis) | `tool_comparisons.*` (pre-generated) | dynamic | ≤ 24h via cascade cron (Pipeline 3) |
| `/best/[slug]` (best-of pages) | `tools.*` direct | ISR 1 hour | **≤ 1 hour** |
| `/stacks/[slug]` | `tools.*` direct | ISR 1 hour | ≤ 1 hour |
| `/for/[slug]` (role pages) | `tools.*` direct | ISR 1 hour | ≤ 1 hour |
| Home page hero / featured rails | `tools.*` direct | ISR 5 min | ≤ 5 min |
| Search results | `tools.*` direct | ISR 5 min | ≤ 5 min |
| RSS feed / opengraph images | `tools.*` direct | dynamic | immediate |

**The single guarantee:** within **1 hour** of `tools.last_verified_at` advancing for tool X, every page on the site that mentions tool X reflects the new data. Compare pages are even faster — pricing tier tables refresh immediately on next request.

The ONLY field that lags > 1 hour is the editorial-opinion text in `tool_comparisons.*` (TLDR row, verdict paragraph, feature-analysis prose) — Pipeline 3 (cascade-editorials) handles those within ~24-48h.

---

## Pipeline 3 — Cascade: compare pages stay fresh with tool data

**Contract:** When a tool gets refreshed (`last_verified_at` advances), every editorial comparison touching that tool gets its editorial fields regenerated within 24 hours.

**How:**

1. **Live-data layer (no cron needed):** `app/compare/[slug]/page.tsx` queries `tools.*` directly. Pricing tiers, integrations, ratings, view counts always show LIVE data from the moment a tool refresh writes to `tools.*`. Zero lag.

2. **Editorial-opinion layer (cron cascade):** Free-text fields in `tool_comparisons.*` (tldr, verdict, feature_analysis, pricing_analysis, use_cases, faqs) are pre-generated and stored. When a tool refreshes, these go out of sync. The cron [`/api/cron/refresh-compare-editorials`](../../app/api/cron/refresh-compare-editorials/route.ts) fires daily 08:00 UTC, queries the `v_stale_comparisons` view (any compare where `MAX(tool.last_verified_at) > comparison.last_reviewed_at`), regenerates the top 20 most-stale via DeepSeek, bumps `last_reviewed_at`.

**Throughput at 20/day:** with ~5 compares per tool × 240 tool refreshes/day = ~1,200 cascade-triggers/day. The cron clears 20/day. Backlog peaks then drains. Acceptable for compares (the live data layer covers user-visible numbers; the verdict text drifts by a few days max).

**To raise throughput:** bump `?batch=40` (will need ~600s; needs `maxDuration: 600` on Vercel Pro) or fire the cron twice daily.

### Verification

```sql
-- How many compares are currently stale?
SELECT count(*) FROM v_stale_comparisons;
-- Expected: ≤ 200 in steady state (5-day rolling backlog)

-- Worst staleness in the queue
SELECT comparison_slug, staleness FROM v_stale_comparisons
ORDER BY staleness DESC LIMIT 10;
-- Expected: top entry < 14 days

-- Compares regenerated in last 24h
SELECT count(*) FROM tool_comparisons
WHERE last_reviewed_at >= now() - interval '24 hours' AND is_editorial = true;
-- Expected: 15-25
```

### Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Backlog growing > 500 stale compares | 20/day not keeping up | Bump batch to 40 + add second daily fire |
| DeepSeek validation failures | Schema cap too tight | Inspect Vercel logs; adjust `editorialSchema` in `lib/cron/cascade-editorials.ts` |
| All regens fail | DEEPSEEK_API_KEY rotated | Update Vercel env |

### Cost

- DeepSeek synthesis ~$0.005 per compare
- **20 compares/day × $0.005 = ~$0.10/day = ~$3/month**
- If bumped to 40/day: ~$6/month

---

## The 24-hour freshness check (run every Monday)

Single SQL block — paste into Supabase SQL editor on Monday 09:30 IST:

```sql
-- 1. Refresh pipeline alive?
SELECT 'refresh-tools' AS pipeline,
       count(*) AS refreshed_24h
FROM tools
WHERE last_verified_at >= now() - interval '24 hours'
  AND is_published = true;
-- TARGET: ≥ 200. RED FLAG: < 100.

-- 2. Ingest pipeline alive?
SELECT 'ingest-tools' AS pipeline,
       count(*) AS new_24h
FROM tools
WHERE created_at >= now() - interval '24 hours'
  AND is_published = true;
-- TARGET: 30-50. RED FLAG: 0 for 2+ consecutive days.

-- 3. Cascade pipeline alive?
SELECT 'cascade-editorials' AS pipeline,
       count(*) AS regen_24h
FROM tool_comparisons
WHERE last_reviewed_at >= now() - interval '24 hours'
  AND is_editorial = true;
-- TARGET: 15-25. RED FLAG: 0 for 2+ consecutive days.

-- 4. Catalog staleness floor
SELECT 'stalest-tool' AS metric,
       min(last_verified_at) AS oldest,
       now() - min(last_verified_at) AS age
FROM tools
WHERE is_published = true;
-- TARGET: oldest ≤ 7 days. RED FLAG: > 14 days.

-- 5. Cascade backlog
SELECT 'cascade-backlog' AS metric, count(*) AS stale_compares
FROM v_stale_comparisons;
-- TARGET: ≤ 200. RED FLAG: > 1,000.
```

**If any red flag → escalate to in-session debug. Check Vercel cron logs first (Project → Logs → filter by route).**

---

## Cost ceiling & how to dial back

If monthly spend on these 3 pipelines exceeds $200, you can throttle without breaking the contract — just relaxes refresh frequency:

| Knob | Change | New rate | Saving |
|---|---|---|---|
| Refresh batch | `0 * * * *` → `0 */2 * * *` | 120/day | -50% |
| Refresh batch size | `?batch=10` → `?batch=5` | 120/day | -50% |
| Ingest fires | `0 1,13 * * *` → `0 1 * * *` | 25/day | -50% |
| Cascade batch | `?batch=20` → `?batch=10` | 10/day | -50% |

All knobs are env-friendly — change in `vercel.json` or the query string and redeploy.

---

## Stricter target — "data fresh as of today AND this minute"

If you ever need *real-time* freshness (e.g., a specific tool got news coverage and you want our page current within 10 min), use:

```
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://rightaichoice.com/api/cron/refresh-tools?batch=1"
```

But the stalest tool wins the slot — not the one you want. For surgical single-tool refresh, run locally:

```
npm run refresh:slug -- cursor   # (TODO: implement --slug flag if not present)
```

Or directly hit the per-tool path via Phase 4 SOP `scripts/backfill-tool-data.ts` with a slug filter (already supported).
