# 21 — Google's May-2026 update + the 50 money pages

> Two linked things: (1) what Google's big 2026 shift means for our SEO, and (2) the
> plan to turn our 50 highest-ROI pages into advanced, citation-ready, converting pages.
> Planned 2026-06-04 (Day 9).

## Part 1 — The Google drift (May 2026) and what it means for us

### What changed
- **Search rebuilt around AI** at Google I/O 2026 (Gemini 3.5 Flash) — described as the
  biggest change to Search in 25+ years; the query box now takes longer, conversational,
  multimodal input (images, docs, tabs).
- **AI Mode ~1B+ MAU; AI Overviews ~2.5B MAU.** User behavior is shifting to longer,
  follow-up-heavy queries.
- **A May-2026 core update** rolled out (~May 21).
- **CTR collapse on AI-feature queries:** position-1 organic CTR fell from ~27% to ~11%
  (SISTRIX, Mar 2026). **Zero-click is now ~58.5% of US searches** (SparkToro/Datos).
- **The consensus reframe:** there is no separate "AI-search strategy" — **AEO/GEO is
  foundational SEO applied to an AI surface.** Keyword-to-click is being replaced by
  **context-to-citation.** (Google's signals on `llms.txt` remain mixed.)

_Sources: Search Engine Journal (SEO Pulse, I/O + core update); Google blog (Search I/O
2026); Lumar / PPC Land / SISTRIX / SparkToro industry coverage, May 2026._

### How it lands on RightAIChoice
**✅ Validated — we were already building for this.** Context-to-citation rewards exactly
what we shipped: Dataset JSON-LD + `llms.txt`, FAQPage / Breadcrumb / SoftwareApplication /
ItemList schema, the AI-crawler allowlist, independent/editorial E-E-A-T, and structured
head-to-head **comparison data** (the single most extractable content type for AI answers).
Our compares ranking page-1 and our cornerstones are prime citation fodder.

**🔧 What to improve (for extraction/citation):**
1. **Above-the-fold direct-answer blocks** on every money page — AI Overviews and featured
   snippets lift a concise, declarative answer verbatim. Today our verdicts sit mid-page
   (tool) or are editorial-only (compare) or absent (best-of).
2. **Machine-readable pricing** — emit multi-tier `Offer`/`PriceSpecification`, not a single
   `price:0`, so "X pricing" answers are extractable (our biggest tool-page query intent).
3. **Richer, rendered FAQs everywhere** — best-of emits only 2 generic FAQs and renders
   none; FAQs are direct PAA/Overview answers.
4. **Entity clarity + internal links** so when an engine summarizes a topic, *we're* the
   cited source.

**📉 Reframe the KPI.** With ~58.5% zero-click and collapsing position-1 CTR, raw sitewide
CTR is the wrong scoreboard. Success = **(a) AI-Overview / snippet citations** (brand +
the click that survives) **and (b) converting the clicks we do get.** So every money page
must be both *citation-shaped* (direct answer + schema) and *conversion-shaped* (clear
pricing, a verdict, an outbound/plan CTA).

**⚠️ `llms.txt`:** keep it (already shipped) but don't over-invest — Google's stance is mixed.

**Net:** the May-2026 shift is a tailwind for our strategy, not a threat — *if* we make our
best pages maximally extractable. That's Part 2.

## Part 2 — The 50 money pages

### Why these 50
They are where commercial intent, ranking potential, and conversion meet. From the live
28d GSC data, the winnable, money-intent pages sit at **pos 4–30** (the site overall is
pos ~47 and authority-gated — see [doc 20](./20-authority-action-plan.md)). We invest in
the pages that can move *and* convert *and* get cited.

### Selection (scoring)
`score = impressions × intent_weight × position_factor`
- **intent_weight** — high: pricing/cost/plans, "best X", "X vs Y"; **low/excluded**:
  navigational competitor-brand we can't win (e.g. "se ranking pricing" → SE Ranking owns
  that SERP; it pads impressions, never converts).
- **position_factor** — pos 4–15 highest, 16–30 high, >35 low.

### The mix (~50)
- **~22 tool pages** at pos 4–30 with pricing/commercial intent — the money queries:
  e.g. `gong` (pos24, 499 impr · "gong pricing"), `amazon-translate` (pos9, 234),
  `brandwatch` (pos8, 204), `clay` (pos22), `xero`, `otter-ai`, `google-earth-studio` (pos4),
  `whoop`, `wiz`, `qualtrics-ai`, `glean`, `salesforce-government-cloud` (pos11),
  `connected-papers` (pos12), `baseten` (pos10), `k-health` (pos10), `suno`, `stripe-radar` (pos7).
- **~20 editorial compares** at pos 2–20 (best clickers + citation gold): `duolingo-vs-loora`
  (pos1), `duolingo-vs-talkpal`, `openhands-vs-devin` (pos2.6), `fliki-vs-pictory`,
  `expensify-vs-wave`, `moises-vs-suno`, `clay-vs-phantombuster`, `dify-vs-langflow-vs-fastgpt`,
  `alphasense-vs-claude`, + the rest of the pos-2–20 cohort.
- **~6 /best commercial pages**: `/best/seo` (pos24, 537 · "best seo ai tool"),
  `/best/meeting-notes` (pos28 · "best ai meeting assistant"), + top commercial best-of.

The final 50 are produced by re-running the scoring query at execution time.

### The approach: template upgrades, not 50 bespoke builds
Tool / compare / best are **templated** (one file, hundreds of pages). Upgrading a template
lifts *every* page of that type; we then prioritize the 50 for recrawl + per-page CTR titles.
This is far more leverage than hand-editing 50 pages, and it's the AI-era-correct move
(extractability is structural). Current template completeness (audited): tool ~70%,
compare ~60%, best-of ~50%.

**A. Direct-answer / TL;DR block (the #1 AEO lever) — all 3 templates**
- Tool: 40–60-word answer under H1 — what it is, who it's for, **how much it costs**
  (from `editorial_verdict`/`tagline` + `pricing_details`).
- Compare: render the verdict for **non-editorial** compares too (today editorial-only).
- Best-of: "The best {X} in 2026 is {top pick} — {why}" lead.

**B. Best-of template (biggest gap):** rendered `FaqSection` + richer per-page FAQs
(replace the 2 generic), TL;DR lead, date metadata, sibling-best-of + category links.

**C. Pricing extractability + schema (tool pages):** a compact "How much does {X} cost?"
answer + pricing table near the top (reuse `pricing_details`/`pricing_plan_guides`); emit
**multi-tier `Offer`/`PriceSpecification`** in the SoftwareApplication JSON-LD.

**D. Intent-matched CTR titles for the 50** (reuse `scripts/approve-tier1-titles.ts` →
title_overrides + freshness + IndexNow): pricing tools → "{Tool} Pricing 2026: Plans, Cost
& Is It Worth It?"; best-of → "Best {X} (2026): Top {N} Ranked"; compares → done (Day-9).

**E. Recrawl the 50:** `bumpFreshness` + batch `submitToIndexNow`.

**F. Internal links:** category links on compares; sibling-best-of + category links on best-of.

### Reused infra (no reinvention)
`bumpFreshness`/`propagateFreshness`/`submitToIndexNow`, `getTitleOverride` +
`scripts/approve-tier1-titles.ts`, `faqPageJsonLd`/`itemListJsonLd` + the SoftwareApplication
builder (`lib/seo/json-ld.ts`), `FaqSection`, `buildToolPageMeta`/`buildComparePageMeta`.

### Execution batches
1. ✅ This doc. 2. Template upgrades A–C + F (lifts all pages); tsc/eslint; deploy.
3. Finalize 50 via scoring query; CTR titles (D) + recrawl (E). 4. Verify; BUILD-LOG.

### Verification & ceiling
tsc/eslint clean + build gate; per-type live checks (direct-answer renders, best-of FAQ
renders, schema validator shows FAQPage + multi-tier Offer / ItemList, titles updated on
the 50). GSC follow-up (weeks): CTR + impressions on the 50, AI-Overview/PAA presence on
"X pricing" / "best X" / "X vs Y". **Ceiling unchanged:** absolute rank for competitive
terms still needs authority (doc 20); the biggest wins land on the pos-4–15 commercial
cohort + AI-Overview citations.
