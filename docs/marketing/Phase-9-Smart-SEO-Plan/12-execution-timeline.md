# 12 — Execution Timeline

> **Goal:** A concrete, day-by-day-then-week-by-week sequence so we can
> show up tomorrow and know exactly what to do. No "let me think about
> what's next" moments.

## Today (Day 0 — 2026-05-27) — ~7 hours focused work

The full priority order from the README, expanded:

### Block 1 — Foundation (~2.5 hours)

| Time   | Task                                                                              | Owner    | Doc ref                                                            |
| :----- | :-------------------------------------------------------------------------------- | :------- | :----------------------------------------------------------------- |
| +0:00  | Brand SERP audit — who outranks us for "rightaichoice"? Save findings.             | Operator | [13](./13-homepage-positioning-and-brand-defense.md)               |
| +0:10  | Write `public/llms.txt` with decision-engine positioning blurb                    | Claude   | [02](./02-today-foundation-fixes.md) + [13](./13-homepage-positioning-and-brand-defense.md) |
| +0:25  | Build `scripts/build-llms-full.ts`; generate `public/llms-full.txt`               | Claude   | [02](./02-today-foundation-fixes.md)                               |
| +0:40  | Update `app/robots.ts` with AI crawler allowlist                                  | Claude   | [02](./02-today-foundation-fixes.md)                               |
| +0:50  | Wire `<LastUpdated>` + `<ReviewedByOurTeam>` into tool/compare/blog/alternative templates | Claude | [02](./02-today-foundation-fixes.md)                       |
| +1:40  | Schema: expand `Organization` (description, slogan, knowsAbout, sameAs, potentialAction) + add `Service` schema on homepage | Claude | [13 Part 1+5](./13-homepage-positioning-and-brand-defense.md) |
| +2:10  | Schema: add `SoftwareApplication`, `FAQPage` baseline, `Review`/`AggregateRating` | Claude   | [02](./02-today-foundation-fixes.md)                               |
| +2:30  | `npm run build` to confirm nothing broke; local verify URLs                       | Operator | —                                                                  |

### Block 2 — Tier 1 setup (~2.5 hours)

| Time   | Task                                                                              | Doc ref                                                            |
| :----- | :-------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| +2:00  | `scripts/build-tier1-candidates.ts` — pull 101 pages from gsc_snapshots, join with titles | [03](./03-tier-1-quick-wins.md)                             |
| +2:30  | `scripts/rewrite-titles-tier1.ts` — DeepSeek-assisted rewrite                     | [03](./03-tier-1-quick-wins.md)                                    |
| +3:30  | `/admin/tier1-review` page — list candidates + approve/reject/edit                | [03](./03-tier-1-quick-wins.md)                                    |
| +4:30  | Hand-review first 10 rewrites; push to production                                 | [03](./03-tier-1-quick-wins.md)                                    |

### Block 3 — Compounding work (~1.5 hours)

| Time   | Task                                                                              | Doc ref                                                            |
| :----- | :-------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| +4:30  | `scripts/build-link-graph.ts` — crawl rendered HTML, identify orphans             | [07](./07-internal-linking-topical-authority.md)                   |
| +5:00  | Pick 5–7 cornerstone categories; stub `/categories/[slug]/page.tsx` if missing    | [07](./07-internal-linking-topical-authority.md)                   |
| +5:30  | Tier-4 audit script — run + review noindex candidates                             | [06](./06-tier-4-prune-or-merge.md)                                |
| +6:00  | Featured-snippet target list — pull pos 2–10 question queries                     | [09](./09-snippets-paa-serp-features.md)                           |

### Block 4 — Wrap (~30 min)

| Time   | Task                                                              |
| :----- | :---------------------------------------------------------------- |
| +6:30  | Commit + push everything in 3–5 well-scoped commits               |
| +6:45  | Update weekly log; queue Day 1 priorities                         |
| +7:00  | Done                                                              |

**End of Day 0 deliverables:**

- llms.txt + llms-full.txt live
- Robots.txt with AI crawler allowlist
- E-E-A-T components wired into 4 templates
- Schema baseline expanded
- 10 Tier-1 title rewrites in production
- Tier-1 candidate list (91 remaining)
- Internal link graph computed
- Cornerstone candidates picked
- Tier-4 audit complete
- Snippet target list

## Day 1–6 (rest of this week)

### Day 1

- **Ship new homepage title + meta + H1** with decision-engine positioning (doc 13 Part 2)
- **Ship footer "About RightAIChoice" block with brand-anchor link** to homepage (doc 13 Part 6)
- Push next 20 Tier-1 title rewrites
- Build first cornerstone page (highest-impression cluster — AI Coding Tools given current GSC data) — **shipped 2026-05-28** as `/categories/code-development` via the new `lib/cornerstones/` registry pattern (1,500+ words, 6 picks, 6 top compares, FAQ, Article + FAQPage JSON-LD).
- **Second cornerstone shipped 2026-05-28** — `/categories/image-generation` (actual DB slug; doc 07 originally listed `image-design`). Picks: Midjourney, DALL-E 3, Flux, Ideogram, Recraft, Stable Diffusion. Next cornerstone candidates: `/categories/writing-content`, `/categories/education-learning`, `/categories/research-search`.

### Day 2

- Push next 20 Tier-1 title rewrites (cumulative 50)
- Ship `<RelatedContent>` widget; deploy across tools template
- **Build first stack pillar page** (`/stacks/ai-stack-for-early-stage-saas`) per doc 13 — **shipped 2026-05-28**. Uses new optional `pillar` field on `StackConfig`; renders editorial above the existing stages template, emits Article + FAQPage JSON-LD. Stages: Cursor → Claude API → Intercom Fin → Apollo → Claude → PostHog → Canva → Notion AI.
- **Second pillar shipped 2026-05-28** — `/stacks/ai-stack-for-content-creators`. Stages: Perplexity → Claude → Canva → Opus Clip → Descript → ElevenLabs → Publer → Beehiiv. Free path ~$40/mo, paid path $150–250/mo for a solo creator. Next pillars queued: `/stacks/ai-stack-for-solo-developers`, `/stacks/ai-stack-for-marketing-teams`, `/stacks/ai-stack-for-product-teams`.

### Day 3

- Push remaining Tier-1 rewrites (cumulative 100, excluding homepage)
- **Rewrite "Plan My Stack" CTA → "Find My AI Stack"** with friction-free first step + social proof (doc 13 Part 4)
- Run orphan-link injection script
- Tier-4 push: first 100 noindex decisions

### Day 4

- FAQ blocks added to top 20 Tier-1 pages (paired with PAA capture)
- Build second cornerstone page
- **Build second stack pillar page** (`/stacks/ai-stack-for-content-creators`)

### Day 5

- Backlink log + HARO subscription set up
- First HARO pitches sent
- **AI Tool Finder Quiz / "Find My Stack" — design + first-pass implementation**
  (per doc 13, this is the flagship decision-engine surface, NOT a peripheral widget)
- **Press kit page (`/press`) live** with brand assets + boilerplate (doc 13 Part 3)

### Day 6

- Pull fresh GSC snapshot (Day +7 measurement of Tier-1 changes)
- Compare against baseline; revert any losers

### Day 7

- Weekly review ritual (per [11-kpis](./11-kpis-and-feedback-loops.md))
- Plan Week 2

> **Reality reconciliation (2026-06-03).** Days 5–7 executed differently from the
> plan above. *Shipped instead:* `/seo-impact` (4-week lift loop), the
> crawlable-pagination fix + 553-URL IndexNow blast (the real cause of the 34%
> compare gap), `/admin/health` cron dashboard + doc-15, cornerstones 3–5,
> pillars 3–5 (catalog gap resolved), and Dataset JSON-LD. *Still not done from the
> Day-5 plan:* HARO/backlink log, Press kit (`/press`), and the AI Tool Finder Quiz
> — deferred (the Quiz is a build, not an SEO move). See BUILD-LOG + checkpoint §5.

## Week 2 (Days 8–14)

- Tier-2 batch 1 (first 25 pages structurally upgraded) — *premise mostly killed:
  buried pages are already content-complete; lever is internal links (shipped)*
- ✅ Cornerstones 3–5 shipped (writing-content, research-education, marketing-seo)
- ✅ **Stack pillar pages 3–5 shipped** (marketing-teams, solo-developers, product-teams)
- **Tool Finder Quiz embedded above the fold on homepage** + new homepage architecture (all 10 sections per doc 13)
- **Brand-anchor link injection across 20+ high-traffic pages** (doc 13 Part 6)
- AI Tool Finder Quiz launched on PH/HN as embeddable
- Reddit cadence active
- First quarterly report drafted (data + outline)
- **Day-7 brand SERP re-check** — did position move on "rightaichoice"?

## Week 3 (Days 15–21)

- Tier-2 batch 2 (cumulative 50)
- All 5–7 cornerstones live
- First pillar page started (`/best-ai-coding-tools`)
- First citation tracking report

## Week 4 (Days 22–28)

- Tier-2 batch 3 (cumulative 75)
- First pillar page live
- Newsletter MVP launched
- Day 28 KPI checkpoint vs targets

## Month 2 (Days 29–60)

- Tier-2 batches 4–8 (complete the 143)
- Pillar pages 2–3 shipped
- Tool Cost Calculator launched
- First quarterly report launched + promoted
- Reddit + HARO cadence stable
- Tier-3 indexation rescue: bucket A internal link injection complete
- Tier-3 bucket B improvements running

## Month 3 (Days 61–90)

- Tier-3 indexation rescue measurement
- Pillar pages 4–5 shipped
- Second quarterly report
- Newsletter at 500+ subs
- AI citation log shows 30+ confirmed citations
- Day 90 KPI checkpoint — what worked, what didn't, Phase 10 planning

## Beyond Phase 9 (Month 4+)

Phase 9 ends. Phase 10 ideas (not committed):

- Programmatic landing pages by use case ("AI tools for X")
- International expansion (hreflang setup, translated cornerstones)
- Original benchmark suite (run our own evals on tools)
- API for embeds (partners pull our comparison data)
- YouTube channel
- Conference / event presence

## Gantt-style overview

```
Day 0  ████████████████ Foundation + Tier 1 setup + 10 rewrites
Day 1  ███ Tier-1 + cornerstone
Day 2  ███ Tier-1 + related-content widget
Day 3  ███ Tier-1 + Tier-4 prune
Day 4  ███ FAQ + cornerstone
Day 5  ███ Backlinks setup + widget design
Day 6  ██ Measurement
Day 7  █ Review

Wk 2  ████ Tier-2 batch + cornerstones + widget launch + research
Wk 3  ████ Tier-2 batch + pillar + citation tracking
Wk 4  ████ Tier-2 batch + pillar live + newsletter + Day-28 check

Mo 2  ████████ Tier-2 finish + pillars 2–3 + calculator + report launch + indexation rescue
Mo 3  ████████ Pillars 4–5 + Q2 report + citation log review + Day-90 check
```

## Hard rules

- **No skipping foundation.** Every later step assumes 02 is shipped.
- **No mass-pushing Tier 1 rewrites.** Batch of 10/day max for the
  first 50, then 20/day. Gives Google attribution time + lets us
  revert losers.
- **No new initiatives mid-week.** If we see a shiny new SEO idea,
  add it to Phase 10 backlog. Don't context-switch in flight.
- **Weekly review is non-negotiable.** Monday morning, scorecard +
  log entry. If a week is missed, we lose the feedback loop.

## Definition of done (Phase 9)

Phase 9 closes at Day 90 (~2026-08-25) with:

- All KPIs from [11-kpis](./11-kpis-and-feedback-loops.md) measured
- 30-day targets hit or escalated
- Tier 1 + Tier 2 fully shipped
- Tier 3 indexation rate ≥80%
- Tier 4 prune complete
- 5–7 cornerstones live
- 2+ pillar pages live
- 2 quarterly reports published
- 2+ interactive widgets live
- ≥50 referring domains earned (sum)
- AI citation log populated
- Weekly ritual sustained for 12 weeks
- Phase 10 plan drafted from learnings
