# 08 — AI Search Optimization (AEO / GEO)

> **Goal:** Optimize for the new search surface — AI Overviews, ChatGPT,
> Claude, Perplexity, You.com — where 30–60% of high-intent queries
> now end without a traditional click. Being cited is the new being
> ranked.

## The shift you're optimizing for

Search in 2026 has three layers:

1. **Traditional blue links** — declining share, still important
2. **Generative answers** (Google AI Overview, ChatGPT, Claude,
   Perplexity) — they summarize and cite a small handful of pages
3. **Conversational follow-ups** — users ask AI agents which tool to
   pick; agents retrieve from their training set + live retrieval

The winners get *cited*. Citations bring brand mention, trust, and
direct clicks even when the AI summarized the page.

## What you have today (Phase 9 baseline)

- No `llms.txt` — fixed in [02-foundation](./02-today-foundation-fixes.md)
- No `llms-full.txt` — fixed in 02
- Robots.txt likely default — fixed in 02
- Schema is partial — fixed in 02
- No AI-Overview-optimized content structure — fixed below
- No citation tracking — set up below

## Two acronyms to internalize

- **AEO** = Answer Engine Optimization — making your page the source
  generative engines extract from.
- **GEO** = Generative Engine Optimization — broader: optimizing your
  content + structured data so generative engines understand, trust,
  and prefer your site.

## Step-by-step AEO playbook

### Pattern 1 — TL;DR-first content

Every Tier-1 and Tier-2 page should open with a 50–80 word direct
answer to the page's primary query. AI engines lift this verbatim.

**Example (for `/compare/duolingo-vs-loora`):**

> **Quick answer:** Duolingo is best for casual learners and gamified
> retention; Loora is best for English conversation practice with AI
> tutors. Duolingo offers 40+ languages free; Loora is English-only
> and starts at $19/month. If you want voice fluency, pick Loora. If
> you want broad language coverage and zero cost, pick Duolingo.

Structure: declaration → contrast → recommendation.

### Pattern 2 — Tabular fact density

AI engines preferentially extract from tables. Every comparison page
should have a standardized table with the same field set:

| Field | Tool A | Tool B |
| :---- | :----- | :----- |
| Best for | ... | ... |
| Free plan | ... | ... |
| Starting price | ... | ... |
| Key feature | ... | ... |
| Limitation | ... | ... |
| Verdict | ... | ... |

The consistency across pages helps engines build a structured model.

### Pattern 3 — Direct-question H2s

Use questions as H2 subheadings, then answer them in 1–3 paragraphs.
This format dominates People Also Ask AND AI Overview extractions.

Examples:
- ## Is Duolingo or Loora better for adults?
- ## How much does Loora cost compared to Duolingo Super?
- ## Which AI language app works best on iPhone?

### Pattern 4 — Cited facts

When you state a fact, attribute it. "According to G2 (1,247 reviews,
4.4/5)" or "Per the tool's pricing page (last verified 2026-05-27)".
AI engines respect attributed pages more than unsourced ones.

### Pattern 5 — Last-reviewed transparency

The "Reviewed by {author} on {date}" byline does double duty:
- Google quality signal
- AI engine freshness ranking (Perplexity especially favors recent)

Component is already built (`reviewed-by-our-team.tsx`); wire it as
specified in [02-foundation](./02-today-foundation-fixes.md).

## llms.txt deep dive

### Why we ship two files

- `llms.txt` (short) — for engines that scan the file like a sitemap
  index. Stays under 4KB. Lists section pointers only.
- `llms-full.txt` (long) — full machine-readable knowledge map. Used
  by engines that ingest the whole thing.

### Generation strategy

- Build at deploy time from Supabase data
- Postbuild step in `package.json` runs `scripts/build-llms-full.ts`
- Output to `public/llms-full.txt`
- Vercel serves it as a static asset

### Content guidelines

- Use Markdown (it's what LLMs read best)
- Group by section type
- One URL per item, with title, summary, key facts
- Stable URLs only (no redirects, no /preview links)
- Keep it under 1MB total

### Validation

- `curl https://rightaichoice.com/llms.txt | head -30` looks sensible
- Try loading it into Claude or ChatGPT and asking "What's
  RightAIChoice?" — answer should accurately reflect the site

## Robots.txt for AI crawlers (already in 02-foundation)

Allowlist the bots that matter:

- `GPTBot` (OpenAI training/retrieval)
- `ClaudeBot` and `anthropic-ai` (Anthropic)
- `PerplexityBot` (Perplexity)
- `Google-Extended` (Google generative features — separate from search)
- `Bytespider` (ByteDance / TikTok AI)
- `cohere-ai` (Cohere)
- `Applebot-Extended` (Apple Intelligence)

## Schema for AI consumption

The schema audit in [02-foundation](./02-today-foundation-fixes.md) covers the basics.
For AI specifically, prioritize:

- `WebPage` with `mainEntity` pointing to the primary content type
- `FAQPage` with `Question`/`Answer` pairs (LLMs love these)
- `Review` + `AggregateRating` on tool pages
- `BreadcrumbList` (helps AI engines understand site hierarchy)
- `Organization` with `knowsAbout` enumerating our topical expertise

## Citation tracking

You can't optimize what you can't measure.

### Manual tracking (start here)

Spreadsheet `seo/ai-citations.csv`:

| Date | Engine | Query | Cited URL | Position in answer |
| ---- | ------ | ----- | --------- | ------------------ |

Update weekly. Run 20–30 representative queries through ChatGPT, Claude,
Perplexity, and Google AI Overview. Log when our URLs appear.

### Programmatic tracking (Week 4+)

- Use Perplexity's source-link disclosure: scrape periodic queries via
  their API and check for our domain
- Use AI Overview detection: SerpAPI / Bright Data offers this
- Build a simple weekly report in `/admin/ai-citations`

## Reddit + community presence (auxiliary to AI search)

ChatGPT and Perplexity heavily cite Reddit. If our tools/comparisons
are mentioned in popular Reddit threads, we get cited indirectly.

### Strategy

Not link spam. Be helpful, link occasionally where genuinely relevant.

1. **Identify target subreddits:**
   - `/r/ChatGPTPro`, `/r/LocalLLaMA`, `/r/ChatGPT`
   - `/r/SaaS`, `/r/Entrepreneur`
   - `/r/cscareerquestions` (for coding AI tools)
   - `/r/languagelearning` (for Duolingo/Loora pages)
   - Category-specific (e.g., `/r/midjourney`)

2. **Weekly cadence:**
   - 30 minutes Tuesday + Friday: scan for "what's the best X" threads
   - Reply with a genuinely useful answer; link to our comparison page
     when it directly answers the question
   - 1-in-3 of these convert into a citable Reddit comment

3. **Avoid:**
   - Posting only links (auto-banned)
   - Posting from a brand-new account (gets flagged)
   - Same comment template repeated (looks like spam)

## YouTube + video schema (auxiliary)

For tools with embeddable demos:

1. Add a YouTube video (even a 30-second screen recording) on each
   hero tool page
2. Tag with `VideoObject` schema (`name`, `description`, `thumbnailUrl`,
   `uploadDate`, `duration`)
3. Video gets a thumbnail in SERP → CTR boost

We're not building a YouTube channel in Phase 9. We're using embedded
video as a schema win.

## Timeline

| Week | Activity                                                                        |
| ---: | :------------------------------------------------------------------------------ |
|    1 | Ship llms.txt + llms-full.txt; robots.txt; schema baseline                      |
|    2 | Add TL;DR blocks to top 50 pages (Tier 1)                                       |
|    3 | Standardized comparison table format across all `/compare/*`                    |
|    4 | First AI citation tracking report (manual)                                      |
|  5–8 | Reddit presence weekly cadence                                                  |
|  9–12 | YouTube video schema on top 30 tool pages                                      |

## Definition of done

- llms.txt + llms-full.txt live and serving
- Robots.txt allows all major AI crawlers
- 50 Tier-1 pages have TL;DR blocks
- Comparison table format standardized + applied to all `/compare/*`
- Citation tracking spreadsheet live, updated weekly
- Reddit presence active (≥10 helpful comments per month)

## Risks

- **Engines de-rank AI-optimized content** — unlikely; the patterns
  above are just well-structured content, not gaming.
- **llms.txt unused by most engines today** — true; ship it anyway as
  cheap insurance.
- **Reddit moderation** — easy to look spammy. Mitigation: real
  account, real engagement, links only when genuinely helpful.

## When this is in flight, move to:

- [09-snippets-paa](./09-snippets-paa-serp-features.md) — featured snippet hunting overlaps with AEO
- [10-link-magnets](./10-link-magnets-and-distribution.md) — original research = AI citation goldmine
