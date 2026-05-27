# 07 — Internal Linking & Topical Authority

> **Goal:** Build dense, intentional internal links so authority
> concentrates on a small number of cornerstone pages, and so no
> commercially-relevant page is an orphan. This is the highest-leverage
> SEO work for any directory site.

## Why this is foundational

Internal links do three things at once:

1. **Distribute PageRank** — pages with more inbound internal links
   inherit more authority and rank better.
2. **Define topical relationships** — Google reads link patterns to
   understand which pages are about the same topic.
3. **Guide crawl budget** — Google prioritizes crawling pages it can
   reach in fewer clicks from the homepage.

A directory site without strong internal linking is a graveyard of
orphan pages. Today, RAC is mostly graveyard.

## 2026-05-28 priority injection — compare-link elevation

The 2026-05-28 GSC audit (see
[14-noindex-sweep-and-audit-findings.md](./14-noindex-sweep-and-audit-findings.md))
found that editorial *compare* pages are only **34% indexed** — vs 93%
for tool pages. The cause maps directly onto this doc's premise:
compares are orphans. They're linked from a "related compares" rail at
the bottom of *other* compare pages = circular, low-priority for crawl.

**B1 — Elevate compare links on tool pages.** Every editorial compare
should be linked from the two tool pages it compares — front and
center, not buried.

- Data layer already exists: `getEditorialComparisonsForTool` in
  `lib/data/comparisons.ts:133`.
- Current placement: a "Compared with" rail somewhere mid- or
  below-the-fold on the tool page.
- New placement: **above-the-fold pill or strip**, e.g.:
  - `Compared with: Cursor → · GitHub Copilot → · Cline →`
  - Or a dedicated "Head-to-head" block right under the editorial
    verdict, before the feature table.
- Treat compares as first-class navigation, not "related content".

Why this works: tool pages already enjoy 93% crawl coverage. Moving
compare links into above-the-fold position transfers crawl-priority
authority from already-indexed pages to under-indexed ones. This is
the single highest-leverage internal-link change in Phase 9.

Note: the linking query already filters `.eq('noindex', false)` so the
22 noindex'd compares won't get authority injected into them.

## The hub-and-spoke model

Pick a small set of **cornerstone pages** (5–7). Every related
tool/comparison/blog post links *to* the cornerstone, and the
cornerstone links *out* to all of them. The cornerstone becomes the
authoritative URL for its topic in Google's eyes.

### Cornerstone candidates for RAC

| Cornerstone URL                                          | Topic cluster                                                          |
| :------------------------------------------------------- | :--------------------------------------------------------------------- |
| `/categories/ai-code-editors`                            | Cursor, GitHub Copilot, Cline, Aider, Continue, Cody — all `/tools/*` |
| `/categories/ai-coding-agents`                           | Devin, OpenHands, SWE-agent — all `/tools/*` + the leaderboard blog   |
| `/categories/ai-image-generators`                        | Midjourney, DALL-E, Flux, Stable Diffusion — `/tools/*`               |
| `/categories/ai-writing-tools`                           | Notion AI, Jasper, Copy.ai, Writesonic                                |
| `/categories/ai-language-learning`                       | Duolingo, Loora, TalkPal, Speak (we already rank for these)           |
| `/categories/ai-research-and-search`                     | Perplexity, Kagi, AlphaSense, Claude (the AlphaSense vs Claude page)  |
| `/categories/ai-music-generators`                        | Suno, Udio, Moises                                                    |

Each cornerstone is a long-form (1,500+ word) editorial page that:

- Explains the category
- Lists all our tools in it as a curated table
- Has a "best for {use case}" sub-section
- Has internal links to the top 3 comparison pages in the category
- Has links to recent blog posts on the topic
- Has FAQ section
- Has author byline + reviewed-by + last-updated

If we don't have these category pages today, build them. They're 5–7
new pages; high ROI per hour.

## The orphan detection job

### Step 1 — Build the internal link graph

Script: `scripts/build-link-graph.ts`

For each published page (tool, comparison, blog, alternative):

1. Fetch rendered HTML
2. Extract all internal `<a href>` to other site pages
3. Store edges as `(source_url, target_url)`

Output: `candidates/internal-link-graph.json` (and persist to a new
`internal_links` table for incremental updates).

### Step 2 — Compute incoming link counts

```sql
SELECT target_url, COUNT(DISTINCT source_url) AS incoming_links
FROM internal_links
GROUP BY target_url;
```

### Step 3 — Identify orphans

Orphan = page with `incoming_links < 2`. (Sitemap doesn't count;
nav/footer doesn't count for cluster relevance.)

Expected output: 500–800 orphan pages.

### Step 4 — Auto-link them

For each orphan:

1. Identify its topic cluster (by category field)
2. Inject 2–3 inbound links from sibling pages within the cluster
3. Add the orphan to the cornerstone's "browse all" list

Done programmatically via a re-render trigger after every batch.

## The related-content widget (programmatic linking)

Every tool/comparison page already has a "related" section opportunity.
Build/upgrade it:

### Spec for `<RelatedContent>`

Props:
- `currentPage`: URL + type
- `category`: primary category slug
- `limit`: default 6

Renders:
- 3 sibling tools (same category)
- 2 related comparisons (containing one of the siblings)
- 1 related blog post (tagged with the category)

Implementation: deterministic, based on category metadata. Don't make
it AI-driven — too unstable, too hard to debug. Pure SQL query.

Output: every tool/comparison/blog gets 6 high-quality inbound links
from siblings.

### Sitewide impact estimate

- 660 tool pages × 3 inbound links each (from sibling tools) = ~2,000 new links
- 300+ comparison pages × ~5 inbound = ~1,500 links
- Effective doubling of internal link density

## Anchor text strategy

Anchor text matters. Generic ("click here", "read more") wastes the
link. Pattern:

| Link type                       | Anchor text pattern                              |
| :------------------------------ | :----------------------------------------------- |
| Tool → Comparison                | `{Tool A} vs {Tool B}` (literal title)           |
| Cornerstone → Tool               | `{Tool name}` or `{Tool name} review`            |
| Tool → Cornerstone               | `Best {category}` or `All {category} tools`     |
| Tool → Alternative page          | `{Tool} alternatives`                            |
| Blog post → Tool                 | `{Tool name}` in natural sentence                |
| Footer / Nav                     | Skip from anchor strategy                        |

## Homepage as authority distributor

The homepage has the most authority. Use it intentionally:

- Top 5 "Trending tools" (data-driven, refreshed weekly)
- Top 3 "Editor's picks" comparison pages
- Featured cornerstone (rotates by month)
- Latest blog post

Every link from the homepage is an authority injection. Make them count.

## Topical authority deep-dive — cluster pillar pages

A "pillar page" goes beyond a category cornerstone. It's the single
URL we want to own for a high-volume short-tail query.

### Pillar candidates

Two pillar types — both critical, different intents:

**Category pillars** (broad "best of" queries):

| Pillar URL                                | Target query                              | Volume (est) |
| :---------------------------------------- | :---------------------------------------- | -----------: |
| `/best-ai-coding-tools`                   | "best AI coding tools"                    |    18K/month |
| `/best-ai-image-generators`               | "best AI image generators"                |    27K/month |
| `/best-ai-writing-tools`                  | "best AI writing tools"                   |    14K/month |
| `/best-ai-language-learning-apps`         | "best AI language learning apps"          |     6K/month |
| `/ai-agents-comparison`                   | "AI agents comparison"                    |     4K/month |

**Stack pillars** (decision-engine queries, per [doc 13](./13-homepage-positioning-and-brand-defense.md)):

| Pillar URL                                  | Target query                              | Volume (est)  |
| :------------------------------------------ | :---------------------------------------- | ------------: |
| `/stacks/ai-stack-for-early-stage-saas`     | "ai stack for startups" / "for saas"      | Medium, very high intent |
| `/stacks/ai-stack-for-content-creators`     | "ai stack for content creators"           | Medium, very high intent |
| `/stacks/ai-stack-for-solo-developers`      | "ai stack for developers"                 | Medium, very high intent |
| `/stacks/ai-stack-for-product-teams`        | "ai stack for product teams"              | Lower vol, very high intent |
| `/stacks/ai-stack-for-marketing-teams`      | "ai stack for marketing"                  | Medium, very high intent |
| `/stacks/ai-stack-for-ecommerce`            | "ai stack for ecommerce"                  | Lower vol, very high intent |

Stack pillars are the **decision-engine** crystallized into pages —
"here's the exact stack of tools we recommend for {persona}". They
should be hand-written, 1,200–2,000 words, with the recommended tool
list embedded as `ItemList` schema, monthly cost totals, and an
"Adjust this stack" CTA that opens the Tool Finder Quiz pre-filled with
the persona's context. Spec in [doc 13 Part 2](./13-homepage-positioning-and-brand-defense.md).

For each pillar:

- 3,000+ words
- All cornerstone categories link to it
- Hand-edited, not templated
- Embedded interactive widget (filterable comparison table)
- Updated quarterly with new tools

Pillars are the long game. Build one per month for the first 6 months
of Phase 9.

## Tooling summary

| Script / component                          | Purpose                                     |
| :------------------------------------------ | :------------------------------------------ |
| `scripts/build-link-graph.ts`               | Crawl rendered HTML, store internal edges   |
| `scripts/find-orphans.ts`                   | Identify pages with <2 inbound links        |
| `scripts/inject-orphan-links.ts`            | Programmatic link injection per cluster     |
| `components/related-content.tsx` (upgrade)  | Sibling/related auto-linking widget         |
| `app/categories/[slug]/page.tsx`            | Cornerstone page template (build if absent) |
| `app/(pillars)/{slug}/page.tsx`             | Pillar pages (one-off creation)             |

## Timeline

| Week | Activity                                                       |
| ---: | :------------------------------------------------------------- |
|    1 | Build link graph; identify orphans; pick 5–7 cornerstones      |
|    2 | Ship 5–7 cornerstone pages (or upgrade existing category pages)|
|    3 | Ship related-content widget across tools/comparisons/blogs     |
|    4 | Programmatic orphan-link injection                             |
|  5–6 | First pillar page (`/best-ai-coding-tools`)                    |
|  7–8 | Second pillar (`/best-ai-image-generators`)                    |
|  9–12 | Remaining pillars; quarterly pillar refresh                   |

## Definition of done (Phase 9 portion)

- Internal link graph built and persisting
- Orphan count reduced from ~600 to <50
- 5–7 cornerstone pages live with proper schema + linking patterns
- Related-content widget shipped on all four templates
- First pillar page live and indexed
- Homepage authority distribution intentional (data-driven trending,
  rotating featured cornerstone)

## Risks

- **Internal-link spam** — too many links per page hurts UX and dilutes
  per-link authority. Cap at 6 in the widget + 4 in body links.
- **Anchor text over-optimization** — exact-match anchors look spammy
  at scale. Vary them (some literal title, some descriptive, some
  natural-sentence).
- **Cornerstone pages thin** — if we ship them at 400 words they don't
  earn their authority. Minimum 1,500 words editorial, period.

## When this is in flight, move to:

- [05-tier-3](./05-tier-3-indexation-rescue.md) — orphan fixes drive Bucket A indexation
- [08-ai-search](./08-ai-search-aeo-geo.md) — cornerstones double as AI Overview citation targets
