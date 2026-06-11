# Phase 5a gate — Overview + Audience rebuilt, every number accounted for

**Date:** 2026-06-12 (IST) · **Branch:** `phase10-admin` · **Baseline:** `post-phase4b.json` vs `post-phase5a.json` (pinned window 2026-06-01 → 2026-06-07 IST, end-exclusive)

Covers 10.5a.1–10.5a.4: metric provenance map + ⓘ popovers, the real `/admin`
dashboard, the Users directory (`/admin/insights/users`, RPC migration 155),
and migration 156 (window purity + determinism + geo/device `p_filters`) with
the geo/devices re-skins.

## Result

| Check | Result |
| --- | --- |
| Pinned keys compared | 39 / 39 |
| Keys byte-identical | 31 |
| Keys changed — all classified (see below) | 8 (2 × avg_days_between cap, 6 × tie-order swap) |
| **Counts changed** | **0** — every (value, count) pair and every count field identical |
| Snapshot errors / nondeterministic | 0 / 0 |
| Filter-matrix verifier (extended) | 15 combos × 2 + 3 extended checks = **33 / 33 GREEN** |
| Users-directory RPC vs hand SQL | total 214 = 214; top-3 rows field-for-field identical |
| Dashboard drill-down route check (18 URLs, dev server) | all `307 → /login` (auth gate renders), **0 × 5xx** |
| `npx tsc --noEmit` | clean |
| `npm run build` | passes (`/admin/insights/users` in the route manifest) |

## The 8 changed keys — every one is an intended migration-156 effect

Diffs were classified programmatically (script asserted: count multisets
identical, shared labels carry identical counts, swapped-in/out labels all
sit exactly at the boundary tie value, new ordering is `value desc, label
asc`):

### Class 1 — `avg_days_between` p_end cap (2 keys)

`insights.getReturningSummary.humans` / `.withBots`: all counts
(`total`/`new_count`/`returning_count`/`returning_pct`) byte-identical;
`avg_days_between` corrected ONCE to its window-pure value:

- humans: 12.3 → **10.9** · withBots: 9.4 → **6.9**

This is the fix for the drift the Phase 4A gate documented
(`phase4a-gate.md`): the lifetime CTE in `insights_returning_visitors`
computed `max(created_at)` with no `p_end` cap, so returning visitors still
active today kept inflating the average inside the pinned window (it had
already crept 12.2 → 12.3 → 12.4 across snapshots). Migration 156 caps the
lifetime scan at `p_end`; the value is now frozen for pinned windows.

### Class 2 — deterministic tie-ordering (6 keys)

`getTopClickedTools.{humans,withBots}`, `getTopComparedTools.{humans,withBots}`,
`getTopViewedTools.{humans,withBots}`: migration 156 added `order by 2 desc,
1 asc` to `insights_top_jsonb_property` / `insights_top_property` /
`insights_unnest_intent_array` (the same fix 154 gave `insights_top_events`).
Equal-count rows now come back alphabetically instead of in arbitrary heap
order. Where the LIMIT cuts through a tie group, the rows holding the last
slots changed *within that tie group only* (verified: every swapped-in/out
label sits exactly at the boundary count — e.g. TopViewedTools.humans swapped
4 in / 4 out, all at count 1). One-off; deterministic from now on.

`getTopReferrers`, `getTopSearches`, `getTopPages`, `getTopUseCases`,
`getTopChatTools`, `getTopExistingTools`, `getTopSavedTools` and every other
consumer of the three RPCs: byte-identical (no ties at their limit
boundaries in the pinned week).

## Filter-matrix verifier — Phase 5a extension (33/33 green)

`scripts/audit/verify-filters.ts` extended with three checks, all against
independent hand-written raw SQL via `_admin_audit_exec`:

1. **U1 — `insights_user_directory`, no optional filters** (humans,
   sort=events): exact pre-limit total AND the full top row
   (distinct_id/events/active_days/is_returning) equal raw SQL.
2. **U2 — `insights_user_directory`, device=desktop + country stack**:
   total = raw SQL count = `distinct_visitors_in_window` with the same
   `p_filters` (the cross-tile invariant the Users page header relies on).
3. **G1 — `insights_geo_breakdown` with `p_filters {device:'desktop'}`**
   (migration 156's new parameter): country count + top-country
   visitors/events equal raw SQL.

Full table in `docs/admin/filter-matrix.md` (regenerated `--write-doc`).

## Users-directory RPC re-verification (recorded in commit a2705ef)

Pinned week, humans, sort=events: RPC `total_rows` 214 = hand SQL 214
(= the audited Visitors tile). Top-3 rows byte-identical on every field;
sample: `8c4c5b71-…74171b` — 905 events, 7 IST active days, top country IN,
top device desktop, returning=true, first_seen 2026-05-20T19:36:20.632Z.

## Route check detail (18 URLs, unauthenticated, dev server)

Every dashboard tile drill-down href: 6 KPI "View →" targets
(`/admin/insights/users`, `…users?auth=known`, 4 × `…events?event=<name>`),
a Top-sources row (`/admin/insights?source=google.com`), a Top-events row,
2 tool drill-downs (`/admin/insights/tool/<slug>`), a user-timeline row
(`/admin/insights/user/<id>`), the users directory with sort+page params,
geo/devices plain + with stacked filters, and `/admin/insights`. All
returned `307 → /login`; no 404s, no 5xx.

## Migration 156 — applied to prod (MCP), confirmed

Single overload per function verified post-apply (`pg_proc` count = 1 for
all 8 touched/related functions). Pre/post probes on the pinned week: all
counts identical (returning summary, recent-visitors top-5, top pages /
first-touch / tools, geo per-country, device rows); filtered geo/device
probes return correct numbers (asserted vs raw SQL by verifier check G1).
