# 01 — Diagnosis & Baseline

> Read this before doing anything else. If you skip it, you will work on
> the wrong problems. The numbers below come from the GSC snapshot
> captured 2026-05-26 (28-day window), stored in `gsc_snapshots`.

## The numbers

| Bucket            | Pages | Total Impr. | Clicks | Avg Pos |
| ----------------- | ----: | ----------: | -----: | ------: |
| Pos 1–3           |     3 |          13 |      0 |     3.0 |
| Pos 4–10          |    30 |         983 |      2 |     8.1 |
| Pos 11–20         |    32 |         268 |      4 |    17.6 |
| Pos 21–30         |    36 |         346 |      0 |    25.8 |
| Pos 31–50         |   143 |       1,786 |      1 |    42.5 |
| Pos 51+           |   529 |      11,819 |      1 |    67.9 |
| Zero impressions  | ~1,330|           0 |      0 |       — |

**Sitewide (28d):** 15,215 impressions · 8 reported clicks · CTR ~0.05%.
GSC shows 44 clicks in the totals — the gap is GSC privacy-floor noise
plus the discrepancy between per-page rows and reported totals. Either
way: <1 click per 1,500 impressions is catastrophic.

## Top 30 opportunity pages (pos < 21, sorted by impressions)

These are the pages where title/meta rewrites have the highest ROI:

| Page                                                                  | Impr. | Clicks | Pos  | Why it matters                                                                  |
| :-------------------------------------------------------------------- | ----: | -----: | ---: | :------------------------------------------------------------------------------ |
| /compare/duolingo-vs-loora                                            |   223 |      1 |  8.1 | Highest-impression page on the site; CTR 0.4% when expected is 4–8%             |
| /compare/duolingo-vs-talkpal                                          |   164 |      0 |  7.1 | Zero clicks despite pos 7 — title/meta failing                                  |
| /blog/ai-coding-assistant-leaderboard-swe-bench-humaneval-2026        |   156 |      0 |  6.0 | Top-of-funnel money page; pos 6 with 0 clicks is leaving $$ on table            |
| /compare/openhands-vs-devin                                           |   156 |      1 |  7.8 | Hot comparison; CTR 0.6%                                                        |
| /compare/expensify-vs-wave                                            |    64 |      0 | 17.2 | Borderline pos 17 — needs to break top 10                                       |
| /blog/how-much-do-ai-coding-assistants-cost-2026-real-usage-math      |    56 |      0 |  7.9 | High-intent commercial query; pos 8 with 0 clicks                               |
| /compare/dify-vs-langflow-vs-fastgpt                                  |    51 |      0 |  9.2 | Three-way comparison ranking on page 1 with no clicks                           |
| /blog/open-source-ai-coding-agents-2026-self-hosting-guide            |    42 |      0 |  7.5 | Niche audience but pos 7 → snippet-eligible                                     |
| /compare/cline-vs-aider-vs-continue                                   |    39 |      4 | 19.1 | **Best CTR on site (10%)** — proves the comparison playbook works               |
| /tools/autodesk-forma                                                 |    28 |      0 | 12.1 | Tool detail page on page-1 edge                                                 |
| /compare/clay-vs-phantombuster                                        |    24 |      0 |  6.6 | Page 1 with no clicks                                                           |
| /compare/moises-vs-suno                                               |    21 |      0 |  8.6 | Music AI comparison                                                             |
| /tools/procurement-sciences-ai                                        |    21 |      0 | 19.2 | Borderline                                                                      |
| /tools/qoves                                                          |    19 |      0 | 20.5 | Just outside top 20                                                             |
| /tools/parspec                                                        |    17 |      0 | 16.2 | Page 2                                                                          |
| /tools/assemblyai                                                     |    15 |      0 | 10.3 | Just outside page 1                                                             |
| /tools/starwriter-ai                                                  |    13 |      0 |  8.2 | Page 1                                                                          |
| /tools/motiff                                                         |    12 |      0 |  6.9 | Top 7                                                                           |
| /tools/tavily                                                         |    12 |      0 | 20.4 | Page 2                                                                          |
| /tools/socket-dev                                                     |    12 |      0 | 16.3 | Page 2                                                                          |
| /compare/alphasense-vs-claude                                         |    10 |      0 |  3.6 | **TOP 4** with zero clicks — biggest title/meta failure on the site             |
| /tools/gitlab-duo                                                     |     9 |      0 | 19.9 | Edge of page 2                                                                  |
| /compare/kagi-vs-perplexity                                           |     7 |      0 | 14.6 | Page 2                                                                          |
| /compare/lindy-vs-superhuman                                          |     7 |      0 |  8.7 | Page 1                                                                          |
| /tools/autosana                                                       |     7 |      0 |  8.9 | Page 1                                                                          |
| /tools/sightsai                                                       |     6 |      0 | 14.7 | Page 2                                                                          |
| /compare/ivo-vs-spellbook                                             |     5 |      0 |  6.0 | Top 6                                                                           |
| /compare/speak-vs-talkpal                                             |     5 |      0 |  7.8 | Top 8                                                                           |
| /tools/spiritt                                                        |     4 |      0 |  6.5 | Top 7                                                                           |
| /tools/creative-fast-aid                                              |     3 |      0 | 16.0 | Page 2                                                                          |

## Five things this data tells us

1. **Comparison pages are the strongest organic asset** — 11 of the top
   20 highest-impression pages are `/compare/*`. The site's comparison
   editorial program is the highest-leverage publishing arm.
2. **Titles aren't earning clicks** — `/compare/alphasense-vs-claude` at
   position 3.6 with 0 clicks is the smoking gun. The serp result
   isn't compelling.
3. **`cline-vs-aider-vs-continue` proves the formula works** — pos 19
   with 10% CTR. Whatever's different about that title/meta is the
   pattern to clone across all comparison pages.
4. **Tool detail pages aren't competitive** — most rank pos 10–20 with
   single-digit impressions. They need supporting content (reviews,
   alternatives, sentiment) to break out.
5. **The blog leaderboard post is sitting on gold** — pos 6, 156
   impressions, 0 clicks. Either the title doesn't say what users want
   to click, or competitors own the snippet.

## Root causes (in priority order)

### 1. CTR is the immediate problem for ~100 pages (Tier 1)

Pages at pos 4–20 with 0 clicks aren't a ranking problem — they're a
**packaging** problem. The title + meta description aren't earning the
click. Fixable in 1 week of rewrite work. See [03-tier-1](./03-tier-1-quick-wins.md).

### 2. Content depth + freshness is missing for ~143 pages (Tier 2)

Pages at pos 31–50 with measurable impressions are *almost* relevant
but losing to richer pages. Common gaps:

- Thin (< 800 words)
- Missing comparison tables
- No FAQ block to capture PAA
- No author + last-updated signals
- No video/demo embed

Fixable in 2–4 weeks per batch. See [04-tier-2](./04-tier-2-content-depth.md).

### 3. Internal linking is sparse (sitewide)

~1,330 pages have **zero impressions** because Googlebot either
hasn't crawled them or has crawled them and decided they're not worth
indexing. The two main causes:

- **Orphan pages** — pages with <2 internal links pointing in
- **Hub starvation** — there's no cornerstone page concentrating
  authority for any topic cluster

This is the biggest unlock long-term. See [07-internal-linking](./07-internal-linking-topical-authority.md).

### 4. E-E-A-T signals are absent

Per untracked file inspection, components exist but aren't wired in:

- `components/seo/last-updated.tsx` — not on tool/compare/blog
- `components/seo/reviewed-by-our-team.tsx` — not on any page
- `lib/seo/freshness.ts` — built but not consumed

Google's quality raters explicitly look for these signals. AI
assistants also weight them when deciding what to cite.

### 5. Site quality drag from 529 pos-51+ pages

When most of your pages are pos 51+, Google treats the whole domain as
low quality. Aggressive prune/merge/noindex is required to lift the
authority of the pages that *can* rank. See [06-tier-4](./06-tier-4-prune-or-merge.md).

### 6. No AI search optimization layer

Today's user journey for "best AI coding assistant" is:
1. Google → AI Overview (~60% of clicks die here)
2. ChatGPT/Claude/Perplexity (~25% of queries)
3. Reddit (~10%)
4. Traditional blue links (the rest)

The site has zero `llms.txt`, no AI-Overview-optimized content
structure, no Reddit presence. We're playing 2020 SEO in a 2026 search
landscape. See [08-ai-search](./08-ai-search-aeo-geo.md).

## What we are NOT fixing in Phase 9

- **Site speed / Core Web Vitals** — assumed already passing. Check
  Vercel Analytics; only escalate if CrUX shows red.
- **Mobile UX** — same.
- **Hosting reliability** — Vercel handles this.
- **HTTPS / canonical / hreflang** — already correct in Next.js sitemap
  and metadata routes.
- **Backlink toxicity** — too small to be a problem at this scale.

Phase 9 is content + technical-SEO + distribution. Other concerns
belong to a future phase.
