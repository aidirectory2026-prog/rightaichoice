# Weekly GSC Optimization Loop — Currently-Ranked Pages

## Why this document exists

Doc 12 governs every new page we add. This doc governs every page already in the index. Both are needed. Most SEO operations break because the team focuses entirely on production — new pages, more pages — and never re-visits what's already ranking. Currently-ranked pages are the highest-leverage real estate we have. They already passed Google's quality bar. A 2-position improvement on a page at position 12 with 1,000 impressions/month is worth more than launching 20 new pages at position 70.

Our situation forces this discipline:

- **750 indexed pages** as of 2026-05-18.
- **Avg position drifted from 7.2 to 39** in 27 days (honeymoon decay + thin programmatic pages dragging average).
- **CTR is 0.17% site-wide** — at avg position 17 that should be 1.5–2%; we're losing ~9× the clicks we should be getting.
- **49% of impressions come from 5 blog pages.** Compare pages (115) get 27% at avg pos 27.5; tool pages (64) get 11% at avg pos 39.9.

There's no shortage of opportunity. The opportunity is hidden in GSC and we're not looking at it weekly. This document is the schedule, the playbook, and the automation spec that turns "look at GSC weekly" into a deterministic, mostly-automated loop.

---

## The weekly cadence

Every Monday morning, the loop runs. The same 6 steps, same order, same automation, every week.

| Day | Time | Step | Who | What |
|-----|------|------|-----|------|
| Mon | 06:00 ET | 1. Snapshot | cron | Pull all GSC data for the prior 7 days + 28 days. Write to `.gsc-snapshots/YYYY-MM-DD.json`. |
| Mon | 06:30 ET | 2. Diff | cron | Compare this snapshot to last week's. Compute deltas per page-keyword pair. Write `.gsc-diff-YYYY-MM-DD.json`. |
| Mon | 07:00 ET | 3. Triage | cron | Apply the triage matrix below. Emit `.gsc-actions-YYYY-MM-DD.json` — a typed list of recommended actions per page. |
| Mon | 09:00 ET | 4. Review | operator | 15-min triage session. Approve/reject each action. Output: a sprint backlog of 5–15 page edits for the week. |
| Tue–Thu | — | 5. Execute | mostly auto | Run the scripted fixes (title rewrites, internal link injections, content depth expansions, schema repairs, redirects/noindex). Manual review only where required. |
| Fri | 16:00 ET | 6. Measure & log | cron | For pages we touched on Tue–Thu, push IndexNow + GSC re-inspect requests, log to `logs/weekly-loop.ndjson`, and start the impact-tracking watch (results visible Mon following). |

This loop runs forever. Every Friday's "what did we change" feeds the next Monday's diff.

---

## Step 1 — Snapshot (automated)

Every Monday 06:00, `scripts/snapshot-gsc-rankings.ts` runs:

```bash
npm run snapshot:gsc
```

What it pulls (via `lib/seo/gsc-client.ts` already in place):

1. Site-wide totals for last 7d and 28d (clicks, impressions, CTR, avg position).
2. Page-level data for top 5,000 pages by impressions, last 28d. Dimensions: `[page, query]` so we get per-(page, query) rows. Rate-limit aware: GSC tops out at 25,000 rows per query — paginate.
3. Page-level URL-Inspection result for our top 100 highest-priority pages (sampled across page types). Bucketed: indexed / discovered-not-indexed / crawled-not-indexed / excluded.
4. Sitemap submission state for every sitemap.

Output: one JSON file at `.gsc-snapshots/YYYY-MM-DD.json` plus a tabular summary written to `logs/gsc-weekly-report.md` for human eyeballs.

**Script does not exist yet — build it.** Templates already exist in `scripts/audit-gsc-indexation.ts` (URL inspection logic) and `scripts/mine-gsc-keywords.ts` (search analytics logic). Compose them.

---

## Step 2 — Diff (automated)

`scripts/diff-gsc-snapshots.ts` compares this week's snapshot to last week's:

```bash
npm run diff:gsc -- --from=2026-05-11 --to=2026-05-18
```

For every page-keyword pair present in both snapshots, compute:

- `delta_position` — negative is good (moved up the SERP).
- `delta_impressions` — absolute and percentage.
- `delta_clicks` — absolute and percentage.
- `delta_ctr` — percentage point change.
- `signal` — one of `winning | losing | flat | new | lost`. Definitions:
  - `winning`: position improved ≥2 ranks and impressions ≥ last week.
  - `losing`: position dropped ≥3 ranks OR impressions dropped ≥25% OR CTR dropped ≥0.5pp.
  - `new`: this page-keyword pair appeared this week (wasn't in last week's data).
  - `lost`: this pair was in last week's top 5,000 but not this week's.
  - `flat`: anything else.

For every page (regardless of keyword), compute aggregate signals too. A page can be "winning" on its primary keyword but losing overall.

Output: `.gsc-diffs/diff-YYYY-MM-DD.json`.

---

## Step 3 — Triage (automated)

The triage matrix is what turns the diff into a list of actions. This is the brain of the loop. Below is the deterministic rule set; build it as a pure function in `lib/seo/triage.ts` so it can be unit-tested.

### Triage matrix — page-level

Input: a page's aggregate stats from this week's snapshot + the diff vs last week.

| Condition | Action | Priority | Automation |
|-----------|--------|----------|------------|
| pos 1–3, CTR ≥ expected (4–10%), impr ≥ 100 | Leave it. Add to "watchlist" so we notice if it slips. | — | none |
| pos 1–3, CTR < expected, impr ≥ 50 | **Rewrite title/meta for CTR.** Test pattern variants. | High | `script:title-rewrite -- --page=...` |
| pos 4–10, impr ≥ 50, trend = losing | **Refresh content + add 3 internal links from blog cluster.** Push the date forward (freshness). | High | `script:refresh-page` |
| pos 4–10, impr ≥ 50, trend = winning or flat | Leave it; add to watchlist. | — | none |
| pos 11–20, impr ≥ 30 | **Content depth + schema audit.** Likely thin or missing FAQ/HowTo. Add an FAQ block from mined questions. | High | `script:depth-expand` |
| pos 11–20, impr < 30 | Probably a long-tail with low demand — leave or merge into a parent page. | Low | manual decision |
| pos 21–50, impr ≥ 20 | **Internal link injection + title rewrite to match query intent.** Pages this deep are usually missing inbound link signals or the title doesn't match search intent. | Medium | `script:links-inject` + `script:title-rewrite` |
| pos 21–50, impr < 20 | Candidate for noindex/merge. | Low | manual decision |
| pos 51+, impr ≥ 10 | **Investigate quality.** If page <400 words for its type, either rewrite or noindex. | Medium | `script:depth-flag` |
| pos 51+, impr < 10 | **Noindex.** This page is dragging the site average. | High | `script:noindex --slug=...` |
| coverageState = "Discovered – currently not indexed" for >14 days | **Boost authority.** Add 5+ inbound links from indexed pages + manual GSC submit. | High | `script:boost-discovery` |
| coverageState = "Crawled – currently not indexed" for >14 days | **Content quality issue.** Rewrite or noindex. | High | `script:depth-expand` or `noindex` |
| coverageState = "Duplicate, Google chose different canonical" | **Canonical fix.** Inspect the canonical chain, fix the canonical tag, IndexNow re-submit. | High | `script:canonical-fix` |
| coverageState = "Excluded by 'noindex' tag" but we didn't intend it | **Remove noindex meta.** Bug investigation. | Critical | manual |
| Page is in top 50 of site by impressions, last touched >90 days ago | **Mandatory refresh.** Update content, bump dateModified, IndexNow. | Medium | `script:refresh-page` |

### Triage matrix — query-level (per page-keyword pair)

Run *after* page-level. These are surgical: a page might be ranking fine overall but losing on one key query.

| Condition | Action | Priority |
|-----------|--------|----------|
| Query has impr ≥ 50, pos 11–20, page already exists for it | **Re-optimize for that query.** Add the exact-match query phrase to an H2 or to the opening paragraph if missing. | High |
| Query has impr ≥ 30, pos 4–10, but CTR < 2% | **Title contains the query?** If no, rewrite title to include it. If yes, rewrite meta to be more compelling. | High |
| Query has impr ≥ 100 (any pos), we have no page targeting it | **New page opportunity** (handoff to Doc 12). Add to `plan:from-gsc` backlog. | Medium |
| Query is "branded" (contains "rightaichoice" or our brand variants) but ranking <5 | **Branded-query SOS.** This is a critical health signal — our brand should rank #1 on its own name. Investigate immediately. | Critical |

### Output of triage step

`.gsc-actions-YYYY-MM-DD.json`, shaped like:

```json
[
  {
    "page": "/compare/cline-vs-aider-vs-continue",
    "current_position": 7.8,
    "current_impressions_28d": 676,
    "actions": [
      { "type": "title_rewrite", "reason": "CTR 1.3% at pos 7.8, expected 4-6%", "priority": "high" },
      { "type": "links_inject", "reason": "only 1 inbound link, type requires 2", "priority": "medium" }
    ]
  }
]
```

Operator sees this file in Monday's review — see Step 4.

---

## Step 4 — Review (operator, 15 minutes)

Monday morning, after the cron jobs finish, open the report:

```bash
npm run loop:review
```

This command:

1. Loads `.gsc-actions-YYYY-MM-DD.json`.
2. Renders a terminal-friendly table of the top 20 recommended actions sorted by priority + expected impact (impressions × CTR-uplift estimate).
3. Lets you accept/reject each with `a` (accept), `r` (reject), `s` (skip — re-evaluate next week).
4. Writes the accepted actions to `.gsc-sprint-YYYY-MM-DD.json` — this is the week's backlog.

15 minutes max. If it takes longer, the triage rules need tightening, not the operator's time.

The operator's only judgment calls in this loop are:

- Should this page get a noindex or a rewrite?
- Is this "branded query SOS" a real bug or a fluke?
- For pages with multiple proposed actions, what order should they happen in?

Everything else is automatic.

---

## Step 5 — Execute (mostly automated, Tue–Thu)

For every accepted action, one script runs. Each script is idempotent (safe to re-run), commits its own changes, and logs to `logs/weekly-loop.ndjson`.

### Script: `script:title-rewrite`

```bash
npm run script:title-rewrite -- --slug=cline-vs-aider --reason="ctr-low"
```

What it does:

1. Reads current title + meta + page content.
2. Reads the page's top 5 queries from this week's snapshot.
3. Generates 3 title variants using the type-specific formula in Doc 12.
4. Validates each variant: ≤60 chars, primary keyword in first 30 chars, year present (if formula requires).
5. Picks the variant whose top-keyword density best matches search intent (heuristic: highest fraction of top-5-query tokens contained).
6. Writes the change directly to the file (`app/compare/[slug]/page.tsx` for compare type — for DB-backed pages, updates `tools.seo_title` / `tool_comparisons.seo_title`).
7. Commits the change with a structured commit message including before/after.
8. Triggers IndexNow.

Operator review: the diff is shown before commit. One-keystroke approve.

### Script: `script:refresh-page`

```bash
npm run script:refresh-page -- --slug=ai-coding-assistant-leaderboard-swe-bench-humaneval-2026
```

For data-driven pages (leaderboards, best-of, comparisons): re-pull source data, regenerate the body, update `dateModified` in JSON-LD, bump `last_refreshed_at` in DB, push IndexNow.

For evergreen blog/editorial: append a "Last updated: {date}" line, regenerate one section (the one with stalest stat), update `dateModified`.

### Script: `script:depth-expand`

```bash
npm run script:depth-expand -- --slug=tools/foo
```

For pages flagged thin or stuck in "Crawled – not indexed":

1. Compute current word count.
2. Identify the section types missing per Doc 12's schema requirements (often FAQ or use-cases on tool pages).
3. Pull mined questions from `.reddit-opportunities.json` / `.quora-opportunities.json` / Google Suggest mining for that tool.
4. Generate the missing block (FAQ, use cases, integration list, pricing tiers) via the same LLM pipeline used in `generate-comparisons.ts`.
5. Insert into DB.
6. Re-render, push IndexNow.

### Script: `script:links-inject`

```bash
npm run script:links-inject -- --slug=tools/foo
```

The bidirectional automation specified in Doc 12 §5. For an already-published page:

1. Identify 5 topical neighbors in the existing index using vector similarity over titles + categories.
2. Inject a "Related" block in the source pages pointing here.
3. Inject 3 contextual inline links from this page out to top adjacent pages.

### Script: `script:noindex`

```bash
npm run script:noindex -- --slug=tools/dead-tool
```

Adds `noindex, follow` to the page's metadata (via `lib/seo/metadata.ts`). Removes URL from sitemap by setting `tools.is_published = false` or equivalent for the page type. Logs a NDJSON entry with reason ("position 67 with 2 impr/mo for 8 consecutive weeks"). On the next weekly snapshot, this page should drop out of the index, lifting the site-wide avg.

We expect to noindex 100–150 pages in the first run of this loop based on the current distribution (pos 51+ takes 728 impr at avg pos 70). Net effect: site avg position will drop from 17 to ~10–12 mechanically.

### Script: `script:canonical-fix`

```bash
npm run script:canonical-fix -- --slug=tools/foo
```

Investigates the canonical chain via `inspectUrl`. If our user-declared canonical disagrees with Google's chosen one, picks the higher-impression URL as the true canonical, sets the loser to 301 redirect to the winner, removes the loser from sitemap.

### Script: `script:boost-discovery`

```bash
npm run script:boost-discovery -- --slug=compare/foo
```

For pages stuck in "Discovered – not indexed" >14 days:

1. Inject 5 inbound links from already-indexed pages (using `links:inject` plumbing).
2. Add the URL to the next morning's manual GSC submit list (12/day budget).
3. Submit to IndexNow with `--priority=urgent`.
4. Re-check status in the next snapshot.

If still not indexed after 4 weeks of this treatment, page goes into "kill-or-rewrite" review with the operator.

### Common scaffolding

All scripts share:

- Read from `.gsc-sprint-YYYY-MM-DD.json` if `--from-sprint` is passed (batch mode).
- Write structured logs to `logs/weekly-loop.ndjson`.
- Commit changes with a standardized message: `seo(loop): <action> <slug> — <reason>`.
- Refuse to run if there are uncommitted local changes (avoid mixing manual edits into automated commits).

---

## Step 6 — Measure (automated, Fri 16:00)

`scripts/close-weekly-loop.ts`:

```bash
npm run loop:close
```

For every page touched this week (from `.gsc-sprint-YYYY-MM-DD.json` execution log):

1. Re-submit to IndexNow.
2. Add to next Monday's "watch closely" subset of the snapshot.
3. Tag the page with `last_optimized_at = now()`.
4. Compute an "impact tracker" record: baseline metrics from this week's snapshot. Next week's diff will measure lift.

Write `logs/weekly-loop-YYYY-MM-DD.md` — a human-readable wrap-up:

- Actions executed (count by type).
- Pages touched (list).
- Expected impact (sum of expected-uplift estimates).
- Pre-conditions to check next Monday (any URL submits still pending GSC processing, etc.).

This file is the audit trail. Six months in, you can look back and see exactly which loops were high-value and which were noise — and adjust the triage rules accordingly.

---

## Reporting & dashboards

One scoreboard, updated weekly. Built into the admin dashboard at `/admin/seo/weekly` (route to be created). The page reads from the snapshot + diff files and shows:

### Always visible at the top

- **Site avg position** (this week vs prior 4 weeks, trend chart).
- **Site CTR** (this week vs prior 4 weeks, trend chart).
- **Total clicks** + **total impressions** (this week, with WoW delta).
- **Indexed pages** (count + delta).
- **Pages in each coverageState bucket** (Indexed / Discovered-not / Crawled-not / Excluded).

### Drilldown panels

- **Top 20 winners this week** (biggest +clicks, biggest -position).
- **Top 20 losers this week** (biggest -clicks, biggest +position drops).
- **Branded-query health** — every query containing "rightaichoice" or variants, our position and impressions.
- **Sprint progress** — for the current week, how many of the accepted actions are done, in-progress, or blocked.
- **Long-term cohort tracking** — pages touched 4 weeks ago, position then vs now. Real impact attribution.

This is the only SEO dashboard we need. No SEMrush. No Ahrefs. GSC is the source of truth; our pipeline is the analyst.

---

## Cron + scheduling

The full loop, expressed as cron entries (run on the daily orchestrator host or via Vercel cron — pick one and stick with it).

```
# Monday morning loop
0  6  *  *  1   npm run snapshot:gsc
30 6  *  *  1   npm run diff:gsc -- --auto
0  7  *  *  1   npm run triage:gsc -- --auto
0  9  *  *  1   # operator runs npm run loop:review in terminal

# Daily during execution window
0  9  *  *  2-4 npm run loop:execute -- --auto-approve-low-risk

# Friday close
0  16 *  *  5   npm run loop:close

# Daily housekeeping (already exists)
0  9  *  *  1-5 npm run daily
```

The Tue–Thu execute job runs auto-approved actions only (e.g., schema fixes, IndexNow re-submits, sitemap updates). Anything that rewrites titles or content waits for operator approval on Monday.

Total compute time per week: ~25 minutes of cron, ~15 minutes of operator review. ~40 minutes total for full optimization sweep of 750 pages.

---

## Decision rules — the hard ones

Two recurring judgment calls deserve explicit rules so we don't relitigate them every week.

### When to noindex vs. refresh vs. delete

| Page state | Action |
|-----------|--------|
| Position 51+, impr <10/month, stale >90 days | Noindex |
| Position 51+, impr ≥10/month | Refresh once. If still 51+ after 4 weeks, noindex. |
| Indexed but irrelevant to our topical clusters (we're not the right authority) | Noindex |
| Duplicates an existing higher-ranking page on the same topic | 301-redirect loser → winner, then delete |
| Was never indexed and is >60 days old | Noindex + remove from sitemap; investigate why Google rejected it before adding more like it |
| Branded-query page that's underperforming | Refresh — never noindex branded queries |

Hard cap: in any one week, we cannot noindex more than 50 pages. Forces operator review and prevents an over-zealous purge.

### When to merge two pages

Merge two of our own pages when:

- Both target the same primary keyword.
- Their content overlaps >60% by token.
- One has ≥3× the impressions of the other.

Merge process:

1. Combine the unique content from the loser into the winner (depth boost).
2. 301 the loser to the winner.
3. Update internal links pointing at the loser.
4. Remove loser from sitemap.
5. IndexNow re-submit the winner.

Don't merge across page types (a comparison page and a best-of page serve different intents — keep separate even if topics overlap).

---

## Automation we need to build

| # | Script | npm alias | Effort | Frequency | ROI |
|---|--------|-----------|--------|-----------|-----|
| 1 | GSC snapshot | `snapshot:gsc` | 0.5 day | weekly cron | Critical — input to everything |
| 2 | Snapshot diff | `diff:gsc` | 1 day | weekly cron | Critical — surfaces signals |
| 3 | Triage engine | `triage:gsc` | 1.5 days | weekly cron | Critical — generates the sprint |
| 4 | Loop review TUI | `loop:review` | 1 day | weekly operator | High — 15-min Monday ritual |
| 5 | Title rewrite script | `script:title-rewrite` | 1 day | per-action | High — single biggest CTR lever |
| 6 | Refresh page script | `script:refresh-page` | 1 day | per-action | High — fights freshness decay |
| 7 | Depth-expand script | `script:depth-expand` | 1.5 days | per-action | High — fixes "Crawled not indexed" |
| 8 | Links-inject script | `script:links-inject` | 2 days | per-action | High (shared with Doc 12) |
| 9 | Noindex script | `script:noindex` | 0.5 day | per-action | Critical — fastest avg-position lift |
| 10 | Canonical-fix script | `script:canonical-fix` | 1 day | per-action | Medium — recovers indexing bugs |
| 11 | Boost-discovery script | `script:boost-discovery` | 0.5 day | per-action | Medium — unsticks pages |
| 12 | Loop close + impact tracker | `loop:close` | 1 day | weekly cron | High — proves the loop works |
| 13 | Admin dashboard at `/admin/seo/weekly` | route + components | 2 days | always-on | Medium — visibility & alignment |

Total effort: ~14 engineering-days. Build order: 1, 2, 3, 4, 9 (immediate avg-position rescue), then 5, 8, 6, 7 (compounding impact), then 10, 11, 12, 13.

If we built only items 1, 2, 3, 4, and 9 — about 4 engineering-days — and ran the loop once, we'd noindex the 100+ pages currently dragging us from avg position 10 to avg position 17. That alone recovers ~7 positions sitewide. Highest ROI move in the entire SEO stack right now.

---

## Quality bar for the loop itself

The loop has its own QA — meta-SEO if you want.

Quarterly we ask:

1. Are the triage rules still calibrated? Pull every action recommended in the last 12 weeks. For each action type, compute the average position change of the page 4 weeks after action. If any action type has negative ROI on average, retire it or tighten its threshold.
2. Are we noindexing too much / too little? Track total impressions of noindexed pages — if those pages were getting any clicks at all, we noindexed too aggressively.
3. Is the operator review taking >15 min? If yes, the triage rules are too loose. Tighten them so fewer marginal actions reach the operator.
4. Are we executing the sprint completely? If <80% of accepted actions get done in a week, the backlog is too big — accept fewer.

Adjust the rules. Commit the changes. The triage rules are versioned in `lib/seo/triage.ts` and that file's history is the loop's own learning curve.

---

## Cross-references

- **Doc 09** — Indexed Pages Strategy: why we care about avg position and topical clusters.
- **Doc 10** — GSC Keyword Mining: source of the demand signal that feeds triage queries.
- **Doc 12** — New-Page SEO SOP: companion to this doc — covers new pages going forward. Many scripts are shared (`links:inject`, `audit:schema`).
- **`lib/seo/gsc-client.ts`** — `querySearchAnalytics` + `inspectUrl` are the primitives every loop step uses.
- **`scripts/audit-gsc-indexation.ts`** — existing pattern for paginated GSC reads; reuse for snapshot.
- **`scripts/daily.ts`** — the daily orchestrator we extend with weekly hooks (Monday-only behavior).
