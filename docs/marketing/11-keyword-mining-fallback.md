# Phase 7A.fallback — Keyword Mining: Suggest + Reddit + Quora

**Goal:** when GSC alone is too thin (e.g. site is < 6 months old, see `10-gsc-keyword-mining.md`), pull keyword opportunities from three additional sources and merge into a unified prioritized JSON for Phase 7B-7M.

**Sources:**

| Source | Auth | Cost | Runtime | Coverage |
|---|---|---|---|---|
| Google Suggest | None | Free | ~14 min | All 1,178 published tools, 7 query patterns each |
| Reddit (Apify) | APIFY_TOKEN | ~$1.20 | ~3-5 min | Top 300 by view_count, 2 patterns each |
| Quora (Apify) | APIFY_TOKEN | ~$3.05 | ~5-10 min | Top 300 by view_count, 1 pattern each |

**Total Apify spend:** ~$4-5 (well under typical free monthly Apify credit).

---

## Setup

### Prerequisite: Apify token

Already in `.env.local` as `APIFY_TOKEN` — same token used by other Apify-based scripts in the project. No additional setup needed for Reddit + Quora.

If your Apify free tier is exhausted, you can either:
- Top up at https://console.apify.com/billing
- Skip Reddit + Quora and run Suggest only (free)

### Google Suggest

No setup. Uses the public `suggestqueries.google.com/complete/search` endpoint that Google's own homepage search box hits.

---

## Usage

### Per-source dry-run (free, instant — confirms scope + cost before spending)

```bash
npm run mine:suggest:dry
npm run mine:reddit:dry
npm run mine:quora:dry
```

### Per-source apply (real run, real costs)

```bash
npm run mine:suggest:apply              # free, ~14 min
npm run mine:reddit:apply               # ~$1.20, ~5 min
npm run mine:quora:apply                # ~$3.05, ~10 min
```

Each writes its own JSON: `scripts/.suggest-opportunities.json`, `.reddit-opportunities.json`, `.quora-opportunities.json`.

### Single-tool smoke test (recommended before full run)

```bash
npm run mine:suggest:apply -- --slug=kit       # free, instant
npm run mine:reddit:apply -- --slug=kit        # ~$0.01, ~30s
npm run mine:quora:apply -- --slug=kit         # ~$0.05, ~30s
```

### Limit cohort

```bash
npm run mine:reddit:apply -- --top=100   # cohort: top 100 by view_count instead of 300
npm run mine:suggest:apply -- --limit=50 # only first 50 tools
```

### Merge all sources into one prioritized JSON

```bash
npm run mine:merge
```

Reads whichever source JSONs exist in `scripts/`, normalizes per-source scores to 0-100, applies source-priority weights, dedups within (tool_slug, page_type, normalized_keyword) triples, and writes `scripts/.keyword-opportunities.json`. This is the file Phase 7B-7M generation scripts read.

**Source weights (combined_score multipliers):**
- GSC: **1.0** (real impressions data — most reliable)
- Google Suggest: **0.7** (Google's autocomplete signal — implicit volume)
- Reddit: **0.5** (community discussion — engagement proxy)
- Quora: **0.4** (Q&A engagement — narrower audience than Reddit)

Cross-source consensus boosts confidence — a keyword that surfaces from both GSC and Suggest gets summed scores.

---

## Output schema

Each opportunity in `scripts/.keyword-opportunities.json`:

```json
{
  "tool_slug": "kit",
  "page_type": "compare",
  "target_keyword": "kit vs mailchimp",
  "source": "google-suggest",
  "combined_score": 47.3,
  "suggestion_rank": 1,
  "seed_query": "Kit vs"
}
```

`page_type` is one of: `compare | alternative | worth-it | how-to | use-case | pricing | unbucketed`. Source-specific fields (`current_position` for GSC, `reddit_score` for Reddit, etc.) are preserved on each row for downstream display.

---

## Recommended sequence

1. **Dry-run all three** to confirm scope + cost (~30 seconds total, no spending):
   ```bash
   npm run mine:suggest:dry && npm run mine:reddit:dry && npm run mine:quora:dry
   ```

2. **Smoke-test on `kit`** (~$0.06 total):
   ```bash
   npm run mine:suggest:apply -- --slug=kit
   npm run mine:reddit:apply -- --slug=kit
   npm run mine:quora:apply -- --slug=kit
   ```

3. **Full apply** (~25 min wall-clock, ~$5 total):
   ```bash
   npm run mine:suggest:apply
   npm run mine:reddit:apply
   npm run mine:quora:apply
   ```

4. **Merge**:
   ```bash
   npm run mine:merge
   ```

5. **Inspect the merged output**:
   ```bash
   jq '.bucket_totals' scripts/.keyword-opportunities.json
   jq '.opportunities | sort_by(-.combined_score) | .[:20]' scripts/.keyword-opportunities.json
   ```

---

## What this unblocks

`scripts/.keyword-opportunities.json` is the canonical priority signal for Phase 7B-7M generation:
- **7B (compare gen)** reads `compare` bucket, generates pages prioritized by combined_score
- **7C (alternatives)** reads `alternative` bucket
- **7D (worth-it)** reads `worth-it` bucket
- **7E (best-of)** reads `use-case` bucket
- **7L (cluster hubs)** reads top broad terms
- **7M (how-to)** reads `how-to` bucket
- **(future, unplanned: pricing pages)** reads `pricing` bucket

Within each bucket, top combined_score rows get pages built first. Tools with no opportunities in a bucket fall back to view_count-based prioritization.

---

## Re-run cadence

- **Suggest:** monthly (free) — Google's autocomplete drifts as search trends change
- **Reddit:** quarterly (~$1.20 each time) — discussion patterns are slower-moving
- **Quora:** quarterly (~$3.05 each time) — same as Reddit
- **GSC:** quarterly via `npm run mine:gsc:apply` (free)

After every run, re-run `npm run mine:merge` to refresh the unified output.

---

## Cost / quota notes

- **Apify** has a free monthly credit on the starter tier ($5/mo at time of writing). Reddit + Quora full runs together cost ~$4.25; should fit. Check current spend at https://console.apify.com/billing.
- **Google Suggest** has no documented quota. If you hit a 429 or 403 (rare), tighten the throttle in `lib/seo/suggest-client.ts:RateLimiter` from 10/sec to 5/sec.
- **Reddit-via-Apify** doesn't require any Reddit account or Reddit Developer App — the actor uses public scraping with no login needed.
- **Quora-via-Apify** uses Apify residential proxies (set automatically in the script) to avoid Quora's bot-detection.
