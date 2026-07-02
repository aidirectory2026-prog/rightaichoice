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

---

# Phase 14b — Mixpanel-deep · Build log

Model: Fable 5. Same worktree/branch/integration protocol as Phase 14.
Plan: `Plan_phase-14b-mixpanel-deep.md` (same folder). Migrations planned: 183–188.

## Pre-work re-verification (2026-07-02) — ALL GREEN
Before any new code: 46-check filter matrix, 13 smart-board checks, 32 unit tests, all 14 nightly
in-DB invariants pass; live data quality clean (0.1% null geo, 0% schema violations, events flowing);
migration-182 Explore RPCs smoke-tested live. Also found the local main tree 2 commits behind
origin/main (PRs #64/#65 were merged remotely) — worktree synced before starting.

## What shipped (all six waves, 2026-07-02, single branch `phase14b-wave1`)

Migrations **183–189** applied + verified on production; every wave proven by the
filter-matrix verifier, which grew **46 → 97 checks (all green)** through the phase.

### Wave 1 — Every visible filter actually works (mig 183)
Three pages (Searches, Plan drop-off, Errors) showed the filter bar but their queries
silently ignored it — fixed. Live got the full filter bar (and its activity feed's
browser refresh, silently broken by a missing permission, now works). Users directory
got an email/ID search box; the User 360 journey got a date-range picker + "only
sessions containing event X"; Members got search + signed-up range.

### Wave 2 — Filter by anything, anywhere (migs 184–185)
New dimensions on every screen: **City, Region, Page, Browser, OS, Session,
client/server, any event property** — plus **≠ (exclude)** on every chip and a
**Person pin** (paste an email or ID → every chart shows just that human; no match →
honest zero, never silently unfiltered). Browser/OS parsed at ingest; 46,513
historical rows backfilled with the same parser. Filter bar got a "+ Add filter" menu.

### Wave 3 — Build any funnel + saved reports (mig 186)
The Funnel page now composes ANY funnel from ANY events (presets keep the classic
two), breaks each step down by geo/device/browser/…, and lists the actual people who
converted or dropped at any step (click → their journey). A **Reports** menu in the
filter bar saves any page + filter state by name, reopenable anywhere.

### Wave 4 — Retention + Paths (mig 187)
**Retention**: the classic cohort heat grid — "of the people who first came this
week, how many came back N weeks later", with custom anchor/return events, daily or
weekly. **Paths**: a clickable tree of what people do before/after any event within
a session. Both honor every filter.

### Wave 5 — Smarter segments + take-it-with-you CSV (mig 188)
Cohorts learned "did X **at least N times**", "did X **where property = value**",
and Location/Device conditions. **Bug found & fixed by the new checks:** a visitor
with both anonymous and logged-in activity was counted TWICE in every cohort —
deduplicated. A **CSV** button in the filter bar downloads the raw events behind the
current view (all filters applied, 50k cap).

### Wave 6 — Verification hardening (mig 189)
The Explore RPCs (mig 182) and the cohort-as-filter path are now in the automated
verifier (they were only ever eyeballed). Two new nightly invariants: **I14 geo
completeness** (0.00% missing today) and **I15 browser parse coverage** (10.75%
unparsed, under threshold). `npm run smoke:authed` added and wired into nightly CI —
it now hits every new page WITH filters and fails on any 5xx. `docs/admin/
filter-matrix.md` regenerated.

## Verification discipline (finished state)
- `tsc --noEmit` → 0 across all waves
- `npm run tracking:filters` — **97 checks ALL GREEN** (35 combos × 2 + 27 extended:
  honesty H1–H6, funnel reconciliation, retention/paths invariants, cohort v2 vs raw
  SQL, mig-182 partition sums, cohort-ids in the main predicate) + transient-fetch retry
- `npm run test:filters-sort` 36/36 · `test:range` 9/9 · `tracking:schema` consistent
- All migrations applied to prod BEFORE merge (all backward-compatible — the live
  site keeps working on old code); rollback file per migration
- New in-DB invariants I14/I15 run + pass on live data

## Open items (founder)
1. **Merge the phase PR** (branch `phase14b-wave1`, one squash merge) — nothing new
   is visible in the admin until this deploys.
2. **Enable Vercel Skew Protection** (dashboard → Settings → Advanced) — still the
   outstanding belt for the Phase 14 version-skew self-heal.
3. After the deploy: hard-refresh `/admin/insights` and click through
   Funnel → Retention → Paths → the new filter menu; report anything that feels off.

---

## Post-merge fix round (2026-07-02, branch `phase14b-fixes`)

Founder reported "none of the filters on the entire admin panel is working nicely" right
after the merge. Deep re-verification (live authed smoke of all ~40 admin routes: all 200)
plus a three-agent adversarial review of the whole phase found the causes:

### The big one — every query was 500× slower (migration 190, LIVE already)
Migration 185 restructured the shared filter logic into nested functions; Postgres could
no longer optimize ("inline") it, so EVERY chart query paid a per-row function call:
measured **10,242ms vs 17ms** for the same 30-day filter. With 5–22 queries per page, every
insights page crawled or timed out — even with no filters set. Migration 190 rebuilds the
predicate as one flat expression the database fully inlines (verified in the query plan):
the same filtered query now runs **19ms**. Applied straight to the database, so the speedup
was live before this branch even merges. A speed guard is now IN the verifier (predicate
must stay within 5× of flat SQL) so this class of regression can never ship silently again.

### Real bugs found by the review + the new checks (all fixed)
- **≠ source with two values excluded everything** (SQL nulls in the negation unroll) —
  caught by a new verifier combo, fixed in 190.
- **Clicks looked dead**: every filter change was a silent multi-second round trip with
  zero feedback. The bar now shows a spinner + dims while applying (useTransition).
- **Quick clicks cancelled each other**: two chips added fast → the first silently
  reverted (handlers read a stale URL). All handlers now read the live URL at click time.
- **Half-typed text became garbage filters**: clicking away from the Event/Source box
  committed drafts like "page vi" → chip nobody asked for → everything zero. Inputs now
  commit on Enter only, values are sanitized before writing, and events must be real.
- **"Clear all" didn't clear a pinned cohort** — numbers stayed segment-scoped with no
  visible chips. Fixed.
- **Empty cohorts silently showed ALL data** (zero-member segment = no constraint at all).
  Now pins an impossible id → honest zero rows.
- **Large cohorts broke half the tiles to silent zeros** (URL-length limit + swallowed
  errors). Cohort cap 5000→300 (both paths consistent), and failed count queries now FAIL
  LOUDLY instead of rendering fake zeros.
- **Stale inputs lied after loading a saved report / Back**: search boxes, retention/paths
  pickers and custom dates now re-sync to the URL.
- **Event chips were a visible no-op on Searches/Plan drop-off/Errors** (their queries are
  event-pinned) — the event input is hidden there now; the ≠event asymmetry between the
  two query paths is fixed.
- **Bundle bloat**: the filter bar pulled the entire 1,400-line event schema + zod into
  every admin page's JavaScript, delaying the moment buttons become clickable. Replaced
  with a tiny generated list (a test asserts it can't drift).
- Country dropdown options were recomputed from 90 days of events on EVERY page view —
  now cached for an hour. Migration 191 adds an index for the funnel identity-stitch scan.
  Live feed no longer silently freezes when a refresh fails.

### Verification
`tsc` 0 · unit tests 37/37 · filter-matrix verifier now **100 checks ALL GREEN**
(new: multi-value ≠source combo + predicate-speed guard, flat=185ms vs predicate=197ms).
Migrations 190/191 applied + verified on prod with rollback files.
