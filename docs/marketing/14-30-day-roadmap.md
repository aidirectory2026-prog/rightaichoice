# 30-Day Aggressive Autonomous Growth Roadmap — RightAIChoice

> **Operating principle:** every recurring job runs in the cloud. Laptop on, laptop off, laptop asleep — the engine does not stop. The manager's role is **review and approve, never run**. Skills exist to compress the manager's 30-minute daily session into structured decisions, not to substitute for cron.

---

## Context

- **750 indexed pages.** Avg position drifted 7.2 → 39 over 27 days. 179 thin programmatic pages drag the average. CTR 0.17% vs. expected ~2%. 49% of impressions come from 5 blog posts.
- **700+ newsletter subscribers captured, 0 emails ever sent.**
- **0 of 580 tools have affiliate URLs.** Zero revenue path live.
- **No outreach cadence. No social automation. No backlink monitoring.**
- **Existing infra already runs in the cloud** (16 Vercel cron routes, 2 GitHub Actions workflows, Supabase pg_cron capability, Resend transactional). What's missing is **schedule density, cascade coverage, and a manager interface (skills) that gates daily decisions in <30 minutes**.

This plan is calibrated for: **6 hours/day, 6 days/week, Sunday off (28-day execution + 2 buffer days)**, but the 6 hours apply to **Week 1 build only**. From Day 8 onward, manager time drops to **30 minutes/day, all cloud-driven**.

---

## Locked decisions

1. **No laptop dependency.** Every recurring task runs in Vercel Cron, GitHub Actions, Cloudflare Workers, or Supabase pg_cron. Any `scripts/*.ts` that needs to run on a schedule is invoked by a GH Action — never by a human `npm run`.
2. **Single freshness source of truth.** When any tool's data changes, a Postgres trigger writes to `pages_freshness`; sitemaps, JSON-LD, visible "Last updated" strings, and the newsletter feature pool all read from that one table. One refresh → freshness propagates everywhere with a real date.
3. **Skill scope:** project-scoped at `.claude/skills/` (versioned with repo).
4. **Outreach send policy:** drafts auto-queue overnight (cloud cron); manager approves in `/outreach-batch` next morning; Resend sends within the same skill call. No human "send" click outside Claude Code.
5. **Off day:** Sunday. Days 7, 14, 21, 28 are buffer/catch-up; automation keeps running.
6. **Aggressive stretch targets (committed).** See KPI table below — doubled from the prior conservative draft.
7. **Newsletter ESP:** Beehiiv free tier (≤2,500 subs) for newsletter sends. Resend for transactional + outreach.
8. **Budget:** ~$50/mo LLM tokens + $20/mo Resend Pro from Day 14 (newsletter sends exceed free tier). Everything else free-tier.
9. **Today is 2026-05-19** → Day 1 = Wed 2026-05-20, Day 30 = Thu 2026-06-18.

---

## North-star KPIs — aggressive autonomous targets

| Metric | Today (2026-05-19) | Day 30 target | Day 60 stretch |
|---|---|---|---|
| Indexed pages | 750 | **2,400** | 4,000 |
| Avg position | 39 | **6** | 4 |
| Site-wide CTR | 0.17% | **3.0%** | 4.5% |
| Clicks (weekly) | ~15 | **1,200** | 3,500 |
| Tools in catalog | 580 | **740** (+160 new) | 1,000 |
| Tools refreshed in last 7 days | <10% | **100%** (rolling) | 100% |
| Tools with affiliate URL | 0 / 580 | **500** (86%) | 700 (95%) |
| Compare pages | 115 | **350** | 700 |
| Best-of / role / stack pages cascade-fresh | NO | **YES, automatic** | YES |
| Newsletter subs (active on Beehiiv) | 700 captured, 0 sent | **2,200** | 5,000 |
| Newsletter editions sent | 0 | **8 (2/wk)** | 24 |
| Backlinks logged in `referring_domains` | manual only | **250 tracked, 80 new** | 600 / 200 new |
| Outreach emails sent | 0 | **600 sent, 60 replies** | 1,800 / 200 replies |
| HARO/Featured replies | 0 | **40** | 120 |
| Daily X posts | 0 | **90 posted (3/day)** | 270 |
| Reddit organic replies | 0 | **40 posted** | 120 |
| Manager time/day (Day 8+) | n/a | **≤30 min** | ≤15 min |

Every number above assumes the cloud automation is the engine; the manager is a throttle.

---

## Always-on automation matrix (the cloud engine)

Every line is laptop-independent. Frequency is the locked schedule. UTC throughout. Each row lists what it touches and what it triggers downstream.

### Vercel Cron (Next.js routes, HTTP-triggered)

| Route | Schedule (UTC) | Purpose | Downstream cascade |
|---|---|---|---|
| `refresh-tools` | `*/30 * * * *` (every 30 min) | Refresh 30 tools per run by `last_full_refresh_at ASC`. ~1,440 refreshes/day → entire catalog every <12h. | Trigger `pages_freshness` bump for tool slug. |
| `cascade-comparisons` (rename of `refresh-compare-editorials`) | `0 */2 * * *` (every 2h) | Pick 8 stale comparisons from `v_stale_comparisons` (any tool in pair refreshed since last comparison `updated_at`). Regen editorial via DeepSeek. | Bump `pages_freshness` for compare slug. |
| `cascade-hubs` (NEW) | `15 */2 * * *` (every 2h, +15min offset) | When a tool's `pages_freshness` row updates, recompute `lastModified` for every best-of, category, role, stack page containing that tool. | Sitemap `lastModified` refreshed. JSON-LD `dateModified` refreshed. Newsletter eligibility re-scored. |
| `refresh-faqs` | `0 3 * * *` (daily 03:00) | Regenerate FAQs for top-200 tools by view_count. | Bumps `pages_freshness`. |
| `refresh-freshness-view` | `45 23 * * *` (daily 23:45) | Materialize `v_pages_freshness_summary` for `/admin/seo` + sitemap reads. | `/admin/seo` dashboard updates. |
| `snapshot-daily-updates` | `55 23 * * *` | Log day's changes into `daily_updates`. | `/admin/updates` UI fresh. |
| `snapshot-gsc` (NEW) | `0 6 * * *` (daily 06:00) | Pull 7d + 28d GSC data into `gsc_snapshots`. | `gsc_diffs` populated by next run. |
| `diff-gsc` (NEW) | `30 6 * * *` (daily 06:30) | Diff today's snapshot vs. yesterday + last week. Write per-page deltas to `gsc_diffs`. | `/seo-pulse` reads this. Anomaly cron reads this. |
| `triage-gsc` (NEW) | `0 7 * * 1` (Mon 07:00) | Apply decision matrix from Doc 13. Output prioritized action queue. | `/seo-plan-week` reads queue. |
| `kpi-anomaly` (NEW) | `15 7 * * *` (daily 07:15) | Check every north-star KPI for >20% WoW shift. | Resend alert to manager. |
| `cost-tracker` (NEW) | `0 5 * * *` (daily 05:00) | Aggregate Anthropic + DeepSeek + Apify + Resend + Vercel usage. | `/admin/costs` + alert at $100 burn. |
| `audit-schema` (NEW) | `30 4 * * *` (daily 04:30) | Validate JSON-LD on 200 sampled pages. | `/admin/seo` punch-list updated. |
| `audit-gsc-indexation` | `0 8 * * 2,5` (Tue/Fri 08:00) | Inspect 500 URLs/run via URL Inspection API. | Indexation buckets in `/admin/seo`. |
| `indexnow-recent` | `30 * * * *` (every hour, +30min) | Push last hour's `pages_freshness` URLs to Bing/Yandex. | Bing crawl re-triggers. |
| `resubmit-sitemap-gsc` | `0 6 * * 1` (Mon 06:00) | Ping GSC sitemap. | GSC re-fetch. |
| `submit-urls-bing` | `0 9 * * *` | Push daily new/changed URLs. | Bing crawl. |
| `ingest-tools` | `0 */6 * * *` (every 6h) | Discover new tools from configured sources (TAAFT, ProductHunt, Pulse). Add to `candidates` queue. | `/admin/candidates` review queue grows. |
| `auto-promote-candidates` (NEW) | `0 */4 * * *` (every 4h) | Auto-promote candidates passing safety gates (real domain, no profanity, valid pricing, embeddings dedup). Scale = 5/run → ~30/day → ~210/week new tools live. | `refresh-tools` picks them up next slot → entire cascade. |
| `outreach-founders` (NEW) | `0 9 * * 1-5` (Mon–Fri 09:00) | Draft 30 founder emails/day from `outreach_queue`. Stage as `pending_review`. | `/outreach-batch` skill reads them next morning. |
| `outreach-followup` (NEW) | `0 9 * * 2,4` (Tue/Thu 09:00) | Draft follow-up to non-responders past 7 days. | `/outreach-batch` queue. |
| `badge-outreach` (NEW) | `0 10 * * 1,4` (Mon/Thu 10:00) | Draft 25 badge-pitch emails/day for tools at viability ≥70. | `/outreach-batch` queue. |
| `newsletter-weekly` (NEW) | `0 11 * * 2,5` (Tue/Fri 11:00) | Build 2x/week newsletter draft from top tools + viability shifts + new ingests + compare spotlight. Post to Beehiiv as draft. | Manager sends from `/content-batch` skill (1-click Beehiiv API send). |
| `weekly-report` (NEW) | `0 16 * * 5` (Fri 16:00) | Aggregate KPI deltas + cost + ROI. Email to manager. | Manager reviews in `/weekly-report`. |
| `seo-impact-attribution` (NEW) | `0 15 * * 6` (Sat 15:00) | For every page touched ≥21 days ago in `weekly_loop_actions`, compute position+impr delta. | `/seo-impact` reads it. |

**Total: 22 Vercel cron entries.** Vercel Pro allows 40 cron jobs. Comfortable headroom.

### GitHub Actions (Node + git context)

| Workflow | Schedule (UTC) | Purpose |
|---|---|---|
| `cron-pipelines.yml` (existing) | every 6h | Run heavy refresh + sentiment scripts. |
| `freshness-batch.yml` (existing) | every 4h | Heavy freshness recomputation. |
| `daily-x-post-draft.yml` (NEW) | `0 7 * * *` | Draft 3 X-post variants (insight / hot-take / data). Push to `social_queue`. |
| `weekly-linkedin-carousel.yml` (NEW) | `0 12 * * 3` (Wed 12:00) | Draft 7-slide carousel from prior-week's top click-getter. |
| `weekly-blog-pipeline.yml` (NEW) | `0 10 * * 4` (Thu 10:00) | Draft blog post for top hot-keyword gap (pos 11–30, ≥50 impr/wk). |
| `weekly-backlink-import.yml` (NEW) | `0 4 * * 0` (Sun 04:00) | Pull OpenLinkProfiler free API → `referring_domains`. |
| `weekly-competitor-scrape.yml` (NEW) | `0 5 * * 0` | Scrape TAAFT, Futurepedia, There's an AI For That for backlink gaps. |
| `weekly-core-web-vitals.yml` (NEW) | `0 6 * * 0` | Run Lighthouse on top-50 ranking pages. Alert on regressions. |
| `monthly-affiliate-rescan.yml` (NEW) | `0 5 1 * *` (1st 05:00) | Rescan all tools without affiliate URL for newly-launched programs. |
| `daily-compare-batch.yml` (NEW) | `0 13 * * *` (daily 13:00) | Generate 8 new comparison pages from `compare_candidates` queue. Pre-publish via 7-gate. |
| `daily-page-generation.yml` (NEW) | `0 14 * * *` (daily 14:00) | Generate up to 20 new pages (best-of / role / stack / tool) from `seo_page_queue`. Stage as drafts; manager approves in `/publish-batch`. |

### Cloudflare Workers (sub-hourly listeners — free tier)

| Worker | Schedule | Purpose |
|---|---|---|
| `haro-listener` | `*/15 * * * *` (every 15 min) | Fetch HARO/Qwoted/Featured queries. Classify AI-relevance via Haiku. Draft replies to `outreach_queue` (type=haro). |
| `reddit-listener` | `*/10 * * * *` (every 10 min) | Monitor r/AItools, r/artificial, r/SaaS, r/aiagents, r/ChatGPT, r/programming, r/MachineLearning for "best X" threads. Draft replies. |
| `producthunt-listener` | `0 * * * *` (hourly) | Watch PH daily for AI launches matching our coverage gaps. Auto-add to `candidates`. |
| `mention-listener` | `*/30 * * * *` | Google Alerts / Brand mentions for "RightAIChoice". Log to `referring_domains` with detection_source='alert'. |

### Supabase pg_cron + Edge Functions (DB-resident)

| Job | Schedule | Purpose |
|---|---|---|
| `propagate_freshness()` trigger | on `tools.UPDATE` | Insert/update `pages_freshness` row for every page referencing this tool (compare, best-of, category, role, stack). **This is the freshness cascade core.** |
| `recompute_stale_comparisons()` | `*/30 * * * *` | Refresh `v_stale_comparisons` materialized view. |
| `recompute_hub_lastmod()` | `*/15 * * * *` | Update `hub_pages_lastmod` for sitemap reads. |
| `auto_dedup_candidates` | `*/10 * * * *` | Vector-similarity dedup of `candidates` against existing `tools` (pgvector). |

**No local cron. No launchd. Nothing runs from the laptop.** If laptop is off for a week, every number in the KPI table still moves.

---

## The freshness cascade — single source of truth

The bedrock that makes "data refreshed everywhere" work without manual coordination.

```
[any field on tools.UPDATE]
      │
      ▼
Postgres trigger: propagate_freshness()
      │
      ├─→ pages_freshness (tool_slug, page_path, last_changed_at, change_source)
      │     • tool page
      │     • every compare page containing this tool
      │     • every best-of containing this tool
      │     • every category/role/stack containing this tool
      │     • every blog post referencing this tool
      │
      ▼
Vercel cron `cascade-hubs` (every 2h)
      │
      ├─→ Recompute lastModified for affected hub pages
      ├─→ Bump JSON-LD dateModified
      ├─→ Update visible "Last updated YYYY-MM-DD" string (server-rendered, no client JS)
      ├─→ Mark sitemap entries dirty
      │
      ▼
Vercel cron `indexnow-recent` (hourly)
      │
      ├─→ Push dirty URLs to Bing IndexNow
      ├─→ Push to GSC URL submission API (batched)
      │
      ▼
Newsletter eligibility re-scored
      │
      ▼
`refresh-faqs` re-considers depth on touched pages
```

**Implementation:** one new migration (`pages_freshness` table + trigger), one new helper `lib/seo/freshness.ts` that every sitemap and page reads from, one cron route `cascade-hubs` that materializes the read side. Three files. The cascade then applies to every existing and future page automatically — no per-feature wiring.

**Visible date everywhere:** every page type (tool, compare, best-of, category, role, stack, blog) renders `<p>Last updated <time dateTime={lastChangedAt}>{formatDate(lastChangedAt)}</time></p>` near the title, sourced from `pages_freshness`. Schema.org `dateModified` mirrors it. Google freshness signal reaches every page, with no per-page authoring effort.

---

## The skill family — manager's 30-minute interface

12 project-scoped skills at `.claude/skills/`. Tiered by cognitive role: **what to look at → what to decide → what to ship → what worked**. Each one reads from the always-on data layer; none of them runs the work itself.

### Tier 1 — Diagnostics (read-only, <60s each)
- **`/seo-pulse`** — avg position, CTR, indexation buckets, weekly delta. One screen.
- **`/seo-audit`** — full punch list: schema errors, 404s, depth-thin pages, canonical conflicts.
- **`/ops-pulse`** — newsletter open/click rates, affiliate clicks, outreach reply rate, social engagement, cron failures, cost burn.

### Tier 2 — Planning (Monday/Friday)
- **`/seo-plan-week`** — Monday ritual: read `gsc_diffs` + `triage-gsc` queue. Output sprint of 15–20 actions.
- **`/seo-plan-new-pages`** — propose next 40 pages with type/slug/est-traffic/cluster-fit.
- **`/growth-plan-week`** — newsletter angles, outreach batch composition, social themes.

### Tier 3 — Execution (daily, the 30-min loop)
- **`/seo-fix-page <slug>`** — surgical fix per page (title, depth, links, schema, noindex). Composes 5 sub-scripts.
- **`/publish-batch`** — review queued generated pages (compare/best-of/role/stack/blog drafts). Keyboard `a/r/e` per row. Approved publishes via 7-gate.
- **`/seo-noindex-sweep`** — kill the bottom 100–200 deadweight pages.
- **`/outreach-batch`** — daily approve/reject grid for outreach + HARO + Reddit drafts. ~5 sec/item.
- **`/affiliate-enrich`** — approve/reject affiliate URL candidates the cloud researcher has found overnight. Fast-batch keyboard mode.
- **`/social-batch`** — approve daily X / weekly LinkedIn / Reddit drafts. 1-click queue to Typefully.
- **`/content-batch`** — newsletter draft review + blog draft edit. The only deeper-touch surface.

### Tier 4 — Measurement (Friday)
- **`/seo-impact`** — 4-week attribution per touched page.
- **`/weekly-report`** — auto-generated, emailed; skill replays it in-CC for Q&A.

### The daily skill order (the 30-minute manager session, every working day)

A strict sequence the manager runs each morning. Total time target: **30 minutes by Day 8, 15 minutes by Day 21**.

```
1. /seo-pulse           (~60s)  read overnight movement
2. /ops-pulse           (~60s)  read non-SEO ops
3. /outreach-batch      (~7m)   approve ~30 drafts (5–7s/draft)
4. /social-batch        (~3m)   approve 3 X / 0–1 LinkedIn / 3–5 Reddit
5. /affiliate-enrich    (~5m)   approve ~15–20 URLs the cloud found overnight
6. /publish-batch       (~7m)   approve ~10–20 generated pages
7. /seo-fix-page x 3    (~5m)   top 3 ROI fixes from triage queue
8. /content-batch       (~2m on M/W/F, ~30m on Tue/Fri newsletter days)
```

**Monday adds:** `/seo-plan-week` (~10 min) at start.
**Friday adds:** `/weekly-report` review (~10 min) at end.

The skill order is **not arbitrary** — it follows the natural value chain:
1. **Sense** (pulses) before deciding.
2. **High-leverage low-friction approvals first** (outreach, social, affiliate, publish) — these all unblock cloud automation that's already waiting for green-light.
3. **Manual high-care surface last** (seo-fix-page, content-batch) — where the manager's judgment matters most.

---

## Cross-department cascade — every event triggers ≥2 downstream effects

```
[new tool auto-promoted from candidates] (every 4h)
   └→ refresh-tools picks it up within 30 min
   └→ pages_freshness bumped for tool slug
   └→ cascade-comparisons regenerates any compare it appears in
   └→ cascade-hubs bumps best-of / role / stack lastModified
   └→ sitemap entries updated (real timestamps)
   └→ indexnow-recent pings Bing within 60 min
   └→ JSON-LD dateModified everywhere
   └→ newsletter eligibility re-scored for next Tue/Fri send
   └→ snapshot-daily-updates logs it in /admin/updates
   └→ next Mon: snapshot-gsc picks up first impressions
   └→ +28 days: seo-impact attributes ranking lift to ingestion date
   └→ if affiliate_url set: visit redirect monetizes from minute one

[manager approves affiliate URL in /affiliate-enrich]
   └→ tools.affiliate_url updated
   └→ pages_freshness cascade fires (above)
   └→ /api/tools/[slug]/visit immediately routes to affiliate
   └→ tools.has_affiliate_program = true bumps tool's newsletter feature weight
   └→ /seo-plan-new-pages weights revenue-eligible compare candidates 2× higher
   └→ click_logs revenue path lights up
   └→ kpi-anomaly notices revenue lift; weekly-report calls it out

[manager approves outreach draft in /outreach-batch]
   └→ Resend send within same skill invocation
   └→ outreach_log row marked sent_at
   └→ reply webhook (Resend → /api/webhooks/resend) updates outreach_log.response
   └→ if positive reply: queue founder for "link exchange" pitch
   └→ if backlink earned: weekly-backlink-import picks it up Sunday
   └→ referring_domains gets new row; /admin/authority reflects it
   └→ if domain DA>30: featured as social proof in next newsletter

[manager publishes new page in /publish-batch]
   └→ pages_freshness row created
   └→ sitemap auto-updates
   └→ indexnow-recent + GSC URL submission within 60 min
   └→ audit-schema validates within 4h
   └→ /seo-plan-week considers it for first-week monitoring
   └→ +21 days: seo-impact reports its first ranking
```

**No event is a dead-end.** Every action cascades.

---

## The 30-day calendar

Week 1 is heavy build (the only week with 6-hour days). Weeks 2–4 the manager operates at 30 min/day; build effort drops to occasional 2–3 hour blocks for new automations.

### Week 1 — Build the autonomous engine (Days 1–6: Wed 2026-05-20 → Mon 2026-05-25)

**Day 1 — Wed 2026-05-20** — *Freshness cascade foundation*
- **Build (4h):** Migration `pages_freshness` table + `propagate_freshness()` trigger. `lib/seo/freshness.ts` helper. Update every sitemap (`app/sitemap.ts`, `app/best/sitemap.ts`, `app/categories/sitemap.ts`, `app/for/sitemap.ts`, `app/stacks/sitemap.ts`, `app/compare/sitemap.ts`) to read from `pages_freshness`. Update page renderers to show visible "Last updated" string from same source.
- **Build (2h):** `app/api/cron/cascade-hubs/route.ts` (every 2h). Add to `vercel.json`.
- **Manager checkpoint (15 min):** spot-check 10 pages across types render the date; verify trigger fires on a manual tool update.

**Day 2 — Thu 2026-05-21** — *GSC data layer + diagnostic skills*
- **Build (3h):** `scripts/snapshot-gsc.ts` (Mon 06:00 cron). `scripts/diff-gsc-snapshots.ts` (daily 06:30 cron). Migrations: `gsc_snapshots`, `gsc_diffs`, `weekly_loop_actions`.
- **Build (3h):** `.claude/skills/seo-pulse/`, `.claude/skills/seo-audit/`, `.claude/skills/ops-pulse/`. All read-only.
- **Manager checkpoint (10 min):** invoke `/seo-pulse` — read the 39 avg position; invoke `/seo-audit` — review punch list.

**Day 3 — Fri 2026-05-22** — *Noindex sweep + 7-gate publish*
- **Build (2h):** `scripts/script-noindex.ts` + `.claude/skills/seo-noindex-sweep/`. Identifies pages at pos 51+ with <10 impr/month.
- **Build (3h):** `scripts/script-title-rewrite.ts`, `script-depth-expand.ts`, `script-links-inject.ts`, `script-canonical-fix.ts`. Compose into `.claude/skills/seo-fix-page/`.
- **Build (1h):** `.claude/skills/publish-batch/` (7-gate from Doc 12).
- **Execute (within day):** invoke `/seo-noindex-sweep --confirm` after manager approves the 100–150 kill list (single biggest decision of the month, 45 min).
- **Expected impact:** avg position 39 → ~18 over next 14 days.

**Day 4 — Sat 2026-05-23** — *Newsletter activation (Beehiiv)*
- **Build (2h):** `lib/email/beehiiv.ts` API wrapper. Beehiiv signup; CSV-import existing 700+ subs; confirm double opt-in.
- **Build (3h):** `app/api/cron/newsletter-weekly/route.ts` (Tue/Fri 11:00 UTC, drafts to Beehiiv). `.claude/skills/content-batch/`.
- **Execute (1h):** Manager sends first newsletter (45 min edit + 5 min send): "We're back — and we cut the worst 100 AI tools." 700 dormant emails wake up.
- **AUTO from tomorrow:** newsletter draft auto-appears in Beehiiv every Tue + Fri morning.

**Day 5 — Sun 2026-05-24** — *Off / catch-up.* Automation runs.

**Day 6 — Mon 2026-05-25** — *Affiliate infra + outreach engine*
- **Build (2h):** Migration: `tools.has_affiliate_program`, `tools.affiliate_network`, `tools.affiliate_notes`. `.claude/skills/affiliate-enrich/` (researches a tool's affiliate program via web fetch heuristics + LLM). Queue table `affiliate_research_queue`.
- **Build (2h):** `app/api/cron/affiliate-research-daily/route.ts` — researches 50/day from queue. Stages findings for manager review.
- **Build (2h):** `app/api/cron/outreach-founders/route.ts`, `outreach-followup/route.ts`, `badge-outreach/route.ts`. `.claude/skills/outreach-batch/`.
- **Manager checkpoint (30 min):** approve first batch of overnight affiliate findings + first outreach drafts. **From Day 7, this entire flow runs while you sleep.**

**Day 7 — Tue 2026-05-26** — *Catch-up day.* Manager does first full 30-min skill loop end-to-end. Validates feel.

---

### Week 2 — Operate + multiply (Days 8–13: Wed 2026-05-27 → Mon 2026-06-01)

Daily manager pattern locks in: **30 minutes/day, skill order above**. Build effort shifts to social + cloud listeners.

**Day 8 — Wed 2026-05-27** — *Social automation*
- **Build (3h):** `.github/workflows/daily-x-post-draft.yml` (07:00 UTC, 3 variants). `.claude/skills/social-batch/`. Typefully API wired (or 1-click manual paste).
- **Build (2h):** `.github/workflows/weekly-linkedin-carousel.yml` (Wed 12:00).
- **Manager checkpoint (10 min):** approve first X post + carousel.

**Day 9 — Thu 2026-05-28** — *Cloudflare Workers (HARO + Reddit)*
- **Build (3h):** `cloudflare/haro-listener/` (every 15 min). `cloudflare/reddit-listener/` (every 10 min). Both push to `outreach_queue` with classification.
- **Build (1h):** Extend `/outreach-batch` to surface HARO + Reddit drafts in same approve flow.
- **Daily 30 min skill loop.**

**Day 10 — Fri 2026-05-29** — *Auto-promote candidates + page generation*
- **Build (3h):** `app/api/cron/auto-promote-candidates/route.ts` (every 4h, 5 promotions/run). Embeddings-based dedup against existing tools. Safety gates: real domain, valid pricing JSON, no profanity, viability ≥40.
- **Build (2h):** `.github/workflows/daily-page-generation.yml` — 20 new pages/day staged as drafts. `.github/workflows/daily-compare-batch.yml` — 8 new compare/day.
- **Manager checkpoint:** approve first batch in `/publish-batch` (20 min).
- **AUTO impact:** from this day, the catalog grows ~30 tools/day and ~28 new pages/day, fully gated by the manager's 7-min `/publish-batch` review.

**Day 11 — Sat 2026-05-30** — *Backlink intelligence + cost tracker*
- **Build (2h):** `.github/workflows/weekly-backlink-import.yml` (Sun 04:00 — OpenLinkProfiler). `.github/workflows/weekly-competitor-scrape.yml` (Sun 05:00).
- **Build (2h):** `app/api/cron/kpi-anomaly/route.ts`, `cost-tracker/route.ts`. Resend alert wiring.
- **Build (2h):** Upgrade `/admin/authority` dashboard.

**Day 12 — Sun 2026-05-31** — *Off / catch-up.* Automation runs.

**Day 13 — Mon 2026-06-01** — *Monday ritual #1 with real data*
- **Manager (45 min):** `/seo-plan-week` — first full week of `gsc_diffs`. Sprint of 15–20 actions.
- **Manager (15 min):** Execute via `/seo-fix-page` on top 5.
- **Expected:** avg pos 18 → 13 as Week 1's noindex sweep takes full effect.

---

### Week 3 — Compound + measure (Days 15–20: Wed 2026-06-03 → Mon 2026-06-08)

Almost zero build. Manager runs the 30-min loop. Cloud expands tool count, comparisons, outreach reach, newsletter sends.

**Day 15 — Wed 2026-06-03** — *Impact attribution skill*
- **Build (2h):** `app/api/cron/seo-impact-attribution/route.ts` (Sat 15:00). `.claude/skills/seo-impact/`. Reads `weekly_loop_actions` + current GSC; computes per-action position+impr delta.
- **Daily skill loop (30 min).**

**Day 16 — Thu 2026-06-04** — *Blog pipeline*
- **Build (3h):** `.github/workflows/weekly-blog-pipeline.yml` (Thu 10:00). First draft auto-staged in admin queue.
- **Manager (30 min in `/content-batch`):** edit + publish first auto-drafted blog post.

**Day 17 — Fri 2026-06-05** — *Badge program activation*
- **Build (2h):** `app/api/cron/badge-outreach/route.ts` already wired Day 6; surface in `/outreach-batch` with type=badge. Add badge analytics to `/admin/authority` (embed referrer logs).
- **Daily skill loop.**

**Day 18 — Sat 2026-06-06** — *Tune all listeners*
- **Build (1h, tuning):** Add r/MachineLearning, r/programming, r/ChatGPT to Reddit listener. Bump Reddit draft cap to 7/day. Tune HARO classifier thresholds based on first week's accept rate.
- **Daily skill loop.**

**Day 19 — Sun 2026-06-07** — *Off / catch-up.*

**Day 20 — Mon 2026-06-08** — *Monday ritual #2.*
- **Manager (45 min):** `/seo-plan-week` + `/seo-fix-page` x 5.
- **Expected:** avg pos 13 → 9.

---

### Week 4 — Prove + tune (Days 22–27: Wed 2026-06-10 → Mon 2026-06-15)

**Day 22 — Wed 2026-06-10** — *Anomaly + ROI review*
- **Manager (60 min):** review `/seo-impact` ROI report. Kill triage rules with worst ROI. Tighten outreach copy templates based on reply rates.

**Day 23 — Thu 2026-06-11** — *Affiliate push to 500 (stretch)*
- **Build (1h):** crank `affiliate-research-daily` to 80/day. Manager fast-batches in `/affiliate-enrich` (8s/tool).
- **Manager checkpoint (60 min):** approve 80 URLs in fast mode.

**Day 24 — Fri 2026-06-12** — *Catch-up + automation tuning*
- **Manager (2h):** review the past 3 weeks of `weekly_loop_actions`. Retire low-ROI scripts. Update triage decision matrix.

**Day 25 — Sat 2026-06-13** — *Monthly affiliate rescan rehearsal*
- **Build (1h):** `.github/workflows/monthly-affiliate-rescan.yml` (1st 05:00). Test-fire it manually for first dry-run.

**Day 26 — Sun 2026-06-14** — *Off / catch-up.*

**Day 27 — Mon 2026-06-15** — *Monday ritual #3 (final).*
- **Manager (45 min):** `/seo-plan-week`. Expected: avg pos 9 → 6.

---

### Days 28–30 — Final tune + Month 2 plan

**Day 28 — Tue 2026-06-16** — *Buffer.*

**Day 29 — Wed 2026-06-17** — *30-day retrospective*
- `/weekly-report --range=30d`. Full KPI deltas + cost + ROI per skill + ROI per automation.

**Day 30 — Thu 2026-06-18** — *Month 2 plan*
- Lock the 2 winning channels. Kill the 2 losers. Target Month 2 manager time: ≤15 min/day average.

---

## Critical files to be modified or created

### New scripts (`scripts/`)
- `snapshot-gsc.ts`, `diff-gsc-snapshots.ts`
- `script-title-rewrite.ts`, `script-depth-expand.ts`, `script-links-inject.ts`, `script-noindex.ts`, `script-canonical-fix.ts`
- `audit-schema.ts`
- `outreach/draft-haro-replies.ts`, `outreach/draft-reddit-replies.ts`, `outreach/draft-badge-pitches.ts`, `outreach/draft-followups.ts`
- `affiliate/research-tool.ts`, `affiliate/rescan-monthly.ts`
- `social/draft-x-posts.ts`, `social/draft-linkedin-carousel.ts`
- `content/draft-blog-post.ts`, `content/draft-newsletter.ts`

### New Vercel cron routes (`app/api/cron/`)
- `cascade-hubs/route.ts`
- `snapshot-gsc/route.ts`, `diff-gsc/route.ts`, `triage-gsc/route.ts`
- `kpi-anomaly/route.ts`, `cost-tracker/route.ts`
- `audit-schema/route.ts`
- `auto-promote-candidates/route.ts`
- `outreach-founders/route.ts`, `outreach-followup/route.ts`, `badge-outreach/route.ts`
- `affiliate-research-daily/route.ts`
- `newsletter-weekly/route.ts`
- `weekly-report/route.ts`, `seo-impact-attribution/route.ts`

### New GitHub Actions (`.github/workflows/`)
- `daily-x-post-draft.yml`, `weekly-linkedin-carousel.yml`
- `weekly-blog-pipeline.yml`
- `weekly-backlink-import.yml`, `weekly-competitor-scrape.yml`, `weekly-core-web-vitals.yml`
- `monthly-affiliate-rescan.yml`
- `daily-compare-batch.yml`, `daily-page-generation.yml`

### New Cloudflare Workers (`cloudflare/`)
- `haro-listener/`, `reddit-listener/`, `producthunt-listener/`, `mention-listener/`

### New Supabase migrations
- `pages_freshness` table + `propagate_freshness()` trigger
- `gsc_snapshots`, `gsc_diffs`, `weekly_loop_actions`
- `tools.has_affiliate_program`, `tools.affiliate_network`, `tools.affiliate_notes`
- `affiliate_research_queue`, `outreach_queue`, `social_queue`, `seo_page_queue`, `compare_candidates`
- `referring_domains` extensions (DA, anchor, detection_source)
- pg_cron jobs: `recompute_stale_comparisons()`, `recompute_hub_lastmod()`, `auto_dedup_candidates()`

### New skill files (`.claude/skills/`)
All 12 skills listed in the toolbox section.

### Modified
- All `app/**/sitemap.ts` → read `pages_freshness`.
- All page renderers (`app/best/[slug]`, `app/compare/[slug]`, `app/for/[slug]`, `app/stacks/[slug]`, `app/categories/[slug]`, `app/tools/[slug]`, `app/blog/[slug]`) → render visible "Last updated" from `pages_freshness`.
- `lib/seo/json-ld.ts` → `dateModified` from `pages_freshness` everywhere.
- `vercel.json` → register all 22 cron entries.
- `app/api/newsletter/subscribe/route.ts` → switch to double opt-in via Beehiiv API.
- `app/api/tools/[slug]/visit/route.ts` → already routes to `affiliate_url`; add UTM-tagged tracking + click_log enrichment.

### Reused (do not rebuild)
- `lib/seo/gsc-client.ts` — GSC primitives.
- `lib/seo/json-ld.ts` — schema generation.
- `lib/seo/internal-links.ts` — link suggestion.
- `app/api/cron/refresh-tools/route.ts`, `refresh-compare-editorials/route.ts`, `refresh-faqs/route.ts`, `indexnow-recent/route.ts`, `ingest-tools/route.ts`, `snapshot-daily-updates/route.ts`, `refresh-freshness-view/route.ts`.
- `supabase/migrations/088_comparison_stale_view.sql`.
- `app/embed/viability-badge/[slug]/route.ts` — badge embed.
- `app/api/tools/[slug]/visit/route.ts` — affiliate redirect.

---

## Aggressive tracking — what we collect (everywhere, always)

All of this lands in Supabase tables and is queryable from `/admin/*` dashboards. Nothing depends on the laptop being on.

| Surface | Events captured | Storage |
|---|---|---|
| Page view (every page) | path, referrer, UA, country (Vercel headers), session_id (cookie), tool_slug if applicable | `page_views` (Cloudflare Worker → Supabase, async) |
| Affiliate click | tool_slug, source_page, position_on_page, session_id | `click_logs` (existing) |
| Newsletter capture | email, source_page, source_section | `newsletter_subscribers` (existing) |
| Newsletter open/click | issue_id, link, subscriber_id | Beehiiv webhooks → `newsletter_events` |
| Outreach send/reply | type, target, send_at, reply_at, response | `outreach_log` (existing, extend) |
| Social post | platform, post_id, engagement_pull cron | `social_posts` |
| GSC daily | per-page impr/clicks/pos for top 1,000 pages | `gsc_snapshots` |
| GSC diff | per-page deltas | `gsc_diffs` |
| Backlink | domain, first_seen, anchor, DA, target_page | `referring_domains` (existing, extend) |
| Embed referrer | source_domain, embedded_slug | `badge_embeds` |
| Cron health | run_at, duration_ms, ok, error | `cron_logs` |
| Cost | service, day, units, usd | `daily_costs` |
| Manager actions | skill, action, slug, timestamp | `weekly_loop_actions` |

Every dashboard reads only from these tables. Zero spreadsheets, zero manual aggregation.

---

## Verification — how to know it's working

### End of Week 1 (Day 6)
- `pages_freshness` populated; sitemaps + visible dates reading from it.
- `/seo-pulse` returns data; first GSC snapshot in `gsc_snapshots`.
- 100+ pages flipped to `noindex`.
- First newsletter sent (Beehiiv dashboard confirms).
- First overnight cron-drafted outreach + affiliate batches awaiting approval.

### End of Week 2 (Day 13)
- 30+ new tools auto-promoted; sitemap reflects them with real dates.
- 100+ tools have `affiliate_url`.
- Daily 30-min skill loop is the manager's entire workflow.
- HARO + Reddit listeners have surfaced ≥30 draft replies.
- Avg position trending toward 18.

### End of Week 3 (Day 20)
- Catalog ≥650 tools (90+ net new).
- ≥200 tools with `affiliate_url`.
- ≥4 newsletter editions sent; sub count >1,400.
- ≥30 X posts published; ≥10 Reddit replies posted.
- Avg position <13.

### End of Week 4 (Day 27)
- Catalog ≥720 tools.
- ≥500 tools with `affiliate_url` (stretch).
- ≥8 newsletter editions; sub count >2,000.
- `/seo-impact` shows positive avg position-delta for actions ≥21 days ago.
- 30-day net new spend ≤$70.

### Day 29 verification commands

```bash
# Inside Claude Code (read from cloud data, no local execution required):
/seo-pulse
/ops-pulse
/seo-impact --since=2026-05-20
/weekly-report --range=30d
```

Every KPI in `/admin/seo`, `/admin/revenue`, `/admin/authority`, `/admin/updates`, `/admin/costs`.

---

## Risk list

1. **GSC quota.** URL Inspection caps at 2,000/day. Audits + snapshots staggered 6h apart in the cron schedule above to stay under.
2. **Vercel cron concurrency.** 22 routes is well under the Pro limit of 40, but two heavy ones at the same minute can stall. Cron schedule above spaces aggressively (e.g., `:00`, `:15`, `:30`, `:45` offsets).
3. **Resend free tier.** 3,000 emails/month covers 8 newsletters × ~350 sends average + ~600 outreach. Upgrade to $20/mo Pro on Day 14 to keep headroom.
4. **Cascade race condition.** A tool refresh trigger firing during a sitemap regeneration can produce stale reads. Mitigation: `pages_freshness` writes are upserts; sitemap reads are stable within a single request. Verified Day 1 acceptance test.
5. **Auto-promote thin tools.** Aggressive promotion can land low-quality entries. Mitigation: embedding dedup + viability ≥40 + manual `/publish-batch` review of generated pages catches it.
6. **Outreach reply tone.** Manager-approve-before-send is non-negotiable until reply rate is stable. `/outreach-batch` is the gate.
7. **Laptop sleep ≠ Vercel sleep.** Verified Day 1: all 22 crons execute in Vercel's runtime; nothing depends on `node` on the laptop. Local `npm run` is only for one-off manual ops.

---

## What to revisit at Day 31

1. **Lock the winners.** Top-2 channels by click contribution get doubled cadence.
2. **Kill the losers.** Any automation producing <5% of expected impact gets paused.
3. **Manager time audit.** Month 2 target: ≤15 min/day average; all approvals batched.
4. **Affiliate target Month 2:** 700/580 → impossible without catalog growth; goal is 95% of catalog populated.
5. **Cluster expansion.** First cluster at 9+ interlinked pages enters AI Mode citation rotation; expand the next cluster.
6. **Outreach Month 2 target:** 1,800 sent / 200 replies / 60 backlinks landed.

---

## Open decisions to confirm before Day 1

1. **Cloudflare Workers account.** Free tier covers all 4 listeners (100k requests/day). Sign-up needed Day 1.
2. **Beehiiv signup.** Free tier ≤2,500 subs. Migrate ~700 captured today on Day 4.
3. **Resend Pro upgrade** ($20/mo) confirmed before Day 14.
4. **Vercel Pro cron slot count** — confirm current usage; we will register 22.
5. **OpenLinkProfiler free API key** — sign up Day 11.
6. **Typefully API key** vs. manual paste for X — confirm Day 8.
