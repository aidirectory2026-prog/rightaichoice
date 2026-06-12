# Phase 5b gate — Behavior + Funnels + Revenue rebuilt, every number accounted for

**Date:** 2026-06-12 (IST) · **Branch:** `phase10-admin` · **Baseline:** `post-phase5a.json` vs `post-phase5b.json` (pinned window 2026-06-01 → 2026-06-07 IST, end-exclusive)

Covers 10.5b.1–10.5b.5: migration 157 (events-explorer RPCs + `p_filters` on
the tool RPCs), the events explorer rebuilt on the schema registry (absorbing
`/admin/insights/raw`), the rebuilt funnels page + plan-conversion re-skin,
the windowed sentiment/revenue page (audit **F13** fix), and the tool
engagement re-skins with the last `(sel, includeBots)` → `AdminFilters`
conversions.

## Result

| Check | Result |
| --- | --- |
| Pinned keys compared (shared) | 39 / 39 |
| Keys byte-identical | **39 — zero numeric drift from any conversion/re-skin** |
| New keys (documented additions, below) | 12 |
| Keys removed | 0 |
| Snapshot errors / nondeterministic | 0 / 0 |
| Filter-matrix verifier (extended) | 15 combos × 2 + 6 extended checks = **36 / 36 GREEN** |
| Route check (18 URLs, dev server, unauthenticated) | all `307 → /login`, **0 × 5xx** |
| `npx tsc --noEmit` | clean |
| `npm run build` | passes (`events`/`raw`/`funnel`/`tools`/`tool/[slug]`/`plan-conversion`/`sentiment` all in the route manifest) |

The 39 byte-identical keys include every converted function:
`getTopExistingTools`, `getTopUseCases`, `getTopSearches`, `getTopChatTools`,
`getReconciliationStats`, `planConversion.getPlanFunnel`,
`planConversion.getSurfaceBreakdown`, `planConversion.getLinkRate` — each now
takes `AdminFilters` but snapshots through `baseFilters` (the RPC
null fast-path / humans-only default), proving the conversions changed
nothing numeric.

## The 12 new snapshot keys (additions, not diffs)

Per-unit query modules created/extended in 5b, snapshot from this run on:

- `insights.getEventVolumeList.{humans,withBots}` — explorer volume list (migration 157)
- `insights.getEventPropertyBreakdown(page_viewed,path)` — schema-allowlisted breakdown (migration 157)
- `insights.getToolHeatmap.{humans,withBots}` — extracted from the tools page, now window-pure (explicit `p_cutoff`/`p_end`)
- `insights.getToolAudienceDetail(screenplayiq).{humans,withBots}` — converted fn, pinned-slug sample
- `planConversion.getIntentStream` — was never snapshot before
- `sentiment.getSentimentFunnel.{humans,withBots}`, `sentiment.getSentimentRevenue`, `sentiment.getSentimentScans` — new `lib/admin/sentiment.ts` (queries extracted from the page per the Phase-0 scope note)

## F13 — sentiment page was all-time, unwindowed, unfiltered (fixed)

Before (prod numbers queried 2026-06-12): every funnel leg counted ALL-TIME
`user_events` rows with no window, no end cap and **no bot filter**;
scans/payments were "the most recent 500/200 rows ever".

| Leg | all-time any (old page) | all-time humans | bot inflation |
| --- | ---: | ---: | --- |
| sentiment_card_viewed | 101 | 52 | **+94%** |
| sentiment_scan_requested | 10 | 10 | — |
| sentiment_scan_completed | 8 | 8 | — |
| sentiment_paywall_shown | 8 | 8 | — |
| sentiment_payment_succeeded | 0 | 0 | — |

After: all five legs are windowed (`>= start AND < end`), humans-only by
default with the bots toggle, and honor the optional smart filters via the
`applyFilters()` mirror; revenue/scans/payments panels are windowed. An
explicit **"All time"** preset link (`from=2026-05-20`, the mirror epoch)
keeps the old view one click away. Scope note stated on the page:
`sentiment_searches` / `sentiment_payments` have **no bot column** (verified
against information_schema 2026-06-12) — those panels honor the date range
only.

## Filter-matrix verifier — Phase 5b extension (36/36 green)

`scripts/audit/verify-filters.ts` extended with three checks (all vs
independent hand-written raw SQL via `_admin_audit_exec`, pinned week):

1. **E1 — `insights_event_property_breakdown`, page_viewed × path,
   `{device:'desktop'}`, humans:** full top-5 rows (value/events/visitors)
   equal raw SQL.
2. **E2 — `insights_event_property_breakdown`, tool_page_viewed × tool_slug,
   `{country:<top>, auth:'anon'}` stack:** top-3 rows equal raw SQL.
3. **S1 — sentiment windowed count (the F13 leg):** the LIVE path
   (direct PostgREST count through the `applyFilters` mirror, exactly as
   `getSentimentFunnel` builds it) equals raw SQL for
   `sentiment_card_viewed`, humans, pinned week (43 = 43).

Full table regenerated in `docs/admin/filter-matrix.md` (`--write-doc`).

## Migration 157 — applied to prod (MCP), verified

Two NEW service_role-only RPCs (`insights_event_property_breakdown`,
`insights_event_volume_list`) + `p_filters jsonb default null` appended to
`distinct_visitors_for_tool`, `insights_tool_compared_with` (154 §11
exists-precedent + deterministic tie-breaker) and `insights_tool_heatmap`
(+ `tool_slug asc` tie-breaker) — each extended FROM ITS LIVE DEFINITION
(`pg_get_functiondef`, 2026-06-12). Post-apply: `pg_proc` overload count = 1
for all five; null fast-path probe `distinct_visitors_for_tool(screenplayiq,
pinned week)` = raw SQL (4 = 4); both new RPCs smoke-probed on the pinned
week with sane rows.

## Route check detail (18 URLs, unauthenticated, dev server)

Explorer plain / `?event=page_viewed` / `?event=…&prop=path` / filtered
stack, `/admin/insights/raw` (now a redirect into the explorer), funnel plain
+ filtered, plan-conversion plain + filtered, sentiment plain + **All time**
(`?from=2026-05-20`) + filtered, tools plain + filtered, tool/[slug] plain +
filtered, reconciliation, insights. All `307 → /login`; no 404s, no 5xx.

## Documented behavior changes (not in the numeric oracle)

- **`/admin/insights/raw`** now `redirect()`s to the events explorer — its
  diagnostic value (per-query reality dump) is absorbed by the explorer's
  volume list / raw rows / breakdown panels and the existing
  `/api/admin/insights-debug` endpoint.
- **The old `/admin/insights/funnel` site funnel** (`insights_funnel_steps`
  RPC: visitor → tool view → outbound click → signup, unique users) is
  replaced by the two VERIFIED plan funnels per the Phase 5b spec. The old
  RPC took `p_days` only and could not honor calendar-anchored ranges; it
  remains in the DB untouched if a window-pure rebuild is wanted later
  (listed under deferred).
- **Tools heatmap windows are now exact:** the page passes explicit
  `p_cutoff`/`p_end` instead of `p_days`, so `today`/`mtd`/custom ranges are
  calendar-true. Tie-order within equal view counts is now deterministic
  (`tool_slug asc`), and `insights_tool_compared_with` gained the same
  `2 desc, 1 asc` tie-breaker the 156 sweep gave the other top-N RPCs
  (one-off ordering change inside equal-count groups only; neither was in
  the pinned oracle).
- **Events explorer event names** come from `SCHEMA_EVENT_NAMES` (registry),
  not a DB distinct — `getDistinctEventNames()` removed; unregistered
  in-window names are surfaced in their own picker group instead of being
  silently mixed in.

## Deferred

- `insights_funnel_steps` (site-wide unique-user funnel): rebuild window-pure
  + `p_filters` and re-add as a third strip on /admin/insights/funnel if the
  owner misses it.
- Events-explorer raw-rows pagination beyond the last 50 (the spec scope);
  the per-event full stream remains available via the user timeline and
  Phase 6's event-detail page.
- Property-breakdown cards for EVERY property at once (Phase 6 event-detail
  scope; the explorer shows one chosen property at a time).
- `getEngagementMetrics`, `getKpiRows`, `getVolumeProjection`,
  `getEventHealth` stay now-anchored/(sel,bots) by design (volatile snapshot
  section, F5 resolution) — untouched in 5b.
