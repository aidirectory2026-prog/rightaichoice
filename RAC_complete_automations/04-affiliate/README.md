# 04 — Affiliate (Revenue)

Populate `affiliate_url` aggressively. The `/api/tools/[slug]/visit` redirect already routes there — so every approval = revenue path live for that tool's clicks.

## Skills & automations

| # | Name | Type | Runtime | Schedule | Status |
|---|---|---|---|---|---|
| 4.1 | `affiliate-research-daily` | Cron | Vercel | `0 2 * * *` (50/day) | **NEW** |
| 4.2 | `/affiliate-enrich` | Skill | Claude Code | daily ~5 min | **NEW** |
| 4.3 | `monthly-affiliate-rescan` | GH Actions | GitHub | `0 5 1 * *` (1st) | **NEW** |
| 4.4 | `click-tracking` (extend visit redirect) | Route | Vercel | always | EXISTING (extend) |

## Build order

1. Schema: `tools.has_affiliate_program`, `tools.affiliate_network`, `tools.affiliate_notes` — Day 6
2. `affiliate-research-daily` cron — Day 6 (drafts overnight, ~50/day)
3. `/affiliate-enrich` skill — Day 6 (fast-batch keyboard approval UI)
4. `click-tracking` extension — Day 9 (UTM enrichment, conversion attribution)
5. `monthly-affiliate-rescan` — Day 25

## Cross-department cascades

- New `affiliate_url` set → `pages_freshness` cascade → SEO surface
- Has-affiliate flag → newsletter feature weight 2× → Content surface
- Has-affiliate flag → `/seo-plan-new-pages` weights revenue-eligible compares 2× → SEO surface
- Click landed → `click_logs` → `/admin/revenue` → KPI anomaly watch
