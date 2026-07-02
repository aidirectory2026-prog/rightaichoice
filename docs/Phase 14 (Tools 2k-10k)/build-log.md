# Build Log — Phase 14: Tools 2k → 10k · Fable 5

> One dated entry per completed step. Format: **What / Why / How / Verification / Residual risk** + a plain-language note. A step is "done" only after it's verified and logged here. Plan: `Plan_phase-14-tools-10k.md` (same folder). Code: worktree `../rac-catalog-10k`, branch `phase14-tools-10k`, squash PRs to `main`.

## Baseline snapshot (2026-07-02, before any build — live SQL on prod)

| Metric | Baseline | Target at phase end |
|---|---|---|
| Published tools | **2,060** | 10,000 |
| Draft tools | 83 | ~0 backlog (queue drained) |
| Intake rate (30d) | ~69 inserted / ~1,500 discovered | 500-800 SOP-published/day capacity |
| Lite freshness ≤3d | 2,019 / 2,060 (98%) | ≥95% within tiered SLA at 10k |
| Deep freshness ≤10d | 2,049 / 2,060 (99.5%) | ≥95% within tiered SLA at 10k |
| F1 false-fresh tools (empty `latest_updates`, stamped fresh) | **683** | 0 |
| `tool_comparisons` rows | 1,111 (~699 irrelevant per audit) | irrelevant pairs noindexed; high-intent head-to-heads live |
| AI spend, 30d (`pipeline_runs`) | $38.01 (fleet partially frozen by DeepSeek 402 incident) | ≈$500-600/mo steady-state at 10k, watchdog-protected |
| refresh_tier='daily' | 150 | 150 (unchanged) |
| Onboard throughput | ~240/day theoretical (Vercel lanes) | 500-1,000/day (6 GH shards) |
| Dedup coverage | **BUG: unpaginated fetch, sees ≤1,000 of 2,143 rows** | full-catalog + fuzzy + merged_into |
| Cowork audit tool findings open | C1, C3, C4, C7, C9, F1, F7, F9, F10, F-AI, A1, A2, A4, A5, A6 | all closed w/ SQL evidence |

_Plain language: before we add a single tool, we snapshot today's numbers so every improvement (and every regression) is provable. The two scariest baseline facts: our duplicate-checker has been silently blind to half the catalog, and 683 tools claim to be "recently updated" with nothing behind it._

---

## Progress entries

### 2026-07-02 — Step 0: Phase scaffolding
**What:** Created `docs/Phase 14 (Tools 2k-10k)/` with the authoritative plan (`Plan_phase-14-tools-10k.md`) and this build-log; created code worktree `../rac-catalog-10k` on branch `phase14-tools-10k` (from `origin/main` @ 4fb77dd).
**Why:** House convention — docs in main repo, large stream in dedicated worktree so parallel sessions never collide on `main`.
**How:** Deep research pass (3 exploration agents over tool pages / automations / SOPs), founder decisions locked via Q&A, plan reviewed against live code (`dedup.ts` 1,000-row bug verified by reading the file; onboard queue ordering verified `created_at ASC`; scale-catalog seed schema verified), baseline pulled via live SQL.
**Verification:** Both files exist; `git worktree list` shows `rac-catalog-10k` on `phase14-tools-10k`; baseline table above populated from prod SQL (2,060 published).
**Residual risk:** Multiple parallel Phase-14-named streams exist (Admin Filters, Tool submission, 14b) — folder name includes "(Tools 2k-10k)" to disambiguate; staging discipline is own-paths-only.
_Plain language: the workspace, the plan, and the measuring stick are in place. Next: the five "stop the bleeding" fixes that must land before we mass-produce 8,000 new tool pages._
**Status: done.**
