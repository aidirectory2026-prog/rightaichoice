# 1.3 — ingest-tools (new tool discovery + auto-publish)

> **Status:** EXISTING (extend — add sources + auto-publish gate)
> **Type:** Cron + multi-source fetchers + LLM curate gate + soft-launch
> **Runtime:** GitHub Actions
> **Schedule:** `0 4 * * *` (currently — may be split per source)
> **Decisions locked:** 2026-05-25 conversation

---

## 1. Purpose

Discover net-new AI tools across the public web, gate them against quality/spam filters, and either auto-publish (high confidence) or queue for manager review (medium confidence). The catalog growth engine.

**Why upgraded:**
Today: ProductHunt + GitHub trending + curated lists → all candidates → manual review. Slow + narrow.

After: 5 sources (LinkedIn skipped — see locked decisions) → confidence-scored → auto-publish ≥0.85 with 24h soft-launch + reject button, queue <0.85.

---

## 2. Locked decisions (2026-05-25)

| # | Decision |
|---|---|
| Q1 | **50 per fire, 4 fires/day = 200/day max** (current cap kept) |
| Q2 | **Auto-publish when confidence >0.85.** Below threshold → `candidates/` queue for manual review |
| Q3 | **All sources except LinkedIn.** New: HackerNews "Show HN" + Reddit (r/SideProject, r/SaaS) + Twitter/X (curated accounts) + AI newsletter archives (Ben's Bites, TLDR AI). LinkedIn deferred — paid data provider out of scope for now |
| Q4 | **Dedup safety:** auto-reject if name+website fuzzy-matches an existing published tool (current behavior kept) |
| Flag 1 | **LinkedIn skipped entirely** — re-evaluate when paid data provider budget approved |
| Flag 2 | **24h soft-launch.** Auto-published tools get an admin banner "Auto-published <date> — reject?" with one-click unpublish. After 24h with no manager action → permanent |

---

## 3. Trigger / runtime

- **Trigger:** GitHub Actions cron — `0 4 * * *` (existing single fire). May split to staggered fires per source for source-level rate-limit isolation.
- **Manual:** `workflow_dispatch` with `pipeline: ingest-tools-batch`
- **Entry:** `scripts/ingest-tools-batch.ts` → `lib/cron/ingest.ts` (new) → individual source fetchers in `lib/ingest/sources/`
- **Wall-clock budget:** ~60 min per fire (existing budget; LLM curate dominates)
- **Cost:** ~$0.50/day total (LLM gate per candidate + light scrape)

---

## 4. Inputs — source fetchers

Each source is a TS module in `lib/ingest/sources/`. All return `RawCandidate[]` with normalized shape `{ name, url, description, source, source_meta, raw_score }`.

| # | Source | Fetcher | Cadence | Auth | Notes |
|---|---|---|---|---|---|
| 1 | **ProductHunt** (existing) | GraphQL API | daily | API token | Last 24h `topics: ["artificial-intelligence"]` |
| 2 | **GitHub trending** (existing) | scrape `github.com/trending` | daily | none | Topics: `ai`, `llm`, `agent`; filter by stars Δ |
| 3 | **Curated AI lists** (existing) | hardcoded RSS/JSON sources | daily | none | `awesome-*` repos, There's An AI For That feed |
| 4 | **HackerNews** (NEW) | Algolia HN API `search_by_date` | daily | none | Query: `"Show HN" AND (AI OR LLM OR GPT)`; filter ≥10 points |
| 5 | **Reddit** (NEW) | Reddit JSON API (e.g., `/r/SideProject/top.json?t=week`) | daily | none (rate-limited) | Subs: `SideProject`, `SaaS`, `artificial`, `ChatGPT`; ≥30 upvotes |
| 6 | **Twitter/X** (NEW) | Curated account scrape | daily | none (RSS via nitter-style proxy) OR X API basic tier | Accounts: `@itsPaulAi`, `@leeerob`, `@aibreakfast`, etc. (configurable list); look for URL + "launching"/"introducing"/"new tool" |
| 7 | **AI newsletter archives** (NEW) | scrape web archives | weekly | none | Ben's Bites (`bensbites.beehiiv.com/archive`), TLDR AI (`tldr.tech/ai`); parse "new tools" sections |
| 8 | ~~LinkedIn~~ | **DEFERRED** | — | — | Phase 2 when paid data budget exists |

**Fetcher failure handling:** If a source fetcher fails (API down, scrape blocked), log + skip that source for this run. Other sources continue. Never block the whole pipeline on one source.

---

## 5. Inputs — curate gate (existing, extended)

For each `RawCandidate`:

1. **Dedup check (locked Q4).** SQL `WHERE LOWER(website_url) = LOWER(candidate.url) OR levenshtein(name, candidate.name) < 3` → if match, auto-reject + log.
2. **Spam filter (existing).** Anthropic Claude classifies: real tool / placeholder / academic paper / vendor self-spam.
3. **Confidence scorer (NEW formula).** Weighted 0-1 score:

   | Signal | Weight | Source |
   |---|---|---|
   | Website returns 200 + has substantive content | 0.20 | scrape |
   | Has unique value prop (not generic clone) | 0.20 | LLM judgment |
   | Multi-source mention (in ≥2 of our sources) | 0.20 | source aggregation |
   | GitHub stars (if applicable): >100 → +0.10; >1k → +0.15 | 0.15 | API |
   | Pricing page exists | 0.10 | scrape |
   | Tool has been live >30 days (vs day-old launch) | 0.10 | domain age / first-seen |
   | Falls in a category we cover well | 0.05 | category lookup |
   |  **Total** | **1.00** |  |

4. **Decision (locked Q2):**
   - `score ≥ 0.85` → auto-publish + soft-launch flag (24h reject window)
   - `0.50 ≤ score < 0.85` → enqueue to `candidates/` for manual review
   - `score < 0.50` → reject + log (with reason)

---

## 6. Outputs

### Auto-published tool (locked Flag 2)

Standard `INSERT INTO tools` with:
- `is_published = true`
- `auto_published = true` (NEW column)
- `auto_published_at = NOW()` (NEW column)
- `auto_publish_confidence = 0.87` (NEW column — store the score)
- `ingest_sources = ['producthunt', 'hackernews']` (NEW column — array of sources that found it)

Fires the **1.1 freshness-cascade** trigger → sitemap + IndexNow notified within 1h.

### Soft-launch admin banner

`/admin/tools/[id]` page (and `/admin/updates` "Auto-publish review" section): renders if `auto_published = true AND auto_published_at >= NOW() - INTERVAL '24 hours'`:

> **⚡ Auto-published <relative time> ago** (confidence: 0.87 from `producthunt + hackernews`)
> [✗ Reject + unpublish]  [✓ Keep — review complete]

If the **Reject** button is clicked: `UPDATE tools SET is_published = false, reject_reason = <textarea>` + entry in `auto_publish_audit` log.
If the **Keep** button is clicked: clear `auto_published` flag (no banner thereafter).
If 24h elapses untouched: `auto_published` flag auto-clears (permanent).

### Queued candidate (medium confidence)

`INSERT INTO candidates` row with all the raw data + confidence score + sources. Manager reviews at `/admin/candidates` (existing page).

### Rejected candidate

Log row in `ingest_rejections`:
```sql
CREATE TABLE ingest_rejections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,
  url             TEXT NOT NULL,
  name            TEXT,
  reason          TEXT NOT NULL,   -- 'duplicate' / 'spam' / 'low_confidence' / 'invalid'
  raw_score       NUMERIC,
  raw_payload     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ingest_rejections_created ON ingest_rejections(created_at DESC);
CREATE INDEX idx_ingest_rejections_url ON ingest_rejections(LOWER(url));
```

Surfaced in `/admin/updates` so you can spot-check the auto-decisions.

### Audit log
```sql
CREATE TABLE auto_publish_audit (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id          UUID NOT NULL REFERENCES tools(id),
  action           TEXT NOT NULL,         -- 'auto_published' / 'kept' / 'rejected_in_softlaunch'
  confidence       NUMERIC NOT NULL,
  sources          TEXT[] NOT NULL,
  manager_user_id  UUID,                  -- nullable; null for cron-driven actions
  reason           TEXT,                  -- required when action='rejected_in_softlaunch'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Dependencies

### Upstream
- `tools` table + `candidates` table (exist)
- DeepSeek (spam filter / unique-value judgment) — existing
- Anthropic Claude (existing — used by curate gate)

### New
- Reddit JSON endpoint (no auth, public)
- Algolia HN API (no auth, public)
- Twitter/X — needs decision on data path:
  - **Option A:** nitter.net RSS feeds (free, fragile — instances die)
  - **Option B:** X API Basic tier (~$100/month, reliable)
  - **Option C:** Apify Twitter scraper actor (pay per run, ~$5/month for our volume)
  - Default in SPEC: **Option C** (cheap + reliable). Manager can override.

### Env vars (additions)
- `REDDIT_USER_AGENT` — Reddit polite UA (required by their ToS)
- `APIFY_TOKEN` (already exists, used for other actors)
- (existing) `PRODUCTHUNT_TOKEN`, `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`

### Downstream effects
- **1.2 refresh-tools** — newly auto-published tools enter the stalest-first queue at position 1 (never-refreshed first)
- **1.1 freshness-cascade** — new tool publication fires cascade → sitemap + IndexNow within 1h
- **2.x SEO** — fresh URLs in sitemap, fast indexation
- **3.x newsletter** — newly auto-published tools (with score ≥0.90) eligible for next "new arrivals" digest
- **6.x social** — social-blast cron picks up auto-published tools for X/LinkedIn announcement

---

## 8. Manager touchpoints

**Active touchpoints:**
- **Daily ~5min:** Review `/admin/updates` "Auto-publish soft-launch" section. Click **Reject** on anything that shouldn't have made it through.
- **Weekly ~10min:** Skim `/admin/candidates` queue (medium-confidence) and `/admin/updates` "Rejected" section to spot-check both auto-decisions.

**One-time setup:**
- Approve curated Twitter/X account list (configurable in `lib/ingest/sources/twitter-config.ts`)
- Decide Twitter data path (Option A/B/C above; recommended C)
- Approve confidence scorer weights (§5.3 table)

**Alerts (via 8.1 kpi-anomaly):**
- "Auto-publish reject rate >30% in last 7 days" → confidence scorer needs tuning (too lenient)
- "Auto-publish rate dropped to 0 for 3 days" → scorer too strict OR sources dead
- "Source X returned 0 candidates 5 days in a row" → fetcher broken

---

## 9. Failure modes

| Symptom | Likely cause | Recovery |
|---|---|---|
| Manager misses 24h reject window for a bad auto-publish | Stale tool in production | Standard admin "unpublish" still works post-window; audit log preserved |
| Source X (e.g., Reddit) starts rate-limiting | Volume too high or UA wrong | Fetcher backs off + skips that source for the run; next run retries |
| Confidence scorer returns NaN | Bad LLM output | Default to score=0.50 (queue, don't auto-publish); log |
| Dedup misses a clone (same tool, different domain) | Fuzzy-match threshold too tight | Manager rejects in soft-launch; consider lowering levenshtein threshold |
| All sources return 0 one day | Network / coordinated outage | Cron run logs warning; no candidates that day (acceptable) |
| LLM curate gate misclassifies a real tool as spam | DeepSeek hallucination | Surfaces in `ingest_rejections`; manager can manually publish later |
| Cost spike | Bug in fetcher (e.g., fetched 5k candidates instead of 50) | Daily cost alert from `cost-tracker` (8.2) catches it |

---

## 10. Files to create / modify

### Create
- `lib/ingest/sources/producthunt.ts` (refactor existing into this module)
- `lib/ingest/sources/github-trending.ts` (refactor)
- `lib/ingest/sources/curated-lists.ts` (refactor)
- `lib/ingest/sources/hackernews.ts` (NEW)
- `lib/ingest/sources/reddit.ts` (NEW)
- `lib/ingest/sources/twitter.ts` (NEW — Apify actor by default)
- `lib/ingest/sources/ai-newsletters.ts` (NEW — Ben's Bites + TLDR AI archive scrape)
- `lib/ingest/scorer.ts` — confidence scorer with the weighted formula
- `lib/ingest/dedup.ts` — name+website fuzzy match against `tools`
- `lib/ingest/orchestrator.ts` — fan-out fetchers, normalize, gate, route
- `supabase/migrations/097_ingest_extensions.sql` — adds `auto_published`, `auto_published_at`, `auto_publish_confidence`, `ingest_sources`, `reject_reason` to `tools` + creates `ingest_rejections` + `auto_publish_audit`
- `app/admin/updates/auto-publish-review.tsx` — soft-launch banner section
- `app/api/admin/auto-publish/reject/route.ts` — reject endpoint
- `app/api/admin/auto-publish/keep/route.ts` — keep endpoint

### Modify
- `scripts/ingest-tools-batch.ts` — call orchestrator instead of single-source logic
- `lib/cron/ingest.ts` — refactor to use orchestrator
- `.github/workflows/freshness-batch.yml` — confirm `ingest-tools` job timeout stays 90 min
- `app/admin/candidates/page.tsx` — show confidence score + sources for each candidate

### Reuse
- Existing Anthropic spam filter
- Existing tool insert path

---

## 11. Acceptance test

1. **Each fetcher returns ≥1 candidate** on a fresh `workflow_dispatch` run (pulls last 24h).
2. **Dedup catches a known dupe:** add a fake candidate matching an existing tool URL → confirm `ingest_rejections` row with `reason='duplicate'`.
3. **Spam filter rejects fake:** seed a candidate with `description="lorem ipsum"` → confirm `ingest_rejections` with `reason='spam'`.
4. **Auto-publish high-confidence:** seed a candidate matching multiple sources, real website, GitHub >500 stars → confirm `tools.is_published=true`, `auto_published=true`, soft-launch banner appears on `/admin/updates`.
5. **Queue medium-confidence:** seed a candidate scoring 0.65 → confirm `candidates` row, no `tools` insert, no banner.
6. **Reject in soft-launch:** click Reject on the auto-published test tool → confirm `is_published=false`, banner gone, `auto_publish_audit` row.
7. **24h timeout clears flag:** time-travel test (or wait) → confirm `auto_published` cleared after 24h.
8. **Cascade fires:** auto-publishing tool X → `pages_freshness` rows created for `/tools/<slug>` + sitemap reflects within 1h.
9. **Source failure isolation:** point HN fetcher at a 503 endpoint → confirm other sources continue + log warning + no run failure.

---

## 12. Build order

1. Migration 097 (schema additions + new tables)
2. `lib/ingest/sources/` refactor of existing 3 sources into modules
3. `lib/ingest/scorer.ts` + `lib/ingest/dedup.ts` + `lib/ingest/orchestrator.ts`
4. Wire `scripts/ingest-tools-batch.ts` to orchestrator
5. **First nightly run with only existing 3 sources** — verify behavior is identical to before, plus scoring works
6. Add HN fetcher → test run → confirm 0–5 candidates
7. Add Reddit fetcher → test run
8. Add Twitter fetcher (Apify) → test run + cost check
9. Add AI newsletter fetcher → test run
10. Admin soft-launch UI + reject/keep endpoints
11. Enable auto-publish gate (start at threshold 0.90, lower to 0.85 after 1 week if reject rate is acceptable)

Estimated dev: 3–4 days.

---

## Decisions deferred (not blocking)

- **LinkedIn ingestion** — Phase 2 when paid data provider budget approved.
- **Confidence scorer weight tuning** — start with the §5.3 table; adjust based on reject-rate telemetry over first 2 weeks.
- **Threshold ramp** — start auto-publish at 0.90 for week 1, drop to 0.85 once manager's reject rate stabilizes.
