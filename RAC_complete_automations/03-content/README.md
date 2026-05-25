# 03 — Content

Newsletter, blog, and bulk page generation. The lowest-friction surface for the manager (mostly approvals + light editing).

## Skills & automations

| # | Name | Type | Runtime | Schedule | Status |
|---|---|---|---|---|---|
| 3.1 | `newsletter-weekly` | Cron | Vercel | `0 11 * * 2,5` | **NEW** |
| 3.2 | `/content-batch` | Skill | Claude Code | daily 2 min, Tue/Fri 30 min | **NEW** |
| 3.3 | `weekly-blog-pipeline` | GH Actions | GitHub | `0 10 * * 4` (Thu) | **NEW** |
| 3.4 | `daily-page-generation` | GH Actions | GitHub | `0 14 * * *` | **NEW** |
| 3.5 | `daily-compare-batch` | GH Actions | GitHub | `0 13 * * *` | **NEW** |
| 3.6 | `/publish-batch` | Skill | Claude Code | daily ~7 min | **NEW** |

## Build order

1. `newsletter-weekly` cron + `/content-batch` skill + Beehiiv integration — Day 4
2. `daily-compare-batch` — Day 10 (feeds `/publish-batch`)
3. `daily-page-generation` — Day 10
4. `/publish-batch` — Day 10 (the gate for both 3.4 and 3.5)
5. `weekly-blog-pipeline` — Day 16

## Cross-department cascades

- Newsletter send → Beehiiv webhook → `newsletter_events` → `/ops-pulse` open/click
- New blog post → `pages_freshness` row → cascade-hubs → sitemap → IndexNow
- New generated page → `pages_freshness` → JSON-LD dateModified → SEO surface
- Tool refresh in last 24h → boosts inclusion weight in next newsletter draft
