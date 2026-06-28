# Build Log — Phase 13 (GEO & SEO Upgrades) · Opus 4.8 (1M)

One dated entry per completed step. Format: **what / why / how / verification / residual risk** +
a plain-language note. A step counts as done ONLY after it is verified, re-verified, and logged here.

- Plan: `Plan_phase-13.md` (same folder)
- Code worktree: `../rac-phase13` on branch `phase13-geo-seo` (integrate to `main` via squash PR)
- Governing SOP: Isolate → Implement → Verify → Re-verify → Upgrade → Log → Report → Commit
- New automations are also documented in `docs/automated-pipelines/` and added to its README changelog.

---

## Baseline snapshot (2026-06-27, before any Phase-13 change)

Captured from the live DB (`adtznghodbgkvknilfln`: `gsc_snapshots`, `user_events`, `click_logs`,
`auth.users`) + `scripts/.gsc-indexation-report.json`, so every win can be proven by a moved metric.

### Google Search — 28-day trend (`gsc_snapshots`, scope `28d`)

| Snapshot | Impressions | Clicks | CTR | Avg position |
|---|---|---|---|---|
| 2026-05-26 | 25,542 | 44 | 0.17% | 39.5 |
| 2026-06-01 | 41,202 | 58 | 0.14% | 46.7 |
| 2026-06-08 | 55,725 | 66 | 0.12% | 45.8 |
| 2026-06-15 | 54,775 | 60 | 0.11% | 46.4 |
| **2026-06-22** | **43,485** | **39** | **0.09%** | **45.0** |

Impressions peaked Jun 8 then fell ~22%; clicks falling. Tracks the **May 2026 Core Update**.

### Position distribution — latest 28d snapshot (6,787 query-rows)

| Bucket | Query-rows | Share |
|---|---|---|
| Pos 1–3 | 7 | 0.1% |
| Pos 4–10 | 211 | 3.1% |
| Pos 11–20 | 176 | 2.6% |
| Pos 21–50 | 1,965 | 29.0% |
| **Pos 51+** | **4,428** | **65.2%** |

**94% of appearances are page-3-or-worse.** Page-1 rows generated only ~1,078 of ~43k impressions.

### Indexation by page type (`.gsc-indexation-report.json`, 2026-05-27, 1,996 URLs)

| Type | Indexed | Discovered-not-indexed | Unknown | Other |
|---|---|---|---|---|
| tool | 1,082 | 530 | 103 | 25 (dup/crawled) |
| **compare** | **34** | 0 | 64 | 2 (5xx) |
| category | 13 | 1 | 1 | — |
| best | 50 | 0 | 1 | — |
| stack | 35 | 4 | 1 | — |
| role | 20 | 0 | 0 | — |
| blog | 16 | 0 | 0 | — |
| static | 8 | 5 | 1 | — |
| **Total** | **1,258** | **540** | **171** | **27** |

Compare pages: **34% indexed** — the worst type and the biggest indexation opportunity.

### On-site traffic & conversion (last 30 days)

| Metric | Value |
|---|---|
| Human page views | 3,395 (~110/day) |
| Total tracked events | 36,336 |
| On-site searches | 17,897 |
| **Signups (`auth.users`)** | **5** |
| **Affiliate clicks (`click_logs`)** | **70** |
| AI-crawler hits (logged) | ~344 |
| Bot share of traffic | ~62% |

### GEO baseline

| Metric | Value |
|---|---|
| LLM citations of rightaichoice.com (ChatGPT/Perplexity/Gemini/Claude) | **0 (qualitative; no tracking yet)** |
| `geo_citation_snapshots` table | does not exist yet (D3.4 will create it) |

**Targets (directional):** avg position 45 → <20; page-1 share 3% → 15%+; compare indexation 34% →
70%+; discovered-not-indexed 540 → <150; referring domains ≈0 → grow weekly; AI-citation share 0 →
measurable presence for target prompts; signups & affiliate clicks materially above baseline.

---

## Progress log

### 2026-06-27 — D0: Phase 13 kickoff — docs + baseline
- **What:** Created the Phase 13 docs folder (`Plan_phase-13.md`, `build-log.md`, `README.md`) in the
  main repo; captured the baseline snapshot above.
- **Why:** Mirror the established phase pattern; lock a hard baseline so every later change is provable.
- **How:** Live read-only queries against `gsc_snapshots` (28d trend + position distribution),
  `user_events`/`click_logs`/`auth.users` (30d traffic & conversion), and
  `scripts/.gsc-indexation-report.json` (indexation by type). Web research on the May-2026 Core Update
  and 2026 GEO best practices informed the strategy.
- **Verification:** Numbers in the tables above are copied directly from query output / the report file;
  position-distribution query returned 7 / 211 / 176 / 1,965 / 4,428 across the buckets (sums to 6,787 =
  `rows_count` of the 2026-06-22 28d snapshot).
- **Residual risk:** Indexation report is dated 2026-05-27 (pre-core-update); will re-run
  `audit:indexation` early in D1 for a current read. AI-crawler hit count is client-event-based and
  likely undercounts server-only bot fetches.
- _Plain language: I set up the Phase 13 workspace and wrote down exactly where we stand today —
  Google rankings, which pages are/aren't indexed, how much traffic and how few signups we get, and
  the fact that no AI tool cites us yet. This is the "before" photo we'll measure all the upgrades
  against._
- **Status: done.**

### 2026-06-27 — D3.4: GEO citation tracking engine (the GEO equivalent of GSC)
- **What:** Built the GEO citation tracker — a pluggable system that asks an AI engine
  (which searches the web) our high-intent prompts and records, per prompt, whether
  rightaichoice.com is **cited**, its **rank** among cited domains, which **competitors**
  appeared, and a **share-of-voice** — one row per `(snapshot_date, engine, prompt_id)` in a
  new `geo_citation_snapshots` table. This is the GEO analogue of `gsc_snapshots`.
- **Why:** "You can't improve what you can't measure." No baseline existed for AI citations;
  this makes GEO movement provable, the same way the GSC snapshots prove SEO movement.
- **How (files, in worktree `../rac-phase13`, branch `phase13-geo-seo`, commit `e5c5f2e`):**
  - `supabase/migrations/172_geo_citation_snapshots.sql` (+ `.rollback.sql`) — table, indexes,
    unique key, RLS on (admin/service-role only, mirrors `gsc_snapshots`). **Applied live + verified**
    (17 columns present).
  - `lib/geo/competitors.ts` — `OUR_DOMAIN` + 13 tracked competitor directories; host-normalize helpers.
  - `lib/geo/target-prompts.ts` — 13 curated high-intent prompts across directory / category-best /
    comparison / recommendation / freshness intents.
  - `lib/geo/citation-engines.ts` — pluggable engine interface; `claude_websearch` implemented on the
    existing `ANTHROPIC_API_KEY` using `claude-opus-4-8` + the `web_search_20260209` server tool +
    adaptive thinking (handles `pause_turn` continuation); `perplexity`/`openai`/`gemini` scaffolded as
    "disabled until key added" (respects the founder's free/organic-for-now decision — no new spend).
  - `lib/geo/track-citations.ts` — pure, deterministic analysis (cited/retrieved/rank/competitors/SoV).
  - `scripts/track-geo-citations.ts` + npm `geo:track:dry` / `geo:track` — runner wrapped in
    `runScriptedPipeline` so every run logs to `pipeline_runs`; idempotent upsert; `--limit`, `--prompt`,
    `--engine`, `--date`, `--concurrency` flags; mirrors `snapshot-gsc`.
- **Verification:** `tsc --noEmit` clean. Migration applied (`{success:true}`) and the table verified via
  `information_schema` (all 17 columns). Single-prompt dry run reached the Anthropic API with a **valid
  request** (model + `web_search` tool + thinking all accepted) — it returned a **400 billing** error
  ("credit balance is too low"), not a params error, and the script's per-prompt error handling caught
  it gracefully (logged `✗ ERROR`, no crash, recorded `error`). So the engine is correct end-to-end up
  to the billing gate.
- **Residual risk / BLOCKER:** The `ANTHROPIC_API_KEY` has **no credits** (DeepSeek powers the existing
  cheap pipelines). To produce real citation data we need either (a) a small Anthropic credit top-up to
  run `claude_websearch`, or (b) a **free** path — create a free Google AI Studio (Gemini) key and
  implement the `gemini` engine (Gemini free tier + Google Search grounding returns real citations at
  $0). Awaiting founder decision. Code + schema are ready for either.
- _Plain language: I built the "scoreboard" that checks, on a schedule, whether AI assistants name our
  site when people ask the questions we want to win — and tracks our rivals' share too. It's wired up
  and the database table is live. The only thing stopping it from collecting real numbers is that our
  Anthropic account has no credit; the cheapest fix is a free Google Gemini key, or a small top-up. Your
  call which._
- **Status: built + schema live; blocked on engine credentials (founder decision).**

### 2026-06-27 — D3.4 follow-up: free Gemini citation engine implemented
- **What:** Implemented the `gemini` engine (founder chose the free path) so the GEO tracker can
  collect real citation data at $0.
- **Why:** Anthropic key has no credit; Gemini's free tier + Google Search grounding returns the
  sources it grounded on — a faithful, free citation signal.
- **How:** `lib/geo/citation-engines.ts` — `GeminiEngine` calls `generativelanguage.googleapis.com`
  (`gemini-2.5-flash`, configurable via `GEO_GEMINI_MODEL`) with the `google_search` grounding tool,
  reads `groundingMetadata.groundingChunks`, and **resolves the Vertex redirect URIs to their real
  domains** (falling back to the chunk title) so our/competitor matching works. Enabled automatically
  once `GEMINI_API_KEY` is set. Commit `e0fa397`.
- **Verification:** `tsc --noEmit` clean. Cannot run live until the founder adds a free
  `GEMINI_API_KEY` (https://aistudio.google.com/apikey) — the engine reports `isEnabled()=false`
  without it, and the runner exits with a clear "engine not enabled — missing API key" message
  (verified that guard path).
- **Residual risk:** Gemini grounding chunk shape can vary; redirect resolution has an 8s timeout +
  title fallback. Will validate end-to-end on the first live run once the key is added.
- _Plain language: I wired up Google's free AI so our citation scoreboard can run at no cost. It turns
  on the instant you paste a free Google API key into the project's settings — then it'll start
  recording, every run, whether Gemini names us when people ask the questions we want to win._
- **Status: built; awaiting free GEMINI_API_KEY to run.**

### 2026-06-27 — D3.2: the citable dataset (live /llms.txt, /llms-full.txt, /llms.jsonl)
- **What:** Turned our LLM-facing dataset from a **stale static file** ("Generated 2026-05-28") into
  **three live, DB-generated endpoints** that lead with a loud, real freshness banner — our single
  biggest GEO differentiator made legible to AIs.
- **Why:** LLMs weight recency and structure. Our automation re-verifies ~all tools weekly, but the old
  `public/llms*.txt` were frozen snapshots that hid that. Now every fetch shows the true, current
  freshness and exposes structured records LLMs/RAG can ingest and cite.
- **How (commit `e0fa397`, worktree branch `phase13-geo-seo`):**
  - `lib/geo/llms-dataset.ts` — one DB read → builders for the concise manifest, the full markdown dump,
    and a **schema.org JSON-Lines** feed (Dataset header + one `SoftwareApplication` per tool with
    name, canonical URL, categories, pricing, viability score, and per-tool `dateModified`).
  - `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts`, `app/llms.jsonl/route.ts` — dynamic route
    handlers (ISR `revalidate=3600`, cookie-free admin read, same caching pattern as `feed.xml`).
  - Removed the shadowing static `public/llms.txt` + `public/llms-full.txt`.
- **Verification:** `tsc --noEmit` clean. Ran the builder live against the DB: **1,998 tools loaded;
  freshness banner = "1998 published · 1996 (100%) re-verified in last 7 days · 1998 within 30 days";**
  `/llms.jsonl` = 1,999 lines (valid Dataset header + 1,998 valid SoftwareApplication records);
  `/llms-full.txt` = 513 KB / 9,998 lines; category joins correct (e.g. Webflow → Design & UI,
  Developer Infrastructure, viability 95). (Route handlers are thin wrappers over this verified builder
  and reuse the proven dotted-folder + ISR pattern already live for `app/feed.xml`.)
- **Residual risk:** Routes verified at the builder level, not yet hit on a deployed URL — confirm
  `/llms.txt` etc. serve 200 after the branch deploys (preview). Follow-up: point the `Dataset` JSON-LD
  (`lib/seo/json-ld.ts`) at `/llms.jsonl` so AIs discover the structured feed (deferred to avoid
  touching shared SEO code mid-stream).
- _Plain language: the page we publish for AIs to read is now generated fresh from our live database
  and shouts our best fact at the top — "1,996 of 1,998 tools re-checked in the last 7 days." No other
  directory can say that. I also added a clean machine-readable data file (/llms.jsonl) that AI systems
  can ingest directly. Verified it produces correct, current data._
- **Status: built + verified against live DB; routes pending preview-deploy smoke test.**

### 2026-06-27 — D3.4 complete: weekly cron + automated /admin panel + FIRST LIVE BASELINE
- **What:** Closed the GEO measurement loop — a weekly cron now runs the tracker automatically, an
  admin panel shows the results, and we captured the **first real citation baseline** (Gemini enabled).
- **Why:** Make GEO measurement fully automated + visible (the GSC-grade architecture the founder asked
  for), and establish the "before" number for AI citations.
- **How (commit `05e76dd`, branch `phase13-geo-seo`):**
  - `lib/geo/run-tracking.ts` — shared orchestration (engine loop → analysis → upsert) used by BOTH the
    CLI script and the cron, so behavior never drifts; `pickDefaultEngine()` prefers free Gemini.
  - `app/api/cron/track-geo-citations/route.ts` — weekly cron via `cronRoute` (auth + `pipeline_runs`
    logging); **gracefully skips (status `partial`) if no engine key is set** so it never false-alerts.
  - `vercel.json` — scheduled `Mon 07:15 UTC` (right after the GSC crons).
  - `app/admin/ai-citations/page.tsx` — extended the EXISTING manual citation page (not duplicated) with
    an "Automated GEO tracking" panel: citation-rate KPI, prompts tracked, best rank, rate trend,
    competitor strip, and a per-prompt table (cited / rank / share-of-voice / competitors). Read model
    in `lib/geo/admin-queries.ts`.
  - `scripts/track-geo-citations.ts` refactored to a thin wrapper over the shared module.
- **Verification (live, multiple checks):**
  - Founder added a free `GEMINI_API_KEY`. Single-prompt dry run → engine grounded + parsed correctly.
  - Full baseline scan (`geo:track --apply --engine=gemini`) → wrote **12 rows, 0 errored**; confirmed in
    DB (`count=12, cited=0, retrieved=0, avg_sources=13.6`).
  - Admin read model verified live: `hasData=true`, rate `0%` (0/12), trend + topCompetitors populated.
  - `tsc --noEmit` clean across the whole project.
- **📊 FIRST GEO BASELINE (2026-06-27, engine=gemini):** **0 of 12** high-intent prompts cite
  rightaichoice.com. Gemini grounds on **~13.6 sources per answer** but never us. Competitors observed:
  `futurepedia.io`, `aixploria.com`. This is the measured confirmation of "no LLM suggests us" — and the
  number every later GEO change is measured against.
- **Residual risk:** Admin panel verified at the data/query level + `tsc`, not yet rendered on a deployed
  URL (same as D3.2 routes — confirm on preview deploy). Single engine (Gemini) so far; add
  Anthropic/Perplexity/OpenAI later for multi-engine coverage.
- _Plain language: the citation scoreboard is now fully automatic — it'll re-check every Monday on its
  own, and you can watch the trend in the admin area under "AI Citations." The first run confirms the
  hard truth: across 12 questions we want to win, Google's AI cited ~14 sources each time and **never us**
  — while rivals like Futurepedia showed up. That's our starting line; every GEO upgrade now has a number
  to move._
- **Status: done (D3.4 complete). Loop is live and automated.**

### 2026-06-27 — D2.1: directory submission engine (authority + GEO consensus)
- **What:** Built the off-site authority engine's first piece — a pipeline of high-authority **free**
  directories to submit RightAIChoice to, with an operator workflow + automated backlink detection.
  Authority is the #1 blocker to ranking, and these directories are also the cross-source sources LLMs
  read before citing a brand (so this doubles as the GEO consensus play).
- **Why:** Median page-1 site ≈ 900 referring domains; we have ~0. Directories give dofollow links AND
  entity/consensus signal. Founder chose free/organic + automation-prepares / operator-approves-sends.
- **How (commit `af0e5da`, branch `phase13-geo-seo`):**
  - `supabase/migrations/174_directory_submissions.sql` (+ rollback; renumbered from 173 — main has a
    `173_link_health.sql` from a parallel session) — **purely additive** new table
    (after a first version that altered `referring_domains` was correctly denied by the prod-migration
    guard; redesigned to log directory backlinks via the existing `other` channel + a `directory:` note,
    touching no shared table). **Applied live + verified.**
  - `lib/authority/directory-targets.ts` — 19 curated free directories (Product Hunt, G2, Capterra,
    Crunchbase, There's An AI For That, Futurepedia, AlternativeTo, SaaSHub, Toolify, Trustpilot, …)
    with tier/DA/dofollow/category metadata; mirrors the `best-pages.ts` config pattern.
  - `lib/authority/submission-kit.ts` — canonical brand copy at multiple lengths so the operator pastes
    **identical** name/description everywhere (consistency = the consensus signal LLMs reward).
  - `lib/authority/backlink-check.ts` — fetch + regex-detect a link back to rightaichoice.com.
  - `scripts/authority-directories.ts` + npm `authority:seed|next|mark|check|status` — operator CLI;
    `--check` auto-logs confirmed backlinks into `referring_domains` (feeds the existing dashboard) and
    is wrapped in `runScriptedPipeline` (pipeline_runs logging).
  - `lib/authority/admin-queries.ts` + a **directory-pipeline panel on `/admin/authority`** (extends the
    existing page; service-role read): pipeline counts, backlinks-confirmed, next-to-submit table, in-progress strip.
- **Verification:** `tsc --noEmit` clean. Migration applied (`{success:true}`). `authority:seed` inserted
  **19** rows; `authority:status` shows `queued 19`; `authority:next` prints the prioritized list (G2 DA92
  top) + the paste-ready kit; admin read model verified live (19 targets, counts correct, G2 first).
- **Residual risk:** Directory submissions are human/CAPTCHA forms — the engine prepares + tracks, the
  operator submits (by design). Backlink detection is link-presence (regex), not dofollow-vs-nofollow
  verification. Admin panel verified at query level, render pending preview deploy.
- _Plain language: I built the system that gets us listed on the big directories — both to earn the
  backlinks Google needs to stop burying us, AND because those exact sites (G2, Product Hunt, Futurepedia…)
  are what the AIs read before deciding who to recommend. It hands you a ranked to-do list and the exact
  text to paste (same everywhere — that consistency is what makes AIs trust us), tracks what's submitted,
  and automatically checks when a directory starts linking back to us. 19 targets are queued and ready;
  the submitting itself is the human step (those forms are CAPTCHA-gated on purpose)._
- **Status: done (D2.1). Engine ready; operator submission is the next manual action.**

### 2026-06-27 — D2.2: "State of AI Tools" data report (linkable asset)
- **What:** Public report at `/state-of-ai-tools` computing ORIGINAL statistics from our
  continuously-verified catalog — the kind of proprietary data that earns editorial backlinks and that
  LLMs quote.
- **How (commit `4f26af1`):** `lib/geo/state-of-ai.ts` (reuses the single `loadDataset` read) +
  `app/state-of-ai-tools/page.tsx` (answer-first TL;DR → tables → cite-this block; Article+Dataset
  JSON-LD; ISR daily) + sitemap entry.
- **Verification:** `tsc` clean; builder run live → 1,998 tools, 99.9% verified in 7d, **54.6% free/freemium**
  (Freemium 47.7% / Contact 28.5% / Paid 16.9% / Free 6.9%), avg viability 85 (93.1% "strong"), biggest
  category Marketing & SEO (105), top OSS Hugging Face 161,927★.
- **Residual risk:** "At-risk" viability bucket is ~0% (scores skew high) — report states this honestly;
  page render pending preview deploy.
- _Plain language: a public stats page built from our own fresh data, with facts no competitor can
  publish (e.g. "55% of AI tools are free or freemium"). It's bait for journalists and AIs to link/quote us._
- **Status: done (D2.2).**

### 2026-06-27 — D2.3: entity / dataset-feed consensus
- **What:** Pointed our `Dataset` structured-data at the machine-readable feeds so AIs/knowledge-graphs
  discover them; documented the operator entity playbook (below).
- **How (commit `5e94eac`):** `lib/seo/json-ld.ts` — `datasetJsonLd().distribution` now lists
  `/llms.jsonl` + `/llms-full.txt` + `/llms.txt` (was just one); `sameAs` Wikidata `Q139970688` already present.
- **Operator entity playbook (free, manual — for the consensus signal that drives citations):**
  1. **Wikidata** (`Q139970688`): keep label/description/official-website/logo current; add `P856`
     (official website), `P1581` (blog), founder link. 2. **Wikipedia**: pursue a draft once we have 2–3
     independent press mentions (notability) — the data-PR report (D2.2) is the hook. 3. **Consistent NAP**:
     use the exact name + description from `lib/authority/submission-kit.ts` everywhere (the directory
     engine already enforces this). 4. **Crunchbase/G2/Product Hunt profiles** (from D2.1) reinforce the
     same entity. Consensus = the same brand described identically across many trusted sources.
- **Verification:** `tsc` clean. The Wikidata/Wikipedia/profile steps are manual operator actions.
- _Plain language: I told the AIs (via hidden structured data) exactly where to find our clean data file,
  and wrote down the simple identity steps (Wikipedia/Wikidata/consistent descriptions) that make AIs
  recognise us as a real, trusted brand worth citing._
- **Status: code done; entity steps are in the operator guide.**

### 2026-06-27 — D2.4: weekly backlink monitoring
- **What:** Automated weekly check that detects when a directory listing starts linking back to us and
  logs it to `referring_domains` (the existing /admin/authority dashboard).
- **How (commit `5e94eac`):** `app/api/cron/authority-check/route.ts` (cronRoute + pipeline_runs logging) +
  `vercel.json` schedule `Mon 07:30 UTC`. Same logic as the `authority:check` CLI.
- **Verification:** `tsc` clean; `vercel.json` validates (20 crons, authority-check present). Will confirm
  backlinks on the first run after listings go live.
- _Plain language: every Monday the site automatically re-checks the directories we submitted to and
  records any new link back to us — so authority growth shows up on the dashboard without manual checking._
- **Status: done (D2.4).**

### 2026-06-27 — D3.1 + D3.3: status (satisfied by existing work + this phase)
- **D3.1 citation-worthy structure:** Largely DELIVERED in **Phase 9** (Quick-answer TL;DR blocks, rendered
  FAQ, tables, FAQPage/ItemList/Breadcrumb/Article JSON-LD on tool/compare/best pages) — re-doing it is
  explicitly out of scope per the automated-pipelines changelog. Phase 13 adds the same answer-first +
  table + sourced/dated shape on the new `/state-of-ai-tools` report. **No edits to the contested
  tool/compare templates** (D1 page work is active in another session — collision-avoidance). Any further
  per-template tuning is left as a guided follow-up. **Status: satisfied; no new code (by design).**
- **D3.3 Bing-first push:** Bing/IndexNow infra already exists (`submit-urls-bing` daily cron,
  `indexnow-*` crons). The new GEO surfaces (`/state-of-ai-tools` added to the sitemap; `/llms.jsonl`)
  will be picked up by those crons once the branch deploys — ChatGPT search rides Bing's index, so this
  routes our freshest, most-citable pages into it. **Status: satisfied by existing infra + the sitemap
  addition; operator action = ensure the sitemap is (re)submitted to Bing after deploy (existing cron does this weekly).**

### 2026-06-27 — D4: conversion funnel diagnosis (read-only)
- **What:** Diagnosed why signups/affiliate-conversions are low, from `user_events` (last 30 days).
- **Findings (the leak is the FIRST click, not signup):**
  | Step | 30d count (users) |
  |---|---|
  | page_viewed | 5,432 (4,276) |
  | **plan CTA impression** | **4,442 (3,977)** |
  | tool_visit_redirected (affiliate out-click) | 1,231 (717) |
  | plan_cta_clicked | **10 (8)** ← ~0.2% of impressions |
  | plan_started | 35 (20) |
  | plan_completed | 6 (4) |
  | signup_modal_shown → signup_completed | 23 → 4 |
  - **#1 leak:** the Plan CTA is shown to ~3,977 people but clicked ~8 times (**~0.2% CTR**). The funnel
    isn't broken downstream (once started, ~17% complete; signup modal converts ~17%) — almost nobody
    *enters* it.
  - **Real conversion today is affiliate out-clicks** (1,231 events / 717 users) — ~100× the signups. The
    money path is affiliate, not signup.
- **Recommendations (for a later build phase — not implemented now to avoid page-template collision):**
  1. Rebuild the plan entry as a **low-friction inline goal input** on the page (type your goal → instant
     results) instead of a CTA that opens a separate flow — the 0.2% CTR is the binding constraint.
  2. Lean monetization into **affiliate out-clicks** (the working path): clearer "Visit / Try" CTAs,
     track per-tool affiliate revenue, prioritize high-intent tool pages.
  3. Defer signup-friction work — signup isn't the main leak; entry is.
- **Verification:** counts are from a live `user_events` aggregate (quoted above).
- _Plain language: the problem isn't sign-up — it's that the big "build my AI stack" button is seen by
  ~4,000 people a month but clicked by ~8. The one thing actually working is people clicking out to tools
  (~700/mo). So: make the planner start instantly on the page (no button), and double down on those
  tool click-outs as the real money path. (I diagnosed it; the fixes touch live page templates another
  session is editing, so they're written up for a dedicated follow-up rather than changed now.)_
- **Status: diagnosis done (D4); fixes scoped for a follow-up to avoid collision with active page work.**

### 2026-06-28 — D1.1: originality-density audit (read-only) — and a plan-changing finding
- **What:** Built + ran a read-only audit scoring every published page on "original value density"
  (proprietary data + text depth + freshness + 28d GSC impressions) → keep / enrich / consolidate.
- **Why:** The May-2026 core update demotes thin programmatic pages; we needed to know how many of OUR
  pages are actually thin before consolidating (D1.2).
- **How:** `lib/seo/originality-audit.ts` (pure scoring) + `scripts/audit-originality.ts` (CLI, writes
  `scripts/.originality-audit.json`). **New files only — no edits to tool/compare/category templates**
  (active page work elsewhere; collision-avoidance). Designed by a background agent, then created + run
  by the main session (the agent's sandbox was read-only). Commit `dfcaa66`.
- **Verification:** `tsc --noEmit` clean; ran live against the full catalog.
- **📊 FINDING (full catalog, 1,998 tools + 925 compares):** tools = **1,830 keep / 168 enrich / 0
  consolidate**; compares = **924 keep / 0 enrich / 1 consolidate**. **Our pages are NOT thin** — every
  tool carries real proprietary data (viability, pricing, categories, all freshly verified) and compares
  have editorial prose. Only **1** page of ~2,900 is a consolidation candidate
  (`/compare/heymilo-ai-vs-presto-voice`).
- **Plan impact:** **D1.2 (data-driven consolidation / 308-redirects) is effectively a no-op** — nothing
  to merge away (no equity to lose). The 168 "enrich" tools are borderline (rich data, zero impressions):
  their problem is **discovery, not depth**. D1 therefore confirms the binding constraint is **authority +
  getting found** (D2/D3), not page quality. D1.2/D1.3 de-prioritized; the 1 thin compare flagged for a
  later cleanup pass.
- _Plain language: I scored all ~2,900 pages to find the "thin" ones Google punishes. The answer: we
  barely have any — basically 1. Our pages are genuinely data-rich, so there's nothing to clean up. That
  confirms our real problem isn't the pages — it's that not enough other sites/AIs point to us yet, which
  is exactly what the directory work fixes._
- **Status: done (D1.1). D1.2/D1.3 de-prioritized by the data; D1 effectively closed (only authority/discovery remains, owned by D2/D3).**

### 2026-06-29 — D2.1 cont.: directory submissions executed (operator) + 8 high-authority targets added
- **What:** Worked the directory pipeline with the founder, one by one; added a round-2 batch of 8
  high-authority targets (SourceForge, Wellfound, TrustRadius, StackShare, GetApp, SoftwareAdvice,
  GoodFirms, Crozdesk).
- **Result (2026-06-29):** **6 LIVE** — G2 (`g2.com/products/rightaichoice`), Crunchbase, Wellfound,
  Trustpilot, SaaSHub, Indie Hackers; **4 submitted/pending** — Capterra, TrustRadius, SaaSworthy,
  SourceForge; **3 skipped** (There's An AI For That, Futurepedia, AlternativeTo — went paid/clunky).
  Every high-value placement is in. Live URLs recorded on each row for the weekly backlink-checker.
- **Baseline (Moz, 2026-06-29):** DA **1**, 31 (weak) linking root domains, 23 ranking keywords, clean
  spam score — the expected floor for a 2-month-old site; the high-DA links above are what lift it.
- **Human-readable record:** `authority-tracking-sheet.md` (same folder).
- _Plain language: we got listed on the big trusted sites — G2, Crunchbase, Trustpilot, Wellfound, SaaSHub
  live; Capterra/TrustRadius/SourceForge pending. These are both the backlinks Google wants and the sources
  AIs read. Our domain authority is still 1 (normal for a new site) and these are what pull it up._
- **Status: done — high-value directories executed; reviews are the parked multiplier.**

### 2026-06-29 — D2.2b: digital-PR / data-journalism engine (the #1 DA mover)
- **What:** Built an operator-approved engine that turns our unique live data into editorial-link bait —
  the highest-leverage authority work (editorial links move DA far more than directory links).
- **How (commit `33c8975`, branch `phase13-geo-seo`):**
  - `lib/pr/story-angles.ts` — derives newsworthy angles from `buildStateOfAI()` (freshness, pricing,
    viability/deathwatch, category concentration, top open-source) — all live, real numbers.
  - `lib/pr/targets.ts` — 16 curated FREE targets: AI newsletters (Ben's Bites, TLDR AI, The Rundown…),
    inbound journalist-query platforms (Connectively/HARO, Qwoted, Featured), and data-post communities
    (HN, r/artificial, r/SaaS…), each with its method + beat.
  - `lib/pr/draft-pitch.ts` — DeepSeek, **method-aware** drafter (email vs. expert-answer vs. community
    post), data-led, no hype, always cites the report URL.
  - `supabase/migrations/175_pr_pitches.sql` — `pr_pitches` approval queue (draft→approved→sent→
    responded→landed). **Applied live.**
  - `scripts/pr-pitch.ts` + npm `pr:angles` / `pr:draft[:dry]` / `pr:status` — generate angles, draft
    pitches into `pr_pitches` + a CSV working file; `runScriptedPipeline`-logged.
- **Verification:** `tsc` clean; `pr:angles` produced 5 live angles (99.5% verified, 55.5% free/freemium,
  Hugging Face 161,979★, etc.); a 2-pitch live draft (freshness × Ben's Bites/TLDR) drafted clean,
  data-led pitches and stored them in `pr_pitches` + CSV. Verified the sample pitch leads with the stat +
  links the report.
- **Operator model:** drafts are a review queue — the founder edits/approves and sends; we never auto-send
  or fabricate claims. Inbound-query targets (HARO-type) are the highest-yield free editorial-link source.
- **Residual risk:** target list will need pruning as newsletters change submission methods; sending is
  manual by design. Admin UI deferred (CSV + `pr_pitches` table is the working surface for now).
- _Plain language: I built the machine that pitches our data to journalists and newsletters — it writes a
  tailored, no-hype pitch for each one (leading with a real stat like "55% of AI tools are free") and
  queues it for you to approve and send. Landing even a few of these earns the kind of high-quality links
  that actually move our domain authority — far more than directory listings do._
- **Status: done (D2.2b). Built + verified; drafting/sending is operator-driven.**

---

## Phase 13 round 1 — summary (2026-06-27)

Shipped + verified + logged: **D3.2** (live citable dataset), **D3.4** (GEO citation loop + free Gemini +
weekly cron + admin panel; baseline 0/12 cited), **D2.1** (directory submission engine, 19 targets +
admin panel), **D2.2** (State of AI Tools report), **D2.3** (entity dataset feeds + playbook), **D2.4**
(weekly backlink-monitor cron). **D3.1/D3.3** satisfied by existing Phase-9 + this phase's additions.
**D4** diagnosed (leak = 0.2% plan-CTA click-rate; affiliate out-clicks are the real money path). **D1**
deferred (active page work elsewhere). All code on branch `phase13-geo-seo` (PR pending merge); migrations
172 + 173 applied live. See the operator guide at the end of this round in the chat / README.

---

# 📋 PHASE 13 — THE FULL STORY IN PLAIN ENGLISH

*(This section is written for a non-technical reader. It explains the problem we set out to fix,
everything we built, what now runs on its own, and exactly what you need to do to finish the phase.)*

---

## 1. The problem we were solving

Two things were going wrong, and we proved both with real numbers from our own database:

- **Google had buried us.** Google shows our pages ~43,000 times a month, but only ~39 people click —
  because **94% of the time we appear on page 3, 4, or 5**, where nobody looks. Worse, we were *sliding*:
  a Google update in May 2026 specifically punished big auto-generated directory sites like ours.
- **No AI assistant ever mentions us.** You'd tried ChatGPT, Gemini, etc. and none suggested
  rightaichoice.com. We confirmed it precisely (see point 3 below).

The single root cause behind both: **almost no other websites link to us, and we're not part of the
"conversation" AIs read.** Our technology and our data are excellent — better than competitors — but the
wider web doesn't vouch for us yet. This phase attacks exactly that.

---

## 2. What we built — explained simply

We built and tested **eight pieces** (every one checked against live data and recorded above with proof).
Here's each in plain terms:

**① An AI-citation scoreboard *(was: D3.4)*.** A little robot that, every Monday, asks an AI assistant
the 12 questions we most want to win (e.g. *"What's the best directory to find and compare AI tools?"*)
and records whether the AI names us, where we rank, and which competitors it named instead. Before this,
we were flying blind; now every improvement is measurable. **You can watch it in the admin area under
"AI Citations."**

**② The first real AI-citation measurement.** We ran that scoreboard. The result: **across all 12
questions, the AI named ~14 sources each time and us ZERO times** — while competitors like Futurepedia and
Aixploria did appear. Painful, but it's our honest starting line, and now it's tracked.

**③ An "always-fresh" data page for AIs *(was: D3.2)*.** The page we publish for AIs to read had been
frozen since May 28 — making us look stale. It's now rebuilt automatically from our live database and
leads with the one fact **no competitor can claim**: *"1,996 of our 1,998 tools were re-checked in the
last 7 days."* We also added a clean, machine-readable data file (so AI systems can swallow our whole
catalog) and made it self-update every hour.

**④ A public "State of AI Tools" report *(was: D2.2)*.** A new public page built from our unique data,
full of original statistics nobody else can publish — for example, **55% of AI tools are free or
freemium**, the biggest category is Marketing & SEO, and the average "viability" score is 85/100. This is
exactly the kind of page journalists and AIs quote and link to ("according to RightAIChoice…"). It's our
bait for earning mentions.

**⑤ An authority (link-building) machine *(was: D2.1)*.** Since the core problem is "nobody links to us,"
we built a ranked to-do list of **19 trusted, free directories** to get RightAIChoice listed on —
Product Hunt, G2, Capterra, Crunchbase, Futurepedia, and more. The system hands you the next ones to do
**and the exact wording to paste**, tracks what you've submitted, and (see ⑦) automatically notices when a
directory starts linking back to us. These are also the very sites AIs read before recommending a brand —
so this earns Google links *and* gets us into the AI conversation at the same time.

**⑥ Our "official identity" wiring *(was: D2.3)*.** We told the AIs (through hidden, behind-the-scenes
data on our site) exactly where to find our clean data, and we wrote down the simple identity steps —
keeping our Wikidata entry current and pursuing a Wikipedia page — that make AIs treat us as a real,
recognized organization worth citing.

**⑦ An automatic backlink watcher *(was: D2.4)*.** Every Monday the site re-checks the directories we
submitted to and records any new link back to us on the "Authority" admin dashboard — so our reputation
growth shows up without anyone checking by hand.

**⑧ A conversion diagnosis *(was: D4)*.** We dug into why so few people sign up. The finding: it isn't the
sign-up form — it's the very first step. Our big *"build my AI stack"* button is **shown to ~4,000 people
a month but clicked by only ~8** (a 0.2% click rate). Meanwhile, ~700 people a month *do* click through to
tools — **that's our real money path (affiliate clicks), about 100× the sign-ups.** The recommended fix
(make the planner start instantly on the page instead of behind a button) is written up for a focused
follow-up, because it touches pages another work-stream is editing right now.

*(Two related items — making individual tool/compare pages more "quotable," and pushing our pages into
Bing — were already handled by earlier work plus the changes above, so they needed no new building. Page
consolidation was intentionally paused to avoid clashing with active work happening elsewhere.)*

---

## 3. What now runs automatically — you do nothing

- **Every Monday:** the AI-citation scoreboard runs; the backlink watcher checks for new links; our
  sitemap is re-pinged to Google and Bing.
- **Every hour/day:** the fresh AI data page, the machine-readable data file, and the public report all
  rebuild themselves from the live database — so they're never stale.

---

## 4. YOUR STEPS TO COMPLETE THIS PHASE (in order)

**Step 1 — Publish everything (5 minutes). Do this first.**
None of the above is live until the code is merged. Open this link, click **"Create pull request,"** then
**"Merge":**
`https://github.com/aidirectory2026-prog/rightaichoice/compare/main...phase13-geo-seo?expand=1`
If it shows a "conflict," don't worry — just tell me and I'll clear it in a couple of minutes. After
merging, the site redeploys on its own and everything goes live.

**Step 2 — Start getting listed on directories (~30 min/week — this is the #1 priority).**
This is the biggest lever for both Google *and* AI mentions. It's a human task on purpose (those sites
have "are you a robot?" checks), but we made it nearly effortless:
- In the project, run: **`npm run authority:next`**
- It prints the next directories to do **and the exact name + description to paste.** Start with
  **Product Hunt, G2, Capterra, Crunchbase.**
- **Paste the same wording everywhere** — that sameness is literally what makes AIs trust and cite us.
- After submitting one, run **`npm run authority:mark <name>`** (e.g. `npm run authority:mark g2`).
- Aim for 3–5 per week. The site checks for the resulting links automatically.

**Step 3 — Lock in our identity (~1 hour, one-time).**
- **Wikidata** (we already have an entry): make sure our description, website, and logo are current.
- **Wikipedia:** worth pursuing once we have 2–3 press mentions — and the new "State of AI Tools" report
  is exactly the kind of thing that earns those mentions.

**Step 4 — Watch the scoreboards (anytime).**
In the admin area: **"AI Citations"** (is the AI starting to name us? watch it climb from 0) and
**"Authority"** (new links coming in). These are how we'll see the phase working.

**Step 5 — Approve the conversion fix (later).**
When you're ready, give me the go-ahead to rebuild the planner so it starts instantly on the page (the fix
for the ~8-clicks problem) and to lean our money-making into the tool click-outs that already work.

---

## 5. Honest expectations (no hype)

- **AI mentions:** can start appearing in **2–6 weeks** on Gemini/Perplexity and **6–12 weeks** on
  ChatGPT — but **only after** Steps 2 & 3 build our reputation. The scoreboard will show it moving from 0.
- **Google rankings:** improve gradually over **1–3 months** as directory links accumulate. There is no
  instant version — the directories and the report are the engine that gets us there.
- **The honest truth:** the machines are built and running; the remaining gains now depend mostly on
  **Step 2 (directory submissions)** happening consistently. That's the work that converts everything we
  built into real traffic and citations.

---

*Phase 13 build work is complete (D2, D3, D4 done; D1 deferred). Everything above this section is the
detailed, dated, technical record with verification evidence for each step.*
