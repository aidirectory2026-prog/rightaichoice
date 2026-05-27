# 06 — Noindex sweep + first GSC URL-Inspection audit (2026-05-27)

> Ran the Phase A noindex sweep and the first Tier-3 indexation audit on
> the same day. This doc captures what shipped and what the audit
> revealed — including a major finding that reframes the rest of Phase 9.

## What shipped (Phase A — noindex sweep)

10 hub pages + 12 comparison pages were marked `noindex, follow` (URLs
still resolve, but they're excluded from the sitemap and emit
`<meta name="robots" content="noindex,follow">` so Google drops them
from the index).

**Best/stacks/for pages** (mechanism: `noindex?: boolean` on the static
config in `lib/data/{best-pages,stacks,role-pages}.ts`; consumed by both
`generateMetadata` and the per-section `sitemap.ts`):

- `/best/agencies` (pos 86)
- `/best/design` (pos 82)
- `/best/writing` (pos 81)
- `/best/spreadsheets` (pos 74)
- `/best/cybersecurity` (pos 73 — also off-domain for our directory)
- `/best/cold-outreach` (pos 64)
- `/best/presentations` (pos 61)
- `/best/healthcare-ai` (pos 58)
- `/stacks/real-estate-agent` (pos 90, niche)
- `/for/real-estate-agents` (pos 80, niche)

**Comparison pages** (mechanism: new `noindex boolean` column on
`tool_comparisons` via migration `113_noindex_tool_comparisons.sql`;
also filters through every list query — sitemap, RSS feed,
IndexNow/Bing pings, llms-full.txt, related-compares rail, hub
listings):

- `/compare/expensify-vs-quickbooks` (non-AI)
- `/compare/expensify-vs-ramp` (non-AI)
- `/compare/aweber-vs-klaviyo` (non-AI)
- `/compare/shopify-vs-webflow` (non-AI)
- `/compare/skool-vs-thinkific` (non-AI)
- `/compare/circle-so-vs-skool` (non-AI)
- `/compare/carrd-vs-wix` (non-AI)
- `/compare/leadpages-vs-wix` (non-AI)
- `/compare/rewardful-vs-tapfiliate` (non-AI)
- `/compare/canva-vs-picsart` (AI-adjacent, low quality)
- `/compare/adobe-photoshop-vs-canva` (AI-adjacent, low quality)
- `/compare/heygen-vs-veedio` (AI but pos 84, niche)

**Skipped on purpose:**

- `/categories/business-finance`, `/categories/healthcare` — these are
  core taxonomy nodes. The right fix is better content, not noindex.

## 2026-05-28 update — full --all audit complete (1996 URLs)

The B3 follow-up audit ran to the 2,000/day quota cap. **The reframe
in this doc is now partially wrong**: the small-sample audit below
overstated tool-indexation health.

| Page type   | Inspected | Indexed | Rate  |
| ----------- | --------: | ------: | ----- |
| tool        | **1740**  | **1082**| **62%** |
| compare     | 100       | 34      | 34%   |
| category    | 15        | 13      | 87%   |
| best        | 51        | 50      | 98%   |
| stack       | 40        | 35      | 88%   |
| role        | 20        | 20      | 100%  |
| blog        | 16        | 16      | 100%  |
| static      | 14        | 8       | 57%   |

Bucket totals across the 1996-URL run:

- `Submitted and indexed` — 1258 (63%)
- `Discovered - currently not indexed` — **540 (27%)** ← crawl-budget bottleneck
- `URL is unknown to Google` — 171 (8.6%)
- `Duplicate without user-selected canonical` — 16 (0.8%)
- `Crawled - currently not indexed` — 9 (0.5%) ← content-quality bottleneck
- `Server error (5xx)` — 2

**Revised takeaway:**
1. Compares are still the worst rate (34%) — the B1 above-the-fold
   compare-link elevation (shipped 2026-05-28) remains the right move.
2. **Tools are the bigger absolute-volume problem**: 658 tool pages
   discovered-not-indexed vs ~66 compares. The earlier "tools are at
   93%" line was a top-100-by-view_count sample, not the full catalog.
3. The diagnostic split is **540 discovered-not-indexed** (crawl budget)
   vs **9 crawled-not-indexed** (content quality) — confirms the
   primary lever is internal linking, not editorial rewrites.

This redirects Phase 9 priority order for the rest of the week to:
1. Cornerstones + stack pillars (concentrate authority on hubs)
2. **Tool-page internal linking sweep** (B4 — was "next week", now
   moved up because the long tail is bigger than thought)
3. Continue compare-link elevation (B1)

4 tool URLs returned fetch failures during the audit and need
investigation: `coreweave`, `flatiron-health`, `resistant-ai`,
`gloat`.

## Original audit results — first 356 URLs inspected (small-sample)

Sampled top-100-by-view_count per page type (compares ordered by
`published_at desc`). Top-line numbers:

| Page type   | Inspected | Indexed | Rate  |
| ----------- | --------: | ------: | ----- |
| tool        | 100       | 93      | 93%   |
| best        | 51        | 50      | 98%   |
| stack       | 40        | 35      | 88%   |
| role        | 20        | 20      | 100%  |
| blog        | 16        | 16      | 100%  |
| category    | 15        | 13      | 87%   |
| static      | 14        | 8       | 57%   |
| **compare** | **100**   | **34**  | **34%** |

Bucket totals across the whole sample:

- `Submitted and indexed` — 269 (75.6%)
- `URL is unknown to Google` — 68 (19.1%) ← **discovery problem**
- `Discovered - currently not indexed` — 15 (4.2%) ← authority bottleneck
- `Duplicate without user-selected canonical` — 2 (0.6%)
- `Server error (5xx)` — 2 (0.6%)

## The reframe: compares are the bottleneck, not the long-tail tools

Going into this we assumed the 1,400 zero-impression tools were the
indexation problem to solve. The audit says otherwise:

**Top-100 tools** (by view_count) are **93% indexed**. The 7% gap is
mostly the long-tail seed data with no internal links yet.

**Top-100 compares** (by recency) are **only 34% indexed**. Even the
most recent editorial compares — the ones we're actively shipping —
aren't making it into Google's index.

That's a 3x larger problem hiding inside a smaller surface. ~1,000
editorial compares published, ~660 of them invisible to Google.

## Why compares fail to index

Three suspects based on the bucket distribution:

1. **Crawl-budget starvation.** Google grants new sites a tight budget.
   Tools get crawled first (linked from homepage + listing pages);
   compares only get linked from a related-compares rail at the bottom
   of other compare pages — circular, low priority.
2. **Template similarity.** Every compare uses the same MDX shell.
   Google's near-duplicate clustering may be folding them together.
3. **Thin perceived value.** Pages with short verdicts + sparse
   feature tables look like spec sheets, not editorial content.

## Phase B next actions (in priority order)

### B1 — Fix compares-as-orphans (this week)

The single highest-leverage move. Every editorial compare should be
linked from the two tool pages it compares — front and center, not
buried below the fold.

Today `getEditorialComparisonsForTool` exists (`lib/data/comparisons.ts:133`)
but lives in a "Compared with" rail that may or may not be prominent
on the tool page. Audit the tool page and elevate the compare links
to a position that signals authority transfer:

- Above-the-fold pill: "Compared with: Cursor, GitHub Copilot →"
- Treat compares as first-class navigation, not related content

This is also why the noindex sweep above filters
`getEditorialComparisonsForTool` — we don't want tool pages bleeding
authority into compares we've just marked noindex.

### B2 — Boost compare sitemap priority (today, included in this PR)

Compares currently ship at priority `0.8`. Bump to `0.95` to signal
crawl-budget preference. Tools stay at default. (Future PR — not
included here to keep this changeset reviewable.)

### B3 — Re-run the audit with `--all` (background, multi-day)

The audit checkpoints by URL so the next run picks up where this one
left off. 2,000/day quota means the full 2,781 URLs complete in ~2
days. Re-run gives us:

- Full compare-type distribution (is it 34% across all 1,000, or worse?)
- The "URL is unknown to Google" set for tools — likely the bottom
  of the view_count distribution

### B4 — Long-tail tool internal linking (next week)

For tools in the "URL is unknown to Google" bucket: surface them from
indexed siblings via "Similar tools" rail. Today the rail exists on
tool detail pages but pulls from `tool_categories` overlap; we should
weight UN-indexed tools higher so crawl flows down into the long tail.

## Files touched in this commit

```
lib/data/best-pages.ts         + noindex?: boolean on BestPageConfig + 8 flags
lib/data/stacks.ts             + noindex?: boolean on StackConfig + 1 flag
lib/data/role-pages.ts         + noindex?: boolean on RolePageConfig + 1 flag
lib/data/comparisons.ts        + .eq('noindex', false) on 5 query helpers
lib/seo/internal-links.ts      + .eq('noindex', false) on related-compares
app/best/[slug]/page.tsx       + robots: { index: false } from config
app/best/sitemap.ts            + .filter((p) => !p.noindex)
app/stacks/[slug]/page.tsx     + robots: { index: false } from config
app/stacks/sitemap.ts          + .filter((s) => !s.noindex)
app/for/[slug]/page.tsx        + robots: { index: false } from config
app/for/sitemap.ts             + .filter((r) => !r.noindex)
app/compare/[slug]/page.tsx    + robots: { index: false } from DB row
app/feed.xml/route.ts          + .eq('noindex', false) on compare RSS
app/api/cron/indexnow-recent/  + .eq('noindex', false) before pinging IndexNow
app/api/cron/submit-urls-bing/ + .eq('noindex', false) before pinging Bing
scripts/build-llms-full.ts     + .eq('noindex', false) before writing llms.txt
supabase/migrations/113_noindex_tool_comparisons.sql  (new)
```

## What to watch in GSC over the next 2 weeks

- Indexed-page count for compares should rise (B1 effect)
- Indexed-page count for the 22 noindex'd pages should drop to 0
- Total impressions should NOT drop — these pages weren't contributing
  meaningful traffic to begin with (all at pos 51+ with <10 impr/mo)
- Crawl-stats report should show steadier compare-page hits as
  crawl budget reallocates away from the noindex'd hubs
