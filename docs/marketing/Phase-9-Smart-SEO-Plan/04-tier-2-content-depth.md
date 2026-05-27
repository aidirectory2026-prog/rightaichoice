# 04 — Tier 2: Content Depth (143 pages, pos 31–50)

> **Goal:** Take 143 pages currently at pos 31–50 and lift them into
> top 10. This is a 4–6 week effort, not a one-day push. Title rewrites
> alone won't do it — these pages are losing on content quality and
> authority signals.

## Why title rewrites aren't enough

A page at pos 40 isn't being held back by a weak SERP snippet — Google
has decided that other pages are simply more relevant or authoritative.
The fixes are:

1. **Content depth** — more useful, more original, more structured
2. **Topical authority** — internal links from related pages (covered in [07](./07-internal-linking-topical-authority.md))
3. **External signals** — at least 1–2 backlinks from credible sources
4. **Freshness** — recent `dateModified` so Google re-evaluates

All four matter. Skipping any of them caps the ceiling.

## Selection logic

From the 28d snapshot:

```sql
SELECT page, impressions, clicks, avg_pos
FROM page_agg
WHERE avg_pos BETWEEN 31 AND 50
  AND impressions >= 3   -- exclude single-flukes
ORDER BY impressions DESC;
```

Output: `candidates/tier2-page-list.json` — expect ~120–143 rows after
filtering out flukes.

## Three-pass content treatment

For each Tier-2 page, apply these in order. Each pass takes 30–60 min
per page. So 143 pages × 3 passes ≈ 200 hours of work. We batch this:

- 25 pages per week × 6 weeks
- Prioritize by current impressions (high first — bigger upside)
- Hero pages get hand-written; mid-tier gets AI-assisted with heavy review

### Pass 1 — Structural depth (mandatory)

Every Tier 2 page must have:

| Section                          | Why                                                                 |
| :------------------------------- | :------------------------------------------------------------------ |
| H1 matching primary query        | Relevance signal                                                    |
| TL;DR block (50–80 words)        | AI Overview citation bait; instant-answer feature                   |
| 3–5 row comparison/spec table    | Skimmability; rich result eligibility (`Product` schema)            |
| 2–4 H2 sections answering common sub-queries | Covers PAA, builds depth                                  |
| FAQ block (5–8 Q&As)             | `FAQPage` schema, PAA capture                                       |
| "Updated on {date}" byline       | Freshness signal                                                    |
| "Reviewed by {author}" byline    | E-E-A-T signal                                                      |
| 4–6 internal links to related pages | Topical authority                                                |
| 1–2 outbound links to authoritative sources | Trust signal                                              |

If a Tier-2 page is missing 3+ of these, prioritize structural pass first.

### Pass 2 — Original substance

Generic content gets ignored. Each Tier-2 page needs at least one
section that competitors don't have:

- **For tool pages:** real sentiment breakdown from `tool_sentiment_cache`
  (we have this data, it's not surfaced)
- **For comparison pages:** a "verdict" box with our editorial call —
  not just a feature checklist
- **For blog posts:** original data, benchmark, or screenshot we
  generated (not stock images)
- **For alternatives pages:** a "switching cost" or "compatibility"
  section competitors don't have

### Pass 3 — Distribution boost

Once the page is updated:

- Submit via IndexNow (instant Bing + Yandex re-crawl)
- Submit via GSC URL Inspection → Request Indexing
- Add 4–6 inbound internal links from related pages
- If page is hero-tier: get 1 external backlink (Reddit comment, niche
  forum, HN comment, guest-blog mention)

## Content-depth tooling

### Script — content audit scoreboard

`scripts/audit-tier2-pages.ts`

For each of the 143 URLs:

1. Fetch the HTML
2. Score against the structural checklist (presence/absence of each section)
3. Output `candidates/tier2-audit.json`:

```json
[
  {
    "url": "/tools/some-tool",
    "score": 4,           // out of 9 (one per checklist row)
    "missing": ["faq_block", "comparison_table", "reviewed_by"],
    "wordcount": 612,
    "impressions": 17,
    "avg_pos": 41.2,
    "priority": "high"    // = impressions ranked into bands
  }
]
```

Then operator picks the top 25 per week to work on.

### Content drafting workflow

For each priority page:

1. **DeepSeek brief** — generate an outline + missing sections from the
   page URL + primary query. Use a long-context model so it can re-read
   the existing page before drafting.
2. **Editor review** — operator approves outline, refines tone, calls
   out factual errors.
3. **Migration entry** — write into a new migration as a row update or
   into the editorial cache table.
4. **Re-deploy + IndexNow ping.**

## Backlink mini-campaign for hero Tier-2 pages

Pick the top 20 highest-impression Tier-2 pages. For each, pursue 1–2
backlinks via:

- **Reddit organic** — find a relevant thread, comment helpfully, link
  naturally. (Never spam; expect 1-in-3 hit rate.)
- **HARO / Help A Reporter Out** — answer 1 journalist query per
  week mentioning the page.
- **Niche forum mentions** — Indie Hackers, Hacker News, Lobste.rs,
  category-specific Discords.
- **Guest blog** — pitch 1 guest post per month to relevant outlets.

Tracked in a simple `backlink_log` Notion or sheet. We're not building a
CRM for this in Phase 9.

## Timeline (6-week rolling)

| Week | Pages worked | Cumulative |
| ---: | -----------: | ---------: |
|    1 |       25     |         25 |
|    2 |       25     |         50 |
|    3 |       25     |         75 |
|    4 |       25     |        100 |
|    5 |       25     |        125 |
|    6 |       18     |        143 |

Each week ends with: IndexNow + Bing re-submit + GSC URL inspections
for the 25 pages touched.

## Expected results

If we execute correctly:

- Week 2–4: First Tier-2 pages start showing up in Tier-1 (pos < 30)
- Week 6: Median position for the cohort lifts from ~42 to ~22
- Week 8: First clicks from Tier-2 pages compound
- Week 12: ~30% of the cohort in top 10

If we don't see this lift by Week 8, the problem isn't content — it's
backlinks. Escalate to a focused link-building sprint.

## Definition of done

- Audit script run, scoreboard generated
- Top 20 hero pages identified and queued for hand-writing
- Remaining 123 prioritized into 6 weekly batches
- Backlink campaign launched for top 20
- Week-by-week tracking dashboard live

## When this is in flight, move to:

- [05-tier-3](./05-tier-3-indexation-rescue.md) — indexation rescue runs in parallel
- [07-internal-linking](./07-internal-linking-topical-authority.md) — the linking work compounds Tier 2 results
- [10-link-magnets](./10-link-magnets-and-distribution.md) — sustained backlink supply
