# 22 — Page architecture overhaul + 100 quality "AI tools for [industry/role]" pages

> Two linked initiatives, planned 2026-06-04 (Day 9):
> 1. **Finish the per-page-type SEO + conversion architecture** so every page type is
>    AEO-era complete and converts.
> 2. **Build ~100 new, quality-gated "AI tools for [industry/role]" pages** to expand
>    demand capture (top-of-funnel + commercial), without the thin-content risk that
>    Google's May-2026 helpful-content/core update punishes.
>
> Decisions (with operator): **quality-gated, not volume-first**; family = **"AI tools
> for [industry/role]"**.

## 0. The hard constraints (read first)
- **Doing 100 pages cheaply = a sitewide risk.** The `/best` + `/for` templates are
  config-driven (add a row → page + sitemap auto-generate), but their tool list filters
  **only by category** — so naive config-only niche pages would be near-duplicate, thin
  pages. Under the May-2026 update that can drag down the *whole* site. We will NOT do that.
- **Niches are genuinely populatable.** Matching `search_vector @@ websearch_to_tsquery(niche)`
  OR `use_cases/best_for ILIKE niche` returns ample tools per niche (marketing 594, sales
  389, healthcare 181, legal 112, ecommerce 82, real-estate 73, recruiting 48, nonprofit 21…).
  A **≥8 genuinely-relevant-tools quality gate** cleanly drops niches we can't serve well.
- **Authority is still the rank ceiling** (see [doc 20](./20-authority-action-plan.md)). New
  pages target lower-competition long-tail + feed AI citations, so they're *more winnable* —
  but ranking still compounds with backlinks. We maximize odds (quality + internal links +
  recrawl); we don't promise #1.

## Part 1 — Per-page-type architecture (finish the recommendations)
Goal: every money page is both **citation-shaped** (a direct answer + schema + FAQ that AI
Overviews extract) and **conversion-shaped** (verdict → ranked picks → outbound/affiliate CTA
+ `/plan`). Status by type:

| Page type | Already AEO-complete | Remaining gap to fix |
| :-- | :-- | :-- |
| Homepage, `/plan`, `/stacks`, `/tools`, `/categories`, `/best`, cornerstones | ✅ (Days 8-9) | — |
| **Tool page** (`app/tools/[slug]/page.tsx`) | schema + multi-tier pricing ✅ | **add an above-the-fold direct-answer / TL;DR block** under H1 (what it is + who for + how much it costs, from `editorial_verdict`/`tagline` + `pricing_details`) |
| **Compare page** (`app/compare/[slug]/page.tsx`) | editorial verdict, schema, FAQ ✅ | **render a synthesized verdict for NON-editorial compares** + add **category internal links** (extract both tools' categories → link the cornerstone / `/tools?category=`) |

Conversion check: ensure every type has a prominent Visit/affiliate CTA + a `/plan` path
(the visitor we do get must convert — see the affiliate-revenue note below).

## Part 2 — The 100 "AI tools for [industry/role]" pages

### 2a. The engine (build once, then scale)
1. **Niche-aware tool query** — `getNicheTools(niche, limit)` in `lib/data/tools.ts`:
   select tools by `search_vector @@ websearch_to_tsquery(niche)` OR `use_cases`/`best_for`
   ILIKE niche, ranked by review_count/viability. **Quality gate:** publish a niche only if
   ≥8 genuinely-relevant tools; otherwise skip or `noindex`.
2. **Niche config + template** — reuse the AEO-upgraded `/best` family (Quick-answer TL;DR +
   ranked picks + rendered FAQ + ItemList/FAQPage/Breadcrumb + sibling links). Add a `niche`
   field to the config so the entry renders with the **niche-filtered** tool list.
3. **Per-niche unique content (anti-thin):** generate a unique ~150-word intro + 4-5
   niche-specific FAQs per page via the existing DeepSeek editorial pipeline (same one behind
   `generate-editorials` / `refresh-faqs`); the **ranked tool set itself differs per niche**.
   No two pages are boilerplate-with-a-swapped-word — that's the whole quality bar.

### 2b. The 100 keywords (sourcing + gate)
- **Proven demand (GSC):** accounting, teachers/educators, SEO, agencies, consultants,
  game-dev, finance, real-estate, healthcare, spreadsheets, copywriting, real-estate agents…
- **Industry × role taxonomy:** industries (real estate, legal, healthcare, finance,
  insurance, ecommerce, construction, hospitality, manufacturing, nonprofits, agencies…) ×
  roles (teachers, recruiters/HR, sales reps, marketers, lawyers, accountants, realtors,
  podcasters, designers, founders, students, customer-support…).
- **Light keyword research** to rank demand; **quality-gate every candidate by catalog
  coverage (≥8 tools)** → final ~100 (publish what the catalog serves well; park the rest).
- Each page serves the cluster: top-funnel "AI tools for [X]" + commercial "best AI tools
  for [X]" via the H1/title + answer block.

### 2c. Internal-linking cluster (topical authority)
Each niche page links to relevant cornerstones, compares, and 6-8 picks + `/plan`;
cross-links 3-4 sibling niches; is linked from the `/best` index + a "by industry/role" hub.
A tight cluster aids both ranking and AI-citation.

### 2d. Sitemap + recrawl
Auto-included via the config-driven `/best` sitemap; `bumpFreshness` + batch `submitToIndexNow`
on publish (the proven recrawl path).

### 2e. Phased execution (all quality-gated, targeting 100)
- **Phase A — engine + proof:** niche-tools query + quality gate; Part-1 architecture fixes;
  publish ~15-20 highest-demand, high-coverage niches; verify niche-specific tools + unique
  intros/FAQs (no duplication); deploy + recrawl.
- **Phase B — scale:** generate the rest through the pipeline behind the quality gate → ~100;
  deploy + recrawl in batches; monitor for thin-content flags.

## How this ties to revenue (affiliate)
The niche/commercial pages are **bottom-of-funnel, buying-intent** ("best AI tools for [X]")
— the affiliate-resilient cohort that still earns clicks in an AI-Overview world. Each page's
ranked picks carry the outbound/affiliate CTA; the page also routes undecided readers to
`/plan`. Citations from these pages bring warm, high-converting visitors even when the click
count is lower.

## Critical files
- `lib/data/tools.ts` — niche-aware query + quality gate
- `lib/data/best-pages.ts` (or new `lib/data/niche-pages.ts`) — niche config entries
- `app/best/[slug]/page.tsx` — render niche-filtered list (already AEO-upgraded)
- `app/tools/[slug]/page.tsx` — direct-answer block; `app/compare/[slug]/page.tsx` — verdict + category links
- editorial-generation pipeline (per-niche intro/FAQ) + `lib/seo/freshness.ts` / `lib/indexnow.ts`

## Verification
- `tsc`/`eslint` clean + production build gate.
- Niche pages render niche-specific tools (not a generic category dump), a unique intro +
  FAQ, Quick-answer block, ItemList+FAQPage+Breadcrumb schema, canonical, internal links;
  quality gate drops thin niches; spot-check 5 intros differ materially.
- Part 1: tool pages show the direct-answer block; non-editorial compares show a verdict +
  category links.
- GSC follow-up (weeks): impressions/CTR on the niche cluster + "ai tools for [X]" / "best ai
  tools for [X]"; AI-Overview/PAA presence. Rank ambition gated on authority (doc 20).

## Honest expectation
This is the penalty-safe way to scale: real niche value + unique content + a quality gate +
internal-link clustering, aligned to the May-2026 context-to-citation shift. It expands
winnable long-tail surface and AI-citation coverage; absolute rank still compounds with
authority (doc 20). **Quality over raw count** — we publish the niches the catalog serves
well, targeting ~100.
