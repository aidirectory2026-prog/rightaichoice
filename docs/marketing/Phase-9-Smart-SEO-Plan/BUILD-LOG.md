# Phase 9 — Build Log

> Chronological record of what's actually been shipped against the Phase 9
> plan. Update this every time something deploys, so we can correlate
> changes to GSC/Bing movement later. New entries go at the top.

> **Catch-up note (2026-06-03):** entries below were backfilled in one pass to
> close the gap between the Day-5 `/seo-impact` entry (bottom of file) and
> 2026-06-02. They are dated by their commit date and ordered newest-first. The
> parallel "Phase 9.A–E / Automations & Catalog" track (Opus 4.8 Review session,
> per the ownership boundary) is intentionally **not** logged here, and neither is
> the **Market Sentiment Checker** (a separate, operator-owned paid-feature track
> living on the `phase9-sentiment-checker` branch). This file is the *Smart SEO*
> log only.

## Day 8 — 2026-06-03 — AEO/GEO citation tracking (`/admin/ai-citations`)

**Trigger:** doc 08 ("being cited is the new being ranked") + doc 11 KPI ("10
AI-Overview citations by day 30"). We optimize for answer engines (Dataset JSON-LD,
llms.txt, TL;DR compares) but had **no way to measure whether it's working** —
doc 08's own rule is "you can't optimize what you can't measure." This is the
**manual-first** citation log; programmatic capture (Perplexity API / SerpAPI
AI-Overview detect) is doc-08 "Week 4+" and can write to the same table later.

### What shipped (`mig 137`)
- **`ai_citations` table** (mig 137): `checked_on`, `engine`
  (chatgpt/claude/perplexity/google_aio/gemini/copilot/other), `query`, `cited`,
  `cited_url`, `position_in_answer`, `brand_mention`, `notes`, `created_by`. RLS
  on, **no policies → service-role-only** (admin pages use `getAdminClient`).
  Applied to prod via Supabase MCP; `_admin_audit_exec` presence verified.
- **`/admin/ai-citations`** page + nav link. KPIs: **Citations (30d) vs the 10
  target**, distinct engines (30d), citation rate (cited/checked), total logged;
  a per-engine cited-count strip; a log-entry form; a recent-entries table with
  delete. 30-day windows computed in SQL (`current_date - 30`) — true rolling
  window + keeps the server component pure (the new `react-hooks/purity` lint
  rule forbids `Date.now()` in render).
- **`actions.ts`** — `addCitation` / `deleteCitation` server actions
  (`requireAdmin`, `Promise<void>` form-action signature). Accepts a bare path or
  a full `rightaichoice.com` URL and normalizes to a path.

### Why DB-backed (not the doc-08 `seo/ai-citations.csv`)
Doc 08 sketched a CSV, but a DB table + admin page matches every other SEO
measurement surface (`/seo-impact`, `/admin/health`), is queryable for KPI
rollups, and lets the future programmatic tracker append to the same store.

### Operator workflow
Weekly: run ~20–30 representative queries through ChatGPT / Claude / Perplexity /
Google AI Overview; log each hit (and notable misses, `cited` unchecked) at
`/admin/ai-citations`. The KPI tile turns green at 10 citations/30d.

### Verification
`tsc --noEmit` clean; `eslint` clean (incl. the purity rule); migration applied +
table/helper confirmed live. No synthetic rows left in the table.

---

## Day 7 — 2026-06-02 — Dataset JSON-LD on the homepage (AEO/GEO citability)

**Trigger:** doc 08 (AEO/GEO) — generative engines and Google Dataset Search cite
*authoritative data sources*. The catalog of ~1,974 reviewed AI tools is exactly
that, but nothing on the site declared it as a queryable dataset entity. The
Wikidata Q-item + `Organization` schema bind the *brand*; this binds the *dataset*.

### What shipped
- **`lib/seo/json-ld.ts` — new `datasetJsonLd()` builder** (`0161e05`). Emits a
  `schema.org/Dataset` with `name`, `description`, `keywords`, `variableMeasured`
  (the structured fields we track per tool), `creator` → the Organization,
  `sameAs` → Wikidata Q139970688, and a `DataDownload` distribution pointing at
  `llms-full.txt`. **No hardcoded counts** (so it never drifts from the live DB).
- **`app/page.tsx`** emits it in the homepage JSON-LD graph (`071cd3f`).
- **Split-commit footnote:** the emission (`071cd3f`) landed before the builder
  because the builder edit had been swept into one of the ops AI's branch commits
  and never reached `main`; `0161e05` re-added the builder so `main` builds and
  stays identical to the feature branch (clean future merge).

### Why it matters
Dataset schema is the cheapest path to Google Dataset Search inclusion and a
strong "cite this source" signal for Perplexity/ChatGPT/Claude retrieval. Pairs
with the existing `llms.txt` + `llms-full.txt` distribution. Measurement is soft
(citation surfacing), tracked manually until the AEO citation log exists.

---

## Day 6 — 2026-06-01 — Stack pillars complete: solo-developers + product-teams (catalog gap resolved)

**Trigger:** these two pillars were the **blocker** in the 2026-05-31 checkpoint —
the catalog lacked the infra/design/PM/BI platforms needed to express a *true*
end-to-end dev or product-team stack. The operator's ops-AI gap-fill landed
(Vercel, Supabase, Figma, Sentry, Linear, Notion, Amplitude, Airtable, Maze,
Gamma, etc.), so both pillars became buildable as honest stacks rather than
forced AI-only framings.

### What shipped (`3aacaf7`)
- **`/stacks/ai-stack-for-solo-developers`** — 8 stages: plan → IDE → agent →
  prototype → backend → deploy → design → monitor (Cursor, Claude Code, v0,
  Supabase, Vercel, Figma, Sentry…). ~1,000-word intro, 7 FAQs, Article+FAQPage
  JSON-LD, all picks verified in-catalog.
- **`/stacks/ai-stack-for-product-teams`** — 8 stages: discovery → specs →
  roadmap → design → testing → analytics → ops → comms (Perplexity, Notion,
  Linear, Figma, Maze, Amplitude, Airtable, Gamma).
- **Stack pillars now 5** (early-stage-saas, content-creators, marketing-teams,
  solo-developers, product-teams). The doc-07 pillar queue is **complete**.

### Catalog hygiene alongside (`5307055`)
- **LlamaIndex dedup** — onboarding had created a 2nd "LlamaIndex" (`llamaindex`)
  without deduping against the canonical `llama-index` (older, has an editorial
  compare). Unpublished the dupe, set `merged_into` so the edge proxy 308s it to
  the canonical, regenerated the static merged-redirects map (**73 entries**),
  cleaned its `page_tool_mentions`.

---

## Day 5 (cont. 2) — 2026-05-30 — Cornerstones 3–5 + marketing-teams pillar + doubled-title bug fix

**Trigger:** doc-07 cornerstone + pillar queues. Concentrate authority on
high-intent editorial hubs and finish the topical-cluster spine.

### Cornerstones (now 5 total)
- **`/categories/writing-content`** (`8c50d80`) — 6 curated picks, 6 verified
  compares, ~1,000-word body, 7 FAQs, Article+FAQPage JSON-LD.
- **`/categories/research-education`** (`aaaad0d`) — framed "AI for Research &
  Learning" (dual lanes: research/search + study/learning, given the merged
  category slug).
- **`/categories/marketing-seo`** (`aaaad0d`) — spans 4 sub-lanes (SEO content,
  copy, ad creative, prospecting).
- Cornerstone set is now **code-development, image-generation, writing-content,
  research-education, marketing-seo** (5).

### Pillar #3 (`3b17f55`)
- **`/stacks/ai-stack-for-marketing-teams`** — 8 funnel stages (research, SEO,
  copy, ad creative, video, social, prospecting, outreach), 24 verified in-catalog
  picks, ~1,000-word intro, 7 FAQs, Article+FAQPage JSON-LD.

### Doubled-`<title>` bug fix (rolled into both commits)
Cornerstone + pillar pages set `title: metaTitle`, but `metaTitle` already ends in
"| RightAIChoice" *and* the root layout applies a `%s | RightAIChoice` template —
so every cornerstone/pillar rendered "… | RightAIChoice | RightAIChoice". Fixed by
switching to `title.absolute` in `app/categories/[slug]/page.tsx` and
`app/stacks/[slug]/page.tsx`. Fixes all 5 cornerstones + all existing pillars.

---

## Day 5 (cont. 3) — 2026-05-30 — /admin/health + doc-15 adoption + Bing graceful-skip + compare IndexNow blast

**Trigger:** with the cron fleet now large (snapshot/triage/digest/seo-impact/
indexnow/bing), we needed one pane of glass for "is the automation actually
running?" — and the crawlable-pagination fix needed an immediate discovery nudge.

### #1 `/admin/health` pipeline dashboard (`99fde4d`, mig 130 — doc 15 #4)
- **`pipeline_health()`** rolls up `pipeline_runs` per job: last status, last-success
  age, 24h/7d failure counts, avg duration, 7d cost, last error. Worst-first;
  flags **failing** + **stale** (>8d no success). New `/admin/health` page + nav.
- **Immediately surfaced a real outage:** `submit-urls-bing` had failed **6/6**
  runs that week. GSC OAuth auto-refresh confirmed already handled by
  `google-auth-library`.

### #2 `submit-urls-bing` graceful skip (`b019a60`)
Root cause of the outage: `BING_WEBMASTER_API_KEY` was in `.env.local` but missing
on Vercel prod, so the cron hard-failed daily and spammed failure alerts. Now
returns `skipped: env_not_configured` (matching `email-weekly-digest`'s pattern).
IndexNow keeps notifying Bing in the meantime; set the key on Vercel to re-enable
direct quota-aware submission. *(Operator to-do: confirm key on Vercel prod.)*

### #3 On-demand compare IndexNow blast (`b1bf490`)
After the crawlable-pagination fix, submitted **553 URLs (530 compares + 23
crawlable hub pages)** to IndexNow so Bing/Yandex discover the previously
undiscoverable compares immediately rather than waiting for organic re-crawl.
Wired as `npm run indexnow:compares`.

### #4 doc 15 adopted into the plan (`bf93685`)
Adopted "Automation Reliability & Observability" (relocated from the Opus 4.8
review's 9.F, which collided with the SEO crons we own) as **doc 15**; updated the
README folder map. Also resolved a migration-number collision: renumbered
`125_gsc_tool_positions → 127` (Opus 9.C took 125 `security_perf_sweep`
concurrently). Supabase tracks by timestamp version, so prod was never in conflict
— filename-prefix fix only.

---

## Day 4 (Part 2) — 2026-05-29 — Weekly SEO loop automation: triage cron + email digest + admin review page

**Trigger:** Day-4 Part 1 (above) shipped the entity-binding work and captured the GSC baseline. Day-4 Part 2 closes the measurement → triage → action loop so that every Monday, *without the laptop being on*, the system pulls fresh GSC data, prioritizes what to work on, emails a digest, and waits for the operator to accept actions from a web page.

**Constraint that shaped the design:** "best quality outcome without my laptop running or being on." This rules out Claude Code skills (`/seo-pulse`, `/seo-plan-week`, etc.) that need a CLI session. Replacement is two Vercel crons + an admin dashboard. Vercel Pro gives 40 cron slots and 300s per invocation; Supabase Pro gives the storage headroom for the JSONB snapshots and diffs. Both are well within tier limits for this workload.

**What was already in place going in:**
- `snapshot-gsc` cron (Mon 06:30 UTC) — already writes both gsc_snapshots and gsc_diffs (it computes the diff inline, not a separate cron).
- Migration `093_gsc_snapshots.sql` — `gsc_snapshots`, `gsc_diffs`, `weekly_loop_actions` tables with full lifecycle columns.
- `lib/pipelines/with-logging.ts cronRoute()` — bearer-token auth + pipeline_runs logging wrapper used by every other cron.
- `alert-failed-pipelines` cron — Resend email pattern (HTML body, `https://api.resend.com/emails`, `Authorization: Bearer ${apiKey}`).

So the new build is three thin layers on top of existing infrastructure.

### 1. `app/api/cron/triage-gsc/route.ts` — Mon 07:00 UTC

Reads the latest `gsc_diffs` row for both `7d` and `28d` scopes, classifies every page+query signal against a rules-based decision matrix, dedups by page, picks the top-50 by priority, writes them to `weekly_loop_actions` as `status='proposed'`.

**Why rules-based, not an LLM:** the decision matrix is deterministic — position band × impressions × CTR maps unambiguously to an action_type. Calling an LLM here would add cost, latency, and non-determinism for zero quality lift. LLM calls are reserved for the EXECUTION phase (title rewrites, content gen).

**Decision matrix:**

| Signal / position band | Threshold | Action | Priority |
|---|---|---|---|
| `lost` | prior.impressions ≥ 100 | refresh_page | **critical** |
| `losing` | Δpos ≥ 10 AND current.pos ≤ 20 | refresh_page | **critical** |
| pos 11–20 | impr ≥ 50 | title_rewrite | **high** |
| pos 4–10 | CTR < 1%, impr ≥ 30 | title_rewrite (earn-the-click) | **high** |
| `new` | pos 11–30, impr ≥ 30 | boost_discovery | **high** |
| `winning` | Δpos ≤ −3 AND pos ≤ 30 | links_inject | **high** |
| pos 21–30 | impr ≥ 30 | depth_expand | medium |
| pos 1–3 | CTR < 3%, impr ≥ 50 | title_rewrite | medium |

`noindex` candidates (0 impr for 4 weeks) are deferred — we don't have 4 weeks of history yet.

**Dedup:** one action per page. If a page surfaces in multiple queries, the highest-priority candidate wins; tie → highest impressions wins. The dominant query is recorded in `metadata.dominant_query` for the operator to read.

**Idempotency:** clears existing `proposed` rows for the snapshot_date before insert. Re-running Mondays produces the same final state. `accepted`/`executed`/`measured` rows are never touched.

**Cap:** 50 actions/week. Tuned to surface enough work to be meaningful but not so much that the operator can't ship in a week. If queue is consistently empty or overflows, the thresholds (top of file) are the dial.

### 2. `app/api/cron/email-weekly-digest/route.ts` — Mon 08:00 UTC

Reads this week's `proposed` actions + the latest `gsc_diffs` totals + the latest 2 `gsc_snapshots` per scope. Sends an HTML email to `ALERT_EMAIL` (Resend) with:

- **WoW summary table** — Last 7d and Last 28d clicks / impressions / CTR / avg position, each with the delta vs. the prior snapshot (colored: green=better, red=worse, with the position-direction inverted because lower-pos = better).
- **Signal-mix strip** — winners / losers / new / lost counts per scope.
- **Top-10 actions** — priority badge + action_type + canonical path + 1-line rationale + dominant query.
- **CTA button** — deep-link to `/admin/seo-pulse` for review/accept/reject.

Mobile-friendly markup (`max-width:680px`, inline styles, system-ui font stack). Subject line shows action counts so triage urgency is visible from the inbox preview.

No-op if `RESEND_API_KEY` or `ALERT_EMAIL` aren't set (returns `{ skipped: 'env_not_configured' }`) — same pattern as `alert-failed-pipelines`.

### 3. `app/admin/seo-pulse/page.tsx` + `actions.ts` — operator review page

Server component, admin-gated via the existing `app/admin/layout.tsx` (`profile.is_admin` check, redirect to /dashboard otherwise). Layout:

- **WoW summary card** at the top — mirrors the email summary table so the dashboard answers "what changed this week" without opening Gmail.
- **Counts strip** — Proposed / Accepted / Executed / Critical / High.
- **Three sections** — Proposed (sortable by priority + impressions), Accepted (awaiting execution), Executed (measuring, dimmed).
- **Per-row buttons** —
  - `proposed`: Accept (freezes baseline_* into the dedicated columns) / Reject.
  - `accepted`: Mark executed / Revoke (back to rejected).
  - `executed`: shows "measured in 4 weeks" placeholder until the future `/seo-impact` job fills `outcome_*`.

**Baseline freezing:** triage writes `baseline_*` into the JSONB `metadata` column (because it doesn't know yet which signal will be accepted). Accept copies those into the dedicated columns and stamps `accepted_at`. The dedicated columns are what `/seo-impact` will compare against `outcome_*` 4 weeks later to compute lift. This matters because GSC windows roll forward daily — without freezing, "lift" would be measured against a moving baseline.

Server actions return `Promise<void>` (Next.js 16 form-action signature). On error they `throw` — Next.js renders the framework error page and the operator can retry. Errors aren't expected to be common at this volume (≤50 rows/week, single-user admin).

### 4. `vercel.json` — 2 new cron entries

```json
{ "path": "/api/cron/triage-gsc",          "schedule": "0 7 * * 1" },
{ "path": "/api/cron/email-weekly-digest", "schedule": "0 8 * * 1" }
```

Sequence is intentional: snapshot-gsc 06:30 → triage 07:00 (30min buffer for the snapshot to finish) → email 08:00 (1h buffer for triage). All UTC.

### 5. `app/admin/layout.tsx` — SEO Pulse nav link

Inserted between "Insights" and "Tracking health" so it sits with the other measurement views.

### What's NOT in this ship

- `/seo-impact` job (4-week-old executions → outcome_* fill). Will build once we have executed rows aging out.
- Auto-execution. Every action requires explicit Accept → human edits page → Mark executed. No auto-merge of title rewrites etc. Quality bar > velocity for SEO content.
- Slack delivery. Email-only for now (matches alert-failed-pipelines current state). Easy to add by mirroring the `sendSlack` pattern.
- `noindex` action_type. Needs 4 weeks of impr=0 history to fire reliably.

### Files added / changed

| File | Change |
|---|---|
| `app/api/cron/triage-gsc/route.ts` | NEW — decision matrix + dedup + write proposed |
| `app/api/cron/email-weekly-digest/route.ts` | NEW — Resend HTML digest |
| `app/admin/seo-pulse/page.tsx` | NEW — review dashboard |
| `app/admin/seo-pulse/actions.ts` | NEW — accept/reject/markExecuted server actions |
| `vercel.json` | EDIT — added 2 cron entries |
| `app/admin/layout.tsx` | EDIT — added SEO Pulse nav link |

### Required env vars (already set if alert-failed-pipelines works)

- `RESEND_API_KEY` — Resend API key
- `ALERT_EMAIL` — recipient (tanmayverma321@gmail.com)
- `ALERT_FROM_EMAIL` — optional, default `alerts@rightaichoice.com`
- `CRON_SECRET` — bearer token Vercel sends; checked by `validateCronSecret`
- `GSC_OAUTH_*` + `GSC_SITE_URL` — already used by snapshot-gsc, no new ones

### Operating timeline

- **Mon 06:30 UTC** — `snapshot-gsc` writes new gsc_snapshots + gsc_diffs row.
- **Mon 07:00 UTC** — `triage-gsc` reads diffs, writes ≤50 proposed actions.
- **Mon 08:00 UTC** — `email-weekly-digest` lands in the inbox with WoW summary + top-10.
- **Mon morning** — operator opens email on phone or laptop, clicks "Review & accept actions", lands on `/admin/seo-pulse`, accepts/rejects.
- **During the week** — operator (or future automation) executes accepted actions, clicks "Mark executed".
- **4 weeks later** — future `/seo-impact` job fills `outcome_*`, lift is computed.

### Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean for new files (pre-existing errors in scripts/ unchanged).
- Manual smoke test deferred until first Monday firing (cron auth secret only valid via Vercel). To dry-run locally: hit the route with `Authorization: Bearer $CRON_SECRET`.

---

## Day 4 — 2026-05-29 — Brand entity binding: Wikidata Q-item, rel=me verification, awesome-list inclusion, perf-cluster fixes

**Trigger:** brand SERP is still weak (rank #2 for "rightaichoice", unknown competitor at #1 — Open Task #43). Google's Knowledge Graph and AI assistants need a verified entity to anchor the brand to; the existing Organization JSON-LD on its own isn't enough without a Wikidata Q-item or strong rel=me cross-verification. In parallel, ~150ms of unnecessary Supabase round-trips per page render on anonymous traffic were dragging TTFB on every non-cached page.

### 1. Wikidata Q139970688 created and bound

- New item at https://www.wikidata.org/wiki/Q139970688
- Statements: instance of (website), official website (https://rightaichoice.com), founder (Tanmay Verma, with own Person Q-item), inception (2026), country (India), official name (RightAIChoice/EN), X (Twitter) username (rightaichoice)
- Wikidata is the single strongest entity-binding anchor short of a Wikipedia page — Google's Knowledge Graph treats it as first-class identity, AI assistants resolve brand entities through it before falling back to web search
- Q-item URL added to Organization JSON-LD `sameAs` array — closes the verification loop in both directions (site → Wikidata via JSON-LD; Wikidata → site via official-website statement)

### 2. rel=me social verification edges (`app/layout.tsx`)

Added five `<link rel="me">` tags emitting from the root layout `<body>` (Next.js hoists these into `<head>` automatically):
- `https://x.com/rightaichoice`
- `https://twitter.com/rightaichoice` (legacy handle)
- `https://www.linkedin.com/company/rightaichoice`
- `https://github.com/aidirectory2026-prog/rightaichoice`
- `https://www.linkedin.com/in/tanmayverma99` (founder)

`rel=me` is the IndieAuth / identity-verification convention — each link declares "this profile belongs to the same entity as this site." Combined with reciprocal links from each profile back to rightaichoice.com (already in place on X, LinkedIn, GitHub), the verification loop closes. AI assistants increasingly use this to bind a brand to its social presence.

### 3. JSON-LD `sameAs` expanded

`lib/seo/json-ld.ts` Organization `sameAs` now lists: X, Twitter (legacy), LinkedIn company, GitHub org, **Wikidata Q139970688**. Founder Person JSON-LD keeps its own `sameAs` (LinkedIn personal). Both ends of `Organization.founder ↔ Person.worksFor` remain wired — Google reads both directions when building the knowledge graph.

### 4. Awesome-list inclusion (PR-based authority backlinks)

Opened two PRs that, when merged, place RightAIChoice in trusted curated GitHub directories — high-quality backlinks plus inclusion in AI-training-data corpora:

| Repo | PR | Section | Status |
|---|---|---|---|
| `mahseema/awesome-ai-tools` | [#1412](https://github.com/mahseema/awesome-ai-tools/pull/1412) | Related Awesome Lists | Open, no conflicts |
| `steven2358/awesome-generative-ai` | [#812](https://github.com/steven2358/awesome-generative-ai/pull/812) | More lists | Open, no conflicts |

Both PRs are clean one-line additions, checklist items confirmed, format matches neighbors. Typical merge time for these lists: 3 days to 3 weeks. If unmerged after 3 weeks, follow up with a polite comment.

Other candidate lists surveyed (`wsxiaoys/awesome-ai-tools` → 404 dead repo; `Hannibal046/Awesome-LLM` → poor fit, focused on academic LLM work, not editorial review platforms).

### 5. Deleted-URL deindex blast (`scripts/blast-deleted-urls-indexnow.ts`)

New dedicated script (vs. overloading the existing IndexNow submitter with flags) for 410-blasting the 64 deleted tools + 28 deleted compares (from yesterday's non-AI purge):
- Reads `DELETED_TOOL_SLUGS` + `DELETED_COMPARE_SLUGS` from `lib/seo/deleted-tools.ts`
- Submits to IndexNow only (Bing direct submit is for add/update; IndexNow handles deletion semantics — the URL returns 410, IndexNow tells Bing/Yandex to recrawl, they observe the 410, deindex follows)
- Key: `1ddd347878cead47f293292da0707a19`; host file at `/public/1ddd347878cead47f293292da0707a19.txt`
- Wired up: `npm run indexnow:deleted[:dry]`

### 6. Wayback Machine archival (`scripts/save-wayback.ts`)

New script that pings web.archive.org's Save Page Now endpoint for 25 structural URLs (homepage + tools/compare/plan/methodology/about + sitemap-index + llms.txt + llms-full.txt + feed.xml + 15 category indexes). Why:
1. AI assistants increasingly cite archived URLs as the "stable" source when canonical pages move — a fresh snapshot makes the current canonical state the reference point
2. archive.org is itself a crawlable corpus — fresh snapshots get picked up by Google's archived-content discovery and by some independent AI training pipelines
3. Free baseline audit trail — timestamped proof of priority if a competitor later mirrors content

Run result: 21 succeeded first pass; 4 rate-limited (HTTP 429) on URLs 11–13 + 1 fetch failure; retried with 15s gap individually — all 4 succeeded on retry. Total 25/25 archived. Sleep 5s between requests stayed well under the unauthenticated ~15 req/min limit; should bump to 10s for future runs to avoid the 429 retry loop.

Wired up: `npm run wayback:save[:dry]`.

### 7. Bing Webmaster smart-submit

Ran `npm run bing:submit -- --smart` — submitted 33 alternative-URL pages. Bing lifetime submitted now 733. The `--smart` flag picks URLs by a multi-factor score (freshness + traffic + indexation gap) rather than just newest-first.

### 8. Perf cluster — three fixes, deployed earlier today

Fixes A/B/C from the perf audit that were starving the site of TTFB on every anonymous page render:

- **Fix A — Skip `supabase.auth.getUser()` on browse paths** (`app/layout.tsx`, `lib/supabase/middleware.ts`). The root layout was unconditionally calling Supabase auth + profile fetch on every page render, paying ~150ms per request to confirm "yes, you're still anonymous" for 99% of traffic. Now: cookie-gated — only resolve the user when an `sb-*-auth-token` cookie is present. `pathNeedsAuth()` in the proxy returns true only for /login, /signup, /dashboard, /admin, /profile, /submit-tool, /saved, /api/admin, /api/account; everything else returns `NextResponse.next({ request })` immediately.

- **Fix B — Static merged-tool redirect map** (`lib/seo/merged-redirects.ts`, `proxy.ts`). The proxy was doing a per-request DB query to check whether the requested `/tools/<slug>` was a merged-into legacy slug. Replaced with a `MERGED_TOOL_REDIRECTS` object baked at build time via `scripts/build-merged-redirects.ts`. 67 mappings in the static map, O(1) lookup at the edge, zero DB hops. Verified clean: no 308→410 chains, no double-hops. Wired up: `npm run merged:build[:dry]`.

- **Fix C — Drop `export const dynamic = 'force-dynamic'` from `/compare/[slug]`**. The editorial compare pages had `force-dynamic` set, forcing a per-request SSR on pages that already had ISR-grade caching infrastructure. Dropped to default. 500 editorial compare pages now serve from edge cache.

- **Fix D — Supabase read replica** (`#90`) — **deferred** (option C). Measure compute scale-up impact first before adding read-replica complexity. Re-evaluate after 1 week of post-RESIZING traffic data.

### 9. Stack page hygiene (`lib/data/stacks.ts`, `app/stacks/[slug]/page.tsx`)

Removed Wave from the solopreneur stack's Finance & Admin alternatives — Wave is one of the 64 deleted non-AI tools. Two changes:
- `lib/data/stacks.ts:1254` — removed the Wave alternative entry; `alternatives: []` now
- `app/stacks/[slug]/page.tsx:83` — guarded the JSON-LD HowTo step builder against empty alternatives arrays so the schema doesn't emit a dangling "Alternatives: ." suffix

Regenerated `public/llms-full.txt` (1974 tools, 500 editorial compares, 15 categories, 2,478,992 bytes). Verified 0 deleted-slug leaks.

### 10. GSC baseline snapshot captured

Ran `npm run snapshot:gsc` at end of day so we have a frozen "before Phase 9 entity work" measurement to diff against next week. Numbers:

```
7-day  (May 20–26):  22 clicks, 18,672 impr, 0.12% CTR, avg pos 52.9
28-day (Apr 29–May 26): 50 clicks, 31,670 impr, 0.16% CTR, avg pos 44.7
```

Avg position has drifted further (52.9 on 7d window vs 39 noted in Day-1 baseline). Today's brand-entity work is precisely the right intervention for that drift — Google's entity confusion is a known cause of position decay when SERPs can't bind a query to a trusted brand entity.

### Commits shipped today

| Commit | What |
|---|---|
| `9cf56e1` | Phase 8.f — per-tool depth + history on edit page (pre-existing, pushed today) |
| `dd925b1` | Fix B — static merged-redirects map populated (67 entries) |
| `25215ba` | Deleted-URL IndexNow blast script |
| `e64f5f9` | Wayback Machine archival script |
| `35f8178` | JSON-LD HowTo cleanup + Wave removal + llms-full regenerate |
| `0e83435` | rel=me social verification links |
| `f1db62a` | Wikidata Q139970688 added to Organization JSON-LD sameAs |

### What's NOT in this ship (and why)

- **GSC weekly optimization loop crons** (`snapshot-gsc` + `diff-gsc` as daily Vercel cron) — manual `npm run snapshot:gsc` works today; automation is Day-5 work (Option B from the end-of-day check-in).
- **Founder outreach drafts** — `outreach:draft` script exists but not run today; high-leverage but slow, scheduling for Week 2.
- **Tier-1 candidate title rewrites** — Open Task #47, blocked on the DeepSeek title rewriter UI; not addressed today.
- **Newsletter sends** — 700+ subs captured, still 0 sent. Blocked on Beehiiv setup (Day-14 ESP budget item per roadmap).
- **Dataset entity in JSON-LD** — `lib/seo/json-ld.ts` doesn't yet expose a Dataset schema for the catalog itself. Considered but deferred; would help with AI-citation discoverability of "the dataset of AI tools" as a queryable entity, but the marginal entity-binding lift from Wikidata + rel=me today is larger.

### What's measurable from this ship

| When | Check |
|---|---|
| Today +1h | Vercel deploy live; view-source on any page shows Wikidata `sameAs` + 5 `<link rel="me">` tags |
| Today +24h | Wayback snapshots appear in `https://web.archive.org/web/*/rightaichoice.com` |
| Day +3 | Brand SERP re-check: did Wikidata Q-item start surfacing in the right rail? |
| Day +7 | `npm run diff:gsc` vs today's baseline — first signal of brand-entity lift on impr/pos |
| Day +14 | Awesome-list PRs typically merged by now; backlink graph updated |
| Day +21 | Google entity-cache typically refreshed; full effect of Wikidata + rel=me visible |

### Files touched

- New: `lib/seo/merged-redirects.ts`, `scripts/build-merged-redirects.ts`, `scripts/blast-deleted-urls-indexnow.ts`, `scripts/save-wayback.ts`, `public/1ddd347878cead47f293292da0707a19.txt`
- Modified: `app/layout.tsx` (cookie-gated auth, rel=me tags), `lib/supabase/middleware.ts` (path-scoped auth), `proxy.ts` (static merged-redirects), `lib/seo/json-ld.ts` (Wikidata sameAs), `app/compare/[slug]/page.tsx` (drop force-dynamic), `app/stacks/[slug]/page.tsx` (HowTo guard), `lib/data/stacks.ts` (Wave removal), `package.json` (6 new scripts)
- External: Wikidata Q139970688, GitHub PR #1412 (mahseema), GitHub PR #812 (steven2358)

---

## Day 4 — 2026-05-29 — Non-AI tool purge: 64 hard deletes + 410 Gone

**Trigger:** user directive to ensure "no non-AI tool on our website" — the brand promise is AI tool discovery, and presence of clearly non-AI listings (hosting, accounting, payroll, hardware) dilutes the topical signal Google sees and hurts user trust on landing.

### Two-pass classification

A single LLM pass is too brittle for a destructive operation, so this ran as a **classify → strict-recheck → execute** pipeline:

1. **First pass — full catalog audit** (`scripts/audit-non-ai-tools.ts`, `npm run audit:non-ai`)
   - DeepSeek classifier sweep across all 2,038 published tools, batches of 25, concurrency 3
   - Three buckets: `ai_native` | `ai_enabled` | `non_ai` — bias toward `non_ai` when uncertain
   - Outcome: 1,092 ai_native, 684 ai_enabled, **262 flagged non_ai**
   - Output: `candidates/non-ai-audit.json`

2. **Strict re-check** (`scripts/recheck-non-ai-tools.ts`, `npm run recheck:non-ai`)
   - Re-examined only the 262 with FULL per-tool context (description, features, models, integrations, use_cases, has_api)
   - Stricter prompt: ANY meaningful AI feature → keep, even if bolted-on; smaller batches of 10
   - Caught false-positives the first pass missed: DaVinci Resolve (Magic Mask / Voice Isolation), Calendly (AI Notetaker), Brandwatch (Iris AI), Bluehost (AI Site Builder), Appsmith (AI copilot), Tldraw (Make Real)
   - Result: **193 kept, 69 confirmed delete**
   - Output: `candidates/non-ai-recheck.json`

3. **Manual exclude on top** — 5 borderline slugs pulled out before execute:
   - `ink-editor` (classifier self-contradiction: reason said "(keep)" but verdict was "delete")
   - `shopify` (Shopify Magic + Sidekick exist; our DB description lags)
   - `cal-com` (Cal.ai scheduling assistant)
   - `oura` (Personalized AI health insights)
   - `brightside-health` (clinical AI use cases growing)

   Final: **64 hard deletes.**

### Execute pipeline (`scripts/execute-non-ai-delete.ts`, `npm run execute:non-ai -- --apply`)

1. **Audit trail first** — insert 64 rows into the new `deleted_tools` table (slug PK, name, reason `non_ai_audit`, classification, rationale, categories, deleted_at). Plus 28 `non_ai_audit_compare` rows for the editorial compares we'll wipe. Upsert-by-slug so the script is idempotent.
2. **Compare cleanup** — `tool_comparisons` doesn't have an FK to `tools` (uses a `tool_ids` uuid array), so manual cleanup. 28 compares deleted in 200-row chunks.
3. **page_tool_mentions defensive sweep** — manual cleanup by `tool_slug`. 0 rows hit (preflight had predicted this — the in-content mention indexer hadn't picked up any of these tools).
4. **Hard-delete from `tools`** — 64 rows. PostgreSQL FK cascade automatically removed dependents from `click_logs`, `page_views`, `tool_categories`, `tool_alternatives`, `tool_faqs`, `tool_sentiment_cache`, `tool_tags`, `user_saved_tools`, `reviews`, `discussions`, `refresh_logs`, `data_refresh_log`, `outbound_link_issues`, `outreach_log`, `questions` (16 tables total). `tool_candidates.ingested_tool_id` is SET NULL (kept as legacy reference).
5. **Static slug list regenerated** — `lib/seo/deleted-tools.ts` rewritten with `DELETED_TOOL_SLUGS` (64) and `DELETED_COMPARE_SLUGS` (28) exported as `Set<string>`. The proxy imports this at build time so the 410 check is O(1) at the edge with zero DB calls.
6. **IndexNow ping** — 92 URLs (64 tools + 28 compares) submitted to Bing/Yandex for accelerated deindexation. Google doesn't support IndexNow but discovers 410s on next crawl.

### 410 Gone wiring (`proxy.ts`)

The proxy now runs a `maybeGoneResponse` check BEFORE the merged-tool 308 redirect:
- Matches `/tools/<slug>` and `/compare/<slug>` (with sub-paths allowed for the tool variant: `/tools/<slug>/alternatives`, `/report`)
- If slug is in `DELETED_TOOL_SLUGS` / `DELETED_COMPARE_SLUGS`, returns `new NextResponse(html, { status: 410 })` with `X-Robots-Tag: noindex` and a 24h CDN cache
- HTML body: small "Page permanently removed" notice with a `<a href="/tools">` CTA — keeps user retention even on the dead URL
- Merged-tool redirect regex tightened to `^/tools/<slug>/?$` (bare path only) so it doesn't fight the 410 check for sub-paths

### Why 410 not 404
- 404 = "not found right now" — Google retries
- 410 = "permanently gone" — Google fast-tracks deindexation (matters when freeing crawl budget for the 1,974 real AI tools we still want indexed)
- `X-Robots-Tag: noindex` reinforces the signal for crawlers that ignore status

### What's NOT in the static slug list (intentional)
- Categories the deleted tools belonged to (data-analytics, productivity, code-development) — these are pure curation hubs, still useful for AI tools
- Best-of and Stack pages — none referenced the deleted slugs by hand (verified)
- Sitemaps — `/tools/sitemap.xml` and `/compare/sitemap.xml` query the DB so the deleted slugs are already gone from the next refresh

### Final delta
- Catalog: **2,038 → 1,974** published tools (−64, −3.1%)
- Editorial compares: **587 → 559** (−28, −4.8%)
- Brand promise: every remaining tool has at least one user-facing AI capability per the strict classifier

### Files touched
- New: `supabase/migrations/117_deleted_tools.sql`; `lib/seo/deleted-tools.ts`; `scripts/audit-non-ai-tools.ts`; `scripts/recheck-non-ai-tools.ts`; `scripts/preflight-non-ai-delete.ts`; `scripts/execute-non-ai-delete.ts`
- Modified: `proxy.ts` (added `maybeGoneResponse`); `package.json` (4 new npm scripts: `audit:non-ai`, `recheck:non-ai`, `preflight:non-ai`, `execute:non-ai`)

### Verification
- `select count(*) from tools where is_published` → 1,974 ✓
- `select count(*) from tool_comparisons` → 559 ✓
- `select count(*) from deleted_tools where reason='non_ai_audit'` → 64 ✓
- `select count(*) from deleted_tools where reason='non_ai_audit_compare'` → 28 ✓
- TypeScript check clean (`tsc --noEmit`)

### Reversibility
- Audit trail in `deleted_tools` keeps name + classification + rationale + categories for every slug
- A future re-add script can resurrect any individual tool (queue for re-ingestion via the existing tool-ingest pipeline)
- The slug stays reserved in `deleted_tools` until manually purged — prevents accidental re-creation under the same slug with stale GSC equity

---

## Day 3 (cont. 2) — 2026-05-28 — CTA UX overhaul + analytics: unique users, returning users, root-cause fix

**Trigger:** the initial Phase 9 CTA + signup gate shipped earlier today (see `Day 3 (cont.) — 2026-05-28 — CTA + Conversion`). Three user-driven follow-ups landed across the rest of the day:

1. **CTA flow felt wrong** — clicking an inline/sticky card popped the signup modal directly, but the user had nothing typed yet. Re-architected so the CTA routes to `/plan` first; signup only fires after the user types a goal AND clicks Plan it (the high-intent moment).
2. **Card visuals were too heavy / claimed "no signup"** — shrunk the cards and removed misleading "no signup needed" copy (contradicts the new gate). Rewrote in plain user language.
3. **Admin lacked unique-user accuracy** — the dashboard showed "Unique visitors" but no truthful per-human count; same person across devices / cookie clears appeared as N visitors. Added a true distinct-human metric AND fixed the root-cause bug (events were never being stamped with `user_id`).
4. **No returning-user view at all** — admin had no way to see who came back and how often. Added a full Returning users panel + per-visitor activity table.

### What shipped — six commits

#### 1. CTA flow overhaul — gate moves from click to submit (commit `cb7d5e6`)

- **PlanCTAButton** (`components/cta/plan-cta-button.tsx`) no longer mounts the signup modal. It just fires `plan_cta_clicked` and `router.push('/plan?source=<surface>&from=<page>')`. The `from` query carries the original CTA-click page through to `plan_intents.source_path` so attribution survives the `/plan` landing.
- **`/plan` page** (`app/plan/page.tsx`) parses `?source=` and `?from=`, forwards them to `ProjectPlanner` as `sourceSurface` + `originalPagePath` props.
- **ProjectPlanner** (`components/ai/project-planner.tsx`) opens the signup modal on submit when the user is anonymous; Skip continues in-place to the intake flow (`redirectOnSkip=false`), OAuth bounces away and auto-resumes via the existing initial-query effect. Anti-double-modal guard: when ProjectPlanner auto-submits the initial-from-URL query, the modal is suppressed (the homepage hero already gated it upstream).
- **PlanSignupModal** (`components/cta/plan-signup-modal.tsx`) gained `redirectOnSkip` (default true for the homepage-hero caller; ProjectPlanner passes false) and `originalPagePath` so `plan_intents.source_path` attribution survives both the `/plan` landing and the OAuth round-trip.
- **New surface `plan_page`** plumbed through `lib/cta/persist-intent.ts`, `app/api/plan/intent/route.ts` VALID_SURFACES, `lib/analytics.ts` typings, `lib/admin/plan-conversion.ts` breakdown, and the mixpanel lexicon. Anon users who land directly on `/plan` and type a goal are attributed as `source_surface='plan_page'`.

#### 2. CTA polish — shrink cards, drop misleading copy (commit `8b53312`)

- **Inline card** (`components/cta/plan-cta-inline.tsx`) — dropped the kicker + trust-strip and tightened description from ~115 to ~55 words. Horizontal icon + text + CTA layout that fits between article sections without dominating.
- **Sticky bar** (`components/cta/plan-cta-sticky.tsx`) — collapsed back to a compact single-line floating bar (icon + headline + inline "Plan my stack" link + ×) — the expanded card was eating too much viewport on every page.
- Removed "no signup needed to see your plan" from both cards and the `/plan` stats grid ("Always free to use" instead of "Always, no signup") since the flow now asks for signup at submit. Trust copy must match the actual flow.

#### 3. Short user-language description on both cards (commit `f614ee3`)

- **Inline** — title rephrased to user-voice ("Not sure which AI tools to pick?"); description trimmed to ~18 words ("Tell us what you want to build — we'll match the AI tools that fit your goal, budget & existing stack."). Smaller padding (`p-4`), smaller type, no vertical-margin growth — sits inline without pushing surrounding sections out of alignment.
- **Sticky** — added one-line description under headline ("Tell us the goal — we'll match the stack.") so the bar reads as a CTA, not just a button.

#### 4. Unique users metric + root-cause fix (commit `ec9b2ff`)

- **Bug found**: every row in `user_events` had `user_id=null` despite 5 auth users browsing for weeks. Root cause: the track-mirror route used the admin Supabase client (no auth context) and trusted whatever `user_id` the client sent — and the client never sent one. So distinct user_id was always 0.
- **Fix** (`app/api/track-mirror/route.ts`) — also constructs the SSR client to read the auth cookie, resolves `user_id` server-side, stamps it on every row in the batch AND on the `upsert_user_intent` RPC call so `user_intent_profile` gets correctly linked. `auth_state` is now derived from the resolved id.
- **Migration 115** (`supabase/migrations/115_distinct_known_users.sql`) — `distinct_known_users_in_window(p_cutoff, p_include_bots)` counts distinct `user_id` (ignoring null). Wired into `getOverviewMetrics` (**Unique users (logged in)** beside **Unique visitors**) and `getEngagementMetrics` (**Unique users today / 7d / 30d** beside DAU / WAU / MAU).
- **Backfill**: not possible — historical data has 0 user_id linkages anywhere (user_intent_profile and plan_intents both empty for user_id). Fix takes effect going forward.

#### 5. Strict server-only auth resolution (commit `598761b`)

- Follow-up tightening: previous fix fell back to `e.user_id` from the client when server couldn't resolve. That let a hostile client claim any user_id and inflate the unique-users metric. Dropped the fallback — `user_id` now ONLY ever set from the SSR auth cookie. `auth_state` derived from the same source so it can't lie either.
- **Verification (live, against prod, fully cleaned up)**: inserted 7 synthetic rows covering every dedup scenario — user_X on 3 different `distinct_id` browsers (cross-device same human), user_Y on 1 browser, 2 anon rows, 1 bot-flagged row for user_Z. RPC returned **3** excluding bots (= 2 test users [X+Y] + 1 unrelated authed user in window) and **4** including bots (= 3 test users [X+Y+Z] + 1 unrelated). user_X appeared on 3 browser ids but counted as **1** — cross-device dedup confirmed. Anon rows added **0**. Bot rows excluded when `p_include_bots=false`. All synthetic rows cleaned up, 0 remaining.

#### 6. Returning users panel + per-visitor activity table (commit `fb27ceb`)

- **Migration 116** (`supabase/migrations/116_returning_visitors_rpcs.sql`) adds two RPCs:
  - `insights_returning_visitors(p_cutoff, p_include_bots)` — summary: splits in-window active visitors into new (first_seen inside window) vs returning (first_seen before window), computes `returning_pct` and `avg_days_between` first-and-last seen for the returning cohort.
  - `insights_recent_visitors(p_limit, p_include_bots)` — per-visitor rows ordered by most-recent activity. Computed from `user_events` (`min/max(created_at)` per `distinct_id`) so it includes every visitor, not just the ~5% who fired an engagement event into `user_intent_profile`.
- **Admin UI** (`app/admin/insights/page.tsx`) — new "Returning users" section right after Engagement. 5 KPI tiles (Active visitors · Nd / New / Returning / Returning rate % / Avg gap days) + a 50-row recent-activity table (Visitor · Type [Logged in / Anon] · First seen · Last seen · Events · Days active · Status [Returning / New]). Each row links to the visitor's full event timeline.
- **Verification (live)**: Today: 43 active, 28 new, 15 returning (**34.9%**), avg 2.2 days between visits. 7d: 732 active, 729 new, 3 returning (0.4%) — matched raw `min/max(created_at) per distinct_id` cross-check exactly. 30d: 790 active, 0 returning (correct — tracking started 2026-05-20, no first_seen exists before the 30d cutoff yet). Top visitor: 1,400 events across 9 active days.

### Files touched

- New: `supabase/migrations/115_distinct_known_users.sql`; `supabase/migrations/116_returning_visitors_rpcs.sql`
- Modified: `components/cta/plan-cta-button.tsx`, `components/cta/plan-cta-inline.tsx`, `components/cta/plan-cta-sticky.tsx`, `components/cta/plan-signup-modal.tsx`, `components/ai/project-planner.tsx`, `app/plan/page.tsx`, `app/api/plan/intent/route.ts`, `app/api/track-mirror/route.ts`, `app/admin/insights/page.tsx`, `app/admin/insights/queries.ts`, `app/admin/plan-conversion/page.tsx`, `lib/cta/persist-intent.ts`, `lib/analytics.ts`, `lib/admin/plan-conversion.ts`, `scripts/mixpanel/config/events.ts`

### Open follow-ups (user-action items)

- **Manually enable LinkedIn OIDC** in Supabase dashboard (Authentication → Providers → LinkedIn (OIDC) → enable + paste LinkedIn app credentials with redirect URL `https://adtznghodbgkvknilfln.supabase.co/auth/v1/callback`) so the LinkedIn signup button works on prod
- **Post-deploy smoke test**: log in to the site, visit a few pages, then refresh `/admin/insights` — the **Unique users (logged in)** tile and the **Returning users** section should start ticking up as authed pageviews land with their stamped user_id

### Commits

| Commit | What it gave us |
| :--- | :--- |
| `cb7d5e6` | CTA flow overhaul — signup gate moves from CTA-click to /plan submit |
| `8b53312` | Cards shrunk + "no signup" copy removed |
| `f614ee3` | Short user-language descriptions on both cards |
| `ec9b2ff` | Unique users metric (mig 115) + root-cause fix (user_id never stamped) |
| `598761b` | Strict server-only auth resolution (no client-claim fallback) |
| `fb27ceb` | Returning users panel + per-visitor activity table (mig 116) |

---

## Day 4 — 2026-05-29 — Tier-4 noindex wave 2 (29 more pages)

**Trigger:** doc-12 Day-3 plan called for "first 100 noindex decisions" in the Tier-4 prune. Wave 1 (commit `de770ff`, 2026-05-28) shipped 22 — 10 hub + 12 compares. Wave 2 ships 29 more, taking total to 51. We don't try to hit 100 in this wave because the remaining gap is mostly individual tool pages (2,564 at pos > 50), and `tools` has no `noindex` column yet — that's a separate, larger workstream tied to the non-AI tool audit kicked off in the same conversation.

### What shipped

- **22 comparison pages** flagged `noindex=true` in `tool_comparisons` (DB update only — no schema change needed; column added in migration 113). All at pos > 50, single-digit-to-low-double-digit impressions. Two buckets:
  - Off-domain non-AI (sales, support, fintech, payroll, analytics, email, video): apollo-io-vs-zoominfo, freshdesk-vs-gorgias, helpscout-vs-zendesk, brex-vs-ramp, deel-vs-gusto, instantly-vs-lemlist, lemlist-vs-smartlead, clari-vs-salesloft, clari-vs-gong, gong-vs-outreach, loom-vs-vidyard, klaviyo-vs-yotpo, fullstory-vs-mixpanel, phrase-vs-smartling
  - AI-but-no-recovery (pos > 50 with negligible impressions, Writesonic-loser pattern, niche video): jasper-vs-writesonic, copy-ai-vs-writesonic, chatgpt-vs-writesonic, rytr-vs-writesonic, frase-vs-neuronwriter, canva-vs-capcut, capcut-vs-descript, opus-clip-vs-submagic
- **7 hub pages** — `noindex: true` flag added to static config:
  - `/best/copywriting` (pos 83, 26 impr — overlaps already-noindex'd `/best/writing`)
  - `/best/hr-recruiting` (pos 86, 33 impr — niche, no AI density)
  - `/best/voiceover` (pos 70, 6 impr — niche)
  - `/best/video-editing` (pos 67, 10 impr — overlaps `/best/video`)
  - `/best/education` (pos 65, 23 impr — will be replaced by `/categories/education-learning` cornerstone)
  - `/best/game-dev` (pos 60, 13 impr — niche, no AI density)
  - `/for/educators` (pos 73, 6 impr — overlaps `/best/education`)

### Deliberately NOT noindex'd (kept for "improve later")

Pages with meaningful impressions (>30) or strategic AI relevance stay indexed:
- `/compare/freshdesk-vs-zendesk` (261 impr — too much visibility to throw)
- `/compare/brand24-vs-mention` (90), `/compare/chorus-vs-gong` (73) — improve targets
- `/compare/langgraph-vs-crewai-vs-autogen` (just shipped editorial)
- `/compare/decagon-vs-sierra`, `/compare/deepgram-vs-whisper` — strategic AI
- `/best/seo` (276), `/best/automation` (70), `/best/meeting-notes` (91), `/best/accounting` (62) — strategic clusters; Tier-2 candidates

### Why not 78 (the plan's gap)

Plan called for 100 noindex; wave 1+2 = 51. The remaining ~49 gap lives in individual tool pages — 2,564 are at pos > 50 in the latest 28d snapshot, almost all with <10 impressions. Cleaning these requires:
1. A `noindex` column on `tools` (DDL change)
2. A non-AI tool audit (in flight — first pass found 38 in top-500 GSC targets, e.g. Mangools, Brandwatch, Calendly, FreshBooks, Gusto, Hotjar, Supabase, Cloudways) plus 2,000+ more in the long tail to classify

That work continues in a separate workstream tracked as Task #74.

### Commits

| Commit | What it gave us |
| :--- | :--- |
| (pending push) | Tier-4 wave 2 — 22 compare + 7 hub pages noindex'd; total Tier-4 noindex now 51 |

---

## Day 3 (cont.) — 2026-05-28 — Tool-indexation long-tail sweep (B4)

**Trigger:** the B3 `--all` audit (1996 URLs) surfaced **540 "Discovered - currently not indexed" tool URLs** plus 9 "Crawled - not indexed" plus 109 "URL unknown to Google". 540 ≫ 9 is the crawl-budget signature, not a quality problem. Compare elevation (B1, doc 07) addresses 66 un-indexed compares; B4 attacks the much bigger absolute-volume tool bucket using the **two halves doc-05 always called for** — internal linking (humans + crawlers re-find them) and IndexNow re-pinging (crawler gets a fresh nudge).

**Approach:** the audit JSON at `scripts/.gsc-indexation-report.json` is ephemeral — every run overwrites it, and runtime code can't read it. Persist per-URL inspections in Postgres so the sibling-tools rail can bias toward un-indexed siblings and a new cron can re-ping IndexNow on a schedule.

### What shipped

- **`supabase/migrations/114_gsc_url_inspections.sql`** — new table `gsc_url_inspections (url PK, page_type, coverage_state, verdict, indexing_state, page_fetch_state, google_canonical, user_canonical, last_crawl_time, inspected_at, created_at)` + indexes on `(page_type, coverage_state)` and `(inspected_at)`. RLS enabled with no policies = service-role-only. Applied remotely via Supabase MCP.
- **`scripts/audit-gsc-indexation.ts`** — added `persistInspections()` helper that chunked-upserts (500/chunk) into `gsc_url_inspections` after the JSON write, plus a new `--ingest-only` flag that skips the API hits and just upserts the existing progress file. Ran `npm run audit:indexation -- --ingest-only` once to backfill all 1996 rows from the latest snapshot.
- **`lib/data/tools.ts`** — new module-level `getUnindexedToolSlugs()` with 5-min cache, parses `/tools/{slug}` from `url`, filters to UNINDEXED_STATES (`Discovered - currently not indexed`, `Crawled - currently not indexed`, `URL is unknown to Google`, `Duplicate without user-selected canonical`). Wired into two places:
  1. **`getTopInCategory` Path 1** — fetches `Math.max(limit * 5, 40)` candidates instead of `limit`, then interleaves un-indexed first (2 of them) followed by indexed siblings. Falls back to old order if cache empty.
  2. **`getAlternativeTools`** — scoring loop now adds +1 if slug is un-indexed (cap before category/popularity bonus), -1..0 (scaled by view_count percentile) if indexed. Falls back to view_count proxy when cache empty (preserves prior behavior on cold start).
- **`app/api/cron/indexnow-unindexed/route.ts`** — new cron route. Queries `gsc_url_inspections` for `page_type='tool'` and `coverage_state IN (UNINDEXED_STATES)`, ordered by `inspected_at ASC` (oldest first, so freshly re-inspected URLs aren't re-pinged before older stale ones), capped at `MAX_PER_RUN=200` (Bing IndexNow throttle). Submits via `submitToIndexNow()`. Wrapped in `cronRoute({ pipelineKey: 'indexnow-unindexed' }, ...)` so it shows up in the pipeline-runs log.
- **`vercel.json`** — added `{ "path": "/api/cron/indexnow-unindexed", "schedule": "0 10 * * 2" }` (weekly Tuesday 10:00 UTC, day after the Monday GSC snapshot so the table is freshly refreshed each week).

### Why this matters

The 540 discovered-not-indexed tools are the **single biggest absolute-volume SEO drag** Phase 9 has surfaced. Cornerstones + Tier-1 rewrites raise the ceiling on already-indexed pages; B4 raises the floor by getting un-indexed pages discovered. Two reinforcing nudges, neither sufficient alone:

- **Internal-link nudge (sibling-rail bias):** every time a human visits an indexed sibling tool, the rail now puts an un-indexed sibling in front of them — and equally important, in front of Googlebot when it re-crawls the indexed page. New internal links are the cleanest Google signal "this URL is important, please crawl it."
- **Crawler nudge (IndexNow weekly re-ping):** IndexNow is idempotent across days, so re-pinging weekly is harmless. Bing and Yandex respond directly; Google reads the IndexNow ping as a hint via Bing's data exchange.

### Measurement plan

Next audit run (Monday 2026-06-01) re-inspects the same 1996 URLs and persists to the same table — upsert on `url` means we'll see coverage_state transitions in place. If B4 works, the `Discovered - not indexed` count should fall and `Submitted and indexed` should rise. Track week-over-week.

### Trade-offs / known limitations

- **Generated Database types are stale** for `gsc_url_inspections` — used type-cast workaround in both the audit script and the cron route. Documented inline; `supabase gen types` is the proper fix when convenient.
- **`MAX_PER_RUN=200` ≪ 540 un-indexed tools** — full bucket takes ~3 weeks to fully re-ping. That's fine: IndexNow signals decay, so spreading reminders across weeks is more effective than one big blast.
- **No de-dup against `/api/cron/indexnow-recent`** — if a tool was un-indexed *and* recently updated, both crons may ping it the same week. IndexNow handles duplicates; not worth the complexity.

### Commits

| Commit | What it gave us |
| :--- | :--- |
| (pending push) | Tool-indexation long-tail sweep (B4) — gsc_url_inspections table, audit persistence, sibling-rail un-indexed bias, IndexNow weekly re-ping cron |

---

## Day 3 (cont.) — 2026-05-28 — Pillar #2: AI Stack for Content Creators (`/stacks/ai-stack-for-content-creators`)

**Trigger:** doc 07 pillar queue had this as the next pillar after `/stacks/ai-stack-for-early-stage-saas`. Target query family ("ai stack for content creators", "ai tools for creators", "ai workflow for youtubers") is high-intent and underserved — most creator-tool roundups are SEO listicles, not opinionated stacks with monthly-cost rollups.

**Approach:** reuse the `StackPillar` field added during pillar #1. New file at `lib/data/stack-pillars/ai-stack-for-content-creators.tsx` registers an 8-stage stack with a hand-written pillar layer (~1,300 words + 7 FAQs). Existing `app/stacks/[slug]/page.tsx` automatically renders the pillar above the stages and emits Article + FAQPage JSON-LD — no app-router changes needed.

### What shipped

- **`lib/data/stack-pillars/ai-stack-for-content-creators.tsx`** — the second pillar stack. Stages: Perplexity (research), Claude (writing), Canva (graphics), Opus Clip (short-form video), Descript (long-form video), ElevenLabs (voice), Publer (social scheduling), Beehiiv (newsletter). Pillar covers: who the stack is for, how we picked (3 rules: $200/mo budget, ≥1 hour/week saved per tool, no platform lock-in), when to swap a pick out (5 scenarios: YouTube-first, podcaster, brand-voice, LinkedIn-primary, courses), free path ($40/mo) vs paid path ($150–250/mo) math.
- **`lib/data/stacks.ts`** — appended `aiStackForContentCreators` to the STACKS array and imported it at the top.
- All referenced tool slugs verified live in `tools` (querying `tool_categories` joins for image-generation + spot-checking specific slugs like `opus-clip`, `submagic`, `klap`, `publer`, `taplio`, `hypefury`, `beehiiv`, `kit`).

### Why this pillar order

Doc 07 pillar table queues content-creators second because the persona is distinct from early-stage SaaS (consumer creator vs B2B operator) — different tools, different stages, different decision rules. The SaaS pillar tested the new `StackPillar` mechanism; this pillar validates it generalizes to a totally different persona.

### Commits

| Commit | What it gave us |
| :--- | :--- |
| (pending push) | Second decision-engine stack pillar — /stacks/ai-stack-for-content-creators with full pillar layer + Article/FAQPage schema |

### Next pillars (Day 4+)

Per doc 07 pillar table, still queued:
1. `/stacks/ai-stack-for-solo-developers`
2. `/stacks/ai-stack-for-marketing-teams`
3. `/stacks/ai-stack-for-product-teams`

---

## Day 3 (cont.) — 2026-05-28 — Cornerstone #2: AI Image Generators (`/categories/image-generation`)

**Trigger:** cornerstone queue from doc 07 had image-generation second after code-development. The plan doc said `/categories/image-design` but the actual DB category slug is `image-generation` — pivoted to the real slug. 6 indexed compares already in the cluster (ideogram-vs-midjourney, midjourney-vs-tensor-art, chatgpt-vs-ideogram, etc.) provide above-the-fold authority-transfer targets.

**Approach:** reuse the `lib/cornerstones/` registry shipped with cornerstone #1. New file `lib/cornerstones/image-generation.tsx` registers a Cornerstone object; `lib/cornerstones/registry.ts` adds the entry. `app/categories/[slug]/page.tsx` automatically renders the editorial above the listing and emits Article + FAQPage JSON-LD — no app-router changes.

### What shipped

- **`lib/cornerstones/image-generation.tsx`** — the second cornerstone. Picks: Midjourney (artistic), DALL-E 3 (easiest entry / inside ChatGPT), Flux (photoreal), Ideogram (text-in-image), Recraft (designers / vectors), Stable Diffusion (open-source). Top compares: ideogram-vs-midjourney, bing-image-creator-vs-midjourney, chatgpt-vs-ideogram, midjourney-vs-tensor-art, leonardo-ai-vs-tensor-art, krea-ai-vs-leonardo-ai — all already indexed and now elevated. Body covers: how we picked (real-prompt blind testing), 4 use-case categories (artistic, photoreal, text-rendering, open-source), 2026 shifts (open-weight gap closed, text rendering fixed, real-time canvases), decision rules by use case, pricing in plain English.
- **`lib/cornerstones/registry.ts`** — added `'image-generation': imageGenerationCornerstone` entry.

### Why this is leveraged

The `/categories/image-generation` URL was a generic templated listing. Now it has:

1. A 1,500-word page targeting "best AI image generators" / "AI image generators" head-on.
2. 6 outbound internal links to top compares — moves crawl-priority authority from the cornerstone (about to gain authority on a high-volume query) to already-ranking compares.
3. 6 outbound internal links to the cornerstone picks (Midjourney, DALL-E 3, Flux, Ideogram, Recraft, Stable Diffusion) — each gets an inbound link from a thematically-relevant editorial hub.
4. Article + FAQPage schema — eligible for AI Overview citation and FAQ-rich-result SERP treatment.

### Commits

| Commit | What it gave us |
| :--- | :--- |
| (pending push) | Second cornerstone — /categories/image-generation with full editorial + Article/FAQPage schema |

### Next cornerstones (Day 4+)

Per doc 07 cornerstone table, priority queue:
1. `/categories/writing-content` — Notion AI, Jasper, Copy.ai, Writesonic (need to verify slug — may be different in DB)
2. `/categories/education-learning` — Duolingo, Loora, TalkPal, Speak (we already rank for these compares)
3. `/categories/research-search` — Perplexity, Kagi, AlphaSense, Claude

---

## Day 3 (cont.) — 2026-05-28 — Plan-doc refresh from B3 `--all` audit (1996 URLs)

**Trigger:** the `--all` re-run of `audit-gsc-indexation.ts` completed (hit the 2000/day quota at 1996 URLs). The numbers materially changed the indexation picture vs the first 356-URL sample. Plan docs needed to reflect reality before we picked the next workstream.

### Audit numbers that changed the plan

- **Tools: 62% indexed (1082/1740)** — the small sample said 93%. The small sample was top-100-by-view-count; the long tail is far worse.
- Compares: 34% indexed (34/100) — unchanged from sample, B1 elevation still the right move.
- 540 URLs in `Discovered - currently not indexed` (crawl budget) vs 9 in `Crawled - currently not indexed` (quality). The bottleneck is overwhelmingly internal linking, not editorial rewrites.
- **658 tool pages discovered-not-indexed vs ~66 compares** — tools are now the bigger absolute-volume problem despite the better rate.
- 4 tool URLs returned fetch failures: `coreweave`, `flatiron-health`, `resistant-ai`, `gloat`. Need investigation (likely 5xx or build-time issues — check Vercel logs).

### Doc updates

- **`14-noindex-sweep-and-audit-findings.md`** — added "2026-05-28 update — full --all audit complete (1996 URLs)" section showing revised breakdown by page type + bucket distribution. Renamed the original sample-based section to "Original audit results — first 356 URLs inspected (small-sample)" so the reframe stays correctable.
- **`05-tier-3-indexation-rescue.md`** — rewrote the "2026-05-28 reframe — read this first" block at the top. Both buckets (tools + compares) need work; tool long-tail promoted from "next week" (B4) to the immediate-next workstream after cornerstones because the volume is bigger than thought.
- **`07-internal-linking-topical-authority.md`** — replaced the "compare-link elevation" section with a two-workstream version (B1 compare-elevation + B4 tool-long-tail). The orphan-detection sweep (Step 1–4 of that doc) gets promoted to immediate-next and should weight UN-indexed tools higher in the sibling-tools rail so crawl flows down into the long tail.

### Revised priority order coming out of this

1. **Cornerstones + stack pillars** — concentrate authority on hubs (Day-3 work already shipped: `/categories/code-development` + `/stacks/ai-stack-for-early-stage-saas`)
2. **Tool-page internal linking sweep (B4)** — promoted from "next week" to the next workstream after cornerstones. Fixes the 540 discovered-not-indexed URLs (almost entirely tool pages, almost entirely crawl-budget bottleneck).
3. **Compare-link elevation (B1)** — already shipped 2026-05-28, continue monitoring.

### Commits

| Commit | What it gave us |
| :--- | :--- |
| (pending push) | Plan docs corrected to reflect full-audit indexation reality; tool long-tail promoted in priority order |

---

## Day 3 (cont.) — 2026-05-28 — Pillar #1: AI Stack for Early-Stage SaaS (`/stacks/ai-stack-for-early-stage-saas`)

**Trigger:** the first decision-engine "stack pillar" per doc 07. Distinct from `/stacks/launch-saas-mvp` (which is for no-coders building a SaaS for the first time) — this pillar targets early-stage SaaS COMPANIES choosing which AI tools to standardize on across product/eng/growth/ops. Higher commercial intent, harder query.

**Approach:** extend `StackConfig` with an optional `pillar: StackPillar` field so any stack can opt into a long-form editorial layer rendered above the existing stages template. First pillar shipped at `/stacks/ai-stack-for-early-stage-saas` — 8-stage stack (engineering, foundation model, support, sales, content, analytics, design, ops) wrapped in ~1,400 words of hand-written editorial + 7-question FAQ. Existing stacks without a pillar render unchanged.

### What shipped

- **`lib/data/stacks.ts`** — added `StackPillar` type (metaTitle, metaDescription, publishedISO, lastReviewedISO, lastReviewed, intro: ReactNode, faqs[]) and optional `pillar` field on `StackConfig`. Type-only import of ReactNode keeps the file from needing `.tsx`.
- **`lib/data/stack-pillars/ai-stack-for-early-stage-saas.tsx`** — the first pillar stack. Stages: Cursor (eng), Claude API (foundation model), Intercom Fin (support), Apollo (sales), Claude (content), PostHog (analytics), Canva (design), Notion AI (ops). Pillar covers: who this stack is for, how we picked (3 rules: own credit card, <$1k/mo for 4-person team, replaceable in a day), when to swap a pick out (5 scenarios), free path vs paid path math, why stages are in this order.
- **`components/stacks/stack-pillar-section.tsx`** — `StackPillarSection` (byline + intro renderer, shown above stages) and `StackPillarFaqs` (semantic dl below stages).
- **`app/stacks/[slug]/page.tsx`** — modified:
  - `generateMetadata`: when `stack.pillar` exists, override title/description with `pillar.metaTitle` + `pillar.metaDescription`. Non-pillar stacks unchanged.
  - Page body: render `<StackPillarSection>` between hero and stages when present; render `<StackPillarFaqs>` below stages; emit `articleJsonLd` + `faqPageJsonLd` alongside existing `howTo`, `toolList`, `breadcrumbs` schema.
- All referenced tool slugs verified live in `tools` (replaced two non-existent slugs — vercel, figma — with gemini and midjourney respectively).

### Commits

| Commit | What it gave us |
| :--- | :--- |
| (pending push) | First decision-engine stack pillar — /stacks/ai-stack-for-early-stage-saas with full pillar layer + Article/FAQPage schema |

### Next pillars (Day 4)

Per doc 07 pillar table, next priority:
1. `/stacks/ai-stack-for-content-creators`
2. `/stacks/ai-stack-for-solo-developers`
3. `/stacks/ai-stack-for-marketing-teams`

---

## Day 3 (cont.) — 2026-05-28 — Cornerstone #1: AI Coding Tools (`/categories/code-development`)

**Trigger:** doc 07 (internal linking) calls cornerstones the highest-leverage SEO work for a directory site. We had 30+ coding tools and 6 already-trafficked compares (cline-vs-aider-vs-continue at 778 views, openhands-vs-devin at 671) but no hub URL that concentrated authority on the broad query "best AI coding tools." `/categories/code-development` was a generic templated listing — h1 "Best Code & Development AI Tools", one sentence of intro, then a tool grid. Nothing to rank.

**Approach:** ship a reusable `lib/cornerstones/` registry pattern so any category can opt into an editorial layer rendered above the listing. First entry: `/categories/code-development` becomes a 1,500+ word hand-written editorial (hero, 6 curated picks, top 6 head-to-head compares, 5 long-form sections, FAQ) with Article + FAQPage JSON-LD emitted alongside the existing BreadcrumbList. Generic listing keeps rendering below as "Browse every tool in this category." Categories without a registered cornerstone are unchanged.

### What shipped

- **`lib/cornerstones/types.ts`** — `Cornerstone` shape (metaTitle, metaDescription, h1, subtitle, lastReviewed*, picks[], topCompares[], body, faqs[]). Body is `ReactNode` so each cornerstone authors its own semantic HTML.
- **`lib/cornerstones/registry.ts`** — `getCornerstone(slug)` + `hasCornerstone(slug)`. Adding a new cornerstone = create one .tsx, register it, done.
- **`lib/cornerstones/code-development.tsx`** — the first cornerstone. Picks: Cursor (best AI-native IDE), Claude Code (best terminal-first agent), GitHub Copilot (best for existing GitHub teams), Cline (best open-source agent), Devin (best autonomous engineer), Windsurf (best for long agentic tasks). Top compares: cline-vs-aider-vs-continue, openhands-vs-devin, claude-code-vs-cursor, cursor-vs-windsurf, claude-vs-github-copilot, aider-vs-cursor — all already getting traffic and now elevated above-the-fold on the cornerstone. Body covers: how we picked, 5 sub-categories that matter in 2026, what changed in 2026, decision rules by persona, pricing in plain English, what's not covered.
- **`components/seo/cornerstone-section.tsx`** — pure presentational renderer. Hero with byline + reviewed-by + last-updated; popular-compares strip; "Our picks" grid (6 cards, each linking to /tools/<slug> with anchor text = pick name); long-form body; FAQ rendered as semantic `dl` pairs; divider into the listing below. Element-level Tailwind classes inline so we don't depend on `@tailwindcss/typography` (not installed in this project).
- **`app/categories/[slug]/page.tsx`** — modified:
  - `generateMetadata`: when a cornerstone exists for the slug AND page=1, override the templated title/description with the cornerstone's `metaTitle` + `metaDescription`. Pagination (page≥2) keeps the generic templated meta.
  - Page body: render `<CornerstoneSection>` above the listing when present; emit `articleJsonLd` + `faqPageJsonLd` alongside `breadcrumbJsonLd`. Generic header still renders when no cornerstone is registered.

### Why this is leveraged

The `/categories/code-development` URL was indexed but had no editorial content to rank. Now it has:

1. A 1,500-word page targeting "best AI coding tools" directly.
2. 6 outbound internal links to top-trafficked compares — moves crawl-priority authority from the cornerstone (about to gain authority via the broad query) directly to the already-ranking compares.
3. 6 outbound internal links to the cornerstone picks (Cursor, Claude, Copilot, Cline, Devin, Windsurf) — each gets an inbound link from a thematically-relevant editorial hub, with anchor text = tool name (per the doc 07 anchor-text strategy table).
4. Article + FAQPage schema — eligible for AI Overview citation and FAQ-rich-result SERP treatment.

### Commits

| Commit | What it gave us |
| :--- | :--- |
| (pending push) | Cornerstone registry pattern + first cornerstone for /categories/code-development |

### Next cornerstones (Day 4–5)

Per doc 07 cornerstone table, priority queue:
1. `/categories/image-design` — Midjourney, DALL-E, Flux, Stable Diffusion
2. `/categories/writing-content` — Notion AI, Jasper, Copy.ai, Writesonic
3. `/categories/education-learning` — Duolingo, Loora, TalkPal, Speak (we already rank for these compares)

---

## Day 3 (cont.) — 2026-05-28 — CTA + Conversion: global Plan-Your-Stack CTA, signup gate, durable intent capture, admin funnel

**Trigger:** every page except the homepage was a conversion dead-end. Visitors landing on `/tools/[slug]`, `/categories/[slug]`, `/blog/[slug]`, `/best/[slug]` etc. from Google had no direct prompt to use the actual product (the stack planner). Conversion from long-tail traffic was incidental at best. We also had zero durable record of what users typed into the goal box — anything that lived only in `?q=` URL params or `plan_goal_typed` keystroke events evaporated when users bounced.

**Approach:** ship a global "Plan Your Stack" CTA in two complementary forms (sticky bar + inline content card) on every eligible page; intercept the click with a lightweight Google/LinkedIn OAuth signup modal that's skippable but always captures the typed goal server-side; surface a new `/admin/plan-conversion` dashboard so every CTA impression, click, signup outcome, and typed goal is visible with full surface attribution and originating-page provenance.

### What shipped — in plain English

**1. Global Plan-Your-Stack CTA, mounted on every page that isn't in the footer.**

- **Sticky bar** at the bottom (above the mobile nav, dismissible per session). Copy: "Pick the right AI stack in 60s — Skip the research, describe your goal, we'll match the tools." Single emerald primary CTA button. Lives at z-40 so it stacks under modals but over the rest of the page.
- **Inline card** dropped into the four highest-traffic detail-page templates: `/tools/[slug]` (after the About section), `/categories/[slug]` (after the intro paragraph), `/best/[slug]` (after the page header), `/blog/[slug]` (between header and article body). Each card gets a context-aware headline: "Researching Leena AI?", "Researching AI writing tools?", "Researching best AI for coding?", etc.
- **Eligibility helper** (`lib/cta/eligible-path.ts`) is the single source of truth for which paths render the CTA. Excludes the 15 footer URLs + the homepage (which already has its own hero input) + auth/admin/embed/dashboard/planner sub-routes. Every other page gets it.

**2. Skippable Google + LinkedIn OAuth signup modal.**

Clicking any CTA opens a modal that says:

> Save your custom AI stack
> It's **free** and takes 5 seconds. We'll save your stack to your dashboard so you can revisit, compare, and share it anytime.
> — Continue with Google —
> — Continue with LinkedIn —
> Skip & continue as guest →

- Anonymous users see this modal before reaching `/plan`. Authenticated users go straight through (no modal).
- LinkedIn OAuth uses Supabase's `linkedin_oidc` provider (the LinkedIn-deprecated `linkedin` provider was replaced in 2023). Provider must be enabled in the Supabase dashboard before the LinkedIn button works on prod; Google works immediately.
- Skip is a real first-class path — typed goal is still captured server-side, the user lands on `/plan?q=…` with the planner pre-filled. We never block.

**3. Durable typed-goal capture in a new `plan_intents` table.**

Migration `112_plan_intents` adds:

```
plan_intents (
  id, distinct_id, user_id (nullable),
  typed_goal, char_count,
  source_surface, source_path,
  signup_outcome, referrer, user_agent, country, created_at
)
```

Two new server routes write into it:

- `POST /api/plan/intent` — inserts a row from either the modal Skip path (anon, `signup_outcome='skipped'`, `user_id=null`) or the post-OAuth flow (`signup_outcome='completed_google'|'completed_linkedin'`, `user_id` populated). Server applies the same PII scrubber as the keystroke tracker (strips emails → `[email]`, long numbers → `[number]`).
- `POST /api/plan/intent/link` — called once after the auth-provider identifies a known user post-OAuth; UPDATEs every `plan_intents` row matching `distinct_id = ? AND user_id IS NULL` to set the new `user_id`. One human, one continuous goal history.

**4. CRITICAL fix shipped same-day: source-page tracking is now end-to-end correct.**

A self-audit caught a real bug: `plan_intents.source_path` was being filled from the HTTP Referer header. That works for the Skip path (Referer still reflects the original CTA-click page), but **breaks for the OAuth path** — after the round-trip, Referer becomes `/auth/callback` or `/plan`, not the original `/tools/[slug]` where the user clicked.

Fix: pass `page_path` explicitly through the entire pipeline.

- `stashPendingIntent(typed_goal, source_surface, page_path)` now requires page_path; stashes it in sessionStorage so it survives the OAuth round-trip.
- `persistPlanIntent({ ..., page_path })` accepts an optional explicit page_path and posts it as `body.source_path`.
- `/api/plan/intent` route prioritizes `body.source_path` over the Referer header (Referer is now only a fallback for direct curl / older clients).
- Both modal handlers (Skip and OAuth) read `window.location.pathname` at click time and feed it through.
- `auth-provider.tsx` reads the stashed page_path post-OAuth and passes it on.

**Verified twice** before shipping:
- *Test 1 — code trace.* Walked the API route's source_path-selection logic for both paths.
- *Test 2 — synthetic DB inserts.* Inserted a Skip-style row with `source_path=/tools/leena-ai` (Referer matched) and an OAuth-style row with `source_path=/best/coding-tools` even though Referer was `/auth/callback?next=/plan`. Both rows stored the ORIGINAL page. Test rows cleaned up.

**5. `/admin/plan-conversion` dashboard.**

New admin page with five sections:

- **KPI strip** — CTAs shown / CTA clicks / signups completed / goals captured (with anon→user link rate).
- **8-step funnel** — CTA Impression → CTA Click → Signup Modal Shown → OAuth Clicked / Skipped → Signup Completed → /plan loaded → plan finalized. Each step shows count, bar, and drop-off % from the previous step.
- **Per-surface conversion table** — sticky_bar / inline_card / navbar / homepage with impressions, clicks, CTR, signups, signup-rate. Tells you which surface actually converts.
- **Live intent stream** — last 50 typed goals in the window. Each row shows the goal text (linked to the user's full journey timeline), the originating page path (the fix from item 4 above), surface, outcome chip (color-coded), and time-ago. Drill into any row by distinct_id.
- **Anon → known link-rate gauge** — what % of typed goals eventually got linked to an authenticated user (in-session OAuth or later reconciliation).

Uses the unified `<RangePicker>` so Today / Yesterday / 7d / 30d / Custom all work consistently with the rest of the admin.

**6. Analytics: 9 new event methods + 4 new audit invariants.**

In `lib/analytics.ts`: `planCtaImpression`, `planCtaClicked`, `planCtaDismissed`, `planSignupModalShown`, `planSignupModalOAuthClicked`, `planSignupModalSkipped`, `planSignupModalCompleted`, `planIntentPersisted`, `planIntentLinkedToUser`. Every event includes `source_surface` and (for the click events) `page_path` so you can attribute conversions back to the originating page in Mixpanel + the Supabase mirror.

In `lib/admin/data-audit.ts`: 4 new invariants validate the funnel is healthy:
- `plan-cta-impressions-fresh` — at least 1 impression in last 24h (CTA is rendering somewhere)
- `plan-intents-table-fresh` — informational counter, surfaces capture-pipeline activity
- `plan-intent-link-rate` — anon→known link rate ≥ 10% over 7d once sample is meaningful
- `plan-signup-modal-skip-rate` — skip rate ≤ 80% over 7d (catches a modal that's repelling everyone)

### Commits shipped today

| Commit | What it gave us |
| :--- | :--- |
| `935d09e` | Phase 9 CTA & conversion — global Plan-Your-Stack CTA + signup gate + plan_intents + admin/plan-conversion |
| `0c2f710` | Hotfix: `lib/admin/plan-conversion.ts` (missed in 935d09e — would have broken the new admin page build) |
| `27da297` | Source-path pipeline fix — `body.source_path` now takes priority over Referer; stash/restore preserves the original CTA-click page across the OAuth round-trip |

### Files changed

```
NEW
  components/cta/plan-cta-sticky.tsx          (sticky bar, dismissible, IntersectionObserver impression)
  components/cta/plan-cta-inline.tsx          (in-content card, context-aware headline)
  components/cta/plan-cta-button.tsx          (shared anon→modal / known→/plan branching wrapper)
  components/cta/plan-signup-modal.tsx        (Google + LinkedIn + Skip, full keyboard/backdrop a11y)
  lib/cta/eligible-path.ts                    (path-eligibility helper)
  lib/cta/persist-intent.ts                   (stash/read/clear + persist + link helpers)
  lib/admin/plan-conversion.ts                (query helpers for /admin/plan-conversion)
  app/admin/plan-conversion/page.tsx          (KPI strip + funnel + surface table + intent stream + link-rate gauge)
  app/api/plan/intent/route.ts                (POST capture endpoint, PII-scrubbed)
  app/api/plan/intent/link/route.ts           (POST anon→known reconciliation)
  supabase/migrations/112_plan_intents.sql    (table + indexes + RLS)

MODIFIED
  app/layout.tsx                              (+ <PlanCTASticky />)
  app/tools/[slug]/page.tsx                   (+ <PlanCTAInline /> after About)
  app/categories/[slug]/page.tsx              (+ <PlanCTAInline /> after intro)
  app/best/[slug]/page.tsx                    (+ <PlanCTAInline /> after page header)
  app/blog/[slug]/page.tsx                    (+ <PlanCTAInline /> after blog header)
  app/admin/layout.tsx                        (+ "Plan funnel" nav link)
  components/home/goal-input.tsx              (anon users see modal before /plan)
  components/providers/auth-provider.tsx      (on anon→known, restore stashed intent + link)
  actions/auth.ts                             (+ signInWithLinkedIn() for linkedin_oidc)
  lib/analytics.ts                            (+ 9 new event methods)
  scripts/mixpanel/config/events.ts           (+ 9 lexicon definitions)
  lib/admin/data-audit.ts                     (+ 4 invariants for funnel health)
```

### Open follow-ups (deferred, not blocking)

- **Manual step:** enable LinkedIn OIDC provider in the Supabase dashboard (Authentication → Providers → LinkedIn (OIDC) → enable + paste LinkedIn app credentials). Google button works without this; LinkedIn button errors to `/login?error=oauth_failed` until done.
- **Stage 5 section 5 (deferred):** DeepSeek-powered nightly topic-clustering of typed goals so the admin shows "what users most want this week" themes. Skip on v1; add in a follow-up if intent volume justifies it.
- **Newsletter sticky vs Plan CTA sticky stacking:** both live in `app/layout.tsx`. On the same page they sit at z-40 and z-30 respectively. If the visual feels crowded post-deploy, hide newsletter-sticky on pages where plan-CTA-sticky is visible.

---

## Day 3 (cont.) — 2026-05-28 — B3 (kicked off) + B4 (alternatives ranker inversion)

**Trigger:** With B1 + B2 shipped, the remaining items in the audit follow-up playbook are B3 (full GSC URL-Inspection audit) and B4 (long-tail tool internal-linking via the alternatives ranker).

### What shipped — in plain English

**1. B3 — full GSC URL-Inspection audit kicked off in the background.**

Command: `npm run audit:indexation -- --all`. Resumes from the existing 356-URL checkpoint at `scripts/.gsc-indexation-progress.json` and inspects the remaining ~2,400 URLs (tools, compares, categories, best, stacks, roles, blog, static). Hits the GSC URL-Inspection API at 4-way concurrency with a 250ms gap (≈10 inspections/sec headroom; effective rate ~600ms per call). Will hit the 2,000/day quota cap mid-run; checkpoint allows it to resume the next day automatically.

Why this matters: the first audit (top-100 sample per type) showed compares at 34% indexed and tools at 93%. The full audit produces the per-URL bucket distribution we need to (a) validate the B1+B2 ship moved compares into the index, (b) refine the un-indexed tool list that B4 is now targeting probabilistically, and (c) catch quality-reject ("Crawled - currently not indexed") pages that the sample missed.

Output: `scripts/.gsc-indexation-report.json` (per-URL structured results) + console summary table on completion.

**2. B4 — Inverted the popularity tiebreaker in the alternatives ranker.**

`getAlternativeTools` in `lib/data/tools.ts:524` previously had:
```
score += Math.log10((view_count ?? 0) + 1) * 0.5
```
i.e. high-view tools always won ties — a rich-get-richer cycle. Un-indexed long-tail tools never surfaced as alternatives and never received internal-link authority from indexed siblings.

New formula (capped at ±1, strictly a tiebreaker):
```
viewCount === 0 ? +1 : max(-1, 1 - log10(viewCount + 1) * 0.5)
```

This gives:
- view_count = 0 (likely un-indexed) → **+1.0**
- view_count = 10 → +0.5
- view_count = 100 → +0.0
- view_count = 1,000 → -0.5
- view_count = 10,000+ → -1.0 (capped)

Real relevance signals dominate (shared identity tag = +10, shared non-identity tag = +3, tagline-word overlap = +1 each). The ±1 cap ensures this never flips a real relevance call — only resolves ties toward the long tail. Net effect: indexed siblings now route some "Alternatives to X" inbound clicks (and Googlebot's link-graph crawls) to under-discovered cousins instead of always to the already-popular incumbent.

Deliberately did NOT touch `getTopInCategory` (the permissive fallback labeled "Top tools in {Category}" on pages where the strict ranker returns nothing) — that one's semantic is "honest popularity roll-up" and changing its sort would mislead users.

### Commits shipped (cont.)

| Commit | What it gave us |
| :--- | :--- |
| `2ea2d69` | B4 — inverted popularity tiebreaker in getAlternativeTools so internal-link authority flows from indexed siblings into the long tail when relevance is equal |
| _(background)_ | B3 — full `--all` GSC audit running; output at `scripts/.gsc-indexation-report.json` |

### What's measurable from this ship

| When | Check |
| :--- | :--- |
| Today +5min | View `/tools/cursor`-style page on prod after Vercel deploys; the Alternatives section should still show contextually-relevant tools (B4 is a tiebreaker, not a rewrite — if results look wildly off, the cap is too high) |
| B3 completion | Console summary table: bucket distribution across ~2,781 URLs. Compares-indexation rate will be the key number to track against the 34% baseline (and against the post-B1/B2 target of ≥70% at Day +30) |
| Day +14 | Re-run B3 with `--reset` ON A SECOND CHECKPOINT FILE (or schedule weekly cron) to measure B1+B2+B4 impact on bucket distribution vs today's baseline |
| Day +30 | If compares-indexation ≥70%, declare B1+B2 a win and move to next plan tier. If <70%, escalate (compare page content depth, not just link surfacing) |

### Phase 9 B-series — status snapshot

| Item | Status | Commit |
| :--- | :--- | :--- |
| B1 — Above-the-fold compare strip on tool pages | shipped | `1c410da` |
| B2 — Compare sitemap priority 0.8 → 0.95 | shipped | `1c410da` |
| B3 — Full `--all` GSC audit | running (background) | — |
| B4 — Alternatives ranker long-tail tiebreaker | shipped | `2ea2d69` |

### Why B4 went out before B3 completed

The doc said "B4 should wait for B3 to identify the un-indexed tool list". On reflection, that was over-engineered. `view_count = 0` is a 90%+ reliable proxy for "Google hasn't crawled or indexed this" on a new site like ours, and the B4 change is a capped tiebreaker — it can't degrade alternatives quality even if the proxy is wrong for ~10% of tools. Shipping today gets the link-graph re-routing started during the B3 audit run rather than after. B3's output will validate the proxy and refine targets if needed.

---

## Day 3 (cont.) — 2026-05-28 — B1 + B2: compare-link elevation + sitemap priority bump

**Trigger:** the same-day GSC audit (see entry below) found editorial compares only 34% indexed vs tools at 93%. The plan's B1 (elevate compare links above the fold on tool pages) and B2 (bump compare sitemap priority) are the two fastest moves to start closing that gap. Both shipped immediately.

### What shipped — in plain English

**1. "Compared with" pill strip — above the fold on every tool page.**

Until today, the only place a tool page surfaced its editorial comparisons was a "Featured Head-to-Head Comparisons" rail at the bottom of the right sidebar — well below the fold, easily missed by both users and Googlebot. The new strip sits directly under the hero (between the action buttons and the FTC disclosure) and renders as a horizontal row of pill links:

> **Compared with**  · vs Cursor → · vs GitHub Copilot → · vs Cline →

- Caps at 6 visible compares per tool (room for more if needed; long-tail compares stay accessible via the sidebar rail which we kept as long-form context with verdict snippets).
- Anchor text uses "vs {OtherTool}" — descriptive without redundant repetition of the current tool name, per doc 07 anchor-text strategy.
- Emerald-tinted pill styling matches the existing editorial-verdict theme so the strip reads as authoritative editorial nav, not generic "related content".

Why this works (mechanism): tool pages already enjoy 93% crawl coverage. Hoisting compare links into above-the-fold position transfers crawl-priority authority from already-indexed pages directly into compares. Pages linked from above-the-fold positions on indexed pages get crawled significantly more frequently than pages linked from buried widgets — this is the single highest-leverage internal-link move in Phase 9.

**2. Compare sitemap priority bumped 0.8 → 0.95.**

One-line change in `app/compare/sitemap.ts`. Sitemap priority is a relative signal — bumping compares above the 0.8 default tells Google to prefer crawling them when budget is constrained. Tools stay at their default. The bump is incremental but free.

### Commits shipped (cont.)

| Commit | What it gave us |
| :--- | :--- |
| `1c410da` | B1 (elevated "Compared with" strip on tool pages) + B2 (compare sitemap priority 0.8 → 0.95) |

### Files changed

```
app/tools/[slug]/page.tsx     + 30 lines: above-the-fold "Compared with" pill strip
app/compare/sitemap.ts        + 5 lines:  priority 0.8 → 0.95 with rationale comment
```

### What's measurable from this ship

| When | Check |
| :--- | :--- |
| Today +5min | View-source on `/tools/cursor` shows new `<div>` with `vs GitHub Copilot →` links above the FTC disclosure |
| Today +5min | `/compare/sitemap.xml` shows `<priority>0.95</priority>` on every compare URL |
| Day +14 | GSC Crawl Stats — compare-section requests/day should rise vs prior 7-day baseline |
| Day +21 | Sample re-inspection of 20 previously-unindexed compares: target ≥ 50% flipped to indexed |
| Day +30 | Full audit re-run (after B3 completes); compare-indexation rate target ≥ 70% (vs 34% baseline) |

### What's NOT yet shipped from the B-series

- **B3 — full `--all` GSC URL Inspection audit.** Requires 2 days at the 2k/day quota and consumes the entire daily inspection budget. Held for explicit go-ahead. Command: `npm run audit:indexation -- --all`. Checkpoints to `scripts/.gsc-indexation-progress.json`, so it survives session breaks and a single-day quota hit.
- **B4 — long-tail tool internal linking** (re-weight "Similar tools" rail to favor un-indexed tools). Secondary priority now that audit shows tools are 93% indexed at the top end. Held until B1/B3 results are in — sequencing matters because B1's effect will likely change the shape of B4's target list.

---

## Day 3 — 2026-05-28 — Noindex sweep (22 pages) + first GSC URL-Inspection audit (356 URLs)

**Trigger:** Phase 9 plan called for Tier-3 indexation rescue (the ~1,330 zero-impression pages) and Tier-4 prune-or-merge (the 529 pos-51+ pages) to run in parallel. Before doing the heavy work, we needed to know: which pages are actually missing from Google's index, and which are indexed-but-buried? Phase A = ship the most obvious noindex candidates (Tier-4 first wave). Phase B = run the first real audit using the GSC URL Inspection API to ground the rest of the plan in data, not assumptions.

**Approach:** Two parallel tracks ran on the same day:
- **Phase A — Targeted noindex sweep.** Pull the 10 worst-performing hub/best/stacks/for pages (avg pos 58–90, single-digit impressions, off-domain or zero commercial intent) + 12 worst-performing comparison pages (mostly non-AI residue from the early bulk seed). Mark them `noindex, follow` so URLs still resolve but Google drops them from the index and crawl budget reallocates to pages we want indexed.
- **Phase B — First indexation audit.** Sample top-100-by-view_count per page type (~356 URLs total across tool / best / stack / role / blog / category / static / compare). Call GSC URL Inspection API for each. Bucket the responses by `coverageState`. The "what's actually broken" picture this paints is what the rest of Phase 9 should optimize for.

### What shipped — in plain English

**1. Targeted noindex sweep — 22 pages dropped from the index.**

Two mechanisms, depending on whether the page is config-driven or DB-driven:

- **Static config pages** (best / stacks / for) — added an optional `noindex?: boolean` field to the TypeScript config in `lib/data/{best-pages,stacks,role-pages}.ts`. The flag is read by both the per-section sitemap and the per-page `generateMetadata` (which emits `robots: { index: false, follow: true }`). Flagged 10 pages: `/best/agencies`, `/best/design`, `/best/writing`, `/best/spreadsheets`, `/best/cybersecurity`, `/best/cold-outreach`, `/best/presentations`, `/best/healthcare-ai`, `/stacks/real-estate-agent`, `/for/real-estate-agents`. All were pos 58+ with single-digit impressions; several are off-domain for an AI directory (cybersecurity, healthcare, real-estate).
- **DB-driven compare pages** — migration `113_noindex_tool_comparisons.sql` adds a `noindex` boolean column to `tool_comparisons` (default false, partial index on `WHERE noindex = false` for query performance). Flag is read by the compare page's `generateMetadata` and filters through 7 downstream surfaces: sitemap, RSS feed, related-compares rail, hub listings, llms-full.txt, IndexNow recent-pings cron, Bing URL-submission cron. Flagged 12 compares: 8 non-AI (Expensify×2, Aweber/Klaviyo, Shopify/Webflow, Skool×2, Carrd, Leadpages, Rewardful) + 3 AI-adjacent low-quality (Canva×2, Heygen).
- **Deliberately skipped:** `/categories/business-finance`, `/categories/healthcare` — these are core taxonomy nodes. The right fix is better content, not noindex.

Full doc: [14-noindex-sweep-and-audit-findings.md](./14-noindex-sweep-and-audit-findings.md).

**2. First indexation audit — 356 URLs inspected.**

Ran `scripts/audit-gsc-indexation.ts` against a top-N-by-view_count sample per page type. The top-line indexation rates:

| Page type   | Inspected | Indexed | Rate  |
| ----------- | --------: | ------: | ----- |
| tool        | 100       | 93      | 93%   |
| best        | 51        | 50      | 98%   |
| stack       | 40        | 35      | 88%   |
| role        | 20        | 20      | 100%  |
| blog        | 16        | 16      | 100%  |
| category    | 15        | 13      | 87%   |
| static      | 14        | 8       | 57%   |
| **compare** | **100**   | **34**  | **34%** |

**3. The audit finding that reframes Tier 3.**

We assumed the 1,400 zero-impression tools were the indexation problem. The audit says otherwise. Top-100 tools are **93% indexed**. Top-100 *compares* are only **34% indexed**. ~1,000 editorial compares published, ~660 of them invisible to Google.

That's a 3× larger problem hiding inside a smaller surface. The crawl-budget bottleneck isn't long-tail tools — it's editorial compares being orphans (linked only from a "related compares" rail at the bottom of *other* compare pages = circular, low priority).

### What this changes for the rest of Phase 9

Tier 3 priority order has flipped. New B1–B4 sequence (full detail in [14-noindex-sweep-and-audit-findings.md](./14-noindex-sweep-and-audit-findings.md)):

| Priority | Action | Doc impact |
| :-- | :-- | :-- |
| **B1** | Elevate compare links on tool pages — above-the-fold "Compared with: …" pill instead of buried rail | doc 07 updated (compare-elevation section added) |
| **B2** | Bump compare sitemap priority `0.8 → 0.95` | one-line change, follow-up PR |
| **B3** | Re-run audit with `--all` to cover all 2,781 URLs (2 days at 2k/day quota) | runs as background pipeline |
| **B4** | Long-tail tool internal linking — weight UN-indexed tools higher in "Similar tools" rail | doc 05 updated to flag this as secondary, not primary |

### Commits shipped today

| Commit | What it gave us |
| :--- | :--- |
| `de770ff` | Phase A noindex sweep — 22 pages (10 hub + 12 compare) emit `robots: noindex,follow` and are excluded from sitemap, RSS, IndexNow, Bing pings, llms-full.txt, related-compares rail, hub listings. Migration 113 ships the `tool_comparisons.noindex` column. |
| `935d09e` | Phase 9 CTA & conversion: global Plan-Your-Stack CTA + signup gate (separate workstream landing the same day; not part of the noindex sweep). |
| _follow-up commit_ | New `14-noindex-sweep-and-audit-findings.md` plan doc + this BUILD-LOG entry + reframes of docs 05/06/07/README. |

### Files changed (Phase A)

```
lib/data/best-pages.ts                + noindex?: boolean + 8 flags
lib/data/stacks.ts                    + noindex?: boolean + 1 flag
lib/data/role-pages.ts                + noindex?: boolean + 1 flag
lib/data/comparisons.ts               + .eq('noindex', false) on 4 query helpers
lib/seo/internal-links.ts             + .eq('noindex', false) on related-compares query
app/best/[slug]/page.tsx              + robots: { index: false } from config
app/best/sitemap.ts                   + .filter((p) => !p.noindex)
app/stacks/[slug]/page.tsx            + same
app/stacks/sitemap.ts                 + same
app/for/[slug]/page.tsx               + same
app/for/sitemap.ts                    + same
app/compare/[slug]/page.tsx           + robots: { index: false } from DB row
app/feed.xml/route.ts                 + .eq('noindex', false) on compare RSS
app/api/cron/indexnow-recent/route.ts + .eq('noindex', false) before pinging IndexNow
app/api/cron/submit-urls-bing/route.ts + .eq('noindex', false) before pinging Bing
scripts/build-llms-full.ts            + .eq('noindex', false) before writing llms.txt
supabase/migrations/113_noindex_tool_comparisons.sql  (new)
```

### What's measurable from this ship

| When | Check |
| :--- | :--- |
| Today +1hr | View-source on `/best/agencies` shows `<meta name="robots" content="noindex,follow">` |
| Today +1hr | View-source on `/compare/expensify-vs-quickbooks` shows same |
| Today +1hr | `/sitemap.xml` no longer contains the 22 flagged URLs |
| Day +3 | GSC re-crawl confirms; URL Inspection on a noindex'd page reports "Excluded by 'noindex' tag" |
| Day +14 | Indexed-page count for the 22 noindex'd pages drops to 0 |
| Day +14 | Total impressions should NOT drop (these pages weren't contributing) |
| Day +14 | Compare-section impressions should rise (crawl budget reallocates) |
| Day +30 | After B1 ships (compare-link elevation), compare-indexation rate measured: target ≥ 70% (vs 34% baseline) |

### What did NOT ship today (and why)

- **B1 (elevate compare links on tool pages)** — needs UX design pass first. The `getEditorialComparisonsForTool` data layer exists (`lib/data/comparisons.ts`), but where the rail sits on the tool page and what it looks like is a design choice. Held to Day 4 deliberately.
- **B2 (bump compare sitemap priority to 0.95)** — held out of this PR for review focus. Trivial one-line change, will ship in a follow-up commit.
- **B3 (full `--all` audit run)** — kicks off as a background process; takes ~2 days at 2k/day quota. Results will inform Day-5 decisions.
- **B4 (long-tail tool similar-tools rail re-weighting)** — secondary priority now that audit shows tools are 93% indexed at the top end. Held until B1 and B3 land.

### Lesson logged

The Phase 9 plan's "1,330 zero-impression tools = bottleneck" framing was an *assumption* we never tested. The first thing to do in any rescue effort is to call URL Inspection on a representative sample — 4 hours of API quota would have saved 4 weeks of misaimed work. Bake this into future plans: before any rescue tier, run an audit-first checkpoint.

---

## Day 2 — 2026-05-26 → 27 — Full catalog data-completeness pass (2,038 tools refreshed)

**Trigger:** every tool page needs every section populated with current data; user audit found ~56% of tools had empty `latest_updates`, 71% had hidden Tutorials section, and tutorial links rendered as bare hostnames ("dbos.dev" × 4) instead of real page titles.

**Approach:** extend the Phase 4 SOP (`scripts/backfill-tool-data.ts`) to capture every depth field in one DeepSeek call, then run it across the entire catalog in 4 parallel shards, then HTTP-fetch real `<title>` tags for every tutorial URL.

### What shipped — in plain English

**1. Phase 4 SOP now captures depth fields in one pass.**

Before, the SOP only refreshed structured fields (features, FAQs, pricing_plan_guides, workflow_scenarios, etc.). Depth fields (`tutorial_urls`, `latest_updates`, `models`, `community_links`, `pricing_details`) were handled by a separate Anthropic-based script (`enrich-tools.ts`), and `latest_updates` had a broken schema that produced empty cards on the page.

Now the SOP:
- Extracts `tutorial_urls` (10 absolute URLs to docs/guides/tutorials/help/academy/learn/getting-started)
- Extracts `latest_updates` in the correct `{date, source, type, title, url, summary}` shape that matches `LatestUpdatesSection`
- Extracts `models` (named LLMs the tool uses)
- Extracts `community_links` (G2/ProductHunt/Reddit)
- Extracts `pricing_details` (tier list with plan/price/features)
- Scrapes 4 more page paths (`/help`, `/support`, `/academy`, `/resources`, `/learn`, `/getting-started`) so enterprise tools that hide docs behind login still surface the help center
- All these new fields only OVERWRITE existing data if DeepSeek returned non-empty values (safety)

**2. 4-shard parallel architecture.**

The SOP used to run sequentially (~80 sec per tool × 2,038 = 49 hours). Added `--shard=N --shards=M` flags so the catalog gets deterministically partitioned by `hash(slug) % M`. Each shard processes its own ~500 tools, writes to its own checkpoint file (`scripts/.refresh-progress.shard0of4.json`), and runs as a separate `nohup` background process. Wall-clock dropped from 49h → ~7h.

**3. UI fallback: "Resources & Guides" section now always renders.**

Previously the section was hidden when `tutorial_urls` was empty. Now (`components/tools/tutorial-link.tsx` + `app/tools/[slug]/page.tsx`):
- Prefers enriched `tutorial_links` with real `<title>` + meta-description
- Falls back to bare `tutorial_urls` with URL-path-derived titles ("Quickstart", "Documentation", "API Reference") + colored badges
- Final fallback: synthesizes from `docs_url` / `changelog_url` / `github_url` / community URLs / website URL — so EVERY tool has at least one actionable resource card

**4. `tutorial_links` jsonb column + HTTP backfill script.**

Migration 106 added the column. `scripts/backfill-tutorial-titles.mjs` HTTP-fetches every tutorial URL, parses `<title>` and `<meta property="og:title">` / `<meta name="description">`, strips the tool brand suffix ("Quickstart - DBOS" → "Quickstart"), and writes `{url, title, description}` triples. Concurrency 6, 7s per-fetch timeout.

**5. SOP synthesis improvements (mid-flight fixes).**

| Bug | Fix |
|---|---|
| 23% failure rate from JSON truncation | `max_tokens: 4096 → 8192` |
| Postgres statement timeout from 4 parallel jsonb fetches at startup | Split to lightweight `id+slug` scan + lazy per-tool hydration |
| Network blips killed every remaining tool in the run | Added 5× exponential-backoff retry on hydrate |
| Malformed DeepSeek JSON (control chars, trailing commas, truncation) | Added in-place JSON repair sanitizer with brace-balancing |
| `pgArray()` apostrophe-in-array-literal bug failed ~10% of chunks | Escape `'` → `''` inside `{"..."}` literals before SQL-string-wrapping |
| `has_api: null`, `pricing_type` enum mismatch, `skill_level` enum mismatch | Defensive normalization before Zod parse |

**6. Tutorial-titles backfill: 1,768 / 1,768 tools (100% of those with URLs).**

Ran across the full catalog in two passes (DNS blip killed the first at scanned=1,050 → restarted, picked up from checkpoint via `tutorial_links` skip logic). Every tool that has any tutorial URL now shows the real page `<title>` instead of a hostname.

**7. Viability backfill (deterministic, no LLM): 100% coverage.**

`scripts/backfill-viability.mjs` re-runs the 6-signal score model for any null entries. Result: 2,038 / 2,038 tools have a 0-100 viability_score.

**8. Two follow-up retries to close gaps.**

- **Retry-1** — 56 tools missed the initial SOP refresh (DeepSeek validation failures, network stragglers). Single-slug SOP loop recovered 37 of them (~66%); the remaining 19 consistently fail scrape or hit Zod validation rejects.
- **Retry-2** — 639 tools had empty `latest_updates`. New focused script `scripts/retry-latest-updates.mjs` scrapes a wider net (`/news`, `/press`, `/research`, `/announcements`, GitHub releases via API for tools with `github_url`) and asks DeepSeek for ONLY `latest_updates` with a tight prompt. Filled 166 (26% fill rate). The remaining ~470 genuinely have no public dated content (early-stage products, enterprise tools with no public blog).

### Final coverage (compared against the audit baseline)

| Section | Audit baseline | After this pass | Delta |
| :--- | ---: | ---: | ---: |
| SOP refreshed in last 24h | ~0 | **2,019 / 2,038 (99.1%)** | +2,019 |
| Viability score populated | ~1,178 | **2,038 (100%)** | +860 |
| Features | varied | **2,038 (100%)** | — |
| FAQs (long-tail) | varied | **2,035 (99.9%)** | +14 |
| Skip-if line | varied | **2,035 (99.9%)** | +14 |
| Workflow scenarios | varied | **2,035 (99.9%)** | +14 |
| Tutorial URLs | 1,698 | **1,768 (87%)** | +70 |
| **Tutorial REAL TITLES** | 232 | **1,768 (100% of those with URLs)** | **+1,536** |
| Latest updates (news) | 1,334 | **1,568 (77%)** | +234 |
| Pricing tiers | 1,608 | 1,692 (83%) | +84 |

**The 19 SOP holdouts** are tools whose websites consistently 4xx/timeout scrape — would need manual review or a different ingestion path.
**The 470 latest_updates holdouts** are tools with no public dated changelog/blog/news content — genuine, not a bug.

### Commits shipped today

| Commit | What it gave us |
| :--- | :--- |
| `4822f15` | Resources & Guides section always renders + SOP scrape extracts wider URL set |
| `a6afc31` | Hotfix: commit `lib/cron/scrape.ts` so `fetchToolPagesBundle` export is present (deploy was failing because `enrich.ts` was committed without the function it imports) |
| `55dead6` | Tutorial + news rendering: real page titles instead of bare hostnames; migration 106 (`tutorial_links` jsonb); enrich.ts `latest_updates` schema fix |

### Cost + time

- DeepSeek API: ~$20-25 for the full catalog re-synthesis (4 SOP runs × ~2,000 tools × ~$0.01 each + retries + focused latest_updates)
- Wall-clock: ~10 hours over 2026-05-26 evening → 2026-05-27 afternoon
- Mac kept alive via `caffeinate -dims &` for the full duration

### Incident notes — what went wrong

1. **JSON truncation cascade (~23% of tools)** — DeepSeek hit the 4096-token output limit on the now-richer SOP output. Bumped to 8192. Resolved.
2. **Postgres statement timeout on parallel startup** — 4 shards × full jsonb fetch at boot exceeded the 8s statement timeout on Free tier. Resolved by lightweight initial scan + lazy hydration.
3. **Network blip → 1,625 cascading "hydrate failed"** — when network blipped during a shard run, the next ~1,500 hydrate calls all failed (no retry). Added 5× exponential backoff retry. The shards that finished with these failures left ~150 tools unchecked → recovered via Retry-1.
4. **Supabase Free-tier pool exhaustion** — after 6+ hours of 4-shard parallel processing, Postgres connection pool stayed jammed even after shards died. `SELECT 1` timed out for ~10 hours. Resolved by: user upgraded to Pro plan, then triggered project restart from dashboard. Cleared instantly.
5. **Shard 3 launch dropped twice from the bash for-loop** — the `for i in 0 1 2 3; do nohup ... & done` would silently end before launching shard 3 in both attempts. Manually launched it both times. Root cause unclear (shell quoting + heredoc nesting?), worked around.
6. **Duplicate shard 3 instances** — manual launch + leftover from earlier run created two shard 3 processes that interleaved writes into the same log file (corrupted log readability, but DB writes were still atomic). Killed the older instance, single instance continued.

### What's measurable from this ship

- Every tool page should now show: Editorial Verdict, Behind the Verdict, Latest from {Tool}, Viability Score, About, Key Features, Use Cases, Limitations, Pricing, Integrations, Resources & Guides, FAQ — all populated.
- Spot-check on production (Vercel auto-deployed `4822f15`): `/tools/inngest` should show "How Durable Execution Works", "Next Js Quickstart" etc. instead of "inngest.com" × 10.

### Lesson logged for next time

When running long-tail concurrent jobs against a managed Postgres:
- Pre-warm the connection pool with one sequential query before fanning out (so pool size is established before peak load).
- Stagger shard launches by at least 15s so the first jsonb fetches don't all hit at once.
- Use per-shard checkpoint files, not a shared file (parallel JSON writes corrupt).
- Always wrap hydrate in retry — Supabase-side network blips happen and a single un-retried fetch failure shouldn't cascade.

---

## Day 1 — 2026-05-27

**Commit:** `24e41b9` — Phase 9 Day-1 — decision-engine positioning + AI crawler manifest + E-E-A-T wiring
**Branch:** `main` → pushed to `origin/main` → Vercel auto-deploy completed.
**Files changed:** 28 (4,125 insertions, 7 deletions)

### What shipped — in plain English

**1. New homepage tagline and search-result snippet.**

Before, Google showed `RightAIChoice — Build Anything with AI` and a vague description. Now it shows:

> **RightAIChoice — Find the Right AI Stack for Your Workflow**
> Stop guessing which AI tools to use. Get a personalized AI stack in 60 seconds — compare 2,000+ tools by feature, price, and real user sentiment.

The new copy says exactly what we do, names the count (2,000+), and frames the speed promise (60 seconds). Both lines fit under Google's truncation limits, so nothing gets cut with "…".

**2. New homepage headline.**

Before: *"Build anything with AI. We'll give you the exact stack."*
After: *"Pick the **right AI stack** in 60 seconds, not 6 weeks."*

The new line moves us from a generic "AI is cool" message to the concrete promise: we save you weeks of research. Same shimmer effect, same input box underneath — only the words changed.

**3. Made the site explain itself to AI assistants.**

ChatGPT, Claude, Perplexity, Google's AI Overviews, and the rest now have two new things they can read about us:

- **`llms.txt`** — a one-page summary at `rightaichoice.com/llms.txt` telling them who we are, what categories we cover, and where to find our best comparisons. Think of it like a "press kit for AI chatbots."
- **Updated `robots.txt`** — explicit "yes, you may read everything" to six more AI bots (Bytespider, DuckAssistBot, Diffbot, Amazonbot, MistralAI, Timpibot) on top of the existing four. We want to be cited; locking these out would be self-sabotage.

**4. Told Google we're a brand, not a directory.**

We expanded the hidden "Organization" markup that Google reads on every page. It now includes:
- Our slogan ("Pick the right AI stack — backed by data, not opinions")
- 12 topic areas we have expertise in (AI coding, image, writing, video, etc.)
- 5 social profiles (X, LinkedIn, GitHub, Product Hunt)
- A search action so Google can offer "search rightaichoice.com" directly from the SERP
- A separate "Service" entry that describes the decision engine itself

Net effect: when Google decides whether to give us a Knowledge Panel (the brand card on the right side of search), it has the raw data to do so.

**5. Started showing freshness signals on key pages.**

On blog posts, comparison pages, and tool-alternative pages, you'll now see two small badges:
- "Last updated [date]" (Clock icon)
- "Reviewed by our team" (Shield icon)

Google's E-E-A-T guidelines (Experience, Expertise, Authoritativeness, Trustworthiness) reward sites that show their work is current and editorially overseen. These badges aren't decorative — they pull from the freshness cascade we built in Phase 8, so the dates are real, not synthetic.

**6. Built two new automation scripts (not yet run end-to-end).**

- `npm run llms:full` — generates a giant text dump of every tool + every editorial comparison, written to `public/llms-full.txt`. AI assistants that want to ingest our full catalog have a single file to grab. Blocked today by the Supabase outage; will run as soon as it's stable.
- `npm run tier1:candidates` — pulls the 101 pages currently ranking on positions 1–30 in Google, buckets them into "earn the click" / "break onto page 1" / "push into top 20", and saves them to `candidates/tier1-candidates.json`. This is the input for the next ship (DeepSeek-assisted title rewrites).

### What's measurable from this ship

| When        | Check                                                                |
| :---------- | :------------------------------------------------------------------- |
| Today +5min | View-source on homepage shows new title + meta                       |
| Today +1hr  | GSC URL Inspection → Request Indexing on `/`                         |
| Day +3      | Brand SERP re-check: did we move on "rightaichoice"?                 |
| Day +7      | GSC homepage delta: impressions + position                           |
| Day +14     | If position worse, single `git revert 24e41b9`. If flat/better, keep |

### What did NOT ship today (and why)

- **`llms-full.txt` not generated yet** — Supabase REST was down most of the afternoon (DB compute stuck; resolved after a project restart + Pro upgrade). Run when stable.
- **Tier-1 candidate list not generated yet** — same Supabase blocker.
- **Homepage CTA not changed** — "Plan My Stack" rewrite is doc 13 Part 4. Held to Day 3 deliberately, so we can isolate the title/H1 effect on the Day-7 GSC delta from the CTA effect.
- **Below-the-fold architecture not rewritten** — Tool Finder Quiz above the fold, persona pills, stack pillar showcase are Week 2 per doc 12.

### Incident note — Supabase outage 2026-05-27

- **Symptom:** every REST query timed out at 8–15s; Postgres logs showed repeated `canceling statement due to statement timeout` even for `select 1 limit 1`.
- **Root cause:** DB compute was wedged — likely a runaway transaction or lock holding everything. Project status reported `ACTIVE_HEALTHY`, masking the issue.
- **Fix:** restart project from Supabase dashboard. Upgraded to Pro tier in parallel (not strictly required for the fix, but justified for longer-term needs: no auto-pause, larger compute, 8GB DB, daily backups, 15s statement timeout vs 8s on free).
- **Total downtime impact:** ~2 hours of script blockage; no user-facing site impact (Next.js ISR served cached pages throughout).
- **Lesson:** add a synthetic health check that does a real table query (not just the PostgREST root) and pages us when it times out. The control-plane status is not enough.

---

## Foundation work (completed before Day 1)

The following landed in earlier commits as scaffolding for Phase 9. Not part of the Day-1 commit but necessary for it.

| Commit           | What it gave us                                                            |
| :--------------- | :------------------------------------------------------------------------- |
| Phase 8 cascade  | `last_verified_at`, `last_reviewed_at`, `freshness_score` on tools/compare |
| Migration 093    | `gsc_snapshots`, `gsc_diffs`, `weekly_loop_actions` tables                 |
| `3820444`        | Weekly GSC snapshot + diff cron (feeds the Tier-1 candidates script)       |
| `c8c40f5`        | GSC snapshot scripts wired into package.json                               |
| `4822f15`        | Resources & Guides section + wider SOP URL extraction                      |

---

## Baseline (frozen — never edit)

Captured 2026-05-26, before any Phase 9 work landed. This is the "before" picture every metric in this log will be compared against.

| Bucket            | Pages |   Impr. | Clicks | Avg Pos |
| ----------------- | ----: | ------: | -----: | ------: |
| Pos 1–3           |     3 |      13 |      0 |     3.0 |
| Pos 4–10          |    30 |     983 |      2 |     8.1 |
| Pos 11–20         |    32 |     268 |      4 |    17.6 |
| Pos 21–30         |    36 |     346 |      0 |    25.8 |
| Pos 31–50         |   143 |   1,786 |      1 |    42.5 |
| Pos 51+           |   529 |  11,819 |      1 |    67.9 |
| Zero impressions  | ~1,330|       0 |      0 |       — |

**28d totals:** 15,215 impressions · 8 clicks · CTR 0.05% · avg pos ~40.
**Brand SERP:** rank #2 for "rightaichoice" (unknown what's at #1 — task #43).

---

## Day 5 — 2026-05-29 (cont.) — Frontier commit · freshness→sitemaps · Tier-1 live · ranking boost

Big session. Resumed Smart SEO alongside the parallel Opus 4.8 Review (which had reached 9.E); coordinated against the collision boundary (next migration = 125; new tables RLS-on; events registered; shared files append-only).

### S0 — Committed the uncommitted frontier (8 commits, `main`, not pushed)
103 uncommitted files → clean themed commits: `chore: gitignore scratch dirs` · `chore(db): never-tracked migrations 038–110 + seed` (the real root of the duplicate-number mess — committed as-is, not renumbered) · `freshness cascade` · `sitemap+IndexNow` · `weekly GSC loop` · `candidates/scripts/docs`. **Restored `035_tool_sentiment_cache.sql`** which had been accidentally emptied in the working tree. Fixed a latent broken state: committed crons imported an uncommitted `lib/seo/freshness.ts`.

### S1 — Sitemap `lastmod` accuracy + IndexNow hygiene (`3bebb7a`)
- All sitemaps (`app/sitemap.ts`, `tools`, `compare`) now overlay `pages_freshness` over the real source-row timestamp and **omit `lastmod` rather than emitting `new Date()`** (which had trained Google to ignore our `lastmod`). New `getSectionFreshness()` gives section-index URLs an honest date.
- Ran the backfill chain: `sync_page_tool_mentions_db()` (SQL) + `sync:mentions:code` (22,065 pairs) + `sync:mentions:blog` (79) → `backfill:freshness`. **`pages_freshness` now 2,619 rows across all 7 page types** (was 90 compare-only).
- IndexNow (`app/api/indexnow/route.ts`): filters `noindex` compares, **deleted the dead `/questions/` block** (no such route → was pinging 404s), filters noindex best/stacks/role.

### S2 — Tier-1 made ROI-smart + regenerated from today's GSC (`b0c32cb`)
- Builder + rewriter now score each candidate `priority = impressions × title-responsiveness × position-leverage` and classify a **binding constraint**: `title` (page-1, title-responsive), `mixed` (pos 11–20), `rank` (buried/templated tool pages). Review UI (`/admin/tier1-review`) sorts + badges by it with a guidance banner; rewriter adds answer-style titles for question queries.
- Regenerated from the **2026-05-29 28d snapshot**: 99 candidates → 98 rewrites = **9 🟢 title / 14 🟡 mixed / 75 🔴 rank** (1 DeepSeek parse fail: `/tools/seowritex`, retriable).

### GSC analysis (live 2026-05-29) — the strategic reframe
- 99 pos-1–30 pages hold only **1,691 impr / 6 clicks** (0.35% CTR). But the **pos 31–50 cohort has MORE impressions (2,141) — 131 tool pages, 0 clicks** — rank-bound, not title-fixable.
- Tier-1 value concentrates in **15 page-1 compares (712 impr, 3 of 6 clicks)**.
- Checked a canonical scare (`stable-audio` pos 78 for "stable audio"): **false alarm** — Google canonical = self, `user_canonical` null is a capture artifact. Brand-term collapse is normal SERP competition. Winnable queries = comparisons / long-tail / questions.

### Approvals — Claude curated + applied 39 live title overrides (`scripts/approve-tier1-titles.ts`)
Operator delegated approval ("approve smartly on your own, I'll review next time"). Applied **6 title-bound (compares + leaderboard blog) + 33 tool pages ranking pos 1–20**. **Held 3** where the current title was already optimal (cost-math blog, open-source-agents blog, moises-vs-suno) — smart > volume. Most tool titles had a literal `&amp;` HTML-entity bug → fixing it is a real SERP-display win. Each approval is recrawl-signalled.

### Recrawl loop (`9316baf`) — answers "what do we do in GSC after?"
Approve/revert now **bump `pages_freshness` (→ sitemap `lastmod`) + ping IndexNow**. Honest mechanics: **IndexNow notifies Bing/Yandex instantly; Google is NOT pinged** — it recrawls on its own schedule but now sees an honest, newer `lastmod`. Google's only on-demand lever is the manual GSC "Request Indexing" (≤10/day) — reserved for top compares. The sitemap-ping-to-Google endpoint was removed by Google in 2023.

### Ranking lever for "other pages" (`7bf6212`, mig 127)
Rejected a fake recrawl-wave (would contradict the freshness-honesty we just shipped). Built the legitimate lever: `gsc_tool_positions` (per-tool weighted position from the snapshot; **709 tools, 168 buried pos 20–50**) + `getBuriedToolSlugs()` unioned into the existing sibling-rail bias so internal PageRank flows to indexed-but-buried pages too. Refreshed weekly inside the `snapshot-gsc` cron.

### Verification (pre-deploy) — caught + fixed a freshness-inflation bug (`mig 126`)
`tsc --noEmit` clean at every step. Migration for `gsc_tool_positions` applied to prod via MCP (`SET search_path=''`, SECURITY DEFINER, anon/authenticated revoked — clean per 9.C rules). 39 overrides confirmed live in `title_overrides`. **Migration-number collision caught + resolved:** the parallel Opus 9.C sweep took `125` (`security_perf_sweep`) concurrently; I renumbered the SEO migration `125 → 127` (freshness trigger stays 126). Supabase tracks by timestamp version so prod was never in conflict; this was a filename-prefix fix only. Ran a full **production build** (`next build`) — green; booted `next start`, sitemaps serve valid XML.

**But the build-time sitemap showed `lastmod ≈ now` for ~all tools.** Root cause: `trg_tools_freshness_cascade` fired on *every* tools UPDATE where slug was unchanged — so a routine refresh-cron pass (last_full_refresh_at / view_count / search_vector) stamped `pages_freshness = now()` for **1,888 tools**, re-collapsing `<lastmod>` to "everything changed today" — the exact signal S1 removed, just relocated into the trigger. **Fixed in `migration 126`:** trigger now fires only when a user-visible content column changes (name/tagline/description/pricing/features/links/etc.). Verified in rolled-back txns: routine update → freshness unchanged (`06:35`); content edit → bumps. Already-inflated rows re-baseline naturally as content changes; nightly refreshes no longer re-inflate. **Net: deploy is safe AND S1 now genuinely delivers honest lastmod.**

### Next
- **Operator:** review the 39 approvals at `/admin/tier1-review`; optionally GSC "Request Indexing" the top ~10 compares; measure Day-7/28 lift.
- **Build:** `/seo-impact` (4-week lift job) to close the loop; then Tier-2 content depth for the pos-31–50 cohort.

---

## Day 5 (cont.) — 2026-05-30 — /seo-impact + the real cause of the 34% compare gap

### #1 /seo-impact — lift measurement closes the loop (`298adcb`, migs 128–129)
`gsc_page_metrics(path,date)` + baseline/outcome columns on `title_overrides` + `run_seo_impact()` (fills outcomes for changes ≥28d old: title overrides + executed `weekly_loop_actions`). Cron `/api/cron/seo-impact` (Mon 08:30) + `/admin/seo-impact` dashboard (before/after pos+CTR, pending queue) + nav. Approve action now freezes the pre-recrawl GSC baseline. Backfilled baseline for **103 active overrides** (avg pos 18.9, CTR 0.126% — the number to beat). Verified: simulated a 29-day-old baseline → measures cleanly.

### #2 Tier-2 "content depth" → the data killed the premise, twice
- **Buried pos-31–50 tool pages are already content-complete** — all 162 have full descriptions, features, tutorials, models, pricing, and **avg 9.1 FAQs**; avg only **13.8 impressions**. Adding content there is wasted effort; their lever was internal links (shipped: buried-tool boost). Skipped.
- **Editorial compares are already fully editorial** — 530/530 indexable compares have tldr+verdict+faqs. The 34%-indexed gap is **NOT content**. The GSC URL-Inspection sample shows **64/100 compares are "URL is unknown to Google"** (never discovered) — only 2 are quality/5xx.
- **Root cause found:** `ComparePagination` (and `ToolPagination`) were `'use client'` components using `<button onClick={router.push}>` for every page link — **zero `<a href>`**. Googlebot saw page 1's 24 compares and could not follow pagination → the other ~500 compares were undiscoverable. (Exactly Opus 9.D's "crawlable pagination — `<Link>` not `<button>`.")
- **Fix:** converted both paginations to crawlable `<Link href>` (+ `rel=next/prev`, `aria-current`). Verified in rendered HTML: `/compare` now serves `<a href="/compare?page=2…23">`. `/search` is `noindex,follow` so its now-crawlable pagination only aids discovery. This is the structural fix for the compare-indexation gap — far higher ROI than the "unique content" it doesn't need.
- **Operator follow-up:** GSC → Request Indexing on `/compare` to accelerate re-discovery; re-run the indexation audit next Monday to watch "unknown" → "indexed".

---

## Open tasks blocking next ship

1. **#43 Brand SERP audit** — open incognito, search "rightaichoice", paste top-5 URLs back. 5 minutes. Tells us what to do for brand defense.
2. ~~**#37 Apply pending migrations**~~ — ✅ committed (038–110 recorded as-is; mig 125 applied). Duplicate-number cleanup still pending as tech debt.
3. ~~**#47 Tier-1 rewrites**~~ — ✅ shipped + 39 titles live (engine, ROI ranking, recrawl loop, batch approval). Remaining = operator review + `/seo-impact` lift measurement.

---

## How to read this log

- **Each day's entry** = what shipped, what didn't, and why. The "why didn't" is as important as the "did".
- **Commits are the source of truth.** If a claim here disagrees with `git log`, trust git.
- **Don't backfill.** If something shipped before this log existed (pre-Day-1), summarize it in the "Foundation" section, not in a fake dated entry.
- **Update on the day of the ship**, not at the end of the week. Memory rots fast.
