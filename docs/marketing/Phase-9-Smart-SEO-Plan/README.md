# Phase 9 — Smart SEO Plan

> Author's note: this is the *strategy and execution* doc set for Phase 9.
> It exists because the snapshot taken on 2026-05-26 showed an average GSC
> position of 39–50 across the site — i.e., the site is functionally
> invisible to Google. This plan is engineered to fix that, not gently.

## Mission

Move RightAIChoice from "barely-visible directory at page 4–5" to
"the decision engine for picking the right AI stack — cited by default
by Google + AI assistants" inside 30 days, then compound from there.

> **Positioning shift (Phase 9):** RAC is not just a directory of AI
> tools. It is the **decision engine** that tells founders, builders,
> and teams the *exact* AI stack to deploy. The directory is the
> substrate; the decision engine is the product. Every SEO move in
> this plan reinforces that positioning. See [13-homepage-positioning](./13-homepage-positioning-and-brand-defense.md)
> for how this changes the homepage, brand defense, and the dead
> "Plan My Stack" CTA.

## Where we are (2026-05-26 baseline)

| Bucket            | Pages |   Impr. | Clicks | Avg Pos |
| ----------------- | ----: | ------: | -----: | ------: |
| Pos 1–3           |     3 |      13 |      0 |     3.0 |
| Pos 4–10          |    30 |     983 |      2 |     8.1 |
| Pos 11–20         |    32 |     268 |      4 |    17.6 |
| Pos 21–30         |    36 |     346 |      0 |    25.8 |
| Pos 31–50         |   143 |   1,786 |      1 |    42.5 |
| Pos 51+           |   529 |  11,819 |      1 |    67.9 |
| Zero impressions  | ~1,330|       0 |      0 |       — |

Site total (28d): **15,215 impressions · 8 clicks · CTR 0.05% · avg pos ~40.**
For comparison, a healthy directory at this stage should be ~3–5%
CTR and avg pos <20. We are roughly **100× under-performing** what is
achievable. See [`01-diagnosis-and-baseline.md`](./01-diagnosis-and-baseline.md).

## The strategy in six lines

1. **Reposition + fix the homepage** — switch all surfaces from
   "directory" to "decision engine", rewrite the homepage to rank for
   stack/comparison/decision queries, defend brand search (own rank #1
   for "rightaichoice"), and fix the dead "Plan My Stack" CTA. See
   [13-homepage](./13-homepage-positioning-and-brand-defense.md).
2. **Fix foundation** — `llms.txt`, robots.txt, schema, E-E-A-T
   components — so every other optimization compounds.
3. **Tier 1 (101 pages): CTR rewrite for pos 1–30** — the only pages
   where title/meta changes alone meaningfully move clicks.
4. **Tier 2 (143 pages): content depth + backlinks for pos 31–50** —
   these need *substance*, not titles.
5. **Tier 3 (~1,330 pages): indexation rescue** — most of the site is
   invisible because of poor internal linking + thin pages.
6. **Tier 4 (529 pages): prune or merge** — pos-51+ with no quality
   signals is a sitewide quality drag; aggressive cleanup.

In parallel: stack pillar pages (`/stacks/[slug]`), link magnets, AI
search citations, internal cornerstones, Reddit/YouTube distribution.
See per-doc breakdowns below.

## Today's execution order (priority-strict)

Run these in order. Do not skip ahead — each step boosts ROI of later
steps:

| #  | Step                                                              | Doc                                                                            | Est. effort |
| -: | :---------------------------------------------------------------- | :----------------------------------------------------------------------------- | ----------: |
|  1 | Brand SERP audit: who outranks us for "rightaichoice"?            | [13-homepage](./13-homepage-positioning-and-brand-defense.md)                  |      10 min |
|  2 | Ship `llms.txt` + `llms-full.txt` (with decision-engine positioning) | [02-foundation](./02-today-foundation-fixes.md) + [13](./13-homepage-positioning-and-brand-defense.md) | 20 min |
|  3 | Audit robots.txt — confirm AI crawlers allowed                    | [02-foundation](./02-today-foundation-fixes.md)                                |      10 min |
|  4 | Wire `last-updated` + `reviewed-by-our-team` into 4 templates      | [02-foundation](./02-today-foundation-fixes.md)                                |      45 min |
|  5 | Schema audit + add Organization (full) + Service + missing types  | [02-foundation](./02-today-foundation-fixes.md) + [13](./13-homepage-positioning-and-brand-defense.md) |   90 min |
|  6 | Draft new homepage `<title>` + meta + H1 (commit, ship Day 1)     | [13-homepage](./13-homepage-positioning-and-brand-defense.md)                  |      30 min |
|  7 | Generate Tier-1 candidate list (101 URLs + queries)               | [03-tier-1](./03-tier-1-quick-wins.md)                                         |      30 min |
|  8 | Title/meta rewrite tool + admin review UI                         | [03-tier-1](./03-tier-1-quick-wins.md)                                         |     2 hours |
|  9 | First batch: 10 hand-reviewed rewrites pushed                     | [03-tier-1](./03-tier-1-quick-wins.md)                                         |      45 min |
| 10 | Internal-linking orphan scan + cornerstone selection              | [07-internal-linking](./07-internal-linking-topical-authority.md)              |      45 min |
| 11 | Tier-4 prune list (low-quality pos-51+ → noindex candidates)      | [06-tier-4](./06-tier-4-prune-or-merge.md)                                     |      45 min |
| 12 | Featured-snippet target list (top 50 queries)                     | [09-snippets](./09-snippets-paa-serp-features.md)                              |      30 min |

Total: ~8 hours focused work. Realistic for one day if we move briskly.
Steps 13+ (homepage architecture rewrite, Tier 1 rest, Tier 2, Tier 3,
stack pillar pages) spill into the rest of the week.

## What this plan is NOT

- Not a quick-fix list. Tier 3 indexation rescue is a 30–60 day effort.
- Not "rewrite everything with AI". Titles get AI-assist + human review;
  Tier 2 content needs original substance.
- Not "wait for backlinks to materialize". We *earn* backlinks via
  research, calculators, and tool comparisons — see doc 09.
- Not based on tricks. Every move is durable, white-hat, defensible to
  a Google Quality Rater.

## 30-day KPIs (must-hit)

| KPI                                          | Today | Day 30 target | Stretch |
| -------------------------------------------- | ----: | ------------: | ------: |
| Avg position (28d)                           |    40 |          <25 |     <18 |
| Total weekly clicks                          |    11 |           150 |     400 |
| Pages with ≥1 impression                     |   773 |        1,500 |   1,800 |
| Pages in top-10                              |    33 |            80 |     150 |
| Pages in top-3                               |     3 |            15 |      40 |
| Indexed pages (per GSC coverage)             |     ? |    ≥90% of pub |       — |
| AI Overview citations (manual log)           |     ? |             10 |      30 |
| Referring domains                            |     ? |           +20 |     +40 |
| **Brand SERP rank #1 for "rightaichoice"**   |  no (#2) | yes        | yes     |
| **Homepage CTA conversion rate**             |   0%  |           5% |     10% |
| **Homepage ranks in top 50 for a stack query** | no  | yes (≥1)    | yes (≥3)|

Full KPI definitions + alert thresholds in [11-kpis](./11-kpis-and-feedback-loops.md).

## Folder map

| File                                                          | What it covers                                              |
| :------------------------------------------------------------ | :---------------------------------------------------------- |
| [`README.md`](./README.md)                                    | This file — the master index                                |
| [`BUILD-LOG.md`](./BUILD-LOG.md)                              | Chronological record of what's shipped vs the plan          |
| [`01-diagnosis-and-baseline.md`](./01-diagnosis-and-baseline.md) | Why current rankings suck + root causes                   |
| [`02-today-foundation-fixes.md`](./02-today-foundation-fixes.md) | llms.txt, robots, E-E-A-T components, schema audit       |
| [`03-tier-1-quick-wins.md`](./03-tier-1-quick-wins.md)        | 101 pages, CTR-optimized title/meta rewrites                |
| [`04-tier-2-content-depth.md`](./04-tier-2-content-depth.md)  | 143 pages, content expansion + targeted backlinks           |
| [`05-tier-3-indexation-rescue.md`](./05-tier-3-indexation-rescue.md) | 1,330 zero-impression pages, get them indexed         |
| [`06-tier-4-prune-or-merge.md`](./06-tier-4-prune-or-merge.md) | 529 pos-51+ pages, decide kill/merge/improve               |
| [`07-internal-linking-topical-authority.md`](./07-internal-linking-topical-authority.md) | Hub-and-spoke + cornerstones + orphans      |
| [`08-ai-search-aeo-geo.md`](./08-ai-search-aeo-geo.md)        | AI Overview optimization, llms.txt deep, Perplexity        |
| [`09-snippets-paa-serp-features.md`](./09-snippets-paa-serp-features.md) | Featured snippets, People Also Ask, sitelinks     |
| [`10-link-magnets-and-distribution.md`](./10-link-magnets-and-distribution.md) | Original research, calculators, Reddit, YouTube    |
| [`11-kpis-and-feedback-loops.md`](./11-kpis-and-feedback-loops.md) | Weekly review ritual + dashboards                       |
| [`12-execution-timeline.md`](./12-execution-timeline.md)      | Today / week / month / 90-day Gantt                         |
| [`13-homepage-positioning-and-brand-defense.md`](./13-homepage-positioning-and-brand-defense.md) | Positioning shift, homepage rewrite, brand SERP defense, CTA fix, stack pillar pages |

## How to read this folder

- **If you have 5 minutes**: read this README + skim [12-execution-timeline](./12-execution-timeline.md).
- **If you're starting today's work**: read [02-foundation](./02-today-foundation-fixes.md) end-to-end, then go in order.
- **If you want the "why"**: read [01-diagnosis](./01-diagnosis-and-baseline.md).
- **If you're tracking progress**: see [11-kpis](./11-kpis-and-feedback-loops.md).
