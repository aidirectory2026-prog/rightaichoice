# 18 — `/stacks` (AI stacks index) SEO

> Advanced SEO for the stacks index — the pillar hub the homepage, `/plan`, and
> navbar now point to. Shipped 2026-06-04 (Day 9).

## Why
`/stacks` was the least-optimized hub: **no canonical, no JSON-LD, no FAQ** — despite
literally being a list of stacks (ideal for ItemList) and being the parent of the 5
role pillars. It's the natural completion of the hub built on the homepage + `/plan`.

## Shipped (`app/stacks/page.tsx`)
- **Canonical** `/stacks` + OpenGraph.
- **Schema:** `itemListJsonLd` over all stacks (name=goal, url=`/stacks/{slug}`) +
  `faqPageJsonLd` (5 Q&As); **BreadcrumbList** via the new `<Breadcrumbs>`.
- **AEO intro:** the hero subcopy now defines "an AI stack" (crawlable, snippet-friendly).
- **"AI stacks by role" row:** the 5 editorial pillars surfaced first with keyword
  anchors (`STACKS.filter(s => s.pillar)`) → routes equity to the pillar pages; the
  remaining curated stacks follow under "All AI stacks by goal".
- **Server-rendered FAQ accordion** targeting "what is an AI stack / how to choose one /
  are they free / can I customize / goal not listed" (last two link to `/plan`).

## Anti-cannibalization
`/stacks` owns "ai stacks / best ai stack for every goal" (the index/collection intent);
per-persona "ai stack for X" is owned by the pillar pages (linked, not competed for).

## Ceiling
Authority (doc 10) still gates rank. This is the on-page + schema + internal-link
foundation that makes the stack hub coherent and passes equity down to the pillars.

## Verify
`tsc` + `eslint` clean; post-deploy confirm canonical `/stacks`, 5 pillar links, the
ItemList + FAQPage + BreadcrumbList in rendered JSON-LD.
