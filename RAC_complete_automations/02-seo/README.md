# 02 — SEO

Diagnostics → planning → execution → measurement loop. The biggest skill family. Mostly Claude Code skills + supporting cloud crons that prep the data.

## Skills & automations

| # | Name | Type | Runtime | Schedule | Status |
|---|---|---|---|---|---|
| 2.1 | `snapshot-gsc` | Cron | Vercel | `0 6 * * *` | **NEW** |
| 2.2 | `diff-gsc` | Cron | Vercel | `30 6 * * *` | **NEW** |
| 2.3 | `triage-gsc` | Cron | Vercel | `0 7 * * 1` | **NEW** |
| 2.4 | `/seo-pulse` | Skill | Claude Code | manual | **NEW** |
| 2.5 | `/seo-audit` | Skill | Claude Code | manual | **NEW** |
| 2.6 | `/seo-plan-week` | Skill | Claude Code | Monday manual | **NEW** |
| 2.7 | `/seo-plan-new-pages` | Skill | Claude Code | manual | **NEW** |
| 2.8 | `/seo-fix-page` | Skill | Claude Code | manual per slug | **NEW** |
| 2.9 | `/seo-noindex-sweep` | Skill | Claude Code | manual (rare) | **NEW** |
| 2.10 | `/seo-impact` | Skill | Claude Code | manual / weekly | **NEW** |
| 2.11 | `seo-impact-attribution` | Cron | Vercel | `0 15 * * 6` | **NEW** |
| 2.12 | `audit-schema` | Cron | Vercel | `30 4 * * *` | **NEW** |
| 2.13 | `audit-gsc-indexation` | Cron | Vercel | `0 8 * * 2,5` | EXISTING (tune) |

## Build order

1. `snapshot-gsc` + `diff-gsc` — Day 2 (data layer first)
2. `/seo-pulse` + `/seo-audit` — Day 2 (read from snapshots)
3. `/seo-noindex-sweep` — Day 3 (one-time biggest impact action)
4. `/seo-fix-page` — Day 3 (composes 5 sub-scripts)
5. `audit-schema` — Day 3
6. `triage-gsc` + `/seo-plan-week` — Day 6 (first Monday ritual)
7. `/seo-plan-new-pages` — Week 2
8. `seo-impact-attribution` + `/seo-impact` — Day 15

## Cross-department cascades

- `/seo-fix-page` → depth injection → `refresh-faqs` triggers → cascade-comparisons → cascade-hubs
- `/seo-noindex-sweep` → IndexNow ping → sitemap removal → 14-day reprocessing
- `triage-gsc` queue feeds `/seo-plan-week` Monday sprint
