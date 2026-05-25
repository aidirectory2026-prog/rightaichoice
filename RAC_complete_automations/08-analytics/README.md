# 08 — Analytics (Measurement)

Cross-cutting. Reads from every other department, surfaces the manager's daily/weekly view, fires anomaly alerts.

## Skills & automations

| # | Name | Type | Runtime | Schedule | Status |
|---|---|---|---|---|---|
| 8.1 | `kpi-anomaly` | Cron | Vercel | `15 7 * * *` | **NEW** |
| 8.2 | `cost-tracker` | Cron | Vercel | `0 5 * * *` | **NEW** |
| 8.3 | `weekly-report` (cron) | Cron | Vercel | `0 16 * * 5` (Fri) | **NEW** |
| 8.4 | `/weekly-report` (skill) | Skill | Claude Code | Fri manual replay | **NEW** |
| 8.5 | `/ops-pulse` | Skill | Claude Code | daily ~60s | **NEW** |
| 8.6 | `page-view-pipeline` | Worker | Cloudflare | continuous | **NEW** |
| 8.7 | `cron-health-monitor` | Cron | Vercel | `*/15 * * * *` | EXISTING (extend) |

## Build order

1. `cron_logs` + `daily_costs` schemas — Day 11
2. `kpi-anomaly` + `cost-tracker` — Day 11
3. `/ops-pulse` skill — Day 2 (read-only, ships with `/seo-pulse`)
4. `weekly-report` cron — Day 11
5. `/weekly-report` skill — Day 11
6. `page-view-pipeline` (Cloudflare Worker → Supabase) — Day 15
7. `cron-health-monitor` extension — Day 22

## Cross-department cascades

- Anomaly detected → Resend alert to manager → manager invokes relevant Tier 1 pulse
- Weekly report Friday → manager kills bottom-2 automations, doubles top-2 (Day 30 decision)
- Page view spike on a slug → SEO surface (early ranking detection) + Content (newsletter spotlight candidate)
- Cost spike → cron throttling decision (e.g., refresh-tools batch size)
