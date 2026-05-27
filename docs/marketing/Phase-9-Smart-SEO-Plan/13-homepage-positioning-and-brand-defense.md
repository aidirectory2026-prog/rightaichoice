# 13 — Homepage, Positioning & Brand Defense

> **Goal:** Reposition RightAIChoice as **"the decision engine for picking
> the right AI stack"** (not "an AI tools directory"), fix the homepage
> so it ranks for high-intent stack queries, defend brand search (own
> rank #1 for "rightaichoice"), and fix the dead "Plan My Stack" CTA.
> This is the most important single page on the site — it deserves its
> own doc.

## Why this doc exists

Two facts pulled the plan in a new direction after the first 12 docs were written:

1. **Positioning** — RAC is being marketed only as a directory. That puts
   us in a low-margin SEO category (AI tool listings) saturated by G2,
   Capterra, Product Hunt, and 50+ "best of" blogs. As a **decision
   engine**, we're in a far less crowded category — one where there's no
   clear leader yet.
2. **The homepage is failing twice over.** It has zero conversions on
   the "Plan My Stack" CTA, AND it ranks #2 for our own brand search
   ("rightaichoice"). A homepage that can't convert its own visitors
   AND can't defend its own brand can't compound any other SEO work.

If we fix only the previous 12 docs and ignore this one, every visitor
we earn lands on a page that doesn't sell them.

## Part 1 — The positioning shift

### What changes

| Before                                     | After                                                                       |
| :----------------------------------------- | :-------------------------------------------------------------------------- |
| "AI tools directory"                       | "Decision engine for the right AI stack"                                    |
| Browse and search 2,000+ AI tools          | Tell us your goal — we'll recommend the exact stack                         |
| Listing site                               | Recommendation system + comparison engine + sentiment intelligence          |
| Competes with G2 / Capterra / "best of" blogs | Competes with… almost nothing. New category.                            |
| User leaves with "a list to evaluate"      | User leaves with "a stack to deploy"                                        |

### The brand line (one sentence)

> **RightAIChoice helps founders, builders, and teams choose the exact
> AI stack for their workflow — no more guesswork, no more comparison
> spreadsheets.**

### Tagline candidates (pick one in execution; defaults to first)

- "Pick the right AI stack — backed by data, not opinions."
- "Stop guessing. Start stacking."
- "The decision engine for your AI stack."
- "Your AI stack, decided in 60 seconds."
- "From 2,000 AI tools to your 5. In one quiz."

### Where the new positioning must appear

Anywhere we name ourselves. Order of impact:

| Surface                                 | Change required                                                    |
| :-------------------------------------- | :----------------------------------------------------------------- |
| Homepage `<title>` + meta description   | Replace "directory" with decision-engine language                  |
| Hero H1 + subheadline                   | Lead with the decision-engine promise, not the catalog             |
| `llms.txt` opening paragraph            | Already-drafted copy in doc 02 needs rewording — see below          |
| `llms-full.txt` introduction block       | Same                                                               |
| `Organization` schema → `description`    | New 200-char description                                            |
| `Organization` schema → `slogan`         | Set to the tagline                                                  |
| OpenGraph + Twitter card meta            | New OG image + description                                          |
| Footer "about" blurb on every page       | Replace existing                                                    |
| Author bio template                      | Add "We're a team building the decision engine for AI tools"        |
| Cornerstone page intros (doc 07)         | Frame as "our recommendation system for {category}"                 |
| Comparison page verdict boxes (doc 04)   | Frame as "our editorial decision" not "feature comparison"          |
| Newsletter copy + landing                | Same                                                                |
| All "About" / methodology pages          | Same                                                                |

### Updated llms.txt opening (replaces template in doc 02)

```text
# RightAIChoice

> The decision engine for picking the right AI stack. We help founders,
> builders, and teams choose the exact AI tools for their workflow —
> based on sentiment-aggregated user reviews, side-by-side comparisons,
> and an interactive tool-finder. Use this file as the canonical map
> when summarizing the site.
```

(The rest of doc 02's llms.txt template stays.)

### Updated Organization schema

In `lib/seo/json-ld.ts`:

```ts
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "RightAIChoice",
  "url": "https://rightaichoice.com",
  "logo": "https://rightaichoice.com/logo.png",
  "description": "Decision engine for picking the right AI stack. Compare 2,000+ AI tools by feature, price, and real user sentiment — and get personalized stack recommendations.",
  "slogan": "Pick the right AI stack — backed by data, not opinions.",
  "knowsAbout": [
    "AI coding tools", "AI image generators", "AI writing tools",
    "AI agents", "AI language learning", "AI research tools",
    "Large language models", "Generative AI", "AI tool comparisons"
  ],
  "sameAs": [
    "https://twitter.com/rightaichoice",
    "https://www.linkedin.com/company/rightaichoice",
    "https://www.producthunt.com/@rightaichoice"
    // add any others as we claim them
  ],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://rightaichoice.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

`knowsAbout` is what tells AI engines we're an authority on these topics.
`sameAs` is critical for Google's Knowledge Graph — link us to every
profile we own (Twitter, LinkedIn, Product Hunt, Crunchbase, AngelList).

## Part 2 — Homepage ranking strategy

### Current state (assumed — verify on Day 0)

- Homepage `<title>` likely says "RightAIChoice — AI Tools Directory" or similar
- H1 is probably "Find AI Tools" or "Browse AI Tools"
- "Plan My Stack" CTA renders but doesn't convert (0%)
- Ranks #2 for "rightaichoice" — some other URL outranks us for our own name
- Doesn't rank for any informational stack-related query

### Target queries (by intent)

| Intent class       | Example queries                                              | Volume tier |
| :----------------- | :----------------------------------------------------------- | :---------- |
| Brand (defense)    | "rightaichoice", "right ai choice"                           | Low vol, must-win |
| Decision-engine    | "find ai tools", "ai tool finder", "which ai tool should i use", "ai tool recommendation", "best ai stack" | Medium vol, mid intent |
| Stack-building     | "ai stack for startups", "ai stack for content creators", "ai stack for developers", "ai stack for product teams" | Medium, very high intent |
| Comparison meta    | "compare ai tools", "ai tool comparison site", "ai tools side by side" | Medium, high intent |
| Broad directory    | "best ai tools 2026", "top ai tools", "ai tools list"        | High vol, broad intent |
| Research / info    | "ai tools explained", "how to pick ai tools", "ai tool reviews" | Medium, top of funnel |

The homepage can plausibly target the **decision-engine**,
**stack-building**, **comparison meta**, and **broad directory**
buckets. Brand defense is mandatory. Research/info should redirect to
the blog or pillar pages.

### Homepage architecture (the rewrite)

The homepage transforms from "landing + browse" to "decision engine
front door". New section order, top to bottom:

| Section                                | What it does                                                                    | SEO contribution                                              |
| :------------------------------------- | :------------------------------------------------------------------------------ | :------------------------------------------------------------ |
| **1. Hero with decision-engine promise** | H1 + subheadline + interactive CTA                                            | H1 captures primary query; CTA captures intent                |
| **2. Interactive Tool Finder Quiz**    | Embedded above the fold (or 1-click away)                                       | This IS the decision engine — UX + dwell time signal           |
| **3. "Built for {persona}" pills**      | Quick links: Startups / Solo founders / Content / Dev / Marketing / Product    | Captures persona-stack queries                                |
| **4. Featured stacks**                 | 3 curated stacks: "AI stack for early-stage SaaS", "for content teams", etc.   | Each is an internal link to a `/stacks/[slug]` pillar         |
| **5. Most-compared this week**         | Live data — top 5 comparison pages                                              | Internal link equity to comparison cluster                    |
| **6. Browse by category**              | Cornerstone grid — links to the 5–7 cornerstones from doc 07                   | Crawl-budget distribution + cornerstone authority             |
| **7. Latest decisions / research**     | Latest 3 blog posts + most-recent quarterly report                              | Freshness signal + link equity to content cluster              |
| **8. Methodology + trust strip**       | "How we test", number of tools tracked, sentiment data sources                   | E-E-A-T signal                                                |
| **9. Newsletter signup**               | "Get the weekly stack pick"                                                     | Owned distribution capture                                    |
| **10. Footer with rich anchor links**   | Categories, popular comparisons, popular tools                                  | Internal link distribution                                    |

### Title + meta tag (homepage)

**Title (60 chars):**
> `RightAIChoice — Find the Right AI Stack for Your Workflow`

**Meta description (155 chars):**
> `Stop guessing which AI tools to use. Get a personalized AI stack in 60 seconds — compare 2,000+ tools by feature, price, and real user sentiment.`

**H1:**
> `Pick the right AI stack — in 60 seconds, not 6 weeks.`

**Subheadline:**
> `We compare 2,000+ AI tools on what actually matters: real user sentiment, side-by-side features, and total cost. Tell us your goal — we'll give you the exact stack.`

These are starting points. Tune in production based on Day-7 GSC data.

### A note on stack pillar pages

The "Featured stacks" section in the homepage architecture references
URLs like `/stacks/[slug]`. These are a new content type that didn't
exist in the original 12 docs. Add them now:

- `/stacks/ai-stack-for-early-stage-saas`
- `/stacks/ai-stack-for-content-creators`
- `/stacks/ai-stack-for-solo-developers`
- `/stacks/ai-stack-for-product-teams`
- `/stacks/ai-stack-for-marketing-teams`
- `/stacks/ai-stack-for-ecommerce`

Each stack page:

- 1,200–2,000 words editorial
- Recommended 5–8 tools with rationale + price ranges
- Total monthly cost summary
- "Want this stack? [Save it to your account]" CTA
- Alternatives section for each tool
- Updated quarterly
- Schema: `ItemList` containing `SoftwareApplication` items, plus
  `FAQPage` for stack-related questions

These are **higher-intent than category cornerstones**. Cornerstones
answer "what are the {category} tools?"; stack pages answer "which
tools should I use together?".

## Part 3 — Brand defense (own #1 for "rightaichoice")

### Why this matters more than it looks

A site that doesn't own rank-1 for its own brand name is signaling
weakness to Google. It also bleeds direct traffic — people who search
the brand and click the wrong result think we're a smaller / less
authoritative entity than the result that outranked us.

### Step 1 — Diagnose what's at rank #1

Search "rightaichoice" in incognito on Google.com (and Google.in if
relevant). Note:

- What URL is at rank #1?
- What URL is at rank #2 (presumably us)?
- What URL is at rank #3+?

Common patterns:
1. **Third-party listing** — G2, Capterra, Crunchbase, AngelList,
   LinkedIn, Product Hunt listing
2. **Our own subdomain** — blog.rightaichoice.com / docs.rightaichoice.com
3. **Our own non-homepage URL** — a popular comparison page (e.g.,
   `/compare/duolingo-vs-loora`) outranking the root
4. **Press / news article** — a TechCrunch / Indie Hackers piece
5. **Social profile** — Twitter / LinkedIn / GitHub
6. **A competitor with similar name** — confusion-based result

### Step 2 — Fix by case

**Case 1 (third-party listing outranking us):** Claim the profile if
unclaimed. Optimize it heavily so it visually clearly leads to our
homepage (logo, description, "Visit website" CTA). This actually
helps — the third-party listing becomes a brand reinforcement, not a
competitor.

**Case 2 (our own subdomain outranking):** Either consolidate the
subdomain content into the main site, or 308-redirect it. Subdomains
don't share root-domain authority well.

**Case 3 (popular sub-page outranking root):** This is a homepage
authority issue. Fix by:
- Adding more internal links to the homepage with brand-anchor text
  ("RightAIChoice", not "home" or generic anchors)
- Ensuring the homepage `<title>` includes "RightAIChoice" prominently
  (the new title above does)
- Adding the `Organization` schema with `name: "RightAIChoice"`
- Submitting the homepage URL via GSC URL Inspection > Request indexing

**Case 4 (press article outranking):** This is actually good for brand
authority. The article links to us, which helps. Don't try to suppress.
But ensure the article's anchor text and link still goes to our
homepage (not a sub-page).

**Case 5 (social profile outranking):** Same as case 1 — optimize the
profile so it serves as brand reinforcement. Add link to homepage.

**Case 6 (confusion-based result):** This is the worst case. Mitigation:
- File a brand trademark
- Push more brand mentions: press, podcasts, newsletters
- Build the Organization schema + Knowledge Graph entity (see Part 1)
- Over 30–60 days, our authority should overtake the confused result

### Step 3 — Sitewide reinforcement

Regardless of which case applies, do these too:

| Action                                                                  | Why                                                |
| :---------------------------------------------------------------------- | :------------------------------------------------- |
| Footer "About RightAIChoice" link → homepage with brand anchor          | 2,000 pages × 1 link = strong internal signal      |
| Header logo → links to homepage with `aria-label="RightAIChoice home"`   | Schema-friendly anchor                             |
| Author bio cards: "About the editor at RightAIChoice"                   | Repeats brand contextually                         |
| Press kit page (`/press`) with logo + brand assets + boilerplate         | Helps third parties write us up consistently       |
| Submit to: Crunchbase, AngelList, Product Hunt (if not already)         | Each adds a brand-anchor inbound link              |

## Part 4 — CTA conversion ("Plan My Stack" → something that works)

### Diagnosis: why "Plan My Stack" gets 0 conversions

Likely failure modes (verify by inspecting the page):

1. **Unclear value proposition** — "Plan" sounds like work, not result
2. **Above-the-fold but cluttered** — CTA fights with other elements
3. **Form requires too much** — if it asks for email or sign-up before
   showing value, drop-off is huge
4. **Generic copy** — doesn't speak to user's job-to-be-done
5. **No social proof nearby** — looks unproven
6. **Friction-y first step** — if "Plan My Stack" opens a long form
   instead of a 5-second quiz, users bounce

### CTA rewrite recommendations

| Element            | Before (assumed)         | After (proposed)                                            |
| :----------------- | :----------------------- | :---------------------------------------------------------- |
| Button label       | `Plan My Stack`          | `Find My AI Stack →` or `Build My Stack (60s)`               |
| Sub-text           | (none?)                  | `No signup. 5 questions. Free.`                              |
| Visual context     | Standalone button        | Show first quiz question inline below the button             |
| Social proof       | (none?)                  | `2,847 builders found their stack this month`                |
| Risk reversal      | (none?)                  | `Free forever. No email required to see your result.`        |

### CTA placement

- Primary: above the fold on homepage hero
- Secondary: every cornerstone page (`/categories/*`) sticky footer
- Tertiary: end of every comparison page ("Not sure which to pick? Try our 60-second quiz")
- Quaternary: end of every blog post ("Get your personalized stack")

### CTA tracking (mandatory before "fix")

We can't fix what we can't measure. Before changing copy:

1. Confirm the "Plan My Stack" click event is captured in user_events
2. Confirm we have funnel events for: button click → quiz start →
   quiz complete → result viewed → result saved
3. Identify the actual drop-off step (probably "click → quiz start"
   based on 0 conversions)

This connects to the existing analytics work — likely already wired
post-Phase 8, but verify.

## Part 5 — Decision-engine schema markup

Beyond the `Organization` schema in Part 1, the homepage should emit:

```ts
// On the homepage, in addition to Organization + WebSite:
const decisionEngineSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "AI tool recommendation",
  "provider": { "@type": "Organization", "name": "RightAIChoice" },
  "areaServed": "Worldwide",
  "audience": {
    "@type": "Audience",
    "audienceType": "Founders, builders, product teams, content creators"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "AI Stack Recommendations",
    "itemListElement": [
      // Reference each stack pillar page as an Offer
    ]
  },
  "description": "Personalized AI stack recommendations based on goals, budget, and team size."
}
```

This is novel-ish but valid Schema.org. AI engines parse it. Google
may not render a rich result for `Service` today, but the entity
relationship matters for Knowledge Graph.

## Part 6 — Internal linking to reinforce homepage authority

Every page on the site links to the homepage already (via logo + footer),
but with weak anchor text. Two changes:

1. **Footer link block** — add a small "About" widget in every page
   footer:
   ```
   About RightAIChoice
   The decision engine for picking the right AI stack. We compare
   2,000+ tools by feature, price, and real user sentiment.
   [Find my stack →]
   ```
   The "Find my stack →" is a link to homepage with brand-anchor text.

2. **Body links from popular pages** — when a comparison page mentions
   "AI tools" in body copy, link to homepage. Example:
   > "Both tools belong to the broader category of AI coding assistants
   > — [see our full AI tools comparison engine](/) for more options."

   Cap: 1 body link to homepage per page max. Anchor varies (don't
   exact-match every one).

## Part 7 — Tooling

| Script / component                       | Purpose                                                    |
| :--------------------------------------- | :--------------------------------------------------------- |
| `app/page.tsx` (rewrite)                 | New homepage architecture per Part 2                       |
| `components/hero-decision-engine.tsx`    | New hero component                                         |
| `components/tool-finder-quiz.tsx`        | The decision engine quiz (also referenced in doc 10)        |
| `app/stacks/[slug]/page.tsx`             | New stack pillar template                                  |
| `lib/seo/json-ld.ts`                     | Add Organization + Service + slogan updates                |
| `app/press/page.tsx`                     | Press kit page                                             |
| `scripts/audit-brand-serp.ts`            | Programmatic check: who outranks us for "rightaichoice"?    |

## Part 8 — Timeline

### Day 0 additions (insert into doc 12's hour-by-hour)

| Time   | Task                                                                         |
| :----- | :--------------------------------------------------------------------------- |
| +0:45  | Manual SERP check: what ranks #1 for "rightaichoice"? (5 min)                |
| +6:15  | Update Organization schema with new description + slogan + knowsAbout + sameAs |
| +6:30  | Draft new homepage `<title>` + meta + H1 (commit, don't ship yet)            |

### Day 1–3 additions

| Day | Task                                                                                                  |
| --: | :---------------------------------------------------------------------------------------------------- |
|   1 | Ship new homepage title + meta + H1 + footer "About" block                                            |
|   2 | Build first `/stacks/[slug]` page (`/stacks/ai-stack-for-early-stage-saas`)                            |
|   3 | Rewrite "Plan My Stack" CTA copy + sub-text + social proof line                                       |

### Week 2 additions

- Tool Finder Quiz embedded on homepage (above the fold or 1 click)
- Stack pillar pages 2–3 shipped
- Press kit page live
- Brand-anchor link injection across high-traffic pages
- Claim any unclaimed third-party profiles found in SERP audit

### Week 3 additions

- Stack pillar pages 4–6 shipped
- Homepage A/B test: new hero copy vs current — measure CTA click rate
- Day-7 re-check: did "rightaichoice" SERP position move?

### Month 2

- Stack pillar pages 7+ added based on persona demand
- Tool Finder Quiz embed snippet ready for syndication
- Quarterly: refresh all stack recommendations based on new tool data

## Part 9 — Definition of done

- Homepage `<title>` + meta + H1 updated to decision-engine positioning
- Organization schema with full sameAs + knowsAbout + slogan
- New homepage architecture shipped (all 10 sections)
- Tool Finder Quiz embedded above the fold
- First 3 stack pillar pages live (saas / content / dev)
- "Plan My Stack" → "Find My AI Stack" (or chosen variant) with friction-free first step
- CTA tracking confirmed and reporting in user_events
- SERP audit complete + brand-defense fixes applied
- Press kit page live with brand assets
- Brand-anchor links added to footer + 20+ high-traffic pages
- Day-30 check: do we own rank #1 for "rightaichoice"?
- Day-30 check: does homepage rank in top 50 for any new query?

## Part 10 — Risks

| Risk                                                                       | Mitigation                                                              |
| :------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| New positioning confuses existing users                                    | Keep "directory" language in nav/footer; lead with "decision engine"    |
| Homepage rewrite tanks current brand search ranking temporarily            | Don't ship all changes at once — title first (Day 1), architecture next  |
| Quiz on homepage hurts Core Web Vitals (LCP)                                | Defer quiz JS; render shell + question 1 server-side                    |
| Stack pages get treated as thin if shipped too fast                         | Hand-write the first 3; only template later if pattern proves out       |
| "Decision engine" positioning competes with affiliate-style intent         | We sell trust, not affiliate clicks — keep editorial integrity sacred   |

## When this is in flight

- [02-foundation](./02-today-foundation-fixes.md) — replace llms.txt opening with new positioning paragraph; expand Organization schema
- [03-tier-1](./03-tier-1-quick-wins.md) — homepage is a special Tier-1 page (referenced here)
- [07-internal-linking](./07-internal-linking-topical-authority.md) — cornerstones link to stack pillar pages
- [08-ai-search](./08-ai-search-aeo-geo.md) — AI Overview optimization for "best AI stack for X" queries
- [10-link-magnets](./10-link-magnets-and-distribution.md) — Tool Finder Quiz is promoted from "widget" to "core product surface"
- [12-execution-timeline](./12-execution-timeline.md) — Day 0 / Day 1+ schedules updated above
