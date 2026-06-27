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
