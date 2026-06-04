# 20 — Authority & backlink action plan (the ceiling-breaker)

> The whole Phase-9 page-SEO work is **necessary but not sufficient**: the site
> ranks pos ~40–47 and Bing reports `InLinks: 0`. **Authority (referring domains)
> is the binding constraint.** This is the prioritized, operator-executable plan to
> earn it. Mostly human work — code can only build *enablers* (done: `/press`,
> `/embed` widgets, the Dataset). Track wins in `/admin/authority`.

## Why this, why now
On-page + schema + internal links (docs 13–19) raise the *ceiling's* efficiency, but
absolute rank for competitive terms is gated by external links. Until referring
domains climb, expect impressions to keep growing (indexation flywheel) while clicks
stay low (deep positions). This plan moves the position needle.

## Enablers shipped (code)
- **`/press`** (2026-06-04) — boilerplate, fast facts, founder bio, downloadable
  logos. A stable, citable URL journalists/bloggers link when they mention us.
- **Dataset JSON-LD** + `llms-full.txt` — the catalog as a citable data source.
- **`/embed/*`** comparison widgets — embeddable on vendor blogs/newsletters (each
  embed carries a backlink).

## Prioritized tactics (ROI × ease)

### Tier A — fast, high-certainty links (do first, ~1–2 weeks)
1. **AI-tool directory submissions.** Submit RightAIChoice to the big aggregators:
   Product Hunt (launch), There's An AI For That, Futurepedia, Toolify, Future Tools,
   AlternativeTo, SaaSHub, G2/Capterra (as a vendor), AI tool subreddits' wikis.
   Each is a real referring domain + referral traffic. *Owner: operator. ~1 hr each.*
2. **Awesome-list PRs (follow up + expand).** Day-4 opened 2 (mahseema/awesome-ai-tools
   #1412, steven2358/awesome-generative-ai #812) — check merge status, nudge politely
   if stale, and open 3–5 more (search GitHub "awesome ai tools/directory/llm").
3. **Foundational citations.** Crunchbase, LinkedIn company page, Wikidata (Q139970688
   ✓ done) — ensure all cross-link to the site.

### Tier B — editorial links (ongoing, higher DR)
4. **HARO / Connectively / Qwoted / Featured.** Founder answers journalist queries
   about AI tools as an expert source → high-authority editorial links. *Cadence: 15
   min/day. The `/press` page is the credibility anchor to cite.*
5. **Data-PR (our unique asset).** Publish 1 original study from the dataset — e.g.
   "We analyzed {N} AI tools' pricing: X% now have a free tier", "the fastest-growing
   AI categories of 2026". Pitch to AI newsletters (Ben's Bites, TLDR AI, etc.) and
   journalists. Original data is the single best link magnet. *Owner: operator +
   Claude can draft from the catalog data.*

### Tier C — compounding / community (steady)
6. **Reddit/community presence** (doc 08 cadence) — genuinely helpful answers in
   r/SaaS, r/ChatGPT, r/artificial, linking a compare/guide only when it answers the
   question. Cited indirectly by ChatGPT/Perplexity too.
7. **Embed distribution.** Offer the `/embed` comparison widgets to tools we review
   ("featured on RightAIChoice" badge) — reciprocal, durable links.

## Targets & measurement
- **Referring domains:** 0 → **+20 in 30 days** (doc-11 KPI). Log every win in
  `/admin/authority` (`addReferringDomain`).
- **Bing `InLinks`** should leave 0; **Google avg position** should start falling as
  links land (4–8 week lag).
- Re-check the winnable cohort (`/compare/*` at pos 2–15): links + the new CTR
  descriptions should convert impressions → clicks (the CTR >0.5% target lives here).

## Appendix A — Tier-A directory submission checklist (operator, ~half a day)

Work top-down; each is a real referring domain + referral traffic. Use the
paste-ready copy + assets below. Log each live link in `/admin/authority`.

| # | Directory | Submit at | Notes |
| -: | :-- | :-- | :-- |
| 1 | **Product Hunt** | producthunt.com → "Submit" | Schedule a launch (Tue–Thu). Biggest single referral + DR hit. Use the wordmark + a short demo GIF of `/plan`. |
| 2 | **There's An AI For That** | theresanaiforthat.com/submit | Largest AI-tool index; high referral. |
| 3 | **Futurepedia** | futurepedia.io/submit-tool | Free + paid tiers; free is fine to start. |
| 4 | **Future Tools** | futuretools.io (Submit a Tool) | Curated; Matt Wolfe audience. |
| 5 | **Toolify** | toolify.ai/submit | High-traffic AI aggregator. |
| 6 | **AlternativeTo** | alternativeto.net → "Add software" | Add RightAIChoice + list it as an alternative to other AI directories. |
| 7 | **SaaSHub** | saashub.com/submit | DR + a do-follow profile. |
| 8 | **G2 / Capterra** | g2.com (claim/add product) | Slow but high-authority B2B citation. |
| 9 | **Crunchbase** | crunchbase.com (add company) | Foundational entity citation; cross-links Wikidata. |
| 10 | **AI Scout / Insidr / aitoolsdirectory** | their submit forms | Long-tail AI directories; batch them. |

**Category to pick everywhere:** "AI Tools / AI Directory / Productivity."
**Assets:** logos at `/press` (svg + png). **Demo:** a 10–15s screen-grab of `/plan`
turning a goal into a stack.

### Paste-ready copy
- **Name:** RightAIChoice
- **One-liner (≤60 chars):** The decision engine for picking the right AI stack
- **Short (≤160 chars):** Describe your goal and get the exact AI tools to use — a complete stack with costs, alternatives, and real user sentiment across 2,000+ tools.
- **Tags:** ai tools, ai directory, ai stack, tool comparison, productivity
- **URL:** https://rightaichoice.com · **Press kit:** https://rightaichoice.com/press

### Pitch hook (for Tier B / newsletters)
Lead with the data-PR study — **/blog/state-of-ai-tools-2026** ("39% of AI tools won't
tell you the price"). It's the linkable asset; pitch the stat, link the study.

## What Claude can do next (just ask)
- ✅ **Data-PR study** — shipped: `/blog/state-of-ai-tools-2026` (real catalog stats).
- ✅ **Directory checklist** — Appendix A above.
- Draft **HARO/Connectively response templates** + the founder expert bio.
- Draft the **Product Hunt launch copy** (tagline, description, first comment).
The actual submissions/outreach are operator actions (accounts, identity, relationships).
