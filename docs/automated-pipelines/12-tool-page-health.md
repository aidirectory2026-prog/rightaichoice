# Workflow 12: Tool-Page Health — Link-Health Sweep + Stack Audit (Phase 12 Bug-4)

> Part of the Phase 12 Bug-4 tool-page overhaul. Full per-fix narrative lives in
> `Phase 12 (user journey bugs)/build-log.md`; this file is the pipeline-level
> deep-dive for the two NEW automations it introduced and the self-healing
> data-correctness guarantees that ride the EXISTING refresh pipelines.

## Purpose

Keep every tool page **honest and link-clean on its own**, forever, for old and
newly-onboarded tools alike:

1. **No dead links.** A tool's "Resources & Guides" links (vendor docs, changelog,
   tutorials, community) rot over time — vendors move pages, deprecate guides,
   kill changelogs. A weekly sweep records the dead ones so the page hides them.
2. **No 404 stack picks.** Curated stacks reference tools by slug; some aren't in
   our catalog or were merged away. An audit + a render-time guard keep stack
   cards from linking to a 404.
3. **Correct, current tool facts.** Features (incl. modalities like voice),
   pricing, hidden costs, and integrations stay accurate because the synthesis
   prompts were hardened — and they run inside the existing onboarding SOP +
   nightly refresh, so the correction is automatic and permanent.

---

## Part A — Link-health sweep (the only NEW cron)

### Schedule
- **GitHub Actions** `freshness-batch.yml` → job `check-link-health`, weekly
  **Sunday 07:00 UTC**, **3-shard matrix** (`shard: [0,1,2]`), 90-min budget/shard.
- On demand: Actions → "Run workflow" → `check-link-health`, or locally
  `npm run links:check` (full) / `npm run links:check:dry` (report only).
- HTTP-only — **no DeepSeek / Apify** (zero AI cost).

### How it works — step by step
1. `scripts/check-link-health.ts` fetches every published tool via
   `fetchAllPages()` (so it does NOT truncate at PostgREST's 1,000-row cap — that
   bug shipped first and silently half-swept the catalog; now fixed).
2. Hash-partitions by slug into the requested shard (`--shard/--shards`).
3. For each tool, gathers external resource URLs: `docs_url`, `changelog_url`,
   `github_url`, `website_url`, `tutorial_urls[]`, `tutorial_links[].url`, and any
   `community_links.*url`.
4. Probes each URL **HEAD then GET** (follow redirects, 7s timeout, realistic
   User-Agent, concurrency 16).
5. **Conservative verdict** — a URL is `dead` ONLY on a clear **404/410** or a
   **DNS / connection failure** on BOTH HEAD and GET. `401/403/429`, timeouts,
   and `5xx` are treated as `unknown` and **kept** (they're usually bot-blocking
   or transient — we never hide a live link).
6. Writes `tools.dead_links` (the full current dead set for that tool) +
   `tools.links_checked_at`. **Self-healing both ways:** a link that revives
   drops out of `dead_links` on the next run.
7. Logs one `pipeline_runs` row (`pipeline_key=check-link-health`).

### Why sharded
A single unsharded sweep of the dead-link-heavy ~2,000-tool catalog logged
**~268 min** (many probes wait the full HTTP timeout), which would blow a single
job's limit and get killed — the same class of failure as the Phase 12 Bug-2
deep-refresh timeout. 3 shards × concurrency 16 → each ~25-40 min.

### How the page consumes it
`app/tools/[slug]/page.tsx` builds a `deadLinkSet` from `tool.dead_links` and:
- filters dead URLs out of the main **Resources & Guides** list,
- filters them out of the **sidebar Resources** (via a `deadSet` prop on `ResourceLink`),
- skips the whole section when nothing live remains.

### Database
- Migration **173** (`173_link_health.sql`): `tools.dead_links text[]` +
  `tools.links_checked_at timestamptz`.

### Key files
- `scripts/check-link-health.ts` — the probe + writer.
- `lib/data/_pagination.ts` `fetchAllPages()` — the no-truncation fetch.
- `app/tools/[slug]/page.tsx` — `deadLinkSet` filtering + `ResourceLink` guard.
- `.github/workflows/freshness-batch.yml` — the sharded weekly job.

### Not on the heartbeat (by design)
`check-link-health` is weekly, so the `pipeline-heartbeat` 28-30h thresholds
would false-alarm. A missed weekly sweep is non-critical (only delays dead-link
detection). Revisit if a weekly-aware monitor is added.

---

## Part B — Stack viability audit (on-demand, not a cron)

### Schedule
- On demand: `npm run stacks:audit` (`scripts/audit-stacks.ts`). Run after editing
  `lib/data/stacks.ts` or periodically.

### How it works
1. Collects every slug each curated stack references (bestPick + alternatives).
2. Resolves them against live DB health: `is_published`, `merged_into`,
   `viability_score`.
3. Flags a stack DELETE/FIX when its bestPick is missing/unpublished/merged, OR
   >30% of refs are unhealthy.

### Important nuance (why we don't auto-delete)
Most "unhealthy" refs are tools **not in our catalog** (real, live products like
Buffer / TurboTax / Yelp we simply don't list) — NOT non-viable tools. So the
audit is advisory; deleting on it would wrongly gut the feature. Instead the
**render-time guard** handles the user-facing problem:
- `lib/data/tools.ts` `getLiveToolSlugs(slugs)` returns the subset that are live
  + published + non-merged.
- `app/stacks/[slug]/page.tsx` passes that set to `StackStageCard`, which links
  only live picks and renders the rest as plain text (no 404). The `ItemList`
  JSON-LD cites only live URLs.

### Key files
- `scripts/audit-stacks.ts`, `lib/data/tools.ts` (`getLiveToolSlugs`),
  `components/stacks/stack-stage-card.tsx`, `app/stacks/[slug]/page.tsx`.

---

## Part C — Self-healing data correctness (NO new automation)

The Bug-4.3/4.4 fixes hardened the **synthesis prompts**, not the schedulers:
- **Features / modalities** (`backfill-tool-data.ts` + `lib/cron/refresh.ts`):
  prompts now demand exhaustive capability + modality coverage (voice, vision,
  image/audio/video gen, real-time, mobile, browser extension, API, offline) and
  mining of changelog/release-notes/news — fixing the "Claude has voice but the
  page didn't say so" class of bug.
- **Hidden costs**: plain-language, buyer-facing sentences instead of terse
  fragments.
- **Integrations**: documented-only, no guesses / generic categories / "coming
  soon"; `getIntegrationLinks` matches case-insensitively.

Because the **onboarding SOP** (`lib/cron/onboard.ts` step 1 → `runRefreshForSlugs`)
and the **nightly lite + deep refresh** both call these, every newly onboarded
tool AND every refresh inherits the corrected synthesis automatically. That is
the durability guarantee — no per-tool intervention, no new cron.

---

## What does NOT happen here
- We do NOT delete tools or stacks automatically (advisory only).
- We do NOT mark a link dead on 401/403/429/timeout/5xx (false-positive guard).
- We do NOT call any AI in the link or stack jobs (HTTP/DB only).
- The data-correctness fixes do NOT add a pipeline — they ride existing ones.

## Cost
- Link-health + stack audit: **$0 AI** (HTTP/DB only); negligible GH minutes.
- Data-correctness: no extra cost beyond the existing refresh/onboard DeepSeek
  spend (already tracked in `pipeline_runs`).
