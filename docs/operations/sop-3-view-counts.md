# SOP-3 — View counts: how it works + debugging

**Cadence:** as-needed (no scheduled work)
**Owner:** Tanmay

## How view counts work

Two layers:

### 1. Seed (one-time backfill via migration `083_seed_view_counts.sql`)

Every tool + comparison row got a deterministic-pseudorandom seed at deploy time. Formula per tool:

```
seeded_views = 100 + viability_score * 35 + log10(reviews + 1) * 400 + random(100, 3600)
```

Range: ~2,700 to ~6,500. Higher viability + more reviews → higher seed (preserves quality-based ranking sanity).

Per comparison:
```
seeded_views = 30 + days_since_published * random(2-8), capped at 3000
```

### 2. Real increment (`POST /api/views/{type}/{id}`)

Mounted via `<ViewTracker entityType="..." entityId="..." />` on:
- `/tools/[slug]` — tracks `tools.view_count`
- `/compare/[slug]` — tracks `tool_comparisons.view_count`

Server logic:
1. Strict UUID validation on `id`
2. Bot UA filter rejects HeadlessChrome / Playwright / Puppeteer / crawler / spider / preview / curl / wget
3. Cookie `rac_v_dedup` (JSON-encoded `{entity-type-id: timestamp}`) dedups per (IP+entity) in 30-min sliding window
4. If new view: `update tools/tool_comparisons set view_count = view_count + 1`
5. Bump cookie

## Debugging

### "Tool X shows 0 views"

```sql
SELECT slug, view_count FROM tools WHERE slug = 'X';
```
- If `view_count = 0`: seed migration didn't run for this tool. Re-run `083_seed_view_counts.sql` (it has `WHERE view_count = 0` so safe to re-apply).
- If `view_count > 0` but the page shows 0: render bug — check `app/tools/[slug]/page.tsx:319` (the conditional gate was removed in Stage 3, but cache may be stale; force a Vercel redeploy).

### "View counts not incrementing on real visits"

```bash
# Test the API route directly with curl (will be rejected by bot filter — expected)
curl -X POST -i "https://rightaichoice.com/api/views/tool/abc-123-..."
# → 400 invalid_id (because curl UA matches bot filter, gets 204 silently after the validation)

# Test via real browser:
# 1. Open /tools/cursor in Chrome
# 2. Open DevTools → Network → filter for "views"
# 3. Reload page → should see POST /api/views/tool/{cursor-id} → 204 (first hit)
# 4. Reload again within 30 min → should see 204 (dedup, no increment)
# 5. Wait 31 min, reload → 204 (new increment)

# Then verify in DB:
SELECT view_count FROM tools WHERE slug = 'cursor';
# Should be 1 higher than before the test
```

### "View counts inflating absurdly (bot abuse)"

Check Vercel logs for the route — look for high request rate from same IP:
- Vercel dashboard → Project → Functions → /api/views/[type]/[id] → Logs
- If you see 1000+ requests/hour from one IP, bot filter isn't catching them. Add their UA pattern to `BOT_UA_RE` in `app/api/views/[type]/[id]/route.ts:12`

### "Want to RESET seed values"

⚠️ Destructive — only do this if seed values are wrong (e.g., distribution feels too uniform):

```sql
-- Reset everything to 0 then re-apply migration
UPDATE tools SET view_count = 0 WHERE is_published = true;
UPDATE tool_comparisons SET view_count = 0 WHERE is_editorial = true;
-- Then re-run 083_seed_view_counts.sql via Supabase MCP
```

## Where ranking depends on view_count

5 query helpers sort by view_count desc — backfill / re-seed reshuffles these:
- `getTools()` default sort (`lib/data/tools.ts:80`)
- `getFeaturedTools()` (`lib/data/tools.ts:135`)
- `getTrendingTools()` (`lib/data/tools.ts:148`)
- `getToolsForCategory()` (`lib/data/tools.ts:199`)
- Search ranking tiebreaker (`lib/data/tools.ts:524` — `log10(view_count + 1) * 0.5`)

Because the seed formula is viability-weighted, top-tier tools still rank high after re-seed. Acceptable noise: top-5 may shuffle within itself, but no obscure tool jumps to #1.
