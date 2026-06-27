# Workflow 11: GEO Citation Tracking + Authority/Directory Engine (Phase 13)

> Phase 13 (2026-06-27). Two new automations + their operator scripts + self-refreshing data surfaces.
> Phase plan/build log: `docs/Phase 13 (GEO AND SEO upgrades)/`. This doc is the playbook deep-dive.

## Purpose

Two jobs, one goal — stop being invisible to Google **and** to AI assistants:

1. **GEO citation tracking** — measure whether AI assistants (ChatGPT/Gemini/Perplexity/Claude) cite
   rightaichoice.com for our target queries, the way `snapshot-gsc` measures Google rankings. "Being
   cited is the new being ranked." Baseline (2026-06-27, Gemini): **0/12 prompts cited us.**
2. **Authority / directory engine** — drive RightAIChoice onto high-authority free directories (the #1
   lever for off-site authority **and** the cross-source "consensus" AIs read before citing a brand),
   and auto-detect the backlinks earned.

---

## Part A — GEO citation tracking

### Schedule
- **Cron:** `/api/cron/track-geo-citations` — `15 7 * * 1` (Mondays 07:15 UTC), `maxDuration` 300s.
- **Manual:** `npm run geo:track:dry` (no write) / `npm run geo:track` (`--apply`). Flags: `--engine=`,
  `--prompt=`, `--limit=`, `--date=`, `--concurrency=`.

### How It Works — step by step
1. **Pick engine** (`lib/geo/run-tracking.ts` → `pickDefaultEngine()`): first enabled of
   `gemini` (free; needs `GEMINI_API_KEY`) → `claude_websearch` (needs funded `ANTHROPIC_API_KEY`).
   `perplexity`/`openai` are scaffolded (disabled until their keys exist). If none enabled, the cron
   records `partial` and returns — **no failure alert** before a key is configured.
2. **For each target prompt** (`lib/geo/target-prompts.ts`, 12 curated high-intent prompts), the engine
   (`lib/geo/citation-engines.ts`) asks a web-searching AI and returns the URLs it **cited** + **retrieved**.
   - Gemini engine: `generativelanguage.googleapis.com` (`gemini-2.5-flash`) with the `google_search`
     grounding tool; grounding-chunk URIs are Vertex redirects → resolved to real domains (title fallback).
3. **Analyze** (`lib/geo/track-citations.ts`, pure/deterministic): is rightaichoice.com cited? rank among
   cited domains? which tracked competitors (`lib/geo/competitors.ts`) appeared? share-of-voice?
4. **Upsert** one row per `(snapshot_date, engine, prompt_id)` into `geo_citation_snapshots`.
5. **Surface** at `/admin/ai-citations` (automated panel: rate, per-prompt status, rank, SoV, competitor
   strip, trend) — `lib/geo/admin-queries.ts`.

### Data Flow
```
target-prompts ──► engine (Gemini google_search) ──► cited/retrieved URLs
                                                          │
                                          analyzeCitations (ours? rank? competitors? SoV)
                                                          │
                                         upsert geo_citation_snapshots ──► /admin/ai-citations
```

### Database tables
- **`geo_citation_snapshots`** (migration 172, RLS service-role only): `snapshot_date, engine, model,
  prompt_id, prompt, prompt_category, cited, retrieved, citation_rank, our_urls(jsonb),
  competitors(jsonb), all_sources(jsonb), share_of_voice, answer_excerpt, error`. Unique on
  `(snapshot_date, engine, prompt_id)`.

### Key files
| File | Purpose |
|------|---------|
| `app/api/cron/track-geo-citations/route.ts` | Weekly cron (cronRoute + pipeline_runs) |
| `scripts/track-geo-citations.ts` | Manual CLI (thin wrapper) |
| `lib/geo/run-tracking.ts` | Shared orchestration (cron + script) |
| `lib/geo/citation-engines.ts` | Pluggable engines (gemini live; others scaffolded) |
| `lib/geo/track-citations.ts` | Pure citation analysis |
| `lib/geo/target-prompts.ts` · `competitors.ts` | Config: prompts + tracked competitor domains |
| `lib/geo/admin-queries.ts` | `/admin/ai-citations` read model |

### To add an engine later
Set its key (`PERPLEXITY_API_KEY` / `OPENAI_API_KEY`) and implement its adapter in
`citation-engines.ts` (replace the `DisabledEngine`). Multi-engine coverage matters because each AI cites
differently. `pipeline_key` is `geo-track-citations:<engine>`.

---

## Part B — Authority / directory engine

### Schedule
- **Cron:** `/api/cron/authority-check` — `30 7 * * 1` (Mondays 07:30 UTC). Backlink detection only.
- **Operator (on-demand):** `authority:seed` (load the 19 targets), `authority:next` (next-to-submit +
  paste-ready kit), `authority:mark <key>` (record a submission), `authority:check` (detect backlinks),
  `authority:status` (pipeline counts).

### How It Works
1. **Seed** (`authority:seed`): inserts `lib/authority/directory-targets.ts` (19 free high-authority
   directories: Product Hunt, G2, Capterra, Crunchbase, Futurepedia, …) into `directory_submissions`
   (idempotent; never clobbers operator-set status).
2. **Submit (HUMAN step)**: `authority:next` prints the prioritized queue + the **paste-ready submission
   kit** (`lib/authority/submission-kit.ts` — identical name/description everywhere = the consensus
   signal). The operator fills the CAPTCHA-gated forms (bot submission would violate ToS), then
   `authority:mark <key> --status=submitted --live-url=…`.
3. **Backlink check** (`authority:check` **and** the weekly cron): for each `submitted`/`live` row with a
   `live_url`, fetch it (`lib/authority/backlink-check.ts`, regex href scan), set `backlink_detected`, and
   on a hit upsert `referring_domains` (channel `other`, note `directory:<key>`) → feeds `/admin/authority`.

### Data Flow
```
directory-targets ──seed──► directory_submissions
                                  │ operator submits (human) → mark
                                  ▼
                       authority-check (weekly) ─ detectBacklink(live_url)
                                  │ hit
                                  ▼
                       referring_domains ──► /admin/authority
```

### Database tables
- **`directory_submissions`** (migration 174, RLS service-role only): `directory_key, directory_name,
  directory_url, submit_url, authority_tier, da_estimate, pricing, dofollow, category, status
  (queued|submitted|live|rejected|skipped), submitted_at, live_url, backlink_detected, last_checked_at`.
- **`referring_domains`** (migration 084, existing) — write target for confirmed backlinks.

### Key files
| File | Purpose |
|------|---------|
| `app/api/cron/authority-check/route.ts` | Weekly backlink monitor |
| `scripts/authority-directories.ts` | Operator CLI (seed/next/mark/check/status) |
| `lib/authority/directory-targets.ts` | The 19 curated targets |
| `lib/authority/submission-kit.ts` | Canonical paste-ready listing copy (brand consistency) |
| `lib/authority/backlink-check.ts` | Link-back detection |
| `lib/authority/admin-queries.ts` | `/admin/authority` directory-pipeline panel read model |

---

## Self-refreshing data surfaces (ISR routes — automated, but not crons)

`/llms.txt`, `/llms-full.txt`, `/llms.jsonl`, `/state-of-ai-tools` regenerate from the live DB on a Next
`revalidate` (hourly/daily) — replacing the static `public/llms*.txt` that was frozen at 2026-05-28.
Builder: `lib/geo/llms-dataset.ts` (+ `lib/geo/state-of-ai.ts`). They lead with a live freshness banner
("N tools, M verified in last 7 days") — the core GEO differentiator.

## What does NOT happen here
- **No human/bot form submission** — directory submission is deliberately operator-driven (ToS + CAPTCHA).
- **No conversion-funnel automation** — Phase 13 D4 was a read-only *diagnosis* only; no funnel pipeline
  shipped, so none is registered as an automation.
- **No edits to tool/compare page templates** — deferred to avoid colliding with active page work.
