# 1.10 — Onboard SOP (gold-standard gated new-tool pipeline)

> Status: **LIVE** (Phase 9 — Automations & Catalog, Workstreams A4 + C). Built 2026-05-31.
> Code: `lib/cron/onboard.ts` (orchestrator), `lib/cron/onboard-compares.ts`, `lib/cron/onboard-faqs.ts`, `lib/cron/logo.ts`, `app/api/cron/onboard-tools/route.ts`, `scripts/run-onboard-sop.ts`. QA store: `tool_onboarding_qa` (migration 134). Alternatives RPC: `onboard_alternatives` (migration 135).

## Purpose (what + why)
Make a new tool reach the standard of our best pages **before** it goes public, and reach it **fast** — not 10 days behind the nightly batches. Two problems it solves:
1. **Starvation:** new inserts used to stamp `last_verified_at = now()`, sorting the tool to the BACK of every stalest-first queue. Now inserts leave freshness columns NULL → the tool sorts to the FRONT, and a 30-min fast-lane drives it to completion within the hour.
2. **Thin pages:** a day-0 tool used to publish with empty sections. Now it runs a 10-step pipeline with **hard gates**; it stays an unpublished draft until every required section is populated, then auto-publishes.

## Trigger / Runtime
- **Fast lane (published tools):** `onboardPendingTools()` via Vercel cron `/api/cron/onboard-tools` every 30 min (`vercel.json` `7,37 * * * *`). Picks the oldest `onboarded_at IS NULL` published tools and brings them to parity (publish-on-green is a no-op for already-published rows).
- **Draft lane (the gated SOP):** `runOnboardSop({ slugs | limit })` — full premium SOP on `is_published=false` DRAFT tools; publishes each only when all hard gates pass. Used for bulk catalog adds (the D2 P0 / D3 P1 tools). Invoke via `?mode=sop&slug=a,b` on the route, or `scripts/run-onboard-sop.ts <slugs>` (tsx + `.env.local`).
- Secret-gated (`cronRoute` / `validateCronSecret`); logs to `pipeline_runs`.

## The 10 steps + gates (every step records into the QA scorecard)
| # | Step | Reuses | Gate | Type |
|---|---|---|---|---|
| 1 | Refresh (scrape vendor site → editorial fields) | `runRefreshForSlugs` (incl. `includeUnpublished` for drafts) | description ≥300; best_for+not_for+editorial_verdict present | HARD |
| 2 | Categorize (DeepSeek → valid slugs) | inline `predictCategories` | ≥1 category | HARD |
| 3 | Viability score | `calculateSignals`+`computeViabilityScore` | — | — |
| 4 | Latest updates (changelog/blog/news/HN/Reddit → DeepSeek) | `synthesizeLatestUpdates` | latest_updates present | SOFT |
| 5 | Logo (resolve→verify→`tool-logos` bucket) | `resolveAndStoreLogo` (shared w/ backfill-logos) | real bucket logo (favicon = soft-pass) | SOFT |
| 6 | Alternatives (DB-side category-sibling rank) | `onboard_alternatives` RPC | ≥3 | HARD |
| 7 | Editorial compares (2–3 `is_editorial` vs top alts + DeepSeek prose) | `createEditorialCompares` + `generateCompareEditorial` | ≥2 | HARD |
| 8 | FAQs (long-tail) | `generateLongTailFaqs` | ≥9 `faqs_long_tail` | HARD |
| 9 | Sentiment (scrape + synthesize → `tool_sentiment_cache`) | `scrapeAllSources`+`synthesizeReport` (Anthropic) | best-effort | SOFT |
| 10 | Gate + publish + IndexNow | `submitToIndexNow` (invoke only) | flip `is_published` only when ALL hard gates pass | — |

- Each step is independently `try/caught` — one failure never aborts the rest.
- **HARD gates block publish; SOFT gates only warn.** Publish flips `is_published=true` guarded on `is_published=false`; then pings IndexNow. Idempotent (re-running a published tool is a no-op).
- Per-tool result upserted to `tool_onboarding_qa` (checks jsonb + all_green + published) → surfaced at **`/admin/onboarding`** (drafts pending, tools with failing hard gates, recently published).

## Inputs / Outputs
- **Reads:** the draft `tools` row (name/slug/website_url), `categories`, `tool_categories`, vendor websites + HN/Reddit/news, alternatives RPC.
- **Writes:** `tools.*` (editorial fields, viability, latest_updates, logo_url, onboarded_at, is_published), `tool_categories`, `tool_comparisons` (+prose), `faqs_long_tail`, `tool_sentiment_cache`, `tool_onboarding_qa`, `pages_freshness` (via the freshness trigger), IndexNow ping.

## Dependencies
- **DeepSeek** (enrichment, categories, FAQs, compare prose) — required; a 402 fails the hard gates → tool stays draft.
- **Anthropic** (sentiment synthesis) — SOFT only; low credit just leaves the sentiment section on its graceful fallback until backfilled.
- Apify (news/Reddit scrape, best-effort), Supabase storage (`tool-logos`), `CRON_SECRET`.

## Manager decisions
- New categories are owner-approved (DB-driven). New-tool candidate lists (P0/P1) are owner-approved BEFORE insert. The QA gate thresholds (≥300 desc, ≥3 features, ≥3 alts, ≥2 compares, ≥9 FAQs) are the editorial bar — tune in `lib/cron/onboard.ts` `HARD_GATES`/checks.

## Changelog
- **2026-05-31** — built (A4 fast-lane + C gated premium SOP), migration 134 QA store, smoke-tested.
- **2026-06-01** — fix: `resolveAlternatives` moved to the `onboard_alternatives` DB RPC (migration 135) — the old `.in('id',[hundreds])` built an over-long URL → 0 alts → blocked all publishes. First production batch: vercel/linear/datadog published green (alts=6, compares=3, FAQs 11–12, viability 80, ~760–950-char descriptions). Sentiment soft-warns while Anthropic credit is low.
