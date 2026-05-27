# 05 — Tier 3: Indexation Rescue

> **Goal:** Get the silent half of the site indexed and ranked. Today
> a large slice of published pages produce zero impressions in 28 days,
> meaning Google either never crawled them or crawled and refused to
> index. This is the biggest long-term unlock.

## 2026-05-28 reframe — read this first

The original framing of this doc was: "~1,330 zero-impression *tool*
pages are the bottleneck." The first GSC URL-Inspection audit (see
[14-noindex-sweep-and-audit-findings.md](./14-noindex-sweep-and-audit-findings.md))
disproved that assumption. The actual indexation gap looks like this:

| Page type | Sample | Indexed | Rate |
| --- | --: | --: | --: |
| tool | 100 | 93 | **93%** |
| best | 51 | 50 | 98% |
| stack | 40 | 35 | 88% |
| role | 20 | 20 | 100% |
| blog | 16 | 16 | 100% |
| category | 15 | 13 | 87% |
| static | 14 | 8 | 57% |
| **compare** | **100** | **34** | **34%** |

**Top-100 tools are 93% indexed. Top-100 compares (by recency) are 34%
indexed.** ~1,000 editorial compares published, ~660 invisible to Google.

That reframes everything in this doc. New priority order:

1. **B1 — Fix compare-as-orphans** (compare-link elevation on tool
   pages). See doc [07](./07-internal-linking-topical-authority.md)
   "Compare-link elevation" section. **Highest-leverage move in Tier 3.**
2. **B2 — Compare sitemap priority bump** (0.8 → 0.95).
3. **B3 — Re-run audit with `--all`** to get full coverage (2 days at
   2k/day quota); produces the actual bucket distribution for
   ~2,781 URLs instead of the 356-URL sample.
4. **B4 — Long-tail tool internal linking** (the original Tier-3 focus)
   is now secondary. Tools at the bottom of view_count likely *are* in
   the "URL is unknown to Google" bucket, but they represent a smaller
   slice than the compare problem and have less commercial intent.

The rest of this doc (root causes, diagnostic pipeline, fix playbook)
remains correct as a *general framework*. Treat the volumes and
bucket targets below as a baseline to be replaced once the `--all`
audit completes.

## Why this matters

Indexation is the floor. A page that isn't indexed can't rank for
anything. Today >60% of our pages contribute zero search visibility.
Lifting that to even 80% indexation would roughly **double our total
impression surface** before any ranking improvements.

## Why pages aren't indexed (the four root causes)

1. **Orphan pages** — pages with <2 internal links pointing in. Google
   crawls but decides they're unimportant.
2. **Thin content** — < 300 words of unique content. Google sees them
   as "low quality, no need to index".
3. **Duplicate/near-duplicate content** — templated pages that look
   too similar to canonical variants get folded.
4. **Crawl budget exhaustion** — for new sites, Google rations crawl.
   It hits the homepage, sitemap, a few hubs, and stops.

## Diagnostic pipeline

### Step 1 — Pull the zero-impression page list

```sql
WITH page_agg AS (
  SELECT (r->>'page') AS page
  FROM gsc_snapshots, jsonb_array_elements(rows) r
  WHERE scope = '28d' AND snapshot_date = (SELECT MAX(snapshot_date) FROM gsc_snapshots WHERE scope='28d')
  GROUP BY 1
)
SELECT t.slug, '/tools/' || t.slug AS url
FROM tools t
WHERE t.is_published = true
  AND t.merged_into IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM page_agg pa
    WHERE pa.page = 'https://rightaichoice.com/tools/' || t.slug
  );
-- Repeat for /compare, /alternatives, /blog as needed
```

Output: `candidates/tier3-zero-impression.json`

### Step 2 — Bulk URL Inspection (categorize the problem)

Use the `inspectUrl()` helper in `lib/seo/gsc-client.ts`. Quota is
2,000/day per property, so chunk 1,330 over 1 day per pass.

Script: `scripts/audit-gsc-indexation.ts` (already exists per `git status`).

Run it. For each URL, capture:

- `coverageState` — categorizes the indexation issue
- `verdict` — PASS / FAIL / NEUTRAL
- `pageFetchState` — was the page fetchable
- `googleCanonical` — does Google agree with our canonical
- `referringUrls` — how many internal links Google sees

Store output in a new `gsc_url_inspections` table (or `candidates/tier3-inspections.json` for one-off).

### Step 3 — Classify each URL into a fix bucket

Based on `coverageState`:

| coverageState                                            | Bucket           | Action                                       |
| :------------------------------------------------------- | :--------------- | :------------------------------------------- |
| "URL is unknown to Google"                               | Not crawled      | Add internal links → submit via IndexNow     |
| "Discovered - currently not indexed"                     | Crawl budget     | Internal links + improve page quality        |
| "Crawled - currently not indexed"                        | Quality reject   | Content expansion or merge with sibling      |
| "Duplicate without user-selected canonical"              | Dedup needed     | Set canonical OR merge content               |
| "Duplicate, Google chose different canonical than user"  | Canonical fight  | Either accept Google's choice or improve us  |
| "Page with redirect"                                     | Already merged   | Confirm 308 in place; let it expire          |
| "Excluded by 'noindex' tag"                              | Intentional      | Confirm we want it noindexed                 |
| "Soft 404" / "Not found (404)"                           | Broken           | Restore or remove from sitemap               |
| "Submitted and indexed"                                  | OK               | Why no impressions? Move to Tier 2/4 review  |

## Fix playbook by bucket

### Bucket A — "URL is unknown" + "Discovered - not indexed"

Combined fix: **internal linking + IndexNow blast**.

1. For each URL, identify the cluster head it belongs to (see [07](./07-internal-linking-topical-authority.md)
   for cornerstone definitions).
2. Add the URL to the "related tools" / "related comparisons" widget
   on the cluster head + 3–5 sibling pages.
3. Submit the URL to IndexNow + Bing + GSC URL Inspection
   request-indexing (manual, 10/day quota).
4. Wait 14 days, re-inspect.

Target volume: ~600 URLs in this bucket. Internal-link injection should
be automated via the related-links widget — see [07](./07-internal-linking-topical-authority.md).

### Bucket B — "Crawled - currently not indexed"

This is the *quality reject* bucket. Google looked and decided the page
isn't worth keeping. Three options per page:

1. **Improve to Tier 2 standard** — only if the page has commercial
   intent (high-traffic potential keyword). Apply [04-tier-2](./04-tier-2-content-depth.md) treatment.
2. **Merge with a sibling page** — if there's a close-enough sibling,
   merge content + set 308 redirect (we already have the
   `merged_into` field on `tools`).
3. **Noindex + drop from sitemap** — for pages with no clear demand,
   stop wasting crawl budget on them.

Decision rule: if the URL gets even **1 impression in 28 days at any
position**, default to improve. If true-zero for 60+ days, default to
merge or noindex.

### Bucket C — Duplicate / canonical fight

Audit each page's content vs the page Google chose as canonical:

- If our page is genuinely better: improve content + set explicit
  `<link rel="canonical">` to self.
- If Google's choice is correct: accept it. Set canonical to the
  external/sibling page or 308 to it.

### Bucket D — Soft 404 / 404 / errors

Audit each. Either:

- Restore the page (if removal was accidental)
- Remove from sitemap + return 410 Gone (intentional)

### Bucket E — Submitted and indexed but no impressions

The page IS indexed but never ranks for anything. This is a content +
title problem, not an indexation problem. Move to Tier 4 prune-or-merge
review.

## Sitemap pruning (must do alongside)

A bloated sitemap signals "low quality site" to Google. After Tier 3
classification:

- Bucket A (unknown + discovered): keep in sitemap
- Bucket B (improve / merge / noindex): noindexed pages out of sitemap
- Bucket C (canonical): canonical-resolved pages stay; rejected ones
  out
- Bucket D (404): out
- Bucket E (indexed but useless): keep in sitemap but mark for Tier 4
  review

Goal: sitemap shrinks from ~2,100 URLs to ~1,200–1,400 high-quality
URLs. The remaining 700–900 either get noindexed or merged.

## Tooling

### Script — `audit-gsc-indexation.ts` (exists, untracked)

Already written. Reads from `tools` / `comparisons` / `posts`, calls
`inspectUrl()`, writes results to a JSON file. Needs:

- A wrapping table so historical inspections persist (`gsc_url_inspections`)
- Cron-friendly chunking (2,000/day quota)
- A reporting query: "URLs by coverageState bucket, last 7 days"

### Cron — weekly URL inspection refresh

Add to `vercel.json`:

```json
{
  "path": "/api/cron/refresh-gsc-inspections",
  "schedule": "0 7 * * 1"
}
```

Inspects ~2,000 stale URLs per week. Over 4 weeks, covers the whole site.

### Admin view — `/admin/indexation`

Lists URLs by bucket, lets operator approve fixes in batches:

- Bulk-noindex selected pages
- Bulk-merge into chosen canonical
- Bulk-submit to IndexNow

## Timeline

| Week | Activity                                                                          |
| ---: | :-------------------------------------------------------------------------------- |
|    1 | Run full URL inspection across all 2,100 pages; classify into buckets             |
|    2 | Sitemap prune; noindex Bucket B-noindex pages; resubmit cleaned sitemap to GSC    |
|  3–4 | Internal-link injection for Bucket A (use related-tools widget)                   |
|  5–6 | Content improvements on Bucket B-improve pages                                    |
|  7–8 | Merge work on Bucket B-merge pages (308 redirects in place already)               |
|    9 | Re-inspect; measure: how many moved from "discovered" to "indexed"?               |
| 10–12 | Iterate on remaining stragglers                                                  |

## Definition of done

- All 2,100 URLs inspected and bucketed
- Sitemap pruned to ~1,200 quality URLs
- Internal-link widget covers all remaining valid pages
- Re-inspection cron live (weekly refresh)
- Indexation rate measured at Week 9: target ≥80%

## Risks

- **Inspection API quota** — 2,000/day. Plan accordingly.
- **Over-aggressive noindex** — could nuke pages that were going to
  start working. Mitigation: only noindex pages with 60+ days of true
  zero across both 7d and 28d windows.
- **Internal-link spam** — adding too many links per page hurts UX.
  Mitigation: cap related-tools widget at 6 links per page.

## When this is in flight, move to:

- [06-tier-4](./06-tier-4-prune-or-merge.md) — overlaps significantly with Bucket B/E work
- [07-internal-linking](./07-internal-linking-topical-authority.md) — drives Bucket A fixes
