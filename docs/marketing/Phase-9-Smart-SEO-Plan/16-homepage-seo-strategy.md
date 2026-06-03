# 16 — Homepage SEO Strategy (demand-led hub)

> **Goal:** make the homepage rank for the queries around the product — the full
> "define a stack → search a stack → choose one → research" funnel — and act as
> the authority hub that feeds the money pages. Shipped 2026-06-03 (Day 8).

## 1. Context & GSC reality

The homepage was repositioned in Day 1 ("decision engine for picking the right AI
stack") with strong schema + entity binding. But the GSC data forced a rethink:

- **The homepage ranks for ~nothing** — 1 query, 1 impression in the latest 28d
  snapshot.
- **"AI stack" has ~zero captured search demand** — not a single "stack" query
  appears anywhere site-wide. The brand's core positioning term is, today, a
  near-zero-volume head term.
- **Real demand** is "best ai tools for [X]" (accounting/teachers/seo/…),
  tool-name + pricing queries (se ranking, mangools, replit, otter ai), and
  comparisons ("duolingo vs loora" pos 8) — all served by `/best/*`, cornerstones,
  tool pages, and `/compare/*`, at pos 40–100.
- **Authority is the throttle** (`InLinks: 0` in Bing; site avg pos 40–50). On-page
  + internal-link work is necessary but **not sufficient** — absolute head-term
  ranking is gated by backlinks (doc 10).

Two homepage **internal-link leaks** were also found: it linked to 4 *stale* example
stacks (not the 5 real pillars) and routed category links to `/tools?category=`
instead of the editorial cornerstone pages `/categories/{slug}`.

## 2. Strategic thesis — demand-led homepage as the hub

**Decision (with operator): rebalance toward demand.** Lead the homepage with the
vocabulary people actually search ("best AI tools" / "find the right AI tools"),
keep **"AI stack" as the differentiating mechanism** (it's *how* we answer "choose"),
and use the homepage as the broad **hub** that routes its (eventual) authority to the
qualified money pages.

**Anti-cannibalization delegation map** — the homepage owns the broad/unqualified +
informational intent; everything qualified is delegated by internal link:

| Query family | Owner (NOT the homepage) |
| :-- | :-- |
| best ai **[category]** tools | cornerstones `/categories/{slug}` |
| ai stack for **[persona]** | pillars `/stacks/ai-stack-for-{persona}` |
| best ai tools for **[use-case]** | `/best/{slug}` |
| **X vs Y** | `/compare/{slug}` |

Guardrail: qualified phrases appear on the homepage only as **link anchors / FAQ**,
never as the homepage's own ranking `<title>`/H1/H2.

## 3. Keyword tiers (homepage)

- **Tier 1 — own, lead copy:** best ai tools · best ai tools for [your work/business]
  · find the best ai tools · ai tool finder · rightaichoice (brand).
- **Tier 2 — own, support copy + links:** compare ai tools · ai tools directory ·
  ai tool recommendations · how to choose ai tools / which ai tools should I use ·
  ai stack / build an ai stack (brand wedge + emerging demand).
- **Tier 3 — AEO/FAQ long-tail:** what is an ai stack · how do I pick the right ai
  tools for my workflow · are ai tools free / how much does an ai stack cost · how
  does rightaichoice work / is it free · what ai tools should I use for my startup
  (answer links to pillars → converts a near-cannibal into a hub link).

## 4. On-page copy rebalance (shipped)

`app/layout.tsx` (homepage `title`/`description`):
- **Title:** `Best AI Tools, Matched to Your Goal — RightAIChoice` (was "Find the
  Right AI Stack for Your Workflow").
- **Description:** "Find and compare the best AI tools for your workflow. Describe
  your goal — get a personalized AI stack with costs, alternatives, and real
  user-sentiment scores across 2,000+ tools."
- Keywords array re-led with "best AI tools", "AI tool finder", "compare AI tools".

`app/page.tsx`:
- **H1:** `Find the best AI tools for what you're building.` (was "Pick the right AI
  stack in 60 seconds, not 6 weeks.")
- **Sub:** "Describe your goal — we'll match the right AI stack from 2,000+ tools…"
  (keeps "AI stack" as the mechanism).

## 5. Internal-linking rewire (shipped — highest leverage)

- **`AI stacks built for your role`** section replaces the 4 stale example stacks
  with the **5 real pillars**, exact-match anchors → `/stacks/ai-stack-for-*`
  (early-stage-saas, solo-developers, marketing-teams, content-creators,
  product-teams) + "Browse all AI stacks" → `/stacks`.
- **`Editor's guides`** row under "Browse by Category" links the **5 cornerstones**
  by exact-match anchor → `/categories/{slug}`: Best AI coding tools, Best AI image
  generators, Best AI writing tools, Best AI tools for research & study, Best AI
  marketing & SEO tools.
- **Category-grid leak fixed:** cornerstone slugs now route to `/categories/{slug}`;
  all other categories keep `/tools?category=`.
- **Navbar:** added a top-level **`Stacks` → `/stacks`** link (desktop + mobile); it
  was previously only in the footer.
- FAQ answers also link out to pillars/cornerstones/`/methodology`.

## 6. New sections (structural rebuild — shipped)

- **AEO answer block** — `<h2>How to choose the right AI tools` + crawlable
  definitional prose (snippet-friendly lead; defines "AI stack"); links to /plan,
  /stacks, /compare.
- **FAQ** — server-rendered `<details>` accordion (crawlable, no client JS), 6 Q&As
  mapped to Tier-3 queries.
- **Popular AI tool comparisons** — the editorial-compare section retitled for the
  "ai tool comparisons" anchor (reuses `getFeaturedEditorialComparisons`).
- **E-E-A-T trust strip** — "Independent & editorial · 2,000+ tools tracked &
  updated weekly · How we rank tools →" linking `/methodology`.

## 7. Schema (shipped) — `app/page.tsx`

`jsonLdScriptProps([ decisionEngineServiceJsonLd(), datasetJsonLd(),
faqPageJsonLd(HOMEPAGE_FAQS), itemListJsonLd('AI Stacks by Role', …, '/', 5 pillars) ])`
+ global Organization/WebSite/Person (root layout). FAQPage is emitted **once at
page level** (single-source rule). Did NOT add HowTo/Article or a second ItemList.

## 8. Out of scope / deferred

- **Tool Finder Quiz** (doc 13) — a product build, not an on-page SEO lever; the
  goal-input hero already serves the intent.
- **Press kit `/press`** — backlink/PR enabler (doc 10), not a homepage lever.
- **Deleting the 4 stale example-stack routes** — separate cleanup (may have inbound
  links); this work only changed what the homepage links to.

## 9. Authority ceiling & realistic expectations

These changes will **not** put the homepage on page 1 for "best ai tools" or "ai
stack" on their own — authority (doc 10 backlinks) is the binding constraint. The
attributable wins: (1) cleaner brand + AEO/PAA answers for low-competition
definitional/decision queries; (2) **internal-PageRank redistribution** — the
homepage now concentrates equity on the 5 pillars + 5 cornerstones instead of
dribbling it into `/tools?category=` and 4 dead stacks; (3) FAQPage + ItemList
rich-result eligibility. Expect pillar/cornerstone lift before homepage head-term
movement. Re-evaluate after 4–8 weeks of GSC data and doc-10 backlink progress.

## 10. Change checklist

- [x] Title + meta rebalanced (`app/layout.tsx`)
- [x] H1 + sub rebalanced (`app/page.tsx`)
- [x] 5 pillars replace 4 stale example stacks
- [x] Cornerstone "Editor's guides" row + category-grid leak fixed
- [x] `/stacks` added to navbar (desktop + mobile)
- [x] AEO intro block + FAQ accordion + trust strip
- [x] FAQPage + ItemList schema
- [x] `tsc` + `eslint` clean
- [ ] (operator/weeks) GSC: track Tier-3 FAQ impressions + pillar/cornerstone lift
