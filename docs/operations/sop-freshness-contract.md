# SOP — Data Freshness Contract

**Premise:** stale data with 2-week lag kills the business. Every published tool must be re-verified within ≤ 7 days. Every compare page must reflect tool data within 24 hours. Every new tool worth listing must enter the catalog within 24 hours of going live somewhere on the public web.

This SOP defines three production pipelines that enforce that contract — what they do, what guarantees they make, how to verify them, and what to do when they break.

---

## Pipeline 1 — Daily 200+ tool refresh

**Contract:** ≥ 200 published tools refreshed every 24 hours. No tool stays stale past 7 days.

**How:** [`/api/cron/refresh-tools`](../../app/api/cron/refresh-tools/route.ts) fires hourly (`0 * * * *` UTC). Each fire processes the 10 stalest tools by `last_verified_at ASC NULLS FIRST`. 24 hourly fires × 10 = **240 refreshes/day** (20% headroom over the 200 target).

**Per-tool work** (~25 seconds): scrape vendor homepage → Claude Sonnet 4.6 synthesizes 7 fields → atomic write → audit row in `refresh_logs`.

**Fields refreshed:**
- `description` (2-4 paragraph detailed)
- `pricing_type` (free/freemium/paid/contact)
- `features[]` (≤ 15)
- `integrations[]` (≤ 15)
- `best_for[]` (≤ 5)
- `not_for[]` (≤ 5)
- `editorial_verdict` (2-3 sentence opinion)
- `last_verified_at` (timestamp — drives the cascade)
- `github_stars` (when applicable)

**Deeper fields** (workflow_scenarios, FAQs, latest_updates, pricing_plan_guides, recent_changes) get monthly Phase 4 SOP via `npm run refresh:apply -- --force`.

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

### Cost

- Claude Sonnet 4.6 at ~$3 input / $15 output per 1M tokens
- ~2k input + 1k output per tool ≈ $0.021/tool
- **240 tools/day × $0.021 = ~$5/day = ~$150/month**

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

## Pipeline 2 — Daily 50 new tools added

**Contract:** Up to 50 net-new tools ingested per day. Quality gate: ≥ 2/5 curation score (cron) or ≥ 3/5 (scale-catalog manual).

**How:** [`/api/cron/ingest-tools`](../../app/api/cron/ingest-tools/route.ts) fires twice daily at 01:00 + 13:00 UTC. Each fire enriches up to 25 candidates → **50 inserts/day target**.

**Pipeline stages per fire:**
1. **Discover** — pull from sources in `lib/cron/discover.ts` (Product Hunt daily, Futurepedia newest, GitHub trending, etc.)
2. **Dedup** — drop any name/domain already in `tools` table or `merged_into` chain
3. **Enrich** — Claude Sonnet fills tagline + description + categories + features
4. **Curate** — quality gate via `lib/cron/curate.ts` (skips template-y / spam / abandoned)
5. **Insert** — `is_published=true` + IndexNow ping → URL pushed to Bing/Yandex within minutes

**Honest caveat:** the AI-tool space adds ~20-50 genuinely-new quality tools per day globally. Some days the discovery pipeline returns 50+; some days 10-15. Pipeline ceiling is 50/day; actual yield varies. We don't force-feed junk to hit a number.

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
