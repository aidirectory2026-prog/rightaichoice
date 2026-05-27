# 09 — Featured Snippets, People Also Ask & SERP Features

> **Goal:** Capture SERP real estate beyond the regular blue link.
> Featured snippets, People Also Ask blocks, sitelinks, and image packs
> can lift CTR 2–3× even without ranking #1.

## The four SERP feature types we target

| Feature              | Trigger                                                           | CTR uplift |
| :------------------- | :---------------------------------------------------------------- | ---------: |
| Featured snippet     | Question query, clear answer formatted as paragraph/list/table    |     +200%  |
| People Also Ask      | Related sub-questions; clicking expands inline answers            |     +50%   |
| Sitelinks            | Branded query; auto-generated for established sites               |     N/A    |
| Image pack           | Visual intent; well-tagged images with proper alt + filename      |     +30%   |
| Video carousel       | "How to" or demo intent; YouTube video with VideoObject schema    |     +40%   |

## Featured snippet hunt

### Step 1 — Find snippet opportunities

Pages where we rank pos 2–10 for a question query but don't own the
snippet. Pull from gsc_snapshots:

```sql
SELECT (r->>'page') AS page, (r->>'query') AS query, (r->>'position')::float AS pos
FROM gsc_snapshots, jsonb_array_elements(rows) r
WHERE scope = '28d'
  AND snapshot_date = (SELECT MAX(snapshot_date) FROM gsc_snapshots WHERE scope='28d')
  AND (r->>'query') ~ '^(what|how|why|when|which|is|are|can|does|should)'
  AND (r->>'position')::float BETWEEN 2 AND 10
ORDER BY (r->>'impressions')::float DESC
LIMIT 50;
```

Output: `candidates/snippet-targets.json`.

### Step 2 — Verify the SERP

For each candidate query: actually search it on Google (incognito,
US/IN). Note which competitor owns the snippet today and its format
(paragraph / list / table).

### Step 3 — Reformat our page to win

The snippet engine wants:

- **Paragraph snippets**: 40–60 word answer in a single `<p>` immediately
  below an H2 that mirrors the query.
- **List snippets**: H2 question, then `<ol>` or `<ul>` with 5–8 items,
  each 5–15 words.
- **Table snippets**: H2 question, then a `<table>` with clear headers.

### Step 4 — Re-crawl + monitor

Push the page, ping IndexNow, re-check the SERP 7 days later. If the
snippet moves to us → win. If not → iterate format.

## People Also Ask capture

PAA boxes show related sub-questions. Owning them gets you another
SERP slot.

### Step 1 — Scrape PAA for top queries

For each Tier-1 page's primary query, scrape the 4 PAA questions
Google currently shows.

Options:
- Manual (best for accuracy): copy from incognito search
- SerpAPI / Bright Data (programmatic, $$)
- Open-source: `paa-scraper` Python lib (use sparingly to avoid ban)

Store in `candidates/paa-questions-by-page.json`:

```json
{
  "/compare/duolingo-vs-loora": [
    "Is Loora better than Duolingo?",
    "Which app is best to learn English with AI?",
    "Is Loora app worth it?",
    "How much does Loora cost per month?"
  ]
}
```

### Step 2 — Add PAA questions as FAQ items

Each Tier-1 page gets an FAQ block with those 4 questions answered
in 50–100 words each. Wrapped in `FAQPage` schema.

This serves two goals:
1. Captures the PAA slot (we become the source Google extracts from)
2. Captures the underlying long-tail query directly

### Step 3 — Cascade to Tier 2

Once Tier-1 FAQ pattern is proven (Week 3–4), apply the same FAQ
extraction to Tier-2 pages during their content-depth pass.

## Sitelinks

Sitelinks (the 4–6 sub-links under your brand result) are auto-granted
by Google but require:

- Strong site architecture (cornerstone pages exist)
- Strong internal linking (Phase 9's main work)
- Brand searches happening (your traffic)

Indirect optimization: do the rest of Phase 9 well, sitelinks appear
within 2–3 months. Force-prompt by adding `SiteNavigationElement`
schema to the global nav (low impact but free).

## Image SEO + image pack

### Per-image checklist

For every image on tool/compare/blog pages:

- **Filename**: descriptive, hyphenated, lowercased — `duolingo-vs-loora-pricing-chart.png` not `IMG_4032.png`
- **alt text**: 80–120 chars, describes the image AND includes
  primary keyword naturally
- **`ImageObject` schema** in JSON-LD (especially for hero images)
- **Lazy load below-the-fold** (Next.js Image handles this)
- **Modern formats** (WebP/AVIF — Next.js handles this)

### Hero image strategy

Every Tier-1 and Tier-2 page should have a hero image that:

- Is original (not stock) where possible — screenshots, comparison
  diagrams, custom illustrations
- Has descriptive alt + filename
- Renders fast (LCP element)

For tool pages: a UI screenshot of the tool.
For comparison pages: a side-by-side diagram.
For blog: a custom feature image.

## Video carousel

Already covered in [08-ai-search](./08-ai-search-aeo-geo.md). Brief recap:

- Embed YouTube short demo on top 30 tool pages
- Tag with `VideoObject` schema
- Capture video carousel slot when SERP has one

## Rich results we want

Schema → rich result mapping. Verify each works in Google's Rich Results Test:

| Schema           | Rich result           | Pages where we want it                   |
| :--------------- | :-------------------- | :--------------------------------------- |
| `Product` + `Review` + `AggregateRating` | Product snippet with stars | `/tools/*` |
| `FAQPage`        | Expandable FAQ        | All Tier-1 and Tier-2 pages              |
| `ItemList`       | List carousel         | `/compare/*` and category pages          |
| `VideoObject`    | Video thumbnail       | Tool pages with embedded demo            |
| `HowTo`          | Step-by-step result   | Tutorial blog posts                      |
| `BreadcrumbList` | Breadcrumb in SERP    | All non-root pages                       |
| `Article`        | News/article result   | Blog posts                               |

## Tooling

| Script / component                       | Purpose                                    |
| :--------------------------------------- | :----------------------------------------- |
| `scripts/find-snippet-opportunities.ts`  | Query gsc_snapshots for pos 2–10 question queries |
| `scripts/scrape-paa.ts` (manual fallback)| Extract PAA questions per primary query    |
| `components/faq-block.tsx`               | Render + emit FAQPage schema               |
| `components/comparison-table.tsx`        | Standardized 6-row table format            |
| `lib/seo/json-ld.ts` (extend)            | Add Review/AggregateRating/ImageObject/VideoObject/HowTo |

## Timeline

| Week | Activity                                                                       |
| ---: | :----------------------------------------------------------------------------- |
|    1 | Snippet target list; scrape PAA for top 20 queries; FAQ block component        |
|    2 | Add FAQ blocks to top 20 Tier-1 pages                                          |
|  3–4 | Reformat snippet candidates to win the box (paragraph/list/table format)       |
|  5–6 | Image SEO sweep across Tier-1 + Tier-2                                          |
|  7–8 | Embed demo videos + VideoObject schema for top 30 tool pages                   |
|  9–12 | PAA cascade into Tier-2 content depth pass                                    |

## Definition of done

- Snippet target list generated weekly (from latest snapshot)
- FAQ blocks live on all Tier-1 pages
- PAA questions captured into FAQ for top 50 queries
- Comparison table standardized across `/compare/*`
- Image alt/filename audit complete for Tier 1+2
- Video schema live on 30 tool pages
- Weekly tracking of "snippets owned" + "PAA slots owned"

## Risks

- **Snippet volatility** — Google rotates snippet sources. A page that
  won the snippet can lose it on the next algo update. Mitigation:
  treat snippet wins as gravy, not foundation.
- **PAA query mismatch** — answering the wrong question wastes the
  FAQ slot. Mitigation: only add PAA questions that are clearly
  related to the page's primary topic.
- **Schema spam penalty** — adding schema for content that isn't
  actually present gets manual actions. Mitigation: schema must
  reflect on-page reality. No phantom reviews/FAQs/videos.

## When this is in flight, move to:

- [10-link-magnets](./10-link-magnets-and-distribution.md) — original research drives snippet wins
- [11-kpis](./11-kpis-and-feedback-loops.md) — track snippet/PAA ownership over time
