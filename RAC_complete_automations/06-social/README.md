# 06 — Social

X daily, LinkedIn weekly, Reddit organic continuous, brand-mention monitoring. All drafted by cloud cron; manager approves in `/social-batch` (3 min/day).

## Skills & automations

| # | Name | Type | Runtime | Schedule | Status |
|---|---|---|---|---|---|
| 6.1 | `daily-x-post-draft` | GH Actions | GitHub | `0 7 * * *` (3 variants/day) | **NEW** |
| 6.2 | `weekly-linkedin-carousel` | GH Actions | GitHub | `0 12 * * 3` (Wed) | **NEW** |
| 6.3 | `reddit-organic-replies` (extends 5.5) | Worker | Cloudflare | continuous | **NEW** (depends on 5.5) |
| 6.4 | `mention-listener` | Worker | Cloudflare | `*/30 * * * *` | **NEW** |
| 6.5 | `/social-batch` | Skill | Claude Code | daily ~3 min | **NEW** |
| 6.6 | `social-engagement-pull` | Cron | Vercel | `0 */6 * * *` | **NEW** |

## Build order

1. `social_queue` + `social_posts` schemas — Day 8
2. `daily-x-post-draft` — Day 8
3. `/social-batch` skill — Day 8 (gates 6.1, 6.2, 6.3)
4. `weekly-linkedin-carousel` — Day 8
5. `mention-listener` Cloudflare Worker — Day 11
6. `social-engagement-pull` — Day 18 (after first week of posts to measure)

## Cross-department cascades

- X post landed → engagement pull → top post becomes next LinkedIn carousel source
- Mention found → `referring_domains` row → Authority surface
- Reddit reply → if our URL clicked: `referring_domains` + traffic spike alert
- LinkedIn carousel published → asset stored for newsletter feature reuse
