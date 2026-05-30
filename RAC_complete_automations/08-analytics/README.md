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

---

## Implementation log — Phase 9 (Automations & Catalog)

### 2026-05-31 — Reliability hardening + /admin/health (A5)
- **What:** A single operations dashboard for all ~40 automations, plus automatic retry on transient failures.
- **Why:** "Best automations" needs observability + self-healing. Failures and staleness were only visible by digging through logs.
- **How (non-technical):** `/admin/health` shows, per automation, when it last ran, whether it succeeded, how many items it processed, its cost, and whether it's overdue for its schedule — worst first. It also shows the catalog freshness SLA and any failures in the last 24h. Separately, when a job hits a temporary network/rate-limit blip it now retries a few times automatically instead of failing the whole run.
- **How (technical):** `app/admin/health/page.tsx` reads `pipeline_runs` (via `pipeline_health()` RPC + a bounded `DISTINCT ON (pipeline_key)` last-run query + `_admin_audit_exec` for the `fresh-7day-sla` SQL); a hand-derived `CADENCE_HOURS` map flags daily jobs with no success in >36h. `lib/pipelines/with-logging.ts` gains a `rate_limited` error class, `isTransientError()`, and an opt-in `withRetry()` (3 attempts, exp backoff + jitter, retries only timeout/api_error/rate_limited; permanents re-throw). Wired into `lib/cron/refresh.ts` (`callDeepSeek`) and `app/api/cron/refresh-latest-updates` (source fetches + synthesis). `poll-gh-actions` confirmed already idempotent (UPSERT on `(source, external_id)` unique index) — no lock added.
- **Maintenance:** keep `CADENCE_HOURS` in sync when cron schedules change.
