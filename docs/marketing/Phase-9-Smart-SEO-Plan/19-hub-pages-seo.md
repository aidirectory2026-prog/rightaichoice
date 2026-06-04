# 19 — Hub pages SEO: `/tools`, `/categories`, `/best`

> Advanced SEO sweep of the remaining listing/hub pages, mirroring `/stacks`
> (doc 18). Shipped 2026-06-04 (Day 9).

## `/tools` (the directory)
- **Canonical `/tools`** — the critical fix. The directory takes
  `?category/?pricing/?skill_level/?platform/?has_api/?search/?sort/?page`, which
  would spawn unbounded duplicate/thin indexable URLs. Individual tools are
  discovered via `/tools/sitemap.xml` (not listing pagination), so consolidating
  every filtered/sorted/paged view onto the clean `/tools` is safe and stops
  index bloat / crawl waste.
- Demand-led title "Browse All AI Tools — Directory & Comparison" + meta; OpenGraph.
- FAQPage schema + crawlable FAQ accordion (BreadcrumbList already present).

## `/categories`
- Title → "AI Tool Categories — Best AI Tools by Category"; kept canonical, added OG.
- **ItemList** (visible categories) + **FAQPage** + **Breadcrumb**; AEO intro;
  FAQ accordion (links to /stacks, /plan, /methodology).

## `/best`
- Added **canonical `/best`** (was missing) + OG; title → "Best AI Tools by Use
  Case (2026) — Curated Guides".
- **ItemList** (all best-of guides) + **FAQPage** + **Breadcrumb**; expanded intro;
  FAQ accordion.

## Anti-cannibalization
Each hub owns its collection intent (browse tools / categories / best-of guides);
qualified per-category/use-case terms stay with the cornerstone + `/best/{slug}`
pages, linked not competed for.

## Ceiling
Authority (doc 10) still gates rank. These are the canonical-hygiene + schema +
AEO foundations. The `/tools` canonical is also a crawl-budget win (fewer junk
param URLs competing for Googlebot's attention).

## Verify
`tsc` + `eslint` clean; post-deploy confirm canonical on each, ItemList/FAQPage in
JSON-LD, and `/tools?category=x&sort=y` canonicalizing to `/tools`.
