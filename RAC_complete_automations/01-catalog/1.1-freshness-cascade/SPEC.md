# 1.1 — freshness-cascade

> **Status:** NEW (foundation — must land Day 1)
> **Type:** Postgres trigger + Vercel cron + bridge table + admin button
> **Owner department:** Catalog
> **Downstream consumers:** SEO, Content, Affiliate, Authority, Outreach
> **Decisions locked:** 2026-05-23 conversation

---

## 1. Purpose

Single source of truth for "when did this page last meaningfully change". When *any* user-visible field on a tool changes, every page that mentions that tool — product, compare, best-of, role, stack, category, blog — gets its freshness timestamp bumped automatically, atomically, with no per-feature wiring.

**Why this is the foundation:**
- Today, sitemaps emit `lastModified: new Date()` on every render — Google sees "everything just changed forever" and discounts our dates entirely.
- Tool refresh updates `tools.*` but never tells the compare / best-of / category / role / stack / blog pages that reference it.
- Newsletter has no honest "what's new since last issue" signal.
- IndexNow pings stale URLs and misses real changes.

After this lands:
- Sitemaps emit **real** last-changed dates.
- JSON-LD `dateModified` is honest everywhere.
- Visible "Last updated YYYY-MM-DD" + "Reviewed by our team on [date]" on every page type (E-E-A-T signal).
- 0-reviews trust-killer is gone; sentiment block replaces it.
- Newsletter, IndexNow, ISR revalidation, anomaly detection — all read from one table.

---

## 2. Locked decisions (from 2026-05-23 conversation)

| # | Decision |
|---|---|
| 1 | **Fire only on user-visible content changes.** See column list in §4. Internal counters (view_count, click_count) and timestamps (updated_at, last_scrape_at) do NOT fire. |
| 2 | **Every page mentioning the tool refreshes** + applies the A–H best practices below + renders "Reviewed by our team on [date]" + 0-reviews widget hidden when count=0 + sentiment block (1.9) replaces it. |
| 3 | **Bridge table `page_tool_mentions`** (real table, not a view). Populated by: (a) DB joins for category/compare memberships, (b) sync script from TypeScript configs for best-of / role / stack, (c) blog frontmatter `mentions:` field. |
| 4 | **Background cascade job runs every 1 hour** (not 2h — fresher IndexNow, fresher sitemaps, manageable compute). |
| 5 | **Admin "bump freshness" button** on `/admin/tools/[id]` with required reason field — manager can manually mark a page fresh when they ship a non-DB change (e.g., editorial copy tweak). |
| 6 | **Backfill uses real timestamps from underlying data** (Option B). Each page's initial `last_changed_at` = max of relevant source timestamps (tools.updated_at, comparisons.updated_at, best_of.updated_at, etc.) — not `NOW()` for everything. |

### Best practices A–H applied on every cascaded page

| Code | Practice |
|---|---|
| A | Schema.org `dateModified` set from `pages_freshness.last_changed_at` (no more `new Date()`) |
| B | Visible "Last updated YYYY-MM-DD" string near page title |
| C | Sitemap `<lastmod>` reads from `pages_freshness` (per-URL truth) |
| D | ISR `revalidatePath(page_path)` fires inside the 1h cron |
| E | IndexNow push for the same URLs, deduped against previous batch |
| F | OG image cache-bust query param (`?v=<last_changed_unix>`) so social cards refresh |
| G | "Reviewed by our team on [date]" badge below title — E-E-A-T signal, same date source |
| H | When `review_count = 0`: hide the rating widget; **never** emit Schema.org `aggregateRating` (already enforced in `lib/seo/json-ld.ts` and every page renderer — verified 2026-05-23) |

---

## 3. Trigger sources

Three trigger paths, all writing to the same `pages_freshness` table:

| # | Source | Mechanism | Latency |
|---|---|---|---|
| A | Postgres trigger on `tools.UPDATE OF <whitelisted columns>` | calls `propagate_freshness(tool_slug, source_column)` | <100ms |
| B | Postgres trigger on `comparisons.UPDATE`, `best_of_lists.UPDATE` | calls same function with appropriate `source_event` | <100ms |
| C | Vercel cron `cascade-hubs` every **1 hour** (`0 * * * *`) | safety re-sweep + `revalidatePath` calls + IndexNow batch + OG cache-bust | up to 1h |
| D | Admin "Bump freshness" POST from `/admin/tools/[id]` | direct write to `pages_freshness` with `change_source='admin_manual'` + `change_reason=<required text>` | immediate |

A and B handle 99% of changes synchronously. C does the heavy out-of-DB work (Next.js revalidation, external pings) and acts as a safety net. D is the manager escape hatch.

---

## 4. Inputs

### Content-relevant `tools` columns that fire the trigger

Per locked decision #1: only user-visible fields. The full list:

| Column | Reason it's user-visible |
|---|---|
| `name`, `slug` | Title + URL |
| `tagline`, `description`, `long_description` | Hero copy + meta description |
| `our_views`, `editorial_verdict` | Editorial body |
| `pricing_type`, `pricing_json`, `pricing_details` | Pricing tables + Schema.org Offer |
| `features`, `integrations` | Visible feature lists + Schema |
| `best_for`, `not_for` | Buyer-scan sub-sections |
| `categories`, `roles`, `stacks` (array columns OR membership joins) | Hub membership + sitemap eligibility |
| `viability_score`, `viability_breakdown` | Visible badge + sort order |
| `latest_updates`, `latest_updates_at` | "Latest from [Tool]" feed |
| `tutorials`, `youtube_tutorials` | Tutorial section |
| `faqs_long_tail` | FAQ block + FAQPage schema |
| `screenshots`, `hero_image_url`, `logo_url` | OG image + visible hero |
| `affiliate_url`, `affiliate_program` | Revenue path + outbound CTA |
| `website_url`, `github_url`, `docs_url` | Canonical citations |
| `tool_sentiment_cache` row update for this tool | Sentiment summary refresh (1.9) |

### Explicitly NOT in the trigger column list

`view_count`, `click_count`, `last_scrape_at`, `last_full_refresh_at`, `last_verified_at`, `updated_at` (auto-bumped meta — would create infinite recursion), `created_at`, `admin_notes`, `submitted_by`, `is_published` toggle (handled separately — un-publish is a sitemap removal, not a cascade).

### Bridge table: `page_tool_mentions` (NEW — replaces the view approach)

Per locked decision #3, this is a real table, not a view. Refreshed via three paths:

```sql
CREATE TABLE page_tool_mentions (
  page_path        TEXT NOT NULL,
  page_type        TEXT NOT NULL,    -- tool / compare / best_of / category / role / stack / blog
  tool_slug        TEXT NOT NULL REFERENCES tools(slug) ON DELETE CASCADE,
  mention_source   TEXT NOT NULL,    -- 'db_join' / 'code_config' / 'blog_frontmatter'
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (page_path, tool_slug)
);
CREATE INDEX idx_ptm_tool ON page_tool_mentions(tool_slug);
CREATE INDEX idx_ptm_type ON page_tool_mentions(page_type);
```

**How it's populated:**

| Source | Method | Cadence |
|---|---|---|
| `db_join` | Postgres function `sync_page_tool_mentions_db()` — joins `tools`, `comparisons`, `tool_categories`, `tool_roles` (whatever real membership tables exist) and upserts every (page_path, tool_slug) pair | Nightly via pg_cron + immediately after any membership change via trigger |
| `code_config` | `scripts/sync-page-mentions-from-code.ts` — reads `lib/data/best-pages.ts`, `lib/data/role-pages.ts`, `lib/data/stacks.ts`; for each page, runs the same filter query against `tools` and writes the resulting (page_path, tool_slug) rows | On `postbuild` step + nightly cron + on-demand `npm run sync:mentions` |
| `blog_frontmatter` | `scripts/sync-page-mentions-from-blog.ts` — walks `content/blog/*.mdx`, parses `mentions: [slug1, slug2]` frontmatter, writes rows | On every `postbuild` + on `content/` change in CI |

Trigger function looks up mentions in this table; cascade-hubs uses it for ISR + IndexNow.

---

## 5. Outputs

### New table: `pages_freshness`

```sql
CREATE TABLE pages_freshness (
  page_path        TEXT PRIMARY KEY,
  page_type        TEXT NOT NULL,
  last_changed_at  TIMESTAMPTZ NOT NULL,
  change_source    TEXT NOT NULL,             -- 'tool_update' / 'compare_update' / 'best_of_update' / 'admin_manual' / 'cron_sweep'
  change_reason    TEXT,                      -- required when change_source='admin_manual'
  source_tool_slug TEXT,                      -- which tool triggered it (nullable for non-tool sources)
  source_event     TEXT,                      -- e.g. 'pricing_change' / 'description_change'
  last_revalidated_at TIMESTAMPTZ,            -- last time cascade-hubs called revalidatePath
  last_indexnow_at TIMESTAMPTZ,               -- last IndexNow push
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pages_freshness_changed_at ON pages_freshness(last_changed_at DESC);
CREATE INDEX idx_pages_freshness_source ON pages_freshness(source_tool_slug);
CREATE INDEX idx_pages_freshness_type_changed ON pages_freshness(page_type, last_changed_at DESC);
CREATE INDEX idx_pages_freshness_unrevalidated ON pages_freshness(last_changed_at) WHERE last_revalidated_at IS NULL OR last_revalidated_at < last_changed_at;
```

### Trigger behavior

1. `tools.UPDATE OF <whitelisted columns>` fires `propagate_freshness(NEW.slug, TG_ARGV[0])`
2. Function reads `page_tool_mentions WHERE tool_slug = NEW.slug`
3. Upserts every matched `page_path` row with `last_changed_at = NOW()`, `change_source = 'tool_update'`, `source_event = <column name>`
4. Exception handler returns NULL (never blocks the UPDATE)

### Cascade-hubs cron (every 1h)

```
0 * * * * — app/api/cron/cascade-hubs/route.ts
```

Per fire:
1. Read `pages_freshness WHERE last_revalidated_at IS NULL OR last_revalidated_at < last_changed_at` (the "needs ISR" set)
2. For each `page_path`: POST `/api/internal/revalidate?path=<encoded>` with shared secret → `revalidatePath(page_path)`
3. Push deduped URL list to IndexNow
4. Update `last_revalidated_at` and `last_indexnow_at` per row
5. Safety re-sweep: for any tool with `updated_at` in last 65 min, re-run `propagate_freshness` (catches dropped triggers)
6. Cache-bust: append `?v=<last_changed_unix>` to OG image URLs by reading freshness when emitting metadata

### Sitemap (modified)

Every sitemap reads `getLastChangedAt(path)` instead of `new Date()`. Paths:
- `app/sitemap.ts`, `app/best/sitemap.ts`, `app/categories/sitemap.ts`, `app/for/sitemap.ts`, `app/stacks/sitemap.ts`, `app/compare/sitemap.ts`, `app/blog/sitemap.ts`

### Page renderers (modified)

Every page renderer (`app/tools/[slug]/page.tsx`, `app/compare/[slug]/page.tsx`, `app/best/[slug]/page.tsx`, `app/categories/[slug]/page.tsx`, `app/for/[slug]/page.tsx`, `app/stacks/[slug]/page.tsx`, `app/blog/[slug]/page.tsx`):

```tsx
const lastChanged = await getLastChangedAt(pathname)
<ReviewedByOurTeam date={lastChanged} />        {/* practice G */}
<LastUpdated date={lastChanged} />               {/* practice B */}
```

### JSON-LD (modified)

`lib/seo/json-ld.ts` — wire `dateModified` to `getLastChangedAt(path)` for Article, ItemList, SoftwareApplication. (aggregateRating gating already correct — verified.)

### Admin bump-freshness UI (NEW per locked decision #5)

`/admin/tools/[id]` page gets a new "Bump freshness" panel:
- Required `reason` textarea (min 10 chars)
- POST to `/api/admin/freshness/bump` → writes `pages_freshness` row(s) for every page mentioning this tool with `change_source='admin_manual'` + `change_reason=<text>`
- Triggers immediate `revalidatePath` for the tool page (other pages cascade on next 1h fire)
- Audit log entry written to `admin_actions`

---

## 6. Backfill (locked decision #6)

One-time migration script `scripts/backfill-pages-freshness.ts`:

```sql
-- For tool pages
INSERT INTO pages_freshness (page_path, page_type, last_changed_at, change_source, source_tool_slug)
SELECT
  '/tools/' || slug,
  'tool',
  COALESCE(last_verified_at, updated_at, created_at),  -- real timestamps, not NOW()
  'backfill',
  slug
FROM tools WHERE is_published = true;

-- For compare pages
INSERT INTO pages_freshness (page_path, page_type, last_changed_at, change_source)
SELECT
  '/compare/' || slug,
  'compare',
  COALESCE(updated_at, created_at),
  'backfill'
FROM comparisons WHERE is_published = true;

-- Etc. for best-of, role, stack, blog — each uses its own updated_at/created_at
```

Run order: backfill `page_tool_mentions` first, then `pages_freshness`. Run on a staging clone first; manager approves before prod.

---

## 7. Dependencies

### Upstream
- `tools` table (exists)
- `comparisons`, `best_of_lists`, blog tables (confirm Day 1 of build)
- Supabase `pgcrypto` + standard triggers (we have these)
- Next.js App Router `revalidatePath` (in use already — confirmed via `app/api/internal/revalidate/route.ts` if it exists, else create)
- IndexNow endpoint (already wired in `indexnow-recent` cron)

### Env vars
- `CASCADE_HUBS_CRON_SECRET` — auth for cascade-hubs route
- `REVALIDATE_SECRET` — internal revalidation API auth
- `INDEXNOW_KEY` (already exists)

### Other automations affected
- `refresh-tools` (existing) — already updates `tools`; trigger now fires automatically
- `cascade-comparisons` (existing — rename to `regenerate-stale-compares`) — its writes fire the comparisons trigger
- `indexnow-recent` (existing) — switched input source from ad-hoc query to `pages_freshness`
- `1.9 sentiment-discovery` (parked) — sentiment cache update is one of the trigger columns

---

## 8. Manager touchpoints

**Zero during normal operation.** Cascade is fully automatic.

**Manager-invoked:**
- Click "Bump freshness" on `/admin/tools/[id]` when shipping a non-DB editorial change (e.g., minor copy tweak in a markdown column)
- Approve backfill SQL diff before first prod run

**Anomaly alerts (via 8.1 kpi-anomaly):**
- "≥10% of sitemap URLs have `lastmod` older than 30 days" → cascade lag
- "Cascade-hubs cron failed 3 times in a row" → infra
- "`page_tool_mentions` row count dropped >20%" → sync script broke

---

## 9. Failure modes

| Symptom | Likely cause | Recovery |
|---|---|---|
| Tool updated but `pages_freshness` not bumped | Column not in trigger whitelist / `page_tool_mentions` missing row | `SELECT propagate_freshness(slug, 'manual_repair') FROM tools WHERE slug = '<x>'` then sync mentions |
| Sitemap shows old date | `pages_freshness` row missing for that path | `getLastChangedAt` falls back to source-table `updated_at`; cron safety-sweep refills |
| Trigger blocks tool update on error | Exception in function | Function wraps in `EXCEPTION WHEN OTHERS THEN RETURN NULL` — UPDATE always succeeds |
| ISR revalidation fails | Secret mismatch / Vercel down | Cron retries next hour (idempotent); IndexNow still pings; visible date already correct |
| `page_tool_mentions` stale after code config edit | Sync script didn't run in CI | `npm run sync:mentions` locally + commit + redeploy, or trigger workflow_dispatch |
| Sentiment refresh doesn't cascade | `tool_sentiment_cache` change not wired to trigger | Add the table to trigger source B |
| `pages_freshness` grows large | Normal — 1 row per public URL, ~3,000 at 2,400 indexed pages | Indexed; queries stay fast |

---

## 10. Files to create / modify

### Create
- `supabase/migrations/103_pages_freshness.sql` — `pages_freshness` + `page_tool_mentions` tables, indexes, `propagate_freshness()`, `sync_page_tool_mentions_db()`, triggers on `tools` and `tool_comparisons`. (Note: SPEC originally said 094 — bumped to 103 because 094–102 are already used. Sync function folded into the same migration.)
- `lib/seo/freshness.ts` — `getLastChangedAt(path)`, `getLastChangedAtBatch(paths[])`, `bumpFreshness(path, source, event, reason)`
- `app/api/cron/cascade-hubs/route.ts` — 1h cron handler
- `app/api/internal/revalidate/route.ts` — protected ISR endpoint (if not already there)
- `app/api/admin/freshness/bump/route.ts` — manager bump endpoint
- `components/seo/last-updated.tsx` — "Last updated YYYY-MM-DD" component (practice B)
- `components/seo/reviewed-by-our-team.tsx` — "Reviewed by our team on [date]" component (practice G)
- `components/admin/bump-freshness-panel.tsx` — admin UI on `/admin/tools/[id]`
- `scripts/sync-page-mentions-from-code.ts` — TS-config → DB sync
- `scripts/sync-page-mentions-from-blog.ts` — blog frontmatter → DB sync
- `scripts/backfill-pages-freshness.ts` — one-time backfill (Option B real timestamps)
- `.github/workflows/sync-mentions.yml` — nightly + on-content-change run of the two sync scripts

### Modify
- `app/sitemap.ts` + 6 type-specific sitemaps — replace `new Date()` with `getLastChangedAt`
- 7 page renderers (`app/{tools,compare,best,categories,for,stacks,blog}/[slug]/page.tsx`) — mount `<LastUpdated>` + `<ReviewedByOurTeam>`
- `lib/seo/json-ld.ts` — wire `dateModified` from `getLastChangedAt`; OG image cache-bust suffix
- `vercel.json` — add `cascade-hubs` cron `0 * * * *`
- `app/api/cron/indexnow-recent/route.ts` — switch input to `pages_freshness`
- `app/admin/tools/[id]/page.tsx` — mount `<BumpFreshnessPanel>`
- `package.json` scripts — add `sync:mentions`, `backfill:freshness`

### Reuse (no change)
- IndexNow ping helper
- `revalidatePath` from Next.js
- Existing `pgcrypto`, RLS patterns

---

## 11. Acceptance test

After deploy, run in order:

1. **Trigger fires on user-visible update:**
   ```sql
   UPDATE tools SET description = description || ' [test]' WHERE slug = 'cursor';
   SELECT page_path, last_changed_at FROM pages_freshness WHERE source_tool_slug = 'cursor';
   ```
   Expect: every page mentioning cursor has `last_changed_at` within 1 second.

2. **Internal counters don't fire:**
   ```sql
   UPDATE tools SET view_count = view_count + 1 WHERE slug = 'cursor';
   ```
   Expect: NO new `pages_freshness` rows.

3. **Sitemap reflects truth:**
   - `curl /sitemap.xml | grep cursor` → `<lastmod>` matches `pages_freshness` row
   - `curl /compare/sitemap.xml | grep cursor-vs-` → also matches

4. **Visible dates render:**
   - `/tools/cursor` shows "Last updated <today>" + "Reviewed by our team on <today>"
   - `/best/ai-coding-agents` same
   - Any compare page mentioning cursor same

5. **JSON-LD honest:**
   - `curl /tools/cursor | grep dateModified` → today's ISO timestamp matching `pages_freshness`

6. **0-reviews gate verified:**
   - Tool with `review_count = 0` shows no rating widget, no Schema.org `aggregateRating`
   - Tool with `review_count > 0` shows widget + emits AggregateRating

7. **Cron runs:**
   - `curl -X POST /api/cron/cascade-hubs -H 'Authorization: Bearer $SECRET'` → 200 OK
   - `cron_logs` has `ok=true` row
   - IndexNow received the URL list

8. **Admin bump works:**
   - Manager clicks "Bump freshness" on `/admin/tools/[cursor]` with reason "Editorial polish on hero copy"
   - `pages_freshness` row updates with `change_source='admin_manual'`, `change_reason='Editorial polish...'`
   - `/tools/cursor` revalidates within 30s

9. **Backfill replayable:**
   - Run `npm run backfill:freshness -- --dry-run` → outputs diff
   - Run for real → `pages_freshness` populated with real-timestamps (not all NOW())

10. **Safety sweep recovers a missed trigger:**
    - Disable trigger, update a tool, re-enable
    - Wait 1h (or invoke cron manually) → `pages_freshness` fills in

---

## 12. Build order

1. Migration 103 — schema + functions + triggers (single file)
2. `lib/seo/freshness.ts` helper
3. `scripts/sync-page-mentions-from-code.ts` + first sync run
4. `scripts/backfill-pages-freshness.ts` + dry-run on staging clone
5. Sitemap + JSON-LD swaps (low-risk, easy to revert)
6. Page renderer `<LastUpdated>` + `<ReviewedByOurTeam>` mounts
7. Cron `cascade-hubs` + revalidate endpoint
8. Admin bump UI
9. Backfill on prod (manager-approved)
10. Switch IndexNow source

Day 1 in the 30-day roadmap.
