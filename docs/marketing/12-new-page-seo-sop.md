# New-Page SEO SOP & Automation Playbook

## Why this document exists

Every new page added to the site — tool, comparison, best-of, stack, role, blog, category — must meet a fixed quality bar **before** it ships. Pages that ship below the bar drag the site-wide average position down (this is exactly what happened to us: avg position drifted from 7 to 39 in 4 weeks because 179 thin programmatic pages diluted the 5 winning blog posts).

This SOP is the gate: if a page fails any rule here, it does **not** publish. Period. Not "we'll fix it later." Later never comes, and Google penalizes the whole domain for the worst 20% of pages.

The other half of this document is **automation**: every check below should be enforced by a script — not by memory, not by a checklist a human might skip. Where the script doesn't exist yet, the spec is included; build it before scaling more pages.

---

## The one-line rule

> **No page ships without (a) a primary keyword with a real search signal, (b) ≥500 words of unique value, (c) complete schema, (d) 3+ inbound internal links from already-indexed pages, and (e) a same-day IndexNow + sitemap re-ping.**

Every section below is a derivation of that rule.

---

## Page-type quality bars

Different page types serve different intents. The bar varies by type but is non-negotiable per type.

| Page type | Min words | Required schema | Min inbound links | Min outbound links | Notes |
|-----------|-----------|-----------------|-------------------|--------------------|-------|
| Tool detail (`/tools/[slug]`) | 600 | SoftwareApplication + FAQPage + AggregateRating (when reviews exist) + BreadcrumbList | 3 (from category, best-of, compare) | 5 (alternatives, category, stack, comparison) | "What is X" answer in first 100 words |
| Comparison (`/compare/[slug]`) | 1,500 | ItemList of SoftwareApplication + FAQPage + BreadcrumbList + Article (editorial) | 2 (from each tool page + category) | 4 (each tool, category, best-of) | Verdict in first 150 words. Table of differentiators above the fold. |
| Best-of (`/best/[slug]`) | 1,800 | ItemList + FAQPage + BreadcrumbList | 5 (from tools listed + category + blog) | 8 (every listed tool + adjacent best-of) | Top pick named in first paragraph. |
| Stack (`/stacks/[slug]`) | 1,200 | HowTo + ItemList + FAQPage + BreadcrumbList | 3 (from category + role pages) | 5 (each tool in stack + adjacent stacks) | Total cost stated in first 100 words. |
| Role (`/for/[slug]`) | 1,400 | ItemList + FAQPage + BreadcrumbList | 3 (from blog + best-of) | 6 (best-of, stacks, top 3 tools for that role) | Role-specific stack table above the fold. |
| Blog (`/blog/[slug]`) | 2,000 | Article + FAQPage + BreadcrumbList | 2 (from related blogs + homepage feature) | 10 (tools, comparisons, best-of) | Year in title. Data/stats in first 200 words. |
| Category (`/categories/[slug]`) | 800 | ItemList + FAQPage + BreadcrumbList | 3 (from homepage + adjacent categories + blog) | 12 (every published tool in category) | Category definition in first 100 words. |

Source for word-count floor: Google Helpful Content Update guidance + our own data — every page under 400 words in our index sits at position 50+ with <0.05% CTR.

---

## Pre-publish gate — the seven mandatory checks

### 1. Keyword has a real search signal

Don't write speculatively. Every page must target one primary keyword that has *one of*:

- ≥10 monthly impressions in our own GSC (positions 5–30 — proves Google already associates us with this term)
- ≥2 sources of demand in `.keyword-opportunities.json` (GSC + Suggest, or GSC + Reddit, etc.)
- ≥1 named query from Reddit or Quora mining with concrete intent

If none of these, the keyword is hypothetical — don't build the page.

**Automation:** `npm run audit:keyword -- --keyword="<phrase>"` should return PASS/FAIL with the evidence trail. Build this — currently keyword validation lives in mining scripts but isn't exposed as a one-shot pre-flight check.

### 2. Title and meta description follow the type formula

These formulas come from analyzing every page on our site that's ranking in positions 1–10 today.

| Page type | Title pattern (≤60 chars) | Meta description pattern (140–155 chars) |
|-----------|---------------------------|------------------------------------------|
| Tool | `{Tool} Review {Year} — {Differentiator}` | `{Tool} is a {category}. {One-line value}. Pricing from {price}. Pros, cons, alternatives, and our verdict inside.` |
| Compare | `{A} vs {B}: Which Wins in {Year}?` | `Side-by-side: {A} vs {B} on pricing, features, performance, and use cases. Verdict + best alternative for each.` |
| 3-way compare | `{A} vs {B} vs {C} ({Year})` | `Compare {A}, {B}, and {C} on {3 key dimensions}. Decision matrix + which to pick for each use case.` |
| Best-of | `{N} Best AI {X} in {Year} (Tested)` | `Independent ranking of the {N} best AI {X} tools — tested on real workflows. Pricing, pros, cons, and our top pick.` |
| Stack | `The {Goal} AI Stack — {N} Tools, ${Cost}/mo` | `Build a working {goal} workflow in under an hour using {N} AI tools. Total cost ${cost}/mo. Setup time {minutes}.` |
| Role | `Best AI Tools for {Role} ({Year})` | `The {N} AI tools every {role} should use in {year}. Hand-picked stack with pricing and time-saved estimates.` |
| Blog | `{Specific Claim or Number} — {Year}` | `{Data-driven hook}. {What the reader gets in one line}.` |
| Category | `AI {Category} Tools — {N} Reviewed ({Year})` | `Browse {N} AI {category} tools, ranked by viability and user reviews. Filter by pricing, integrations, and use case.` |

**Why these patterns work for us:** they pack the year (freshness signal), put the primary keyword in the first 30 characters (CTR boost in SERP), and the meta description front-loads what the reader gets — not what we sell.

**Automation:** `npm run audit:titles -- --new-only` should validate every newly-generated page against the pattern for its type and fail the publish if the title doesn't match the formula or is >60 characters.

### 3. The "first 100 words" rule

Google AI Overviews and every LLM citation engine read the first 100–200 words to decide if your page answers the query. **44% of all LLM citations come from the first 30% of page content.**

Rules:
- The primary keyword must appear in the first sentence.
- The direct answer to the query the page targets must be in the first 100 words. (For a comparison page, name a winner. For a best-of page, name the top pick. For a tool page, state what it does in one sentence.)
- No preamble. No "In this article we'll cover…" No "When it comes to…"
- Include one specific statistic or data point in the opening paragraph if available (pricing, benchmark score, market share, etc.).

**Automation:** `npm run audit:first-100 -- --pages=new` — parse the page, extract the first 100 rendered words (not HTML, rendered text), check for keyword presence + a sentence ending with a period inside the first 100 words. Fail the build if the opening reads like preamble.

### 4. Schema is complete and valid

Every page type's required schema is listed above. The content must:

- Use the helpers in `lib/seo/json-ld.ts` — don't hand-roll JSON-LD.
- Pass Google's Rich Results Test (https://search.google.com/test/rich-results) before publish.
- Have a working `publisher.logo` for any Article schema. (We just fixed this in `lib/seo/json-ld.ts` — earlier articles had invalid schema for ~4 weeks.)

**Automation:** Build `npm run audit:schema -- --pages=new` that runs every new page through a local JSON-LD validator (use the `schema-dts` types we already have, plus a render of the page's `<script type="application/ld+json">`) and fails the publish if any required field is missing.

### 5. Internal link graph — minimum inbound + outbound

A new page with zero inbound links is invisible to Google's crawler unless it's in the sitemap *and* gets explicitly indexed. Even then, it has no PageRank flow.

For each new page:

- At least N inbound links (see table above) from pages that are **already indexed** (not from other new pages — that's link spam).
- At least N outbound links to high-value internal targets.
- One link from at least one of the top 10 pages by impressions (our blog cluster currently — see `docs/marketing/top-100-gsc-indexing-list.md` and the live GSC top-pages report).

**Automation:** `npm run links:inject -- --page=/compare/cline-vs-aider` should:
1. Read the page's primary keyword and entity (e.g., the two tools being compared).
2. Query `tools`, `tool_comparisons`, `categories`, `posts` tables for topically related already-indexed pages.
3. Propose 5 inbound link sources and 5 outbound targets with anchor text.
4. Apply the inbound links automatically via a managed "related content" block on each source page, and inject outbound links into the new page's content.

`lib/seo/internal-links.ts` already has the helper functions; the orchestration script doesn't exist yet. Build it.

### 6. Same-day indexing actions

The moment a page deploys:

1. `npm run indexnow:submit` — push to IndexNow (Bing + Yandex, instant).
2. Sitemap auto-includes via `app/sitemap.ts`; verify the URL is in the new sitemap by hitting `https://rightaichoice.com/sitemap.xml | grep <slug>`.
3. Once a week, `npm run gsc:sitemap:submit` re-pings Google. Don't do this per-page (Google rate-limits).
4. For top-priority pages, manually submit via GSC URL Inspection (12/day quota — reserve for pages we expect to rank top-5).

**Automation:** Our daily orchestrator (`scripts/daily.ts`) already handles steps 1, 2, 3. The gap is **per-page priority signaling**: a page-publish flow that knows which of today's pages deserves a manual GSC submission slot vs. which can sit in the queue. Add a `pages.priority` column (low/medium/high) and have `scripts/daily.ts` print a "submit these 12 to GSC today" list each morning.

### 7. No duplicate-content cannibalization

Two of our own pages competing for the same query is worse than one strong page. Before publishing, check:

- Does another page on our site already rank for this keyword in positions 1–20? If yes, the new page must target a **different** keyword (a sibling long-tail variant) or it must be a planned upgrade that **replaces** the old page (with a 301 redirect).
- Are the title and H1 substantially different (>40% token-difference) from any existing page?

**Automation:** `npm run audit:cannibal -- --keyword="<phrase>"` reads from `.gsc-page-rankings.json` (a snapshot of every page-keyword pair we currently rank for) and flags conflicts. The snapshot script (`scripts/snapshot-gsc-rankings.ts`) doesn't exist yet — build it and run daily.

---

## The single command that ships a page

Every page-creation flow — programmatic batch, manual editorial, scripted catalog — should funnel through one command:

```bash
npm run page:publish -- --type=compare --slug=cline-vs-aider
```

What this command must do internally (build it once, use it forever):

1. Run all seven pre-publish checks above.
2. Hard-fail and exit non-zero on any failure with a precise message:
   - `FAIL: keyword "cline vs aider" has 0 GSC impressions and 0 mining sources — not a real keyword`
   - `FAIL: opening paragraph has 187 words before primary keyword "cline" appears`
   - `FAIL: page would have 1 inbound link, minimum is 2 for compare type`
3. On PASS:
   - Apply internal link injection (step 5).
   - Mark `pages.published_at = now()` in DB.
   - Rebuild and deploy.
   - Push to IndexNow.
   - Add to today's GSC priority list if priority=high.
   - Log to `logs/page-publish.ndjson` for auditing.

Until `page:publish` exists, run each check manually before merging — but the loop is fragile without it. Make the command the canonical gate.

---

## Smart strategies — what to write next, not just how

Quality gates above tell you *how* to write a page. These tell you *what* to write next.

### Strategy 1 — Mine our own ranking dirt

The single highest-leverage source of new-page topics is our own GSC data. **Positions 5–20 are where ranked pages live but aren't winning.** Each one is a request from Google saying "we'd rank you higher if you had a more specific page."

For every query we sit at position 8–20 with ≥20 monthly impressions, we have three options:

1. **Improve the page already ranking** (covered in Doc 13 — weekly loop).
2. **Build a more specific page** targeting a long-tail variant of that query.
3. **Build a comparison page** if the query has "vs" intent.

`npm run mine:gsc:apply` already pulls these queries. The new-page decision (option 2 vs 3) should be automated: `npm run plan:from-gsc -- --top=50` reads the opportunity file, classifies each query by intent, and proposes a backlog of 50 new pages with type + slug + estimated traffic.

### Strategy 2 — Cluster, then expand

Google rewards topical authority. 7–9 tightly interlinked pages around one topic is the threshold before AI Overviews start citing you. We have 5 winning blog posts on AI coding agents. The next 10 pages must extend that cluster, not start a new one:

- Comparisons among the agents (Cline vs Aider vs Continue — we have this; expand to 5 more pairs).
- "Best for [specific use case]" inside the agent category (best for refactoring, best for solo devs, best for monorepos, etc.).
- Tool detail pages for every agent mentioned in our blogs.
- Stack pages combining agent + IDE + workflow.

**Rule:** until any cluster has 9 pages, no new clusters get started. We diversified prematurely; it cost us 32 positions on the avg.

**Automation:** `npm run audit:clusters` reads the page graph, groups by primary topic embedding similarity, reports cluster size and rank-strength. Suggests the next 5 pages to fill the weakest cluster among those with momentum.

### Strategy 3 — Year stamping with rolling refresh

Every evergreen page gets a year in the title (Google CTR-tested boost). Pages without year stamps see ~25% lower CTR for "best-of" and "vs" queries. But year stamping creates a freshness debt: a "Best AI X 2026" page is dead weight on Jan 1, 2027.

**Solution:** auto-roll the year. Every Jan 1, `scripts/refresh-year-in-titles.ts` rewrites every title/meta containing the prior year, marks the page `last_refreshed_at = now()`, regenerates JSON-LD `dateModified`, and pushes IndexNow. Don't wait for a human; humans forget.

### Strategy 4 — Programmatic but proven

Programmatic compare pages can be a goldmine or poison depending on the seeding logic. Our current logic seeds from `.keyword-opportunities.json`, which is good — but the threshold is too low. Of our 115 compare pages, the bottom 30% are at avg pos 50+ and dragging us down.

**New rule before generating a programmatic page:** the (tool_a, tool_b) pair must have:

- ≥30 combined opportunity score in `.keyword-opportunities.json`, OR
- Both tools in our top 200 by view_count, OR
- ≥5 named user queries from Reddit/Quora mining matching "X vs Y" or "X or Y".

Below those floors, skip the pair. Quality over quantity. Update `scripts/generate-comparisons.ts` to enforce the floor and log every skipped pair with reason. We'd rather have 50 strong compare pages than 200 weak ones.

### Strategy 5 — Brand entity + sameAs everywhere

We finally fixed `publisher.logo` for Article schema. The next move: every tool page's `SoftwareApplication` schema should include a `sameAs` array linking to that tool's official site, Wikipedia (if it has a page), Twitter, LinkedIn, and GitHub. This builds the entity graph and is the single biggest signal for LLM citations (ChatGPT favors entity-rich content).

**Automation:** `npm run enrich:sameas -- --batch=100` queries Wikidata's API for each tool (we already have `tools.name` and `tools.website_url`) and populates a `tools.same_as_urls` JSON column. Render that column into the JSON-LD on the tool page.

### Strategy 6 — IndexNow + Bing first, Google second

90% of LLM citations come from pages ranked position 21+ in Google. Bing indexes faster than Google (24–48 hours vs 1–3 weeks for new sites). For LLM visibility, Bing is the primary surface, not Google.

**Rule:** every new page must be submitted to Bing within 1 hour of publish. We have `scripts/submit-urls-bing.ts` but it runs in a daily rotation (~100 URLs/day cycling for 30 days). For high-priority pages, that's too slow. Add a `--priority=urgent` flag that bypasses the rotation and submits within the next minute.

### Strategy 7 — Backfill before scale

We have 750 pages indexed. Before generating the next 1,000, the existing 750 must be CTR-audited and depth-audited. Adding more thin pages to a thin base accelerates the decay. The weekly loop in Doc 13 is the place for that audit — but the new-page SOP enforces the gate going forward: **if `audit:depth:thin` reports >50 pages under the word-count floor for their type, no new programmatic generation runs until that backlog is below 50.**

This is a circuit breaker, hard-coded into `scripts/generate-comparisons.ts` and `scripts/refresh-tools-batch.ts`. Both scripts should call `audit:depth:thin` at startup and abort if the threshold is breached.

---

## Automation we need to build

Everything above references scripts. Here's the consolidated list, sorted by ROI for our current situation (avg position 17→39, 49% impressions from 5 blog posts, compare/tool pages dragging us down).

| # | Script | npm alias | Effort | Blocks | Frequency | ROI |
|---|--------|-----------|--------|--------|-----------|-----|
| 1 | Pre-publish gate runner | `page:publish` | 2 days | Everything below; ensures every new page passes all 7 checks | per-publish | Critical — prevents all future quality decay |
| 2 | Keyword evidence validator | `audit:keyword` | 0.5 day | `page:publish` | per-publish | High — kills speculative pages at the gate |
| 3 | First-100-words validator | `audit:first-100` | 0.5 day | `page:publish` | per-publish | High — directly drives LLM citations |
| 4 | Schema validator | `audit:schema` | 1 day | `page:publish` | per-publish + nightly | High — invalid schema = no rich results |
| 5 | Internal link injector | `links:inject` | 2 days | `page:publish` | per-publish | High — current pages are link-orphans |
| 6 | Cannibalization checker | `audit:cannibal` | 1 day | `page:publish` | per-publish | Medium — prevents self-competition |
| 7 | GSC rank snapshot | `snapshot:rankings` | 0.5 day | `audit:cannibal`, Doc 13 | daily | High — the single dataset that powers everything |
| 8 | Backlog from GSC | `plan:from-gsc` | 1 day | n/a | weekly | High — tells us what to build next |
| 9 | Cluster audit | `audit:clusters` | 1.5 days | new-page batch generation | weekly | Medium — enforces topical authority |
| 10 | Year-roll refresh | `refresh:year-stamps` | 0.5 day | n/a | yearly + on-demand | Low — but unmissable on Jan 1 |
| 11 | sameAs enrichment | `enrich:sameas` | 1 day | tool-page render quality | one-shot, then nightly delta | Medium — LLM citation lift |
| 12 | Bing urgent submit | extend `bing:submit` | 0.5 day | `page:publish` | per-publish | Medium — Bing is 24h vs GSC's 3 weeks |
| 13 | Thin-page circuit breaker | extend `compare:apply` + `refresh:batch` | 0.5 day | further programmatic generation | every run | Critical — stops the bleeding |

**Build order:** 7 → 2 → 3 → 4 → 1 → 5 → 13 → rest. Start with the data layer (snapshot), then the validators that depend on it, then the gate that orchestrates them, then the smart automation.

Total effort: ~12 engineering-days. ROI: any one of #1, #5, #13 alone would have prevented the avg-position decay we're now trying to reverse.

---

## What "good" looks like — definition of done for a new page

A new page is done when **all** of these are true:

- [ ] `npm run page:publish -- --slug=<...>` exits 0.
- [ ] Page is rendered server-side (no client-only content that crawlers miss).
- [ ] Lighthouse score: Performance ≥85 mobile, Accessibility ≥90, Best Practices ≥90, SEO ≥95.
- [ ] Core Web Vitals: LCP <2.5s, CLS <0.1, INP <200ms (mobile).
- [ ] Page is in `https://rightaichoice.com/sitemap.xml`.
- [ ] IndexNow submission returned HTTP 200.
- [ ] Internal-link graph rebuilt (3+ in, N+ out per table).
- [ ] Logged to `logs/page-publish.ndjson` with timestamp + checks-passed.
- [ ] Added to the weekly GSC rank-tracking watchlist (Doc 13).

Anything less is a half-built page that hurts more than it helps.

---

## Cross-references

- **Doc 09** — Indexed Pages Strategy: the why (topical authority, page-count targets, LLM citation drivers).
- **Doc 10** — GSC Keyword Mining: how to populate `.gsc-opportunities.json`.
- **Doc 11** — Keyword Mining Fallback: when GSC has no data (new tools).
- **Doc 13** — Weekly GSC Optimization Loop: companion to this doc — covers already-published pages.
- **`lib/seo/json-ld.ts`** — every JSON-LD helper.
- **`lib/seo/internal-links.ts`** — link-suggestion primitives.
- **`scripts/daily.ts`** — orchestrator we'll extend with the new automation above.
