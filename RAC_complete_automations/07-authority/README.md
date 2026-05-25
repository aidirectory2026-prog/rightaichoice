# 07 — Authority (Backlinks)

Track backlinks earned and benchmark against competitors. Drives the LLM-citation signal (the strongest ranking lever in 2026).

## Skills & automations

| # | Name | Type | Runtime | Schedule | Status |
|---|---|---|---|---|---|
| 7.1 | `weekly-backlink-import` | GH Actions | GitHub | `0 4 * * 0` (Sun) | **NEW** |
| 7.2 | `weekly-competitor-scrape` | GH Actions | GitHub | `0 5 * * 0` | **NEW** |
| 7.3 | `badge-embed-analytics` | Cron | Vercel | `0 6 * * *` | **NEW** |
| 7.4 | `/admin/authority` dashboard | Page | Next.js | always | **NEW** (read-only UI) |
| 7.5 | `weekly-core-web-vitals` | GH Actions | GitHub | `0 6 * * 0` | **NEW** |

## Build order

1. `referring_domains` extensions (DA, anchor, detection_source) — Day 11
2. `weekly-backlink-import` (OpenLinkProfiler free API) — Day 11
3. `weekly-competitor-scrape` (TAAFT, Futurepedia, There's an AI For That) — Day 11
4. `/admin/authority` upgrade — Day 11
5. `weekly-core-web-vitals` — Day 11
6. `badge-embed-analytics` — Day 17 (after badge outreach runs)

## Cross-department cascades

- New backlink → if DA>30: featured as social proof in next newsletter
- Competitor backlink found → flag 5/week to Outreach queue as pitch targets
- Badge embedded → `badge_embeds` row → counts as backlink → Authority surface
- CWV regression detected → SEO surface (alert via `kpi-anomaly`)
