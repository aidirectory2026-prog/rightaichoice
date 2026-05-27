# 06 — Tier 4: Prune or Merge (529 pages, pos 51+)

> **Goal:** Decide the fate of 529 pages that rank pos 51+ with measurable
> impressions. Aggressive triage — improve, merge, or noindex. Doing
> nothing is the wrong answer: each weak page drags sitewide quality.

## 2026-05-28 status — first wave shipped (22 pages noindex'd)

The most obvious noindex candidates were shipped on 2026-05-28 as the
**first wave** of Tier 4 (commit `de770ff`, doc
[14](./14-noindex-sweep-and-audit-findings.md)). 22 pages with avg pos
58–90 and single-digit impressions are now `noindex, follow`:

- 10 hub pages (best/stacks/for) — agencies, design, writing,
  spreadsheets, cybersecurity, cold-outreach, presentations,
  healthcare-ai, real-estate-agent (stack), real-estate-agents (role)
- 12 comparison pages — 8 non-AI (Expensify×2, Aweber/Klaviyo,
  Shopify/Webflow, Skool×2, Carrd, Leadpages, Rewardful) + 3
  AI-adjacent low-quality (Canva×2, Heygen)

This is **22 of the 529** flagged for Tier 4 — the no-judgment-call
slice (off-domain, non-AI, niche). The remaining ~500 require the
decision-matrix triage below.

## Why prune at all?

Google's site-wide quality assessment penalizes sites with a high ratio
of low-value pages. Every page that ranks pos 51+ with negligible
clicks is a vote against the domain. We have 529 such pages — that's a
real anchor.

Removing or improving them isn't optional; it's a precondition for the
rest of the strategy to compound.

## The 529 — overview

From the 28d snapshot:

- 529 pages at avg pos > 50
- 11,819 total impressions across them (≈22/page average)
- 1 click total

These are pages Google considered relevant to *some* query, but ranked
so low that no one clicked. Three explanations:

1. **Right intent, wrong execution** — page targets a real query but
   isn't competitive (thin, generic, no schema). → improve or merge
2. **Wrong intent** — page is templated for a query Google doesn't
   think it answers well. → noindex or merge
3. **Cannibalization** — multiple pages compete for the same query,
   none wins. → pick one canonical, merge or noindex the rest

## Decision matrix

For each page, classify with this rubric:

| Criterion                                                       | Score |
| :-------------------------------------------------------------- | ----: |
| Impressions ≥ 30 in 28d                                         |    +2 |
| Has unique content (not template-only)                          |    +2 |
| Belongs to a strategic cluster (see [07](./07-internal-linking-topical-authority.md)) |  +1 |
| Has external backlinks (any)                                    |    +2 |
| Has a sibling page that covers the same query better            |    -2 |
| Word count < 300                                                |    -2 |
| Auto-generated with no editorial review                         |    -1 |

| Final score   | Action                            |
| :------------ | :-------------------------------- |
| ≥ 4           | **Improve** (Tier 2 treatment)    |
| 1 to 3        | **Improve OR merge**, case by case|
| 0 or negative | **Merge** if sibling exists, else **Noindex** |

## Three actions, three playbooks

### Action A — Improve (Tier 2 promotion)

Page graduates to Tier 2 treatment. Apply the structural depth pass
(FAQ, table, byline, internal links) and re-evaluate at next snapshot.

Typical volume: ~80–120 of the 529.

### Action B — Merge

Two patterns:

1. **Content merge** — copy the best material from the loser page into
   the winner, then 308 the loser. We already have `merged_into` field
   on `tools` for this and the redirect logic is live.
2. **Just redirect** — if the loser has nothing worth keeping, set
   `merged_into` and let the 308 do its thing. (We just shipped the
   re-crawl trigger for these — see `scripts/resubmit-merged-tool-urls.ts`.)

Typical volume: ~150–200 of the 529.

### Action C — Noindex + sitemap remove

For pages with no improvement path and no merge target:

1. Add `<meta name="robots" content="noindex,follow">` to the page
2. Remove from sitemap
3. Wait for Google to re-crawl and drop the URL (2–8 weeks)
4. After drop confirmed, optionally 410 the URL or leave as `noindex`
   indefinitely

Typical volume: ~200–250 of the 529.

## Cannibalization audit (do this first)

Before triaging individually, find groups of pages competing for the
same query. SQL on snapshot's per-page query data:

```sql
-- pseudo: pull every (page, query) pair from snapshot rows, then group
-- by query to find queries where >1 of our pages appear
SELECT query, array_agg(DISTINCT page) AS pages, COUNT(*) AS n
FROM (
  SELECT (r->>'page') AS page,
         (r->>'query') AS query
  FROM gsc_snapshots, jsonb_array_elements(rows) r
  WHERE scope = '28d' AND snapshot_date = (SELECT MAX(snapshot_date) FROM gsc_snapshots WHERE scope='28d')
) x
GROUP BY query
HAVING COUNT(DISTINCT page) > 1
ORDER BY COUNT(*) DESC
LIMIT 100;
```

For each cannibalized query:

- Pick the strongest page as canonical (highest impressions or best
  intent match)
- Noindex or merge the weaker pages into it

Typical: 30–80 cannibalized queries on a site this size. Solving these
alone could lift 50–100 page positions.

## Tooling

### Script — `audit-tier4-pages.ts`

For each of the 529 URLs:

1. Fetch HTML, extract word count + key sections
2. Look up sibling candidates (same category + similar slug)
3. Compute decision score
4. Emit `candidates/tier4-decisions.json`:

```json
{
  "url": "/tools/some-low-rank-tool",
  "score": -3,
  "recommended_action": "merge",
  "merge_target": "/tools/canonical-tool",
  "rationale": "Word count 187, no backlinks, sibling exists",
  "current_impressions": 12,
  "current_avg_pos": 58.4
}
```

### Admin view — `/admin/tier4-triage`

Lists all 529 with decision + recommended action. Bulk-approve in
batches of 25–50. Pushes:

- For Improve: queues for Tier 2 batch
- For Merge: sets `merged_into` + triggers re-crawl resubmit
- For Noindex: adds to noindex list (read by the rendering layer) +
  drops from sitemap

## Timeline

| Week | Activity                                                  |
| ---: | :-------------------------------------------------------- |
|    1 | Run audit + cannibalization queries; review decisions     |
|    2 | Push first 100 noindex decisions; first 50 merge decisions|
|    3 | Push remaining noindex + merge actions in batches         |
|    4 | Sitemap re-submit; trigger IndexNow on affected URLs      |
|  5–8 | Monitor: confirm Google drops the noindexed/merged URLs   |
|    9 | Final accounting — how many of 529 disappeared from index?|

## Expected outcome

- Sitemap shrinks from ~2,100 to ~1,400 URLs
- Sitewide quality signal improves (no objective measure, but Google's
  internal score lifts)
- Cluster head pages absorb authority from merged children
- Tier 1 and 2 pages benefit from less internal competition

## Risks

- **Over-noindex** — could remove pages that were about to start
  working. Mitigation: 60-day true-zero rule + cannibalization confirmation.
- **Wrong merge target** — content merged into wrong canonical loses
  context. Mitigation: human review of every merge before push.
- **Drop in impressions short-term** — by definition, removing pages
  removes the impressions they generated. Acceptable: those impressions
  weren't producing clicks anyway.

## Definition of done

- All 529 pages audited and decisioned
- Cannibalization map produced
- Sitemap pruned and resubmitted
- Re-crawl triggered on all affected URLs
- Sitewide impression count tracked weekly to detect over-pruning

## When this is in flight, move to:

- [04-tier-2](./04-tier-2-content-depth.md) — Improve-action pages flow here
- [07-internal-linking](./07-internal-linking-topical-authority.md) — merged children's authority redirects to canonicals
