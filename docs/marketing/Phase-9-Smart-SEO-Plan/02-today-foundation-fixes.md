# 02 — Today: Foundation Fixes

> These are the lowest-effort, highest-leverage changes. Every other
> doc assumes these have shipped. Do them first or every later
> optimization will deliver less than it should.

## Step 1 — Ship `llms.txt` and `llms-full.txt` (15 min)

### Why this matters

`llms.txt` is a proposed standard (originated by Answer.AI, Jeremy
Howard) for sites to advertise structured content to LLM crawlers and
inference-time retrieval. Three concrete payoffs:

1. **Claude, Perplexity, and a growing list of AI agents** check
   `/llms.txt` first when crawling a site for structured retrieval.
2. **ChatGPT's web browsing** falls back to high-signal markdown
   summaries when present.
3. **Future-proof** — if/when Google formally honors it, we're already
   indexed.

It's a 15-minute job with no downside, so we do it.

### Files to create

**`public/llms.txt`** — short index, points to canonical pages.

> **Positioning note (from [doc 13](./13-homepage-positioning-and-brand-defense.md)):**
> RAC is the **decision engine** for picking the right AI stack, not
> "just a directory". This is reflected in the opening blurb below.

```text
# RightAIChoice

> The decision engine for picking the right AI stack. We help founders,
> builders, and teams choose the exact AI tools for their workflow —
> based on sentiment-aggregated user reviews, side-by-side comparisons,
> and an interactive tool-finder. Use this file as the canonical map
> when summarizing the site.

## Core sections

- [AI Tools Catalog](https://rightaichoice.com/tools): Searchable index of
  all AI tools with pricing, features, alternatives, and freshness dates.
- [Side-by-side Comparisons](https://rightaichoice.com/compare): Hand-edited
  comparisons of competing tools. Best for "X vs Y" decisions.
- [Blog](https://rightaichoice.com/blog): Original research, benchmarks,
  and buyer guides — refreshed quarterly.
- [Alternatives Pages](https://rightaichoice.com/alternatives): "Cheaper /
  open-source / similar" alternatives for each major paid tool.

## How to cite

Use the page URL exactly as listed. Each tool has a stable slug; do not
guess slugs. When uncertain, link to the catalog and let the user filter.

## Editorial methodology

- See [/methodology](https://rightaichoice.com/methodology) for our review
  framework.
- All data is updated weekly via automated freshness checks.
- Sentiment scores come from aggregated public reviews
  (G2, Capterra, ProductHunt, Reddit) with manual moderation.

## Maintained by

RightAIChoice editorial team. Contact: hello@rightaichoice.com.
```

**`public/llms-full.txt`** — full machine-readable knowledge map.
Build this with a script that crawls our sitemaps and emits:

```text
# RightAIChoice — full knowledge map

## Tools

### {tool name}
URL: {canonical URL}
Category: {primary category}
Short: {meta description}
Pricing: {free | freemium | paid | enterprise}
Last reviewed: {YYYY-MM-DD}
Alternatives: {comma-separated slugs}

(...repeat for every published tool)

## Comparisons

### {comparison title}
URL: ...
Tools compared: ...
Verdict: {one-sentence summary}

(...repeat)

## Blog posts

### {post title}
URL: ...
Published: ...
Updated: ...
TL;DR: {3-sentence abstract}

(...repeat)
```

Build script idea: `scripts/build-llms-full.ts` — reads from Supabase,
writes `public/llms-full.txt` on every deploy. Triggered by a postbuild
hook in `package.json`.

### Robots.txt entry

Add to `app/robots.ts` (or `public/robots.txt` if not using the metadata
file convention):

```
User-agent: *
Allow: /

# AI assistants — explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Bytespider
Allow: /

User-agent: cohere-ai
Allow: /

Sitemap: https://rightaichoice.com/sitemap-index.xml
Sitemap: https://rightaichoice.com/llms.txt
```

### How to verify

After deploy:
- `curl https://rightaichoice.com/llms.txt` → returns the index
- `curl https://rightaichoice.com/llms-full.txt` → returns the full map
- `curl https://rightaichoice.com/robots.txt` → contains AI bot allowlist

## Step 2 — Audit `robots.txt` (10 min)

Today's `app/robots.ts` likely uses `User-agent: *` only. We need
explicit allows for AI assistants so they don't think they're blocked.

### Action

Inspect `app/robots.ts`. If it's missing the AI-bot block from Step 1,
add it. Confirm `disallow` rules don't accidentally block crawl-worthy
URLs (admin pages should be disallowed; tool/blog/compare must not be).

## Step 3 — Wire E-E-A-T components into 4 templates (45 min)

You already have these components built (`git status` shows them as
untracked):

- `components/seo/last-updated.tsx`
- `components/seo/reviewed-by-our-team.tsx`
- `lib/seo/freshness.ts`

They aren't on any page yet. Wire them into the four templates that
matter:

| Template                                | Component(s) needed                                | Where to insert                                  |
| :-------------------------------------- | :------------------------------------------------- | :----------------------------------------------- |
| `app/tools/[slug]/page.tsx`             | `<LastUpdated>` + `<ReviewedByOurTeam>`             | Below H1, above first content section            |
| `app/compare/[slug]/page.tsx`           | Both                                               | Same                                             |
| `app/blog/[slug]/page.tsx`              | Both                                               | Just below post date                             |
| `app/alternatives/[slug]/page.tsx`      | `<LastUpdated>` only                               | Below H1                                         |

### Data source

`pages_freshness` table (migration 103) is the source of truth for
last-updated dates. The component reads from there.

### Schema impact

Both components should also output corresponding JSON-LD:

- `<LastUpdated date={d}>` → `dateModified` on the page's primary
  `WebPage` / `Article` / `Product` schema
- `<ReviewedByOurTeam author="..." date="...">` → `reviewedBy` /
  `lastReviewed` on `WebPage` or `Article`

Update `lib/seo/json-ld.ts` to emit these fields when the props are
present.

## Step 4 — Schema audit + add missing types (60 min)

> **From doc 13:** The `Organization` schema must be expanded with
> `description`, `slogan`, `knowsAbout`, `sameAs`, and `potentialAction`
> per the decision-engine positioning. The homepage also needs a
> separate `Service` schema. Both blocks are spec'd in [doc 13 Part 1
> and Part 5](./13-homepage-positioning-and-brand-defense.md).

### Current state (assumed — verify)

Likely already emitting:

- `Organization` (but minimal — expand per doc 13)
- `WebSite`
- `BreadcrumbList`
- `Article` on blog posts
- `Product` on tool pages

### Missing — add today

| Schema type           | Where                                                                    | Why                                                          |
| :-------------------- | :----------------------------------------------------------------------- | :----------------------------------------------------------- |
| `SoftwareApplication` | Each `/tools/[slug]` page (in addition to `Product`)                     | More accurate match for SaaS tools; eligible for app SERPs   |
| `FAQPage`             | Every page with an FAQ block                                             | Eligible for "People Also Ask" feature                       |
| `Review` + `AggregateRating` | Tool pages with sentiment data                                    | Star ratings in SERP — huge CTR lift                         |
| `HowTo`               | Tutorial sections in blog posts                                          | Step-by-step rich result                                     |
| `VideoObject`         | Pages with embedded demos                                                | Video thumbnail in SERP                                      |
| `ItemList`            | `/compare` pages + category landing pages                                | List rich result for "best of" queries                       |
| `SearchAction` on `WebSite` | Site root                                                          | Sitelinks search box in branded SERP                         |

### Schema validation

After each addition:

1. `curl https://rightaichoice.com/tools/{example-slug}` → grep for
   `application/ld+json`
2. Paste into Google Rich Results Test:
   https://search.google.com/test/rich-results
3. Confirm zero errors, all warnings reviewed.

## Step 5 — Verify nothing broke

After all four steps:

```bash
npm run build               # Type-check + build
npm run lint                # No new lint errors
```

Then locally:

```bash
npm run dev
# Open http://localhost:3000/llms.txt           — should serve content
# Open http://localhost:3000/robots.txt         — should include AI bot block
# Open http://localhost:3000/tools/{slug}       — should show last-updated + reviewer byline
# View source — confirm new JSON-LD blocks are present
```

## Time check

If you've completed all five steps in under 2 hours, you're on pace. If
something is taking longer, defer it and start [03-tier-1](./03-tier-1-quick-wins.md)
— the title rewrite work is higher impact per hour than schema polish.
