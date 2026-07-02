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

### 2026-07-02 — Sourcing round 1: 2,188 unique live candidates (Toolify + FutureTools)
**What:** Built the first Phase-14 candidate pool: Apify scrape of Toolify.ai (new + most_saved + most_used lists, 1,254 unique) and FutureTools.io (full 4,469-tool catalog), resolved to real vendor URLs, liveness-probed, deduped against the FULL catalog, ranked hottest-first. Output: `candidates/phase14/batch40_pilot.json` (18 after review) + `batch41_main.json` (2,145) on branch `phase14-tools-10k`.
**Why:** Founder priority — trending and most-used tools first; the past manual seed-batch process needs candidate JSONs in the exact `scale-catalog.ts` format.
**How:** Standalone prep scripts (`scripts/phase14/prep-seeds-*.ts`, `merge-pools.ts` in the worktree — zero automation code touched). Key mechanics: futuretools.link is a Short.io shortener redirecting via meta-refresh with affiliate params — parsed and stripped; Toolify URLs stripped of utm/aff params; dedup ran against a full paginated 2,143-row catalog export (the in-repo dedup only ever sees 1,000 rows — known parked bug); ~64% of FutureTools links were genuinely dead (link rot) and dropped; hygiene pass dropped 23 more cross-apex duplicates (cursor.sh→Cursor, Devin AI, HuggingFace-space demos) via a domain-label-vs-catalog-name check.
**Honest signal mapping:** `recentList` only for recency-sorted pulls (Toolify "new", FutureTools published ≤90d); traffic/upvotes/saves recorded as verbatim `userCountClaim` strings ("≈N monthly visits (Toolify/Similarweb estimate)", "N community upvotes on FutureTools.io").
**Dead source:** TAAFT is fully Cloudflare-walled on every page type (frontpage, task pages, search) — retired again, ~$0.02 wasted.
**Verification:** Pool counts logged per stage (raw → dedup → live → merged 2,188); Apify spend ≈ $8 total; batches committed (932c68c, 15f4db8).
**Residual risk:** 2,145 main-batch candidates yield roughly ~2k tools after gates — reaching 10k needs sourcing round 2 (PH archive, GitHub sweeps, G2/Capterra, demand mining) tracked as an open task.
_Plain language: we found ~2,200 real, live, not-already-listed AI tools, with the hottest ones ranked first. About two-thirds of one directory's links turned out to be dead tools — the probing we did means we only pay to enrich tools that actually exist._
**Status: done.**

### 2026-07-02 — Pilot batch 40: 17 tools enriched, gated, reviewed, inserted as drafts
**What:** Ran the top-20 hottest candidates through the unmodified `scale-catalog.ts` (DeepSeek enrich → category prediction → §41 curation gate ≥3/5) → operator review → migration `190_seed_tools_batch40.sql` → 17 tools inserted as DRAFTS.
**Why:** Prove the past manual pipeline end-to-end before any bulk run.
**How / review findings (this is why the review step exists):**
1. Gate worked: SpicyChat AI rejected (2/5 criteria) on both runs.
2. Review caught: a listing named "T" that was actually **notion.com** (redirect dupe our domain-dedup missed because catalog-Notion uses notion.so) — dropped; a gray-market **Claude API relay (claudeapi.com, CNY payment)** — dropped; 3 keyword-stuffed names cleaned ("Creen AI: Free AI Image, AI Video" → "Creen AI" etc).
3. **`scale-catalog.ts` hard-codes `is_published=true` (line 280) — it predates Phase 10's draft-until-green policy.** Flipped all 17 to `false` in the reviewed SQL (context-unique regex, verified 17/17). Flagged as a parked automation fix.
4. Insert path: the Supabase CLI isn't installed and the SQL file's 5-6KB lines can't move through tooling verbatim, so the reviewed SQL was parsed locally (`parse-migration-to-rows.py`, exact inverse of the generator's escaping) and inserted via supabase-js data-plane upserts with `ignoreDuplicates` (mirrors ON CONFLICT DO NOTHING); the inserter hard-refuses any row with `is_published=true`. Migration file committed for history/idempotent replay.
**Verification:** `parsed rows=17 category-links=20 published-flag-true=0`; insert result `17/17, conflicts 0, 20 links`; drafts in DB 83→100. Enrich cost ≈ $0.50 DeepSeek (two runs).
**Residual risk:** generated-then-flipped publish flag is manual toil per batch — acceptable at batch cadence; parked fix would set it at the generator.
_Plain language: 20 candidates went in, the machine's own quality gate cut one, human review cut two more (a duplicate of Notion in disguise and a shady API reseller) and fixed three ugly names. 17 clean tools are now sitting invisibly in the database waiting for the quality pipeline to finish their pages._
**Status: done.**
