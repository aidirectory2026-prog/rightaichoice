# 17 — `/plan` (AI Stack Builder) SEO

> **Goal:** turn the interactive planner into a strong, schema-rich, non-thin
> landing page that captures the builder/decision long-tail + brand, and feeds
> authority to the stack pillars. Shipped 2026-06-03 (Day 8).

## 1. GSC reality

- **`/plan` ranks for nothing** (no impressions in the latest 28d snapshot).
- The "plan / builder / generator" query family is **not** about a project planner:
  it's dominated by tool **pricing-plan** queries ("se ranking plans", "calendly
  plans") and "[output] generator/maker" ("marketing plan generator" 10 impr pos 95,
  "strategic marketing plan maker" 37 impr pos 57) — served by specific tool pages.
  There is **~no demand for "ai stack planner/builder"** specifically (same shape as
  "ai stack" on the homepage).
- **Defects found:** `/plan` had **no canonical** despite accepting `?q=`, `?source=`,
  `?from=` CTA-attribution params (duplicate-URL / index-bloat risk), and **no schema**
  beyond the BreadcrumbList from `<Breadcrumbs>`.

## 2. Thesis

`/plan` is a **tool landing page + hub**, not a head-term traffic play. It should:
own the builder/decision long-tail ("ai stack builder", "plan your ai tool stack",
"how to plan an ai stack") + brand; be a rich-result/AEO citizen (WebApplication +
HowTo + FAQPage); and route equity to the 5 role pillars. It does **not** compete for
"best ai tools" (→ homepage) or "ai stack for [persona]" (→ pillars) — those appear
only as link anchors / FAQ.

## 3. Shipped (`app/plan/page.tsx`)

- **Canonical** `alternates: { canonical: '/plan' }` — collapses the `?q/?source/?from`
  param variants onto one indexable URL. Added OpenGraph.
- **Title/meta rebalanced:** title → `AI Stack Builder — Plan Your AI Tool Stack`;
  description leads with "Describe your goal and get a complete AI tool stack in
  seconds… Free AI stack builder." H1 → "Build your AI stack from a single goal."
- **Schema (new):** inline **WebApplication** (free tool, `offers price:0`,
  `featureList`, provider=Org) + **HowTo** (`howToJsonLd`, the 3-step process) +
  **FAQPage** (`faqPageJsonLd`, 6 Q&As). BreadcrumbList stays from `<Breadcrumbs>`.
  All emitted once at page level.
- **Content depth + hub links:** new "Or start from a ready-made AI stack" section
  linking the **5 role pillars** + "Browse all AI stacks"; the "How it works" H2 →
  "How to plan your AI stack" (mirrors the HowTo); a server-rendered **FAQ accordion**
  (crawlable `<details>`); "Explore more" links upgraded to keyword-rich anchors incl.
  a cornerstone (`/categories/code-development`).

## 4. Anti-cannibalization

Qualified "ai stack for [persona]" / "best ai [category]" phrases appear on `/plan`
**only** as link anchors / FAQ links — never as its title/H1/H2. `/plan` owns the
*builder/action* intent; homepage owns broad "best ai tools"; pillars own personas.

## 5. Authority ceiling

Same as the rest of Phase 9: ranking is gated by **authority (doc 10)**. These are
the right on-page + schema + internal-link foundations; expect AEO/brand long-tail +
internal-link lift to the pillars before any head-term movement. The WebApplication +
HowTo + FAQPage schema also improve eligibility for AI-assistant citation of the tool.

## 6. Verification

`tsc` + `eslint` clean; post-deploy: confirm `/plan` returns the new title/H1, a
`canonical` of `https://rightaichoice.com/plan`, the 5 pillar links, and exactly one
each of WebApplication / HowTo / FAQPage (+ BreadcrumbList) in the rendered JSON-LD.
