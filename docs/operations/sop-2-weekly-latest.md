# SOP-2 — Weekly latest-updates refresh

**Cadence:** weekly (manual full-catalog) + daily auto (top 25 by stalest)
**Cost:** ~$5/week (DeepSeek $1 + Apify $4 if cap allows)
**Time:** 3-4 hours unattended for full catalog
**Owner:** Tanmay

## What this does

Refreshes `latest_updates` JSONB on the `tools` table — the chronological "Latest from {Tool}" timeline (changelog + blog + news + Reddit + HN + Twitter). Two layers:

- **Auto-fired:** `/api/cron/refresh-latest-updates` daily at 02:00 UTC, processes 25 stalest tools per fire (vercel.json schedule). Catches new content within 1-2 days for the catalog's top tools.
- **Manual full:** `npm run latest:apply` weekly. Re-processes ALL 1,178 tools to catch anything the daily delta missed.

Without this, the "Latest from {Tool}" sections show stale dates and users lose trust that we're current.

## Steps (manual full run)

```bash
cd /Users/tanmay/Desktop/AI\ Directory/rightaichoice

# Optional: clear progress checkpoint to force-process every tool
rm -f scripts/.latest-updates-progress.json

mkdir -p logs
caffeinate -dims npm run latest:apply 2>&1 | tee logs/latest-$(date +%Y-%m-%d).log &

# Lock screen, leave Mac plugged in.
```

## Verification

```bash
# Confirm completion
tail -10 logs/latest-*.log

# Check data quality distribution
# Run via Supabase SQL Editor:
SELECT
  COUNT(*) FILTER (WHERE jsonb_array_length(latest_updates) >= 5) AS rich_tools,
  COUNT(*) FILTER (WHERE jsonb_array_length(latest_updates) BETWEEN 1 AND 4) AS sparse_tools,
  COUNT(*) FILTER (WHERE jsonb_array_length(latest_updates) = 0) AS empty_tools
FROM tools WHERE is_published = true;
```

Expect: 50-65% rich, 20-30% sparse, 10-25% empty (vendors with thin web presence).

## Apify cap monitoring

Latest-updates uses Apify for news + Reddit + Twitter. If you hit the cap mid-run:
- Script silently skips Apify-dependent sources per tool
- Tools still get HN + changelog + blog signal (decent coverage)
- Bump cap at https://console.apify.com/billing → Settings → Spending limits

Cap recommendation for this SOP: **$30/month** (full weekly catalog re-run + daily delta).

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| 50%+ tools return empty `latest_updates` | Vendor sites have no recent activity OR Apify cap hit | Check Apify dashboard. If cap: bump it. If real: that's accurate — no fabrication. |
| `synthesis_failed_after_retries` on 10%+ | DeepSeek schema rejecting output | Sample failures in logs; if pattern, relax zod schema in `lib/cron/latest-updates.ts:latestUpdateItemSchema` |
| Daily cron timing out | Each tool taking too long (network slow) | Reduce `BATCH_SIZE` in `app/api/cron/refresh-latest-updates/route.ts` from 25 → 15 |
