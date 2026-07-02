# Plan — Phase 14: Tools 2k → 10k · Fable 5

> Authoritative, in-depth plan for scaling the catalog from ~2,060 to 10,000 published tools. Progress in `build-log.md` (same folder). CODE in worktree `../rac-catalog-10k` (branch `phase14-tools-10k`) → `main` via squash PR. DOCS in the main repo. New/changed automations also documented in `docs/automated-pipelines/` before they count as shipped.
>
> **Governing SOP:** Isolate → Implement → Verify → Re-verify → Upgrade → Log → Report → Commit. A step is "done" only when verified and logged in the build-log.

---

## 1. Objective & Definition of Done

Grow the catalog from 2,060 to **10,000 published tools** where every new tool is indistinguishable from an existing one in format, quality, and operations. The phase is complete only when ALL are true:

1. 10,000 tools published, every one having passed the unchanged 10-step onboard SOP (draft-until-green, all HARD gates).
2. Every new tool renders the identical tool-page template (all ~35 sections read from the same columns) and is automatically enrolled in every automation: lite refresh, deep 22-field SOP, latest-updates, viability, link-health, sentiment (per policy), comparisons, freshness cascade, sitemaps, IndexNow, Bing rotation.
3. The refresh fleet meets re-derived SLAs at 10k (tiered: daily top-150 / standard 3d lite–7d deep / longtail 7d lite–14d deep) with green SLA monitors.
4. All tool-related findings from the cowork audit (`RAC_Deep_Audit_Master_2026-07-02.md`) are fixed with SQL/live pass evidence logged: C1, C3, C4, C7, C9, F1, F7, F9, F10, F-AI, A1, A2, A4, A5, A6.
5. A billing watchdog + LLM kill switch protects the fleet from silent prepaid-balance freezes.
6. SEO wave protocol observed: publishes paced by `PUBLISH_DAILY_CAP`, GSC + quality-sample gates between waves, no unmitigated indexation regression.
7. Docs updated: `docs/automated-pipelines/README.md` inventory, `sop-freshness-contract.md` re-derived at 10k, this folder's build-log complete.

## 2. Locked decisions (founder-approved 2026-07-02)

| # | Decision |
|---|---|
| 1 | **Tiered intake.** Strict traction gate unchanged for the `trending` lane. New `long_tail` lane: real, live, AI-relevant, ANY verifiable footprint (GH ≥25★ / PH listing / G2-Capterra reviews ≥3 / any HN story / Reddit ≥1 thread). Zero footprint = reject. Trending + most-searched tools are top priority and publish first — nothing skips qualification or the content SOP. |
| 2 | **Start immediately, aggressive pace.** Honest math: first publishes day 8-12, 10k in ~5-9 weeks. |
| 3 | **Budget effectively uncapped, DeepSeek-first.** One-time ≈ $850-1,250 + $50-150 Apify; steady-state ≈ $500-600/mo. Billing watchdog ships before bulk spend (DeepSeek is prepaid; a zero balance froze the fleet 2026-05-23→06-27). |
| 4 | **Cowork bug report folded in** — all tool-related findings fixed by end of phase; write-path bugs fixed BEFORE bulk generation. |

## 3. Researched reality (baseline 2026-07-02, live SQL)

| Metric | Value |
|---|---|
| Published tools | 2,060 (83 drafts) |
| Intake rate | ~69 inserted / 30d from ~1,500 discovered (traction gate) — at this rate 10k ≈ years |
| Lite freshness (≤3d) | 2,019 / 2,060 (98%) |
| Deep freshness (≤10d) | 2,049 / 2,060 (99.5%) |
| F1 false-fresh (empty updates, stamped fresh) | 683 tools |
| Comparisons | 1,111 rows (~699 irrelevant pairs per audit) |
| AI spend (30d, pipeline_runs) | $38.01 (fleet was partially frozen by the DeepSeek 402 incident) |
| **Critical latent bug (verified)** | `lib/cron/dedup.ts:31` fetches existing tools unpaginated → Supabase 1,000-row cap → dedup blind to >half the catalog |
| Onboard SOP throughput | ~240/day theoretical (Vercel lanes, batch 5, 2×/hr) |
| Refresh fleet tuning | batch sizes/shards/SLA monitors all derived for ~2k tools |

## 4. Architecture

```
                        ┌─ SOURCING (Wave 1) ────────────────────────────────┐
 TAAFT/Toolify/Futurepedia/AlternativeTo (Apify)   PH archive   GitHub sweeps │
 G2/Capterra (Apify)   demand mining (mine-suggest/gsc/reddit/quora)          │
                        └───────────────┬────────────────────────────────────┘
                                        ▼
                 merge-candidate-pools.ts  (fuzzy dedup in-pool + vs DB)
                                        ▼
             TWO-LANE GATE (Wave 2): evaluateLane() → trending | long_tail | reject
                                        ▼
        bulk-import → DRAFT rows (is_published=false, NULL freshness ⇒ front of queues)
                                        ▼
   ONBOARD SOP ×6 GH shards (Wave 3): unchanged 10 steps, HARD gates, publish cap
                                        ▼
     SEO WAVES (Wave 5): PUBLISH_DAILY_CAP → GSC+quality gates → next wave
                                        ▼
        REFRESH FLEET at 10k (Wave 4): tiered SLAs, sharded, kill-switch aware
```

## 5. Data model (migration in PR-B)

- `tools.source_lane text NOT NULL DEFAULT 'trending'` — `'trending' | 'long_tail'`
- `tools.demand_score numeric` — search-demand priority (mined suggest/GSC frequency)
- `tools.intake_batch text` — provenance tag (`phase14-wave1` etc.)
- `tools.latest_updates_checked_at timestamptz` — F1 fix: "verified" vs "updated"
- `tools.refresh_tier` gains `'longtail'` value (standard/daily unchanged)

## 6. Workstreams

### Wave 0 — Pre-flight blockers (5 PRs; nothing bulk runs before A-D)
- **PR-A billing watchdog + kill switch (A1):** `scripts/billing-canary.ts` + cron; DeepSeek balance API + 1-token canaries; alerts <$75 warn / <$25 or 402/401 critical; `llm_paused` flag checked by every batch runner (exit `blocked`); top-up SOP doc.
- **PR-B dedup + schema (C9):** paginate dedup fetch; `merged_into` awareness; apex-domain + brand-token normalization; migration above; existing-catalog split dedup pass.
- **PR-C write-path guards (C3, C4, F1, A6, A4):** null sentinels + strip speculative model strings at write; truncate-then-validate + per-tool attempt cap; integrations into deep SOP; latest-updates only stamps `_at` on persisted items (always stamps `checked_at`); reset 683 false-fresh; targeted re-refresh of stale/speculative models.
- **PR-D pipeline honesty (A2):** `partial` status at >10% per-tool failure + failure-rate alarm.
- **PR-E render/runtime (C1, C4r, C7, F9, F10, F-AI, F7, A5):** price parse + priceCurrency; render sentinel filter; views 503; tool-state polling; ai-panel DeepSeek failover; comparison relevance gate + noindex junk + high-intent head-to-heads; clean `tool_candidates` path.

### Wave 1 — Sourcing (~15-20k raw → ~8k qualified)
Per-source runners under `scripts/source-candidates/` emitting extended seed JSON (`lane`, `demandScore`, `evidence`); `merge-candidate-pools.ts`; `scale-catalog.ts` direct draft-insert mode (SQL-migration mode kept as escape hatch); GH Actions enrichment dispatch 3 shards × concurrency 8 (~10k enrichments ≈ 3 nights).

### Wave 2 — Two-lane gate
`evaluateLane()` in `traction-probe.ts`; lane-aware `curate.ts` (long_tail: liveness+relevance hard, minCriteria 1); `ingest.ts` threads lane; onboard draft queue `ORDER BY (source_lane='trending') DESC, demand_score DESC NULLS LAST, created_at ASC`.

### Wave 3 — Onboard throughput 240 → 500-1,000/day
`.github/workflows/onboard-drafts.yml` 6 shards × 2 fires/day; shard flags on `run-onboard-sop.ts` (djb2 hash); in-process concurrency 3-4 + 429/503 backoff; `PUBLISH_DAILY_CAP` decouples SOP from publish pacing; Vercel fast lane → trending only, Vercel sop lane paused during bulk.

### Wave 4 — Refresh fleet at 10k
refresh-tools sharded ×3 + concurrency 4 (capacity 3,600/day); full-refresh 6 shards, tiered 7d/14d, cohort ~1,000; latest-updates 1,450/day conc 10; viability → GH 1,600/night; link-health 8 shards conc 24; sentiment top-500 + onboard seeding; cascade-hubs 1,500/run; cascade-editorials 100/day; SLA monitors re-derived; sitemap cached (split only if render >3s); wave URLs prioritized in Bing/IndexNow.

### Wave 5 — SEO publish waves
Pilot 20 tools end-to-end first. Then 500 → 1,000 → 1,500 → 2,000 → 2,000 → 1,000. Cap 150/day start, 300/day after two clean gates. Between waves (5-7d): GSC indexation ≥60% trend, 40-tool quality sample (fail >10% defective), no sitewide impression drop >15% WoW. Abort: two failed gates → cap 0, investigate, resume half-cap.

### Ops closure
Docs re-derivation; `data-audit` → nightly materialized snapshot; admin lane/batch filters + publish-budget tile; 90-day retention pruning on `pipeline_runs`/`ingestion_logs`; full cowork SQL re-verification logged.

## 7. Timeline (honest)

| Milestone | When |
|---|---|
| Wave-0 PRs merged | Day ~3 |
| Candidates sourced + deduped | Day 5-7 |
| ~8k qualified drafts enriched | Day 7-10 |
| First new publishes (trending/demand first) | Day 8-12 |
| All drafts through SOP | Day 20-26 |
| 10k published | Week 5-9 |

## 8. Risks

GH Actions concurrency ceiling (stagger crons); category dilution (reclassify sampling per wave); log-table growth (retention); PH GraphQL throttling; parallel sessions in this repo (own-paths-only staging per AGENTS.md); May-2026 core update sensitivity to programmatic directories (mitigated by full-SOP depth + wave gates).
