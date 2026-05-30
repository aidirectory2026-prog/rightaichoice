# 01 — Catalog (Data Foundation)

The freshness cascade engine. Every other department reads from the catalog. If catalog breaks, SEO/content/affiliate/outreach all degrade.

## Skills & automations

| # | Name | Type | Runtime | Schedule | Status |
|---|---|---|---|---|---|
| 1.1 | `freshness-cascade` | DB trigger + cron | Supabase + Vercel | on tools.UPDATE + every 2h | **NEW** (core) |
| 1.2 | `refresh-tools` | Cron | Vercel | `*/30 * * * *` | EXISTING (tune cadence) |
| 1.3 | `ingest-tools` | Cron | Vercel | `0 */6 * * *` | EXISTING (stable) |
| 1.4 | `auto-promote-candidates` | Cron | Vercel | `0 */4 * * *` | **NEW** |
| 1.5 | `cascade-comparisons` | Cron | Vercel | `0 */2 * * *` | EXISTING (rename + tune) |
| 1.6 | `cascade-hubs` | Cron | Vercel | `15 */2 * * *` | **NEW** |
| 1.7 | `auto-dedup-candidates` | pg_cron | Supabase | `*/10 * * * *` | **NEW** |
| 1.8 | `producthunt-listener` | Worker | Cloudflare | hourly | **NEW** |
| 1.9 | `sentiment-discovery` | Cron + on-demand + UI | Vercel + Worker | every 7d + on click | **NEW** (parked — see `_NOTES.md`) |

## Build order

1. `freshness-cascade` — must land Day 1; everything downstream depends on it
2. `cascade-hubs` — Day 1 (consumes freshness)
3. `cascade-comparisons` tune — Day 1
4. `refresh-tools` cadence tune — Day 2
5. `auto-promote-candidates` + `auto-dedup-candidates` — Day 10 (paired)
6. `producthunt-listener` — Week 2

## Cross-department cascades originating here

- Any tool field update → `pages_freshness` → SEO (sitemap), Content (newsletter eligibility), Affiliate (refresh eligibility re-evaluation), Authority (badge embed re-render)
- New candidate promoted → SEO (new URL in sitemap), Content (newsletter feature pool), Outreach (founder added to `outreach_queue`)

---

## Implementation log — Phase 9 (Automations & Catalog)

> Real-state changelog (timestamps in IST). The tables above are the original *design*; entries below record what's actually shipped.

### 2026-05-31 — Catalog taxonomy expanded: +3 categories (D1)
- **What:** Added 3 categories the catalog was missing for mainstream clusters — `developer-infrastructure` (⚙️), `project-management` (📋), `business-intelligence` (🧮). Total categories 15 → 18.
- **Why:** The catalog over-indexed on niche AI startups and had nowhere to place mainstream platforms (Vercel/Netlify/Figma/Notion/Linear/Jira/Tableau/Power BI…) that now ship real AI features — costing branded search traffic and blocking `/stacks` decision pages.
- **How:** `supabase/migrations/127_new_categories.sql` (DB-driven — no code enum). The ingest/categorization step (`lib/cron/curate.ts` → `predictCategories`, automation **1.3 ingest-tools**) reads category slugs at runtime, so new tools can be classified into these immediately. Icons added in `lib/icons/category-icon.ts` (Server, PieChart; project-management already mapped).
- **Empty-page guard:** categories with 0 published tools are hidden from the public `/categories` listing (`app/categories/page.tsx`, via `category_published_counts()` RPC) so the new categories don't surface as thin pages until the P0 tools (D2) populate them.
- **Follow-up:** when D2 lands the seed tools, confirm the 3 categories auto-appear in the listing; add zero-count guard to `app/categories/sitemap.ts` if not already (SEO-coordinated).

### 2026-05-31 — Catalog-wide "latest updates" + change-detector (A2)
- **What:** Every published tool's news is now checked within 7 days (was: only top-50 by views → a rank-200 tool's launch was never captured). LLM synthesis only runs when something actually changed.
- **Why:** Owner SLA "no big news/update missing." The old top-50 cap meant most of the catalog never got a "Latest from {Tool}" refresh.
- **How (non-technical):** The robot now walks the WHOLE catalog oldest-checked-first. For each tool it does a cheap peek at the changelog/blog/HN/Reddit; if nothing new, it moves on for free; only if it spots a genuine change does it spend the (paid) AI write-up. So we cover everything within 7 days but pay AI cost only for tools that actually shipped news.
- **How (technical):** `scripts/refresh-latest-updates.ts` — removed the top-50 cap; queue = whole published catalog ordered by `latest_updates_at ASC NULLS FIRST`, nightly cohort = front 360 (`DAILY_LIMIT`/`--daily=`). `computeFingerprint()` = SHA-256 of head-slices of the change signals (changelog/blog first 600 chars + top-3 news/HN/Reddit `url|date|title`), stored in new column `tools.latest_updates_fingerprint` (migration 131, applied). Synthesis fires only on NULL/empty `latest_updates`, NULL/changed fingerprint, or `--force`; else the cheap path just stamps `latest_updates_at`. Per-tool `pMap` `.catch` isolation; on synthesis failure the tool stays at the queue front (not advanced) and existing `latest_updates` is preserved. `.github/workflows/freshness-batch.yml` 03:00 job timeout 120→180, wired `DAILY_LIMIT`.
- **Cost:** seed cycle (~6 days) synthesizes each tool once; steady-state only the handful that changed each night pay the ~$0.024 LLM+Apify cost.

### 2026-05-31 — Scheduled the orphaned/manual pipelines (A3)
- **What:** Pipelines that were manual or unscheduled (so new/mid-catalog tools starved) now run nightly on staggered schedules.
- **Why:** A tool is only "done" when every pipeline touches it automatically — viability scores, logos, and page-mention links were drifting because nothing ran them on a schedule.
- **How (per pipeline):**
  - **viability** — added nightly Vercel cron `30 0 * * *` for `/api/cron/calculate-viability`; removed a redundant weekly GH curl. Also bumped the batch **50 → 300/night** (`app/api/cron/calculate-viability/route.ts`, maxDuration 60→120) — `calculateSignals()` is pure CPU over existing columns (no per-tool network), so 300 fits easily → ~6.6-day cycle (was ~40-day; 58% were >7d stale).
  - **backfill-logos** — new nightly GH Actions job `40 5 * * *` (`freshness-batch.yml`), new/missing only (idempotent; only touches null/empty `logo_url`).
  - **sync-page-mentions** — added nightly `schedule: 15 1 * * *` to `sync-mentions.yml` (kept `workflow_dispatch`); rebuild-style (upsert+delete-stale, not append); fixed the `db_join` `if:` guard so it runs on scheduled events.
  - **discover-tutorials** — already scheduled (`0 7 * * 2,5`, Tue/Fri) — audit's "missing" was inaccurate; left as-is.
  - **FAQ coverage** — already 99.85% (1971/1974) via the existing `refresh-faqs` cron + enrichment; **no new pipeline built** (would duplicate). 3 noise gaps.
- **Idempotency/gating:** all secret-gated (`cronRoute`/service-role); all re-runnable safely. Vercel cron count 11→12 (Pro — fine).

### 2026-05-31 — New-tool auto-enrollment (A4)
- **What:** A freshly-added tool now reaches parity in hours instead of starving ~10 days behind the nightly batches, and is picked up by every pipeline automatically.
- **Why:** Inserts stamped `last_verified_at = now()`, which pushed brand-new tools to the BACK of every stalest-first queue. And nothing fast-tracked a new tool through the per-tool steps.
- **How (non-technical):** New tools now start with a blank "last touched" date, so the robots that "do the oldest first" grab them first. On top of that, a fast lane runs every 30 minutes that takes any brand-new tool and immediately fills its core data (refresh, category, viability, latest news) so its page is complete within the hour.
- **How (technical):**
  - Anti-starvation: `lib/cron/ingest.ts` + `scripts/scale-catalog.ts` insert with `last_verified_at = NULL` (and `latest_updates_at`/`viability_updated_at` already NULL). All queues confirmed `... ASC NULLS FIRST` (refresh, latest-updates, viability; logos filters null) → new tools sort first.
  - New automation **onboard-tools**: migration 132 adds `tools.onboarded_at` (NULL = pending) + partial index `idx_tools_onboard_pending`; backfilled all existing rows (`coalesce(last_verified_at, created_at, now())`) → 2,041 onboarded / 0 pending. `lib/cron/onboard.ts` `onboardPendingTools()` + `app/api/cron/onboard-tools/route.ts` (`cronRoute`, maxDuration 300, batch 5) reuse `runRefreshForSlugs`, `calculateSignals`/`computeViabilityScore`, the latest-updates synthesis path; reproduce the small DeepSeek category call inline (predictCategories is private in scale-catalog). Per-step try/catch; `onboarded_at` set only after refresh succeeds; idempotent (`onboarded_at IS NULL` filter). `vercel.json` cron `7,37 * * * *`.
  - **Deferred to C:** logo step (resolve/verify/upload logic is locked in `scripts/backfill-logos.ts`; nightly logo job + favicon fallback cover the gap meanwhile); editorial compares, FAQ≥9 gate, JSON-LD/indexing, QA checklist. `onboard.ts` is structured so C appends steps + gates without a rewrite.
