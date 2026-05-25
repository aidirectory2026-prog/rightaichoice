# Catalog — Decisions queue for next sit-down

> Per your rule: discuss before document. This file is the **agenda**, not the answers.
> Each skill below has the 2–5 questions that block writing its SPEC.
> Read top-to-bottom; when you have answers, we lock them and I write the SPEC.

---

## 1.2 — refresh-tools (existing, tune cadence)

**Status:** code exists at `lib/cron/refresh.ts` + `app/api/cron/refresh-tools/route.ts` + `scripts/refresh-tools-batch.ts`. Currently runs nightly via GH Actions (`0 2 * * *`) refreshing 200 stalest tools.

**Decisions:**

1. **Daily batch size.** 200/day = full catalog (~2,400 tools) refreshed every 12 days. Bump to 300? 400? Stay at 200? More = more DeepSeek cost ($0.002/tool), less staleness.
2. **Per-tool refresh interval target.** 12d (current) / 7d (aggressive) / 21d (cheap). Drives §1 above.
3. **Vendor scrape failures.** Today we have ~10% scrape failure rate (vendor blocks). When scrape fails, we let DeepSeek synthesize from prior knowledge. Keep this, or skip + log instead?
4. **Lite refresh vs full refresh ratio.** Today: 9-field lite via cron, 22-field full via manual Phase 4 SOP. Should we auto-trigger full refresh on a slower cadence (e.g., 1× per quarter per tool)?
5. **Priority queue override.** Should the trending-now tools (top 50 by 7d view_count) get refreshed daily regardless of staleness order?

---

## 1.3 — ingest-tools (existing, stable)

**Status:** code exists. Runs `0 */6 * * *` (4× daily). Ingests 50 trending new tools per fire via traction-gated curate prompt.

**Decisions:**

1. **Daily ingest cap.** 4×50=200/day theoretical max. Are we hitting it? Should we cap lower to keep editorial quality?
2. **Auto-publish vs candidate queue.** Today ingested tools land in `candidates/` for manual review. Lock this, or auto-publish high-confidence ones (e.g., when score >0.9)?
3. **Source mix.** Currently pulls from ProductHunt + GitHub trending + curated lists. Add Reddit r/SideProject? HackerNews launches? AI newsletter mentions?
4. **Dedup with existing catalog.** Today the curate gate checks name+website overlap. Should we also check feature-vector similarity (e.g., "this is just another Cursor clone")?

---

## 1.4 — auto-promote-candidates (NEW)

**Status:** not built.

**Decisions:**

1. **Promotion criteria.** Auto-promote a candidate to published when: (a) GitHub stars >500? (b) ProductHunt votes >100? (c) Mentioned in N blog posts? (d) X mentions >50? Pick the gate.
2. **Cadence.** Every 4h (matches ingest), or daily roll-up?
3. **Manager review.** Auto-promote skips manual review, OR auto-flag candidate as "promotion-eligible" and let manager click-through to confirm?
4. **Rollback path.** If we auto-promote and the tool turns out to be spam/dead, do we soft-delete or unpublish? What's the un-promote trigger?

---

## 1.5 — cascade-comparisons (existing, rename + tune)

**Status:** code exists for compare editorial regeneration. Currently scheduled `0 5 * * *` daily via `freshness-batch.yml`.

**Decisions:**

1. **Rename to what?** Current name "cascade-comparisons" overlaps with the new `1.1 freshness-cascade`. Suggestions: `regenerate-stale-compares`, `compare-editorial-refresh`, `keep-compares-fresh`. Pick one.
2. **Staleness definition.** A compare is "stale" when either of its 2 tools updated >14d ago, OR the compare editorial is >30d old. Adjust thresholds?
3. **Volume per fire.** Today regenerates N stalest. What's the right N? More = more LLM cost.
4. **Auto-publish vs manager-review.** Today these auto-publish (existing behavior). Lock that?

---

## 1.6 — cascade-hubs (NEW)

**Status:** **mostly already specced as part of 1.1 freshness-cascade §3 source C.** Worth a standalone SPEC only if you want different cadence/auth for the hubs cron vs the main cascade.

**Decision:**

1. Keep this as one job inside 1.1, or split into its own automation? Recommend: **fold into 1.1** — the cron is the cron, no value in artificial separation.

---

## 1.7 — auto-dedup-candidates (NEW)

**Status:** not built. Goal: when ingest produces a candidate that's a near-duplicate of an existing published tool, auto-merge or auto-reject.

**Decisions:**

1. **Dedup signal.** Domain match (strongest), name fuzzy match, feature-vector cosine similarity. Combine which?
2. **Action when duplicate found.** Auto-reject + log, OR auto-merge new metadata into existing tool's `submitted_by` history?
3. **Cadence.** `*/10 * * * *` (pg_cron) so candidates clear before manager sees them, OR run only after ingest finishes?
4. **Manager visibility.** Need a `/admin/dedup-log` page to spot-check the auto-decisions?

---

## 1.8 — producthunt-listener (NEW)

**Status:** not built. Goal: webhook/poll PH so new launches enter our candidate queue within an hour of going live (vs 6h via ingest cron).

**Decisions:**

1. **Mechanism.** PH has no official webhook; need to poll their GraphQL API. Poll hourly via Cloudflare Worker, or every 15min?
2. **Filter.** Only PH posts tagged "AI"? "AI" OR "Productivity"? Vote threshold (>20 upvotes within first hour)?
3. **Where it lands.** Direct into `candidates` table (current ingest flow), or new `producthunt_queue` with separate triage?
4. **Storage.** Cloudflare Worker → POST to Supabase Edge Function → write candidate. Or worker writes directly to Supabase? (Auth/RLS considerations.)

---

## 1.9 — sentiment-discovery (PARKED)

**Status:** parked discussion notes at `1.9-sentiment-discovery/_NOTES.md`. 7 open questions captured there. Pick up after 1.1–1.8 are specced.

---

## Cross-cutting question

**Build vs spec order.** I've been writing strawman SPECs after we discuss. Do you want me to:
- (a) Spec 1.2 → discuss → lock → spec 1.3 → discuss → lock → … (current pace)
- (b) Spec all of 1.2–1.8 as strawmen in one pass, then we review the batch together (faster, but more rework risk)
- (c) Skip specs, jump to building 1.1 first, write specs lazily as we touch each

Pick a lane before our next session.
