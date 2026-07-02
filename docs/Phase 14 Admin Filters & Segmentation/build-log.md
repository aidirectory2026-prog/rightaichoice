# Phase 14 — Admin Filters & Mixpanel-grade Segmentation · Build log

Model: Opus 4.8 (1M). Worktree: `../rac-filters` on branch `phase14-filters`.
Integration: one squash-merge PR per wave → `main` → Vercel deploy → live smoke.
Migrations: **181** (multi-value predicate), **182** (Explore RPCs).

---

## Why this phase happened (plain language)
The founder reported admin filters as broken and irritating — *"sometimes it works, sometimes it doesn't;
today none of them worked"* — and asked for a genuinely powerful tool: **in-depth filters + sorting on every
page**, and **Mixpanel-style segmentation** (cohorts, user-by-user, the geo of a particular session,
in-between reports).

Deep investigation flipped the diagnosis twice, which shaped everything below:
1. The filter **data pipeline was already correct** (proven by a 46-check verifier). The "filters die"
   problem was **not** a filter bug.
2. A **Mixpanel foundation already existed but was hidden/disconnected** (a cohort builder, saved-views
   table, per-user session timelines). Much of the work was *connecting and extending* it, not building anew.

---

## What shipped, in order

### P1 — Reliability + discoverability (PR #58)
- **Root cause of the intermittent failure (found in the live `/admin` error log): deploy version-skew.**
  This repo deploys constantly; when a new version ships, a browser tab still on the *old* build requests JS
  chunks the new deployment no longer serves → the chunk fails → the component never becomes interactive →
  every filter button silently dies until a hard refresh. The log showed `react_boundary "Load failed"` +
  `"Failed to load script: /_next/static/chunks/…?dpl=…"` on exactly the days it broke.
- **Fix (self-heal):** `lib/chunk-recovery.ts` detects a chunk-load failure and reloads the page **once**
  (sessionStorage-guarded, cannot loop). Wired into `app/error.tsx` (React error boundary) and the
  resource-error path of `components/analytics/global-interaction-tracker.tsx`.
- **Also fixed:** the Source/UTM filter inputs used to drop typed values unless you pressed Enter — now they
  commit on click-away too.
- **Discoverability:** the dimension filters (geo/device/…) default **open** instead of hiding behind a
  collapsed panel; surfaced the existing **Cohorts** builder in the Insights tab strip.
- **Operator action (belt):** enable **Vercel Skew Protection** (dashboard → Settings → Advanced). This is
  the proper complement to the code self-heal and must be done by the founder.

### Wave 0 — Shared primitives + multi-value engine (PR #59)
- **Migration 181** extends the ONE shared SQL filter predicate `insights_apply_filters` to accept **arrays**
  (IN/OR per dimension) and a **cohort `distinct_ids`** set — fully backward-compatible (scalar/NULL paths
  proven byte-identical to the old predicate on 30 days of real data: 0 mismatches).
- New reusable building blocks: `lib/admin/sort.ts` (URL-driven `?sort&dir`, `parseSort`/`sortRows`),
  `components/admin/sortable-header.tsx`, `components/admin/multi-select-filter.tsx`.
- `lib/admin/filters.ts` made multi-value (`string | string[]`): parse comma lists (`country=IN,US`),
  serialize scalar-or-array, PostgREST mirror uses `.in()`/`.or()`.
- Verifier extended with 5 array combos → **46 checks all green**; new unit test `test:filters-sort` (23/23).

### Wave 1 — Multi-value global filter bar (PR #59)
- The filter bar became **multi-value**: Device is a pill toggle group, Country an add-dropdown,
  Event/Source/UTM add on Enter/blur, every selected value shows as a removable chip. "India **and** US,
  mobile **and** tablet" now works on every analytics page. (The Users directory already had column sorting.)

### Wave 2 — Filter + sort on the list pages (PR #60 / #61 / #62)
Each page got relevant filters + sortable columns using the shared primitives (a new URL-synced
`components/admin/search-input.tsx` was added):
- **Tools catalog** (2,000+ rows) — search name/slug, pricing multi-select, Featured/Sponsored flags,
  sortable columns; DB-level (filters/sorts the whole catalog); tabs preserve the filter state.
- **AI citations** — engine/cited/brand filters + query search + sortable columns.
- **Niche tracker** — niche search + sortable columns.
- **Activity log** — tool search + sortable Tool/When.
- **Tier-1 review** — search + sort-by row (card list); presets preserve search + sort.
- **Data audit** — status/category filters ("show me only failures") + search + runtime/name sort.
- **Freshness** — field + pricing focus filters + sortable oldest-tools table.
- `/admin/social` intentionally left as-is (a hand-posting workspace, not a data table).

### Wave 3a — Cohort-as-filter (PR #63)
- `?cohort=<id>` resolves a saved cohort (`admin_saved_views` + `insights_cohort`) to its member set via
  `lib/admin/cohort-filter.ts:withCohort`, which populates `AdminFilters.distinctIds`; the shared predicate
  then constrains **every** chart on the page. New **Cohort picker** in the filter bar (populates from
  `/api/admin/cohort`, hidden until a cohort is saved). Wired into all 13 filter-bar pages.
- Verified end-to-end on live data: pinning a 200-member cohort narrowed a 778-visitor window → 196.

### Wave 3b — Explore: session breakdowns + pivot (PR #64)
- **Migration 182**: `insights_session_breakdown` (sessions grouped by country/device/auth, 30-minute-gap
  reconstruction across all users → "geo of a session") and `insights_breakdown_matrix` (2-dimension
  cross-tab). Both honour the shared predicate + a pinned cohort.
- New page **`/admin/insights/explore`** (dimension pickers, events/visitors toggle, heat-shaded pivot grid)
  behind the global filter bar; added an **Explore** tab. Sanity-checked live.

---

## Verification discipline (every wave)
- `tsc --noEmit` → 0 across all changes.
- `npm run tracking:filters` (46-check filter-matrix, RPC + PostgREST mirror vs hand-written SQL) — green,
  extended for arrays.
- `npm run test:filters-sort` (23 unit tests on sort + multi-value parse/serialize) — green.
- Both migrations equivalence/sanity-checked against real data before applying; rollback files authored.
- Every wave: squash PR → Vercel deploy → health-checked in production (home 200, admin routes 307 gate).
- A production error-log sweep after the deploys confirmed none of the shipped pages throw at runtime.

## How to use the new capabilities
1. **Multi-value filters** — on any Insights page, open Filters and pick multiple countries/devices/events.
2. **List pages** — search + column sort on Tools, AI citations, niche tracker, activity, tier-1,
   data-audit, freshness.
3. **Cohort-as-filter** — build a segment in **Insights → Cohorts**, Save; the **Cohort** dropdown then
   appears in the filter bar on every Insights page — pick it to re-scope every chart to that segment.
4. **Explore** — **Insights → Explore**: "Sessions by Country/Device", and a Country × Device (etc.) pivot.

## Open follow-ups (owned by others)
- **Founder:** enable Vercel Skew Protection (belt for the version-skew self-heal).
- **Cowork QA sweep:** fix the public compare-page tool-logo 404s (missing objects in the `tool-logos`
  bucket; ~23 users) and the one-off `/compare/gong-vs-outreach` SSR error — documented, not part of this
  admin phase.

## Migrations / key files
- `supabase/migrations/181_insights_multivalue_filters.sql` (+ rollback)
- `supabase/migrations/182_explore_session_pivot.sql` (+ rollback)
- `lib/admin/{filters.ts, sort.ts, cohort-filter.ts}`; `lib/chunk-recovery.ts`
- `components/admin/{filter-bar, sortable-header, multi-select-filter, search-input, cohort-picker}.tsx`
- `app/admin/insights/explore/page.tsx`; `app/admin/insights/layout.tsx` (Cohorts + Explore tabs)
- `scripts/audit/{verify-filters.ts (extended), filters-sort.test.ts (new)}`
