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

## What Claude can do next (just ask)
- Draft the **data-PR study** from the live catalog (pull the stats, write the post).
- Generate a **directory-submission checklist** with URLs + the exact blurb/assets.
- Draft **HARO response templates** + the founder expert bio.
The actual submissions/outreach are operator actions (accounts, identity, relationships).
