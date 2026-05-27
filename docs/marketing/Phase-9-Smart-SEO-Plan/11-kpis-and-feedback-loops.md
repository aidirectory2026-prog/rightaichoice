# 11 — KPIs & Feedback Loops

> **Goal:** Make Phase 9 measurable. Every move has a KPI; every KPI
> has a dashboard; every dashboard has a weekly review ritual. No
> drifting.

## North-star metrics

| Metric                                          | Today  | Day 30 | Day 60 | Day 90 |
| :---------------------------------------------- | -----: | -----: | -----: | -----: |
| Total weekly clicks                             |    ~11 |    150 |    400 |   1,000|
| Avg position (28d, weighted)                    |     40 |    <25 |    <20 |    <15 |
| Pages with ≥1 impression (28d)                  |    773 |  1,500 |  1,800 |  2,000 |
| Pages in top-10                                 |     33 |     80 |    150 |    300 |
| Pages in top-3                                  |      3 |     15 |     40 |     80 |
| Indexed pages / published pages                 |    ~?  |   ≥80% |   ≥90% |   ≥92% |
| Referring domains (new)                         |      ? |    +10 |    +25 |    +50 |
| AI Overview citations (manual log)              |      ? |     10 |     30 |     60 |
| **Brand SERP rank #1 for "rightaichoice"**      | no (#2) |   yes  |   yes  |   yes  |
| **Homepage CTA conversion rate**                |    0%  |     5% |     8% |    10% |
| **Homepage ranks in top 50 for stack queries**  |      0 |     ≥1 |     ≥3 |     ≥5 |
| **Stack pillar pages live**                     |      0 |      3 |      6 |     8+ |

## Secondary KPIs

### CTR layer

| Metric                                       | Target           |
| :------------------------------------------- | :--------------- |
| Sitewide CTR (28d)                           | >1.5% by Day 30  |
| Tier-1 cohort CTR                            | >3% by Day 30    |
| Comparison-page average CTR                  | >5% by Day 60    |
| Best-performing page CTR                     | sustain >10%     |

### Content layer

| Metric                                       | Target           |
| :------------------------------------------- | :--------------- |
| Tier-1 pages with rewritten titles           | 100% by Day 14   |
| Tier-2 pages structurally upgraded           | 25/week, 143/total|
| FAQ blocks deployed                          | Top 100 pages by Day 30 |
| Cornerstone pages live                       | 5–7 by Day 21    |
| Pillar pages live                            | 1/month          |

### Indexation layer

| Metric                                       | Target           |
| :------------------------------------------- | :--------------- |
| URLs in "Discovered - not indexed" bucket    | <300 by Day 60   |
| URLs in "Crawled - not indexed" bucket       | <200 by Day 60   |
| Sitemap URL count                            | 1,400 (clean) by Day 21 |
| Orphan pages (<2 internal links)             | <50 by Day 28    |

### Distribution layer

| Metric                                       | Target           |
| :------------------------------------------- | :--------------- |
| HARO pitches sent                            | 3/week           |
| Reddit helpful comments posted               | 2/week           |
| Backlinks earned (any source)                | 5/month          |
| Newsletter subscribers                       | 500 by Day 90    |

## Dashboards to build

### 1. Weekly SEO scorecard — `/admin/seo-scorecard`

One page, refreshable weekly, shows:

- Big number: total weekly clicks (with sparkline)
- Big number: avg position (with sparkline)
- Bucket distribution chart (pos 1–3 / 4–10 / 11–20 / 21–30 / 31+)
- Top 10 risers and top 10 fallers from latest `gsc_diffs`
- New pages in top-10 this week
- Pages that lost top-10 this week

Data source: `gsc_snapshots` + `gsc_diffs` (already live). Just needs UI.

### 2. Tier execution tracker — `/admin/tier-progress`

Shows per-tier:

- Tier 1: # rewritten / total (101). Avg CTR delta for rewritten pages.
- Tier 2: # structurally upgraded / total (143). Median position delta.
- Tier 3: # buckets resolved / total. Indexation rate trend.
- Tier 4: # pruned / merged / improved / total (529).

### 3. AI citation log — `/admin/ai-citations` (manual until Week 4)

Spreadsheet-style view of:

- Query | Engine | Date | Cited? | Position in answer | Notes

### 4. Backlink log — `/admin/backlinks`

- Domain | URL | Date | Source pillar | DR (if Ahrefs ever added)

## Weekly review ritual (Monday, 30 min)

Every Monday after the GSC snapshot lands (06:30 UTC):

1. **Read the diff** — what moved up, what moved down, what's new?
2. **Tier 1 cohort check** — did the rewrites work? Pages with worse
   CTR after 7 days → revert title.
3. **Indexation check** — has the sitemap-prune effort moved
   "discovered - not indexed" count down?
4. **Decisions** — pick this week's batch for each tier.
5. **Log review** — backlinks earned, HARO sent, Reddit posted.

Output: a 5-line summary in `docs/marketing/Phase-9-Smart-SEO-Plan/weekly-log.md`:

```
## Week of 2026-06-01

- Clicks: +12 (151 → 163) | Avg pos: 38.2 (-1.5)
- 10 Tier-1 titles pushed; 3 already up 5+ positions
- Tier 3: 200 pages moved from discovered → indexed
- 2 backlinks earned (HN comment, IH post)
- Next week: push 15 more Tier-1 titles; start first cornerstone page
```

## Alerts

Wire to the existing alert system (Resend email):

| Trigger                                                              | Alert                  |
| :------------------------------------------------------------------- | :--------------------- |
| Weekly clicks drop >25% vs last week                                 | High priority          |
| 5+ Tier-1 pages drop 5+ positions in a single snapshot               | Medium                 |
| Sitemap URL count changes by >10% unexpectedly                       | Medium                 |
| GSC inspection cron fails 2 weeks in a row                           | Low                    |

Implementation: extend the existing `pipeline_runs`-based alerting or
add a new `gsc_anomalies` table populated by a daily check.

## Feedback loops in code

### Loop A — Title rewrite efficacy

```
Push Tier-1 title rewrite → Day 7 GSC snapshot diff → if CTR delta < 0,
flag for revert in /admin/tier-progress → operator reverts.
```

Automate as much as possible. The diff data is already in `gsc_diffs`.

### Loop B — Indexation progress

```
Weekly URL Inspection cron → bucket counts → compare WoW → if
"Discovered - not indexed" rising instead of falling, alert.
```

### Loop C — Backlink → ranking

```
Manual: when we earn a backlink, tag the recipient page. After 30
days, check if its position improved more than the average for its
tier. Compounds as link data + ranking data accumulate.
```

## What we explicitly aren't tracking in Phase 9

- **Conversion-to-affiliate** — that's revenue work, not SEO work
- **PageSpeed scores** — assumed acceptable; only re-check if CrUX
  shows degradation
- **Brand sentiment** — too early; <100 monthly users
- **SERP volatility** — noise; weekly snapshot smooths it

## Reporting cadence

| Cadence    | Audience      | Format                                                   |
| :--------- | :------------ | :------------------------------------------------------- |
| Daily      | Internal      | `pipeline_runs` health (existing system)                 |
| Weekly     | Operator      | Weekly log entry + scorecard review (Monday morning)     |
| Monthly    | Stakeholders  | Summary of KPIs, lessons, next-month priorities          |
| Quarterly  | Public        | Quarterly report blog post (link-magnet doubled use)     |

## Definition of done

- Weekly scorecard view live
- Tier execution tracker live
- AI citation log started (spreadsheet)
- Backlink log started
- Weekly Monday ritual happening on schedule
- Alerts wired and silent (= things are working)
- Monthly review template drafted

## When this is in flight

It's always in flight. KPI tracking is the substrate of all other
phases. The other docs depend on this one to know whether the work
worked.
