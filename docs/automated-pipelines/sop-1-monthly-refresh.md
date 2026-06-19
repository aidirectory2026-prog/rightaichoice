# SOP-1 — Monthly Phase 4 SOP refresh

**Cadence:** 1st of every month, evening (so it runs overnight)
**Cost:** ~$10 DeepSeek
**Time:** 6-8 hours unattended
**Owner:** Tanmay (or whoever has Mac access + DEEPSEEK_API_KEY in `.env.local`)

## What this does

Re-runs `scripts/backfill-tool-data.ts --force` against all 1,178 published tools. For each tool: re-scrapes the vendor's homepage + `/pricing` + `/integrations` + `/features`, re-synthesizes 22 fields via DeepSeek V3, atomic-writes to `tools` table, bumps `last_full_refresh_at` + `last_verified_at`.

This is THE freshness anchor. If it doesn't run monthly, the catalog goes stale; competitors with weekly refreshes pull ahead in search rankings + user trust.

## Steps

```bash
# 1. cd to the repo
cd /Users/tanmay/Desktop/AI\ Directory/rightaichoice

# 2. Clear any prior checkpoint so all 1,178 tools get re-processed
rm -f scripts/.refresh-progress.json

# 3. Kick off in background with caffeinate (keeps Mac awake)
mkdir -p logs
caffeinate -dims npm run refresh:apply -- --force 2>&1 | tee logs/sop-$(date +%Y-%m-%d).log &

# 4. Lock the screen, leave Mac plugged in. Done for the night.
```

## Next morning — verification

```bash
# Confirm the run finished cleanly
tail -20 logs/sop-*.log | head -30

# Should see "✓ Complete." near the end. If not, the script may
# still be running OR it crashed — check for stack traces.

# Sample 5 random tools and verify last_full_refresh_at
psql -c "SELECT slug, last_full_refresh_at FROM tools WHERE is_published=true ORDER BY RANDOM() LIMIT 5"
# (or run via Supabase MCP if no local psql)

# Spot-check 1-2 tool detail pages on prod, verify content
# reflects current vendor data (e.g., latest GPT model versions on
# /tools/chatgpt, current Cursor pricing on /tools/cursor).
```

## After verification

```bash
# 5. Re-submit fresh signals to search engines
cd rightaichoice
npm run gsc:sitemap:submit
npm run indexnow:submit

# 6. Append run summary to build-log
# Open Phase8(site-overhaul-v2)/build-log.md, add an entry under
# the SOP-Refresh section with: date, success/failure counts,
# notable failures (if any), total cost from DeepSeek dashboard.
```

## Failure modes + responses

| Symptom | Cause | Fix |
|---|---|---|
| Schema validation fails on >5% of tools | Vendor sites changed structure dramatically OR zod bounds too tight | Check sample failures in `docs/preflight/needs_manual_review.txt`; relax zod bounds in `scripts/backfill-tool-data.ts:55-150` |
| DeepSeek 503 storm mid-run | DeepSeek API is overloaded | Stop script (Ctrl+C). Wait 30 min. Re-run — checkpoint resumes |
| Vendor scrape blocked (Cloudflare etc.) | Vendor added bot protection | No action; tool falls through to safe-min fallback per existing policy |
| `caffeinate` not found | macOS missing tool (rare) | `xcode-select --install` to get system tools |
| Same 5-10 tools fail every month | Persistent vendor block / dead URL | Add to `scripts/skip-list.txt` (not yet built) OR mark `is_published=false` if dead |

## Decision points the operator owns

- If failure rate > 10%: PAUSE next month's run, investigate root cause first
- If DeepSeek cost > $20: check for retry storms via API dashboard
- If vendors changed homepage URLs (rare): update `tools.website_url` then re-run for those slugs only via `--slug=foo`
