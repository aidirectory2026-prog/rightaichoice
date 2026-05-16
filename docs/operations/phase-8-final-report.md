# Phase 8 — Final Report

**Site:** [rightaichoice.com](https://rightaichoice.com)
**Reporting period:** 2026-05-05 → 2026-05-16
**Status:** Phase 8 closed. 7O.2 (quarterly data-PR report) deferred.

This is the retrospective + state-of-the-system report at the close of the Phase 8 site overhaul. It captures what we built, what's running automatically today, what's deferred, and how to verify the system stays healthy.

---

## 1. State of the catalog (2026-05-16 snapshot)

| Metric | Value |
|---|---|
| Published tools | **1,178** |
| Editorial comparisons | **587** |
| Categories | 15 |
| Tools with "Latest from" data populated | 551 (47%) |
| Average viability score | 79 / 100 |
| Catalog stalest tool | 2026-05-08 (8 days) |
| Tools never refreshed | **0** |
| Cascade backlog (compares needing editorial regen) | 586 |
| Referring domains tracked | 0 (operator-driven; will populate as outreach lands links) |
| Newsletter subscribers | 0 (live, awaiting traffic) |

**Health verdict:** every tool re-verified within ≤ 8 days. Hourly refresh cycles the full catalog every ~5 days going forward.

---

## 2. What's running automatically (lid-closed safe)

12 Vercel crons + 1 local launchd reminder layer + 1 manual monthly SOP.

### Server-side (Vercel cron — runs forever)

| Pipeline | Schedule (UTC) | Output |
|---|---|---|
| `refresh-tools` | **Hourly** | 200+ tool refreshes/day, 9 SEO-load-bearing fields via DeepSeek |
| `ingest-tools` | 01:00 + 13:00 | Up to 50 new tools/day, traction-gated (HN + Reddit hard floor) |
| `refresh-compare-editorials` | Daily 08:00 | Top 20 stalest editorial compares regenerated when underlying tools change |
| `refresh-latest-updates` | Daily 02:00 | Top 50 stalest tools' "Latest from" data refreshed |
| `submit-urls-bing` | Daily 09:00 | ~100 URLs/day pushed via Bing direct API, smart-rotation cursor |
| `indexnow-recent` | Daily 07:00 | New URLs pinged to Bing + Yandex IndexNow |
| `snapshot-daily-updates` | Daily 23:55 | One row written to `daily_update_summaries` table |
| `resubmit-sitemap-gsc` | Weekly Mon 06:00 | GSC told to re-fetch `/sitemap-index.xml` |
| `calculate-viability` | Weekly Mon 04:00 | Viability score recomputed across catalog |
| `refresh-faqs` | Weekly Mon 05:00 | Stale FAQ blocks regenerated via DeepSeek |
| `scrape-sentiment` | Weekly Sun 04:00 | Reddit/HN sentiment quotes per tool |
| `discover-tutorials` | Weekly Sun 05:00 | YouTube tutorial discovery per tool |
| `generate-editorials` | Weekly Sun 06:00 | Backfill new tool editorial verdicts |

### Local-only (macOS launchd — only when laptop awake)

| Plist | Schedule (local IST) | Purpose |
|---|---|---|
| `daily` | Mon-Fri 09:00 | Orchestrator + Notification Center alert |
| `seo-outreach` | Mon-Fri 10:00 | Reminder: send 10 founder outreach emails |
| `seo-haro` | Mon-Fri 14:00 | Reminder: HARO inbox 15-min check |
| `seo-monday-review` | Mondays 09:30 | Reminder: weekly GSC + authority review |
| `seo-monthly-sop` | 1st of month 09:00 | Reminder: run Phase 4 SOP overnight |

**Install once:** `./scripts/launchd/install-all.sh`.

### Manual cadence (operator)

- **Monthly:** Phase 4 SOP refresh (`npm run refresh:apply -- --force`) — 6-8h unattended, $10
- **Weekly:** Outreach (5-10 founder emails/day), HARO inbox, /admin/authority audit
- **Monday:** Open `/admin/daily` + `/admin/updates` + `/admin/authority`

---

## 3. Freshness contract — measurable

**Promise:** no tool stays stale > 7 days. Every page mentioning a tool reflects new data within ≤ 1 hour of that tool refreshing. Compare-page numeric data refreshes **immediately**.

**Verification SQL** (run every Monday morning — full block in `sop-freshness-contract.md`):

```sql
SELECT 'refresh' AS pipeline, count(*) FROM tools
  WHERE last_verified_at >= now() - interval '24 hours' AND is_published = true;
-- Target ≥ 200

SELECT 'ingest', count(*) FROM tools
  WHERE created_at >= now() - interval '24 hours' AND is_published = true;
-- Target 10-50

SELECT 'cascade', count(*) FROM tool_comparisons
  WHERE last_reviewed_at >= now() - interval '24 hours' AND is_editorial = true;
-- Target 15-25
```

---

## 4. SEO posture at close

| Surface | Status |
|---|---|
| robots.txt | Allows `*` + 13 explicit AI/LLM bot allow-list. Disallows only `/admin`, `/dashboard`, `/auth`, `/api`. |
| Sitemap | `/sitemap-index.xml` with 8 per-type sub-sitemaps (`/tools/`, `/compare/`, `/categories/`, `/best/`, `/stacks/`, `/for/`, `/blog/`, static) |
| JSON-LD | Organization + WebSite at root, BreadcrumbList + Article/CollectionPage per page, SoftwareApplication + AggregateRating on tool pages, ComparisonList on compare pages, FAQPage when FAQs exist |
| Metadata | Consolidated through `lib/seo/metadata.ts` — no "Reviews" in titles, 2026 freshness suffix where it fits, `article:modified_time` from `last_verified_at` |
| Open Graph | Title + description per page; OG image auto-generated for `/compare/[slug]` |
| Bing indexation push | Daily authenticated submission via Vercel cron (server-side) + IndexNow daily + sitemap weekly |
| GSC indexation push | Weekly sitemap re-ping; IndexNow doesn't reach Google but the freshness cron + `article:modified_time` does |
| Embed widgets | `/embed/tool-of-day` + `/embed/viability-badge/[slug]` live; CSP `frame-ancestors *` only for `/embed/*` |
| Audit | 166-URL production sweep: **100% return 200**, logged at `logs/qa-404-2026-05-16.tsv` |

---

## 5. Cost (monthly)

| Pipeline | $ / month |
|---|---|
| 200+/day tool refresh (DeepSeek V3) | ~$15 |
| 50/day ingest (DeepSeek + enrichment) | ~$15 |
| Cascade compare editorials | ~$3 |
| Latest-updates daily refresh | ~$5 |
| Sentiment + tutorials scraping (Apify) | ~$5 |
| **Total ongoing** | **~$43/month** |
| **One-time Phase 4 SOP (monthly)** | +$10 |

Anthropic key remains as a fallback if DeepSeek has an outage; the data layer is DeepSeek-only.

---

## 6. Deferred work — known and intentional

| Item | Why deferred | Trigger to revisit |
|---|---|---|
| **7O.2 — Quarterly viability report (Data PR)** | Operator-bandwidth dependent (3,000-word report, manual pitch list of 9 publications). Engineering scope is small (DeepSeek synthesis from `viability_score` distribution); time investment is in writing + pitching. | When the operator has a clear week to draft + pitch; first eligible quarter end. |
| Job-market signal section (Indeed scraper) | Apify cost $24/mo for marginal added value. Latest-updates section already shows hiring trend through changelog/blog signals. | Defer until DA-50+ and a dedicated /signals page makes sense. |
| Pricing-change history section | Needs ≥ 3 months of monthly snapshots before the chart is meaningful. | Snapshot the `pricing_details` JSONB monthly into a `pricing_history` table starting now; visualize once 3+ data points accumulate. |
| Lighthouse Mobile audit | Needs local browser + 8 sample pages exported. Runbook in `sop-lighthouse-axe.md`. | When the operator wants a Core Web Vitals baseline before a marketing push. |
| axe-core / Pa11y accessibility audit | Same — needs local browser. Runbook in `sop-lighthouse-axe.md`. | Quarterly accessibility refresh. |
| Manual UX walkthrough | Operator-only — clicking through every flow on a real iPhone. Checklist in `sop-manual-ux-walkthrough.md`. | Before any major design change or marketing campaign. |
| Resend transactional email | API key not yet provisioned. Newsletter capture writes to DB; sends ship when key lands. | When operator signs up at resend.com. |

---

## 7. Reference index — every doc shipped

`docs/operations/`:

- **sop-pipelines-master.md** — single index of every automated pipeline (12 active, 7-field SOP per pipeline)
- **sop-freshness-contract.md** — the 200/day + 50/day + cascade contract with verification SQL
- **sop-1-monthly-refresh.md** — Phase 4 SOP monthly runbook
- **sop-2-weekly-latest.md** — latest-updates refresh runbook
- **sop-3-view-counts.md** — view-count debugging
- **sop-4-bing-direct-submission.md** — Bing API setup + rotation strategy
- **sop-lighthouse-axe.md** — Lighthouse + axe-core local-run instructions (NEW this session)
- **sop-manual-ux-walkthrough.md** — manual QA checklist (NEW this session)
- **crawl-audit-2026-05-16.md** — robots audit findings
- **strategy-5-approaches.md** — 5 distinct visibility strategies with measurement targets
- **daily-updates-log.md** — auto-generated daily activity log (`npm run daily:log:export`)
- **phase-8-final-report.md** — this doc

`scripts/launchd/`:

- 5 plists for SEO daily reminders + `install-all.sh`

`/admin/` routes:

- `/admin/daily` — today's operator checklist
- `/admin/updates` — daily activity log (rolling 60-day history)
- `/admin/authority` — referring domains tracker
- `/admin/analytics` — platform-wide metrics
- `/admin/tools` — catalog management

---

## 8. The 30-day plan

Continuing automated work (no operator action needed):

- ~6,000 tools refreshed (200 × 30 days)
- ~1,500 new tools added (50 × 30 days, signal-dependent — realistic 300-1,200)
- ~600 compare editorials regenerated (20 × 30)
- ~3,000 URLs submitted to Bing
- ~30 daily-update snapshot rows written
- ~30 GSC sitemap re-pings

Operator weekly cadence:

- 5 × week: 10 founder outreach emails + 15-min HARO check
- 1 × week (Monday): GSC index review + /admin/authority audit
- 1 × month (1st): Phase 4 SOP overnight run

**Expected 30-day outcomes:**

- Indexed-page count (GSC): 500 → **1,500+**
- Bing indexed URLs: ~50 → **2,500+** (post first rotation cycle)
- Referring domains: 0 → **15-35** (if operator runs the outreach cadence)
- AI assistant citations (Copilot / ChatGPT / Perplexity): trace mentions appear

---

## 9. The single guarantee at close of Phase 8

**Every tool in the catalog has been re-verified within the last 8 days. Every page on the site that mentions a tool reflects that tool's current data within 1 hour. New tools enter the catalog only when they have measurable real-world traction. The pipelines that maintain this run server-side and don't depend on the operator's laptop being on.**

Phase 8 closed.
