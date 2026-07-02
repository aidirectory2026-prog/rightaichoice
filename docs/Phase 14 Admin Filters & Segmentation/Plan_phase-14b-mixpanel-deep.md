# Phase 14b — Mixpanel-deep · Plan

Model: Fable 5. Worktree: `../rac-filters` on branch `phase14-filters`.
Integration: one squash-merge PR per wave → `main` → Vercel deploy → live smoke → build-log entry → founder OK before next wave.
Planned migrations: **183–188** (each with a rollback file).

## Why this phase (plain language)

Phase 14 built the filter foundation. The founder now wants the full Mixpanel-grade experience, in-house:
**filter ANY event or journey by geo, user id, or a particular event, on EVERY screen** — plus ad-hoc funnels,
retention ("do people come back?"), path analysis ("what do people do after X?"), stronger cohorts, and
CSV export of any filtered view. Before building, all existing tracking was re-verified end to end.

## Re-verification (done 2026-07-02, before any new work) — ALL GREEN

- `npm run test:filters-sort` 23/23 · `npm run test:range` 9/9
- `npm run tracking:filters` — full 46-check matrix (RPC + PostgREST mirror vs hand-written SQL) all green
- `npm run verify:boards` — 13/13 smart-board RPC invariants green
- All 14 nightly in-DB invariants (`tracking_health`, run 2026-07-01 19:30 UTC) pass — no duplicate
  insert_ids, 0% schema violations, 96.6% session coverage, exact rollup reconciliation
- Data quality (7d): 8,265 events / 960 visitors; 0.1% null country; 0.1% unknown device; live flow confirmed
- Migration-182 Explore RPCs smoke-tested against live data — sane results
- Found + fixed during planning: local `main` tree was 2 commits behind origin/main (PRs #64/#65)
- Found: 3 pages render the FilterBar but their RPCs silently ignore dimension filters → Wave 1

## Architecture rules (carried from Phase 14)

- ONE shared SQL predicate `insights_apply_filters(ue, f jsonb)` + its TS mirror in `lib/admin/filters.ts`;
  every new dimension lands in BOTH, and `scripts/audit/verify-filters.ts` proves them equivalent.
- Server components; URL is the only state; helpers in `app/admin/insights/queries.ts`;
  RPCs are SECURITY DEFINER with EXECUTE granted to service_role only (migration 169 pattern).
- Param-adding migrations must `drop function` the old signature first (Postgres overload footgun);
  rollback files restore the previous signature.
- Founder is non-technical: everything clickable, no query language, plain-language build-log entries.

## Waves

### Wave 1 — Every visible filter actually works (UI honesty)
Migration **183**: thread `p_filters` through `insights_search_log`, `insights_plan_dropoff`,
`insights_error_overview`, `insights_live_sessions`, `insights_activity_feed`; add range+event params to
`insights_user_sessions_v2` (User-360 timeline); add `p_search` (email/ID) to `insights_user_directory`.
UI: Live page gets a compact event/country/device/auth filter row (client mirrors it on Realtime rows via a
tiny unit-tested `matchesFilters`); Users directory gets text search; User 360 gets a range picker + event
chips; Members gets range + search (deliberately NOT the full bar — it reads auth.users, dimension filters
can't honestly apply). Verify: each newly-honest RPC spot-checked vs hand-written SQL.

### Wave 2 — New dimensions + person pin (the headline wave)
Migration **184**: `browser`, `os` columns; new `lib/ua-parse.ts` (pure regex, fail-open null) wired into
`/api/track-mirror` ingest; backfill script reuses the SAME parser (decision locked: ingest-time parse, not
SQL-time — PostgREST can't regex UA strings, SQL-time would break the SQL↔TS equivalence proof forever).
Migration **185**: predicate v2 — new scalar-or-array keys `page_path` (contains), `city`, `region`,
`browser`, `os`, `source_kind`, `session_id`, `props` (`{k,v}` exact match, key regex + schema allowlist
`KNOWN_PROP_KEYS` from `lib/analytics-schema.ts`), and a sibling `not` object for negation (≠).
**Person pin**: `?person=` accepts an email, distinct_id, or user_id → resolves to distinct_ids (cap 500,
explicit "no person matched" chip when unresolved) → feeds the existing cohort `distinct_ids` mechanism.
UI: filter bar becomes a "+ Add filter" menu (plain labels), chips get =/≠ toggles, URL params 100%
back-compatible. Verify: matrix grows 46 → ~70 combos; browser/os completeness spot-check.

### Wave 3 — Ad-hoc funnel builder + saved reports
Migration **186**: `insights_funnel_breakdown` (per-step users by dimension, identity-stitched like 175)
and `insights_funnel_people` (converters/droppers lists → link to User 360).
UI: `funnel-builder.tsx` (ordered event steps, `?steps=a,b,c`, presets = the two existing funnels), per-step
breakdown selector, drill table. **Saved reports**: `admin_saved_views` gains `kind='report'` rows
(name + page path + query string) via a new saved-views API; a "Save this view" menu in the FilterBar gives
every page named, reloadable reports. Verify: breakdown step-1 sum == funnel step-1 total, filtered + not.

### Wave 4 — Retention + Paths
Migration **187**: `insights_retention` (cohort grid: first qualifying event → retained per day/week bucket)
and `insights_event_paths` (session-scoped event→event transitions, before/after an anchor).
UI: new **Retention** page (triangle heatmap) + **Paths** page (clickable next-event tree), both behind the
global FilterBar; new tabs in the Insights strip. Verify: structural invariants (retained(0)==cohort size,
monotone ≤, filters strictly shrink cells).

### Wave 5 — Cohort builder v2 + filtered CSV export
Migration **188**: `insights_cohort` conditions gain `min_count` ("did X ≥3 times"), per-event property
`where {k,v}` (same allowlist as Wave 2), and `geo`/`device` condition types.
UI: builder gets the count stepper + property row + geo/device rows; cohort API validates the new shapes.
**Export**: `type=filtered_events` on the export route + an "Export CSV" button in the FilterBar — download
exactly the current filtered view anywhere (~50k row cap). Verify: cohort combos + export row-count honesty.

### Wave 6 — Verification hardening
Add migration-182 RPC cross-checks + a cohort `distinct_ids` combo to `verify-filters.ts`; new nightly
invariants for geo and browser/os completeness; `smoke:authed` npm script wired into CI post-deploy, extended
to the new pages; refresh `docs/admin/filter-matrix.md`.

## Per-wave ritual
`tsc --noEmit` → extend + run `npm run tracking:filters` → `npm run test:filters-sort` → rollback file per
migration → squash PR → Vercel deploy → live smoke (admin pages + error-log sweep) → plain-language
build-log entry → founder OK before the next wave.

## Key risks (mitigations locked in)
1. Function overloads → always drop old signatures in migrations; rollbacks restore them.
2. `props` filter injection → charset regex + schema allowlist on BOTH SQL and TS sides; exact-match only.
3. Filter-bar refactor touches all FilterBar pages via one component → URL params stay back-compatible.
4. Live-feed client predicate is a third filter implementation → kept to 4 dims, unit-tested.
5. Person pin → cap 500 ids; explicit failed-chip state, never a silent no-op.
