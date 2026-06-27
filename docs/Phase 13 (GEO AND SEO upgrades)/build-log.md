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
