# 03 — Tier 1: Quick Wins (101 pages, CTR rewrite)

> **Goal:** Take the 101 pages currently at pos 1–30 and rewrite their
> titles + meta descriptions so they earn the click. Target: lift CTR
> from ~0.1% to ~3–5% within 14 days. That alone gets us from 8 clicks
> to ~400 clicks per week.
>
> **Special case — the homepage is its own Tier-1 page.** It currently
> ranks #2 for our own brand name and doesn't rank for any stack
> query. It needs more than a title rewrite — full architecture
> overhaul + positioning shift + CTA fix. See
> [doc 13](./13-homepage-positioning-and-brand-defense.md) for that
> work. This doc covers the other 100 pages: tools, comparisons,
> blog posts, alternatives. **Voice/positioning:** rewrites should
> reinforce "decision engine" wherever natural (e.g., comparison meta
> descriptions say "our verdict" not "feature comparison").

## Why these 101 pages first

These pages are already *almost* working — Google decided they're
relevant enough to rank. The only thing standing between you and traffic
is whether the SERP result is *more compelling* than competitors. Title
+ meta description are the entire pitch.

Importantly: title/meta rewrites are **the only SEO intervention that
delivers measurable lift in 7–14 days**. Content depth changes take 4–8
weeks to re-crawl + re-rank. Backlinks take 2–6 months. So this is the
fast-payoff tier.

## The 101 — selection logic

From `gsc_snapshots` (28d window):

```sql
SELECT (r->>'page') AS page,
       SUM((r->>'impressions')::float)::int AS impr,
       SUM((r->>'clicks')::float)::int AS clicks,
       SUM((r->>'position')::float * (r->>'impressions')::float) /
         NULLIF(SUM((r->>'impressions')::float), 0) AS avg_pos
FROM gsc_snapshots, jsonb_array_elements(rows) r
WHERE scope = '28d' AND snapshot_date = (SELECT MAX(snapshot_date) FROM gsc_snapshots WHERE scope='28d')
GROUP BY 1
HAVING SUM((r->>'impressions')::float) / NULLIF(SUM((r->>'impressions')::float), 0) > 0  -- always true; placeholder
   AND SUM((r->>'position')::float * (r->>'impressions')::float) /
         NULLIF(SUM((r->>'impressions')::float), 0) < 31
ORDER BY impr DESC
LIMIT 101;
```

Save to `candidates/tier1-page-list.json`.

## Three sub-tiers within Tier 1

Different positions warrant different rewrite strategies:

### Tier 1A — pos 1–10 (33 pages): "earn the click"

**Problem:** Already on page 1. Title isn't compelling.
**Fix:** Lead with the user's actual question, end with a hook.

**Title formula:** `{Primary keyword} — {Specific benefit / number / year}`

Examples:
- ✗ Before: `Duolingo vs Loora — RightAIChoice`
- ✓ After: `Duolingo vs Loora: Which AI Language App Wins in 2026? (Honest Side-by-Side)`

- ✗ Before: `AlphaSense vs Claude`
- ✓ After: `AlphaSense vs Claude: Research AI Showdown — Features, Price, Verdict`

**Meta formula:** `Direct answer in 1 line. + Why our take is trusted (sentiment / freshness). + CTA.`

- 150–158 chars (anything longer truncates)
- Include the primary keyword in the first 60 chars
- End with implicit CTA ("See the verdict", "Compare features", "Get the breakdown")

### Tier 1B — pos 11–20 (32 pages): "break onto page 1"

**Problem:** On page 2. CTR is near-zero because users rarely click past
page 1.
**Fix:** Both rewrite the title for keyword precision AND signal
freshness/depth to Google so the page itself moves up.

**Title formula:** `{Long-tail keyword variant matching actual user query} — {Year}`

Look up the *actual queries* this page is ranking for (in `gsc_snapshots`
when we have query-level data, or in GSC console). Rewrite the title to
match the most common query *verbatim* — Google rewards exact-match
relevance.

**Body change at the same time:**
- Add H2 that mirrors the title
- Add a 3-row comparison table near the top
- Add `dateModified` (already done in foundation step 3)
- Trigger reindex via IndexNow + Bing

### Tier 1C — pos 21–30 (36 pages): "push into top 20"

**Problem:** Off-page-2. Title rewrites alone probably won't move them.
**Fix:** Title + meta rewrite + force re-crawl + light content touch.

Apply the same title/meta improvements as 1B, plus:
- Add 200–300 words of unique commentary near the top
- Add FAQ block (3–5 questions sourced from PAA — see [09](./09-snippets-paa-serp-features.md))
- Submit URL to IndexNow + GSC URL Inspection request-indexing

## Title/meta rewrite tooling

### Step 1 — Build candidate list (30 min)

Script: `scripts/build-tier1-candidates.ts`

Reads `gsc_snapshots`, joins with `tools` / `comparisons` / `posts` for
current title + meta, writes `candidates/tier1-page-list.json`:

```json
[
  {
    "url": "/compare/duolingo-vs-loora",
    "page_type": "comparison",
    "current_title": "Duolingo vs Loora",
    "current_meta": "Compare Duolingo and Loora — features, pricing, and use cases.",
    "impressions": 223,
    "clicks": 1,
    "avg_pos": 8.1,
    "top_queries": ["duolingo vs loora", "loora vs duolingo", "loora pricing"],
    "sub_tier": "1A"
  }
]
```

### Step 2 — AI-assisted rewrites (1 hour)

Script: `scripts/rewrite-titles-tier1.ts`

For each candidate, call DeepSeek with this prompt:

```
You are an SEO copywriter. Rewrite the title and meta description for
the page below to maximize click-through rate from Google search.

Page type: {page_type}
Current title: {current_title}
Current meta: {current_meta}
Primary query (highest impressions): {top_queries[0]}
Other queries: {top_queries[1:]}
Position: {avg_pos}
Sub-tier: {sub_tier}

Rules:
1. Title: 55–60 chars max. Include the primary query verbatim. Add a
   number, year, or specific benefit. No clickbait.
2. Meta: 150–158 chars. Lead with a direct answer. Reference our
   editorial process (sentiment-aggregated / human-reviewed). End
   with implicit CTA.
3. Avoid: "best", "ultimate", "top" unless backed by a number.
4. Avoid: brand-only titles like "Tool Name — RightAIChoice".

Output JSON:
{
  "title": "...",
  "meta": "...",
  "rationale": "one-line explanation"
}
```

Write outputs to `candidates/tier1-rewrites.json` for human review.

### Step 3 — Admin review UI (1 hour)

Build a page at `/admin/tier1-review` that lists the 101 candidates
side-by-side: current title/meta vs proposed title/meta. Each row:

- Approve → writes the new title/meta to the row's source table
  (`tools.seo_title`, `tools.seo_meta`, etc.)
- Reject → leaves it
- Edit → inline-edit the AI proposal and approve

This must exist before we push live changes. AI rewrites are good but
need human gating, especially for brand pages.

### Step 4 — Push first batch of 10 (45 min)

Pick 10 of the highest-impression pages from the rewrite list. Hand-edit
to perfection. Push. Trigger:

- IndexNow ping for the 10 URLs
- GSC sitemap resubmit (already happens weekly via cron)
- Bing direct submit

### Step 5 — Measure (Day 7, 14, 28)

- Pull a fresh `gsc_snapshots` row Day 7
- Compute Δposition and Δclicks vs baseline (2026-05-26)
- Pages that moved up + got clicks → confirm pattern works
- Pages that didn't → roll back title or escalate to Tier 2 treatment

The new `gsc_diffs` infrastructure makes this measurement automatic
starting next Monday's snapshot.

## Title/meta library — proven patterns

Save these to reuse:

### Comparison pages

- `{A} vs {B}: Which Is Better in {Year}? Side-by-Side {Feature} Comparison`
- `{A} vs {B}: We Tested Both — Honest Verdict ({Year})`
- `{A} vs {B}: Pricing, Features, and Use Cases Compared`
- `{A} vs {B} vs {C}: The Only Comparison You'll Need ({Year})`

### Tool pages

- `{Tool}: Honest Review, Pricing, and Alternatives ({Year})`
- `{Tool} Review {Year}: Features, Pricing, Pros & Cons`
- `Is {Tool} Worth It? Real User Sentiment + Pricing Breakdown`

### Blog posts

- `{Question}? Here's the Data (Tested {Year})`
- `{Topic} in {Year}: Benchmarks, Costs, and What to Pick`

### Alternatives pages

- `{N} Best {Tool} Alternatives ({Year}) — Free, Paid, Open-Source`
- `Looking for a {Tool} Alternative? {N} Tools We Actually Use`

## Risks & how we mitigate

- **Risk:** AI rewrite produces bland/generic titles.
  **Mitigation:** Human review on every single one. No bulk-push.
- **Risk:** New title doesn't match user intent → CTR falls instead of
  rises.
  **Mitigation:** Diff snapshot at Day 7. Anything with worse CTR + same
  position → revert in 24 hours.
- **Risk:** Pushing too many changes at once confuses Google's
  attribution.
  **Mitigation:** Stagger in batches of 10–20, 3–4 days apart.
- **Risk:** Title is now too long and truncates in SERP.
  **Mitigation:** Enforce 60-char limit in the rewrite script. Validate
  with the SERP simulator.

## Definition of done

- 101 page list generated and exported
- AI rewrites produced for all 101
- Admin review UI live
- First 10 pages live with new titles
- Day-7 measurement scheduled (gsc_diffs cron handles this)
- Pattern from `cline-vs-aider-vs-continue` (10% CTR) reverse-engineered
  and applied to comparable pages

## When this is complete, move to:

- [04-tier-2](./04-tier-2-content-depth.md) — content depth for pos 31–50
- [09-snippets-paa](./09-snippets-paa-serp-features.md) — featured snippet hunting on the same 101 pages
