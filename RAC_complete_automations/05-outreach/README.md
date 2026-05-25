# 05 — Outreach

Drafts compose overnight in the cloud; manager approves the next morning in `/outreach-batch`. Single skill surface for founder/HARO/Reddit/badge — same approval grid for all.

## Skills & automations

| # | Name | Type | Runtime | Schedule | Status |
|---|---|---|---|---|---|
| 5.1 | `outreach-founders` | Cron | Vercel | `0 9 * * 1-5` (30/day) | **NEW** |
| 5.2 | `outreach-followup` | Cron | Vercel | `0 9 * * 2,4` | **NEW** |
| 5.3 | `badge-outreach` | Cron | Vercel | `0 10 * * 1,4` (25/day) | **NEW** |
| 5.4 | `haro-listener` | Worker | Cloudflare | `*/15 * * * *` | **NEW** |
| 5.5 | `reddit-listener` | Worker | Cloudflare | `*/10 * * * *` | **NEW** |
| 5.6 | `/outreach-batch` | Skill | Claude Code | daily ~7 min | **NEW** |
| 5.7 | `resend-webhook-handler` | Route | Vercel | always | **NEW** |

## Build order

1. `outreach_queue` schema — Day 6
2. `outreach-founders` cron — Day 6
3. `/outreach-batch` skill — Day 6 (gates all 5 draft sources)
4. `haro-listener` + `reddit-listener` Cloudflare Workers — Day 9
5. `badge-outreach` cron — Day 17
6. `outreach-followup` cron — Day 17 (after first replies land)
7. `resend-webhook-handler` — Day 9 (reply tracking)

## Cross-department cascades

- Approved draft → Resend send → `outreach_log.sent_at`
- Resend webhook → `outreach_log.response` updated → if positive: queue for link-exchange follow-up
- Backlink earned → `weekly-backlink-import` (Sun) picks it up → Authority surface
- Founder replies + tool listing → bumps `tools.editor_picked` → Content surface (newsletter)
