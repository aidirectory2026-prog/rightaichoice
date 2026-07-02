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

### 2026-07-02 — Scope amendment: manual-first tool addition (founder directive)
**What:** Founder directed that NO automation is edited for the tool-addition step. Tools are added exactly as in the past: Apify-sourced seed batches (`candidates/*.json`) → existing `scripts/scale-catalog.ts` unmodified (DeepSeek enrich + category prediction + curation gate ≥3/5) → reviewable SQL migration → `supabase db push` → tools land as drafts → the existing, unmodified onboard SOP crons publish them gate-by-gate.
**Why:** Founder preference: keep the proven manual pipeline; zero risk of destabilizing running automations mid-scale.
**How:** Plan Waves 0-4 (automation edits: billing watchdog, dedup hardening, write-path guards, two-lane gate, throughput scaling) are PARKED, not cancelled — revisit when founder green-lights. Candidate prep (sourcing + pre-dedup) happens in standalone new scripts/files that do not touch any existing automation code.
**Consequences accepted (stated honestly):**
1. Publish pace is bounded by the existing draft lane (~240/day theoretical; real-world lower) plus manual local `run-onboard-sop.ts` runs — 8k tools ≈ 5-8 weeks of onboarding after drafts land.
2. The known dedup blind spot (`lib/cron/dedup.ts` 1,000-row cap) is mitigated OUTSIDE automations: seed batches are pre-deduped against a full paginated catalog pull before scale-catalog runs; SQL inserts remain `ON CONFLICT (slug) DO NOTHING`.
3. Cowork write-path defects (sentinels, speculative model strings) remain in the enrichment path, so some new tools will carry them until those fixes are un-parked; they are self-healing later via re-refresh once fixed.
**Verification:** Task list re-scoped (tasks 2-6, 8-10 parked; 7, 13, 14 active); shared-tree git state restored after an autostash conflict (other session's newer file version kept from origin/main; nothing lost).
_Plain language: we're adding the tools the hand-crafted way that built the first 2,000 — no machinery changes. It's slower but zero-risk to running systems. The automation upgrades stay on the shelf, ready when you want them._
**Status: done.**
