# Pipelines — One-Page Operational Runbook

**This is the Monday health-check + "something's broken, what do I do" runbook.**
For the full inventory (every pipeline, schedules, what + why, the freshness/propagation
system, viability, cost) see **[README.md](./README.md)** — the authoritative playbook.

---

## Monday 10-minute health-check

1. Open **`/admin/health`** — any red pipeline? Find it in [README.md](./README.md) §1–2.
2. Run these sanity queries in Supabase:

```sql
-- Any cron that should have fired but didn't (dead route — see Gotcha #1)?
select pipeline_key, max(started_at) as last_run
from pipeline_runs group by 1 order by 2 asc;

-- Lite freshness: most tools verified in the last 48h?
select count(*) from tools where is_published and last_verified_at > now() - interval '48 hours';

-- Deep freshness: whole catalog's every field within ~7 days?
select count(*) from tools where is_published and last_full_refresh_at > now() - interval '8 days';

-- Scraper health: a sudden jump in scrapeBlocked = the scraper degraded.
select started_at, metadata->>'scrapeBlocked' as blocked, metadata->>'preserved' as preserved
from pipeline_runs where pipeline_key = 'refresh-tools' order by started_at desc limit 5;

-- Viability populated on every published tool?
select count(*) from tools where is_published and viability_score is null;

-- 30-day AI spend by pipeline (was $0 before Phase 11 cost tracking):
select pipeline_key, round(sum(estimated_cost_usd)::numeric, 2) as usd_30d
from pipeline_runs where started_at > now() - interval '30 days' group by 1 order by 2 desc nulls last;
```

3. Sitemaps cached? `curl -sI https://rightaichoice.com/tools/sitemap.xml | grep x-vercel-cache` → `HIT`.

---

## Recovery — "X is failing"

| Symptom | Likely cause | Fix |
|---|---|---|
| A `pipeline_key` is missing/stale in `pipeline_runs` | POST-only route (Gotcha #1) | Add `export const GET = POST` to the route |
| Freshness counts not advancing | DeepSeek 5xx storm, or scraper degraded | Check `pipeline_runs` errors; re-fire the GH job via Actions → Run workflow |
| `scrapeBlocked` spiked across the catalog | Vendor sites changed bot-protection | Expected for flagships; a *broad* spike = investigate `lib/cron/scrape.ts` |
| Viability scores all clustered high / at-risk empty | `is_wrapper` not yet populated | Normal until the deep `full-refresh` cycles (~7 days); let it run |
| Bing feed "Pending", 0 URLs | Sitemap not CDN-cached (Gotcha #2) | Ensure the sitemap uses `getAdminClient()`, never `createClient()`/`force-dynamic` |
| Alert emails not arriving | Recipient env mismatch | Set `ALERT_EMAIL` (resolves `ALERT_EMAIL → ALERT_EMAIL_TO → ADMIN_EMAIL`) |
| Cost shows $0 for an LLM pipeline | `ctx.recordTokens(...)` not wired | Add it (see refresh-tools route / refresh-tools-batch for the pattern) |

---

## Adding / changing a pipeline — checklist (copy into the PR)

- [ ] Route at `app/api/cron/<name>/route.ts` **exports BOTH `GET` and `POST`** (Gotcha #1)
- [ ] Auth via `validateCronSecret` / `cronRoute`
- [ ] `export const maxDuration` set (≤300 on Vercel; heavy/long work → a GitHub Actions job instead)
- [ ] Schedule in `vercel.json` (light/daily) **or** a `.github/workflows/*.yml` job (heavy)
- [ ] Wrapped in `cronRoute` / `runScriptedPipeline` so it logs to `pipeline_runs`
- [ ] `ctx.recordTokens(...)` if it calls an LLM (so cost is tracked, not $0)
- [ ] **Updated [README.md](./README.md)** — the inventory table + relevant section, in schedule order
- [ ] **Updated this folder** if any other doc references the pipeline
- [ ] Env vars listed in README §Environment AND set in Vercel project / GH repo secrets
