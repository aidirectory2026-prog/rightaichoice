# Indexed Pages Strategy — Google + LLM Ranking

## Why This Document Exists

Traffic from search is compound — every page you add increases the authority of every other page. But not all pages are equal. This document answers: **how many pages, of what type, in what order** to rank on Google and appear in LLM outputs (Perplexity, ChatGPT, Gemini).

The answer is not "more pages." It's the *right* pages, structured correctly, covering the *right* topics. Here's exactly what that means for RightAIChoice.

---

## How Google vs LLMs Decide Who Ranks

### Google Search — Topical Authority Model

Google has shifted from keyword matching to **topical authority**: how completely does a site cover every subtopic within its niche?

**Verified benchmarks (2025 research):**
- **7–9 tightly interlinked cluster pages** around one topic is the threshold before Google AI Mode/Overviews will cite you. Below this, even perfectly structured pages with flawless schema earn zero AI Mode citations.
- **25–50 deep pages per category** builds meaningful topical authority in that category
- Sites implementing topic clusters see an average **43% increase in organic traffic** (HubSpot)
- Websites publishing **25+ authoritative articles in one cluster** see 40–70% keyword ranking increases within 3–6 months

**Google quality floor — minimum word counts (Helpful Content Update, March 2024):**
- Under 300 words: Near-certain deindexation risk
- 300–500 words: Borderline — only for hyper-specific, narrow queries
- 500–1,000 words: Minimum for tool/product pages
- 1,500–2,500 words: Sweet spot for comparison and guide content
- 3,000+ words: Required for pillar pages on high-volume terms

**Crawl budget:** Not a concern until 50,000+ pages. Google will crawl everything in the sitemap.

### LLMs (Perplexity, ChatGPT, Gemini) — Citation Model

**The counterintuitive finding (SEMrush, 230,000+ prompts, July 2025):** 90% of ChatGPT citations come from pages ranked position 21 or lower in Google. Traditional SEO signals "barely move the needle" for LLM citations.

**What actually drives LLM citations:**

| Signal | Impact | Verified By |
|--------|--------|-------------|
| **Brand search volume** | Strongest single predictor (correlation 0.334) | SEMrush 3-month AI citation study |
| **Content structure** (H2→H3→bullets) | +40% citation rate | Digital Bloom 2025 |
| **Direct answer in first 100 words** | +67% more citations | ALM Corp 1.2M citation analysis |
| **Schema markup (complete JSON-LD)** | +30% citation rate | Microsoft Bing, March 2025 |
| **Content freshness** (updated <30 days) | 3.2x more Perplexity citations | Q3 2025 citation study |
| **Statistics and data points on page** | +22% AI visibility | — |
| **Named-source quotations** | +37% AI visibility | — |
| Raw page count | Low | — |

**44.2% of all LLM citations come from the first 30% of page content.** Every page must answer the primary query in the opening paragraph — no preamble.

**Platform architecture — matters for strategy:**
- **Perplexity:** Own crawler (PerplexityBot, 200B+ URL index) + still uses Bing API. Cites **21.87 sources per answer**. Heavily favors Reddit, fresh content, statistics, quantitative claims.
- **ChatGPT:** Primarily Bing. Dominated by brand signal — Wikipedia, high-DA publishers, high organic search volume domains.
- **Gemini:** Uses Google index.
- **Only 11% of domains are cited by both ChatGPT and Perplexity** — they are different audiences requiring slightly different optimization.

**Key action:** Submit sitemap to Bing Webmaster Tools + use IndexNow API to notify Bing of every new page instantly. Confirmed to improve Perplexity and ChatGPT citations independently of Google ranking.

---

## Current State Audit

| Page Type | Current Count | In Sitemap | SEO Indexed | Gap |
|-----------|--------------|------------|-------------|-----|
| Tool detail pages | ~500 | ✅ | ✅ | Grow to 1,000+ |
| Best-of pages | 14 | ✅ | ✅ | Grow to 50+ |
| Stack pages | 15 | ✅ | ✅ | Grow to 40+ |
| Comparison pages | **0** | ❌ | ❌ | **Critical — fix first** |
| Category pages | ~20-30 | ✅ | ✅ | Adequate for now |
| Q&A pages | ~50 (estimated) | ✅ | ✅ | Seed to 200+ |
| Blog posts | **0** | ❌ | ❌ | Build immediately |
| Viability pages | **0** | ❌ | ❌ | New opportunity |
| Role-based pages | 0 | ❌ | ❌ | Phase 2 |

**Total current estimate: ~600 indexed pages.**

### The Single Biggest Miss: Comparison Pages

Every comparison on RightAIChoice uses the URL `/compare?tools=chatgpt,claude` — a **query parameter**. Google does not index query-parameter URLs as individual pages. The comparison feature, which is one of the most powerful features on the platform, generates **zero SEO value**.

"ChatGPT vs Claude" gets 500,000+ monthly searches. "Midjourney vs DALL-E" gets 200,000+. These are some of the highest-intent queries in the AI space — users are actively choosing between tools. We have a comparison engine and rank for none of them.

**Fix: Add `/compare/[slug]/page.tsx`** route with URLs like `/compare/chatgpt-vs-claude`. This alone adds 200 indexed pages with high-intent traffic.

---

## Competitor Benchmarks (Verified Data, April 2026)

| Site | Total Indexable Pages | Domain Rating | Monthly Visits | Notes |
|------|----------------------|--------------|----------------|-------|
| **TAAFT** (theresanaiforthat.com) | **150,000–200,000+** | **DR 75** | **7.79M** | 47K tools + 34K mini-tools + 11K task pages + 7K paper pages + 39K repo pages |
| **Futurepedia** | ~5,500 | **AS 40** (SEMrush) | ~485K | Pivoted to newsletter-first; 57% direct traffic |
| **AlternativeTo** | 12,000+ | High | High | Strong comparison coverage |
| **G2 (AI category)** | 50,000+ | DR 90+ | Massive | 1.1% ChatGPT citation rate — one of highest any site |
| **RightAIChoice now** | **~600** | Unknown (new) | Low | Comparisons not indexed — biggest gap |
| **Target: 30 days** | ~1,000 | — | — | Fix comparisons + best-of expansion |
| **Target: 90 days** | ~2,500 | — | — | Blog + Q&A + stacks added |
| **Target: 180 days** | ~5,000 | — | — | Matching Futurepedia tier |
| **Target: 12 months** | ~20,000+ | — | — | TAAFT-competitive |
| **Target: 180 days** | 1,000+ | 100 | 600 | 80 | **~5,000** |

---

## The Magic Numbers — By Goal (Verified Research)

### First LLM citations in Perplexity / ChatGPT
**What's needed:** 7–9 high-quality cluster pages on one specific topic + AEO structure + schema
**Pages needed: as few as 50–100 perfectly structured pages**
**Case study:** MY IT HUB went from 19 AI brand mentions to 250 in 10 weeks (13x) with AEO restructuring — no page count increase.
**Timeline: 30–60 days if structured data and answer-first format are implemented now.**

### Appear for long-tail queries (e.g., "best AI tool for podcast transcription")
**Pages needed: 300–500 with 500+ words each**
**Current position:** ~600 pages exist. Problem is content depth (tool descriptions likely under 300 words) and zero comparison pages indexed.
**Timeline: Already eligible structurally — fix content quality and comparison indexing.**

### Page 1 for mid-competition queries ("best AI tools for marketing")
**Pages needed: 1,000+ total + DR 40+ + 100+ backlinks**
**Competitor benchmark:** Futurepedia has DR 40 (SEMrush AS 40) and ~485K monthly visits at ~5,500 pages.
**Timeline: 90–180 days with active backlink building.**

### Consistent Perplexity + ChatGPT citations for AI tool queries
**What's needed:** Brand search volume growth + Bing indexing + 200–500 AEO pages + citations from 20+ external sources
**Timeline: 60–90 days. Achievable before matching Google rankings.**

### Page 1 for high-competition queries ("best AI writing tools")
**Pages needed: 5,000+ + DR 60+ + 500+ referring domains**
**Competitor benchmark:** TAAFT dominates this with DR 75, 150,000–200,000+ pages, 7.79M monthly visits.
**Timeline: 12–18 months. Not a short-term goal.**

### Category dominance — matching TAAFT tier
**Pages needed: 50,000–200,000+ + DR 70+ + 1,000+ referring domains**
**TAAFT's current scale:** 47K tools + 34K mini-tools + 11K task pages + 7K paper pages + 39K repo pages = ~150,000+ indexable entities. DR 75. 7.79M monthly visits. 5,200+ referring domains.
**Timeline: 3–5 years. The compound endpoint of programmatic SEO at scale.**

---

## Priority Page Types — Ranked by ROI

### Tier 1: Fix + Build NOW (Weeks 1-4)

#### 1. Comparison Slug Routes — CRITICAL FIX
**Impact: Immediate. Highest urgency.**

- Fix: Create `/compare/[slug]/page.tsx` with DB-backed slugs
- URL format: `/compare/chatgpt-vs-claude`, `/compare/midjourney-vs-dall-e-3`
- Add all comparison routes to sitemap
- Content per page: side-by-side table, winner verdict, FAQ section (3-5 questions), internal links to each tool page
- Target: 200 high-traffic pairs in first 30 days, 500+ by 90 days
- JSON-LD: `FAQPage` schema with "Which is better, X or Y?" as the primary question
- Each page captures: "[Tool A] vs [Tool B]", "X alternative to Y", "X or Y for [use case]"

**Selection criteria for 200 initial pairs:**
Focus on tools in these high-volume categories:
- Writing: ChatGPT vs Claude, Jasper vs Copy.ai, Writesonic vs Rytr
- Coding: Cursor vs Copilot, Cursor vs Codeium, Copilot vs Tabnine
- Image: Midjourney vs DALL-E, Midjourney vs Stable Diffusion, Adobe Firefly vs Midjourney
- Video: Runway vs Pika, HeyGen vs Synthesia, Descript vs Riverside
- SEO: Surfer vs Clearscope, Frase vs Surfer, Semrush vs Ahrefs AI features

#### 2. Best-of Pages: 14 → 50
**Impact: High. Easy to add — entries in `lib/data/best-pages.ts`.**

Priority additions by search volume:

| New Slug | Target Query | Est. Monthly Searches |
|----------|-------------|----------------------|
| `email-marketing` | best AI tools for email marketing | 8,000+ |
| `sales` | best AI tools for sales | 6,000+ |
| `hr-recruiting` | best AI tools for HR | 4,000+ |
| `legal` | best AI tools for lawyers | 3,500+ |
| `real-estate` | best AI tools for real estate | 3,000+ |
| `ecommerce` | best AI tools for ecommerce | 5,000+ |
| `presentations` | best AI presentation tools | 4,000+ |
| `transcription` | best AI transcription tools | 6,000+ |
| `podcasting` | best AI tools for podcasts | 2,500+ |
| `translation` | best AI translation tools | 4,500+ |
| `photo-editing` | best AI photo editing tools | 5,000+ |
| `music` | best AI music generators | 3,000+ |
| `meeting-notes` | best AI meeting note takers | 4,000+ |
| `resume` | best AI resume builders | 7,000+ |
| `accounting` | best AI tools for accounting | 2,000+ |
| `education` | best AI tools for teachers | 3,500+ |
| `students` | best AI tools for students | 8,000+ |
| `healthcare` | best AI tools for healthcare | 2,000+ |
| `architecture` | best AI tools for architects | 1,500+ |
| `game-dev` | best AI tools for game developers | 2,000+ |
| `cybersecurity` | best AI cybersecurity tools | 2,500+ |
| `project-management` | best AI project management tools | 3,000+ |
| `customer-support` | already have — add depth | — |
| `social-media-scheduling` | best AI social media tools (specific) | 4,000+ |
| `voiceover` | best AI voiceover tools | 3,500+ |

#### 3. Viability Score Pages (tied to Idea from strategic review)
**Impact: High novelty, high shareability, new search intent category.**

- Enhance all 500 tool pages: add viability score badge (no new URLs, but improves rankings)
- 3 new dedicated pages:
  - `/viability` — methodology, how scores are calculated, leaderboard
  - `/viability/at-risk` — tools scoring below 40 (viral, linkable, PR-worthy)
  - `/viability/safe-bets` — tools scoring 85+ (positive use case)
- Category-level: each `/best/[slug]` page shows avg viability for that category
- New search queries captured per tool page: "is [tool] still active?", "[tool] shutting down?", "[tool] alternatives"
- This effectively doubles the search intent each tool page ranks for

### Tier 2: Build in 30-60 Days

#### 4. Stack Pages: 15 → 40
**Add 25 new stacks to `lib/data/stacks.ts`.**

Priority additions:

| New Slug | Target User |
|----------|-------------|
| `b2b-sales-team` | Sales reps and SDRs |
| `content-agency` | Agency operators |
| `legal-practice` | Lawyers and paralegals |
| `real-estate-agent` | Realtors |
| `healthcare-practice` | Medical professionals |
| `e-learning-creator` | Course creators |
| `game-studio` | Indie game developers |
| `consulting-firm` | Independent consultants |
| `non-profit` | Non-profit marketers |
| `solopreneur` | Solo business owners |
| `copywriting-business` | Freelance copywriters |
| `seo-agency` | SEO professionals |
| `video-production` | Video editors and creators |
| `music-production` | Music producers |
| `design-studio` | Graphic designers |
| `hr-team` | HR and recruiting teams |
| `customer-success` | CS teams |
| `data-team` | Data analysts |
| `developer-portfolio` | Individual developers |
| `academic-researcher` | PhD students, researchers |
| `journalist` | Writers and journalists |
| `influencer` | Social media creators |
| `restaurant-business` | Food/restaurant owners |
| `financial-advisor` | Finance professionals |
| `startup-cto` | Technical co-founders |

#### 5. Blog / Content Hub: 0 → 30 posts
**Each post = 1 new indexed URL + lifts 5-10 existing pages via internal links.**

Content pillars (8 posts/month):
- `How to [Goal] with AI` — practical, targets long-tail queries, links to 10+ tool pages
- `State of AI [Category] [Year]` — thought leadership, uses platform data, shareable
- `[Tool] Deep Dive Review` — captures "[tool] review 2026" searches, 2,000+ words
- Weekly Roundup — repurposed as newsletter, community, social

Post-to-page ratio: 1 post → supports 5-10 tool pages, 2-3 best-of pages, 1-2 comparison pages via internal linking. Blog is the internal linking backbone.

#### 6. Q&A Seeding: Seed 200 structured questions
**Already have `/questions/[id]` routes and sitemap inclusion.**

Source questions from:
- Reddit r/artificial, r/ChatGPT PAA sections
- Google's "People Also Ask" for every tool page
- Competitor FAQ sections

Each question needs:
- Direct, concise answer in first 150 words
- `FAQPage` and `QAPage` JSON-LD schema
- Link to 2-3 relevant tool pages or best-of pages

These are Perplexity / Google AI Overview magnets. Q&A structured content is cited more frequently than any other format.

### Tier 3: Build in 60-90 Days

#### 7. Role-based Landing Pages: 20+ pages
New URL structure: `/for/[role]`

| Slug | Target query |
|------|-------------|
| `/for/content-creators` | best AI tools for content creators |
| `/for/developers` | best AI tools for developers |
| `/for/marketers` | best AI tools for marketers |
| `/for/freelancers` | best AI tools for freelancers |
| `/for/students` | best AI tools for students |
| `/for/agencies` | best AI tools for agencies |
| `/for/solopreneurs` | best AI tools for solopreneurs |
| `/for/startups` | best AI tools for startups |
| `/for/educators` | best AI tools for educators |

Each role page: curated 12-15 tools + recommended stack for the role + link to Stack Planner.

#### 8. Sub-category Deep Pages
Below the best-of level: `/best/writing/blog-posts`, `/best/writing/copywriting`, `/best/coding/python`

These go deeper than any competitor and capture highly specific, lower-competition queries. Users searching this deep have very high intent.

---

## Structured Data (JSON-LD) — Required on Every Page

This is the #1 lever for LLM citations. Currently unknown if implemented.

| Page Type | JSON-LD Schemas Required |
|-----------|--------------------------|
| Tool pages | `SoftwareApplication` + `FAQPage` + `AggregateRating` |
| Best-of pages | `ItemList` + `FAQPage` |
| Comparison pages | `FAQPage` ("Which is better, X or Y?") |
| Stack pages | `HowTo` + `ItemList` |
| Blog posts | `Article` + `FAQPage` + `BreadcrumbList` |
| Q&A pages | `FAQPage` + `QAPage` |
| Viability pages | `FAQPage` + `Dataset` |
| Homepage | `WebSite` + `SearchAction` (enables Google Sitelinks search box) |

Perplexity and Google AI Overviews pull from JSON-LD annotated content far more frequently than unstructured text. Every page without structured data is leaving LLM citations on the table.

---

## Content Quality Standard Per Page

Every indexed page must meet this minimum:

- **First 100 words:** Direct answer to the page's primary query. No preamble.
- **H1:** Exact match or close variant of target query
- **Word count:** Tool pages 400+, best-of pages 800+, comparison pages 1,000+, blog 1,500+
- **Internal links:** 3-5 links to related pages (tool → category → best-of → comparison → stack)
- **FAQ section:** 3-5 questions per page with `FAQPage` schema
- **Comparison table:** On best-of and comparison pages (LLMs love tables)
- **Last updated date:** Visible on page (signals freshness)

---

## Page Count Targets with Milestones

| Timeframe | Action | New Pages Added | Cumulative Total |
|-----------|--------|-----------------|-----------------|
| **Week 1** | Fix comparison slug routes | +200 | ~800 |
| **Week 2** | Best-of 14 → 50 | +36 | ~836 |
| **Week 2** | Viability dedicated pages | +3 | ~839 |
| **Week 3** | Stack pages 15 → 40 | +25 | ~864 |
| **Month 2** | Blog posts (8) | +8 | ~872 |
| **Month 2** | Q&A seeding (100 new) | +100 | ~972 |
| **Month 2** | Role-based pages (20) | +20 | ~992 |
| **Month 3** | Best-of → 80 pages (+30) | +30 | ~1,022 |
| **Month 3** | Comparison pairs → 400 (+200) | +200 | ~1,222 |
| **Month 3** | Sub-category deep pages (30) | +30 | ~1,252 |
| **Month 4-6** | Blog continues (32 more posts) | +32 | ~1,284 |
| **Month 4-6** | Q&A to 300+ | +100 | ~1,384 |
| **Month 6** | Tool pages grow (automated ingest) | +500 | ~1,884 |

**Milestone: 1,000 indexed pages by Day 60. 5,000 indexed pages by Month 12.**

---

## Tracking and Verification

**Weekly:**
- Google Search Console: Coverage → Indexed count (target: growing each week)
- GSC: Coverage → Errors (fix any "discovered but not indexed" or "crawled but not indexed" issues)

**Monthly:**
- Run `site:rightaichoice.com` in Google — note total results
- Track "indexed pages" in GSC vs "submitted in sitemap"
- Check Bing Webmaster Tools (submit sitemap there separately for Perplexity/ChatGPT)
- Search 10 target queries in Perplexity — note when RightAIChoice first appears as a citation

**LLM Citation Test:**
Search the following in Perplexity monthly and track position:
- "best AI tools for writing"
- "ChatGPT vs Claude comparison"
- "is [specific tool] still active" (viability page test)
- "best AI stack for content creators"
- "what AI tools should I use for [goal]"

**First citation target:** Appear in at least 1 Perplexity result for any AI tool query within 60 days of implementing structured data.

---

## Summary

The answer to "how many indexed pages do we need":

| Phase | Pages | What It Gets You |
|-------|-------|-----------------|
| Fix (Week 1) | 800 | Comparison pages finally indexed |
| 30 days | 1,000 | Mid-competition query eligibility |
| 90 days | 2,500 | Consistent LLM citations, page 1 for niche queries |
| 6 months | 5,000 | Top 3 AI directory by organic traffic |
| 12 months | 10,000+ | Category authority, broad LLM coverage |

**The first move is fixing comparison pages.** Every other action builds on that foundation.
