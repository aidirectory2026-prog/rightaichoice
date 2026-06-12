# Phase 6 gate — User 360 + Event detail (Mixpanel-grade drill-downs), hand-SQL verified

**Date:** 2026-06-12 (IST) · **Branch:** `phase10-admin` · **Migration:** `158_user360_v2.sql` (applied to prod via MCP)

Covers 10.6.1–10.6.5: `insights_user_profile_v2` + hybrid-session
`insights_user_sessions_v2` (migration 158), the User 360 page upgrade
(identity header, traits panel, sessions_v2 Journey cards with per-event
raw-props expanders + `?ecap=` pagination, cross-links), the firing-sites
generator (`lib/analytics-callsites.gen.json` via `npm run tracking:schema`),
and the events-explorer `?event=` full detail (all-properties breakdown
cards, firing sites, typed schema card; trend/raw/lifecycle/synthetic kept).

## Result

| Check | Result |
| --- | --- |
| 5 real users reproduced by hand SQL | **5 / 5 — every number matched** (lifetime, 30d, first/last seen, hybrid session count) |
| 10 busiest events reproduced by hand SQL | **10 / 10 volume rows + 29 / 29 top-property rows matched** |
| sessions_v2 partition invariant | 5 / 5 users: Σ session event_count = lifetime events (no event lost or double-counted) |
| Snapshot post-phase6 vs post-phase5c | **51 / 51 pinned keys byte-identical** (0 added, 0 removed, 0 drifted — new pages only) |
| Filter-matrix verifier | 15 combos × 2 + 6 extended = **36 / 36 GREEN** |
| Authed smoke (dev :3003, real admin session) | **41 / 41** — 33 nav+extra routes + real-id User 360 (`?tab=journey`, 3,735-event user) + 2 event-detail URLs all `200`; 3 redirect stubs `307`; 0 × 5xx |
| `npx tsc --noEmit` | clean after every unit commit |
| `npm run build` | exit 0 |
| `npm run tracking:schema` (registry guard + gen) | ✓ consistent — 137 defined / 79 fired / 79 schema'd; wrote 78 events · 98 firing sites |

## 1. Five real users — `insights_user_profile_v2` vs independent SQL

The 5 busiest human (`bot_likely = false`) distinct_ids of the last 30 days.
RPC and hand SQL ran **in the same statement** (`cross join lateral`) so
`now()` is identical for both paths; the hand side is plain `count/min/max`
over `user_events` plus a hand-built hybrid session count (distinct
`properties->>'session_id'` + 30-min-gap pass over the rows without one) —
it never calls the function under test.

| distinct_id | lifetime (hand = RPC) | 30d (hand = RPC) | sessions (hand = RPC) | first/last seen |
| --- | --- | --- | --- | --- |
| `8c4c5b71-12ca-4e17-ac06-fe91fe74171b` | 3,735 = 3,735 | 3,735 = 3,735 | 120 = 120 | both match (2026-05-20 19:36:20Z → 2026-06-12 13:05:41Z) |
| `eb2414ab-6f48-40db-9f44-2b45561050a6` | 213 = 213 | 213 = 213 | 7 = 7 | both match (2026-06-01 → 2026-06-03) |
| `$device:5b57758f-ace6-495f-b830-f142db61883a` | 107 = 107 | 107 = 107 | 1 = 1 | both match (2026-06-08, single visit) |
| `$device:cdb0f209-93e2-4626-b97d-054057606c74` | 86 = 86 | 86 = 86 | 7 = 7 | both match (2026-06-03 → 2026-06-04) |
| `$device:c42d52d2-9a4b-4eb9-8648-add8766df294` | 75 = 75 | 75 = 75 | 1 = 1 | both match (2026-05-27, single visit) |

**Partition invariant** (sessions_v2 at `p_limit=1000, p_events_cap=10000`):
for all 5 users, `count(sessions)` = profile_v2 `session_count`, Σ
`event_count` = Σ `jsonb_array_length(events)` = lifetime events, and
`events_truncated` = false everywhere. The busiest user splits 16
`session_id`-method + 104 gap-method sessions — exactly the
2,500-of-21,534 session_id envelope coverage (epoch 2026-06-10) predicts.

## 2. Ten busiest events — detail-page numbers vs independent SQL

Pinned, immutable window **2026-05-13T00:00:00Z → 2026-06-12T00:00:00Z**,
humans only (the page's default toggle). Volume legs:
`insights_event_volume_list` (what the detail header/trend reads) vs a raw
`group by event_name` with independent `filter` clauses. All **10/10 match**
on events + bot_events + visitors:

| event | events | bot events | visitors |
| --- | --- | --- | --- |
| scroll_depth_reached | 2,974 | 5,729 | 385 |
| time_on_page | 1,806 | 495 | 447 |
| page_viewed | 1,329 | 1,507 | 561 |
| tab_visibility_changed | 1,083 | 41 | 117 |
| plan_cta_impression | 643 | 1,316 | 437 |
| tool_page_viewed | 296 | 594 | 260 |
| tool_visit_redirected | 125 | 2,079 | 83 |
| comparison_viewed | 87 | 351 | 86 |
| sentiment_card_viewed | 52 | 49 | 15 |
| copy_text_event | 52 | 0 | 5 |

Top-property legs: `insights_event_property_breakdown` (the breakdown-card
RPC) vs hand `group by properties->>prop` for each event's first schema
prop — top-3 value, events AND visitors compared per row: **29/29 rows
identical** (tab_visibility_changed only has 2 values). Sample: page_viewed×path
top-3 = `/` 160ev/75v · `/admin/insights` 126ev/1v · `/plan` 47ev/35v on
both paths.

## 3. Clarity deep-link — evidence and the approach shipped

- **The stored id is empty everywhere:** `user_events.clarity_session_id`
  is NULL on every row and no `properties.clarity_session_id` key exists —
  the `clarity('get','session')` bridge in
  `components/providers/clarity-provider.tsx` has never returned a value
  (that call shape isn't in Clarity's documented client API).
- **No code-verifiable per-session URL:** the embed only loads
  `clarity.ms/tag/<NEXT_PUBLIC_CLARITY_PROJECT_ID>` (id `wtq115a7o7`, found
  in the provider + .env.local). The real playback URL —
  `clarity.microsoft.com/player/<projectId>/<clarityUserId>/<claritySessionId>`
  (community-documented, dumbdata.co) — needs the Clarity **user** id, which
  we have never captured. Official docs only confirm the dashboard shape
  `clarity.microsoft.com/projects/view/<id>/dashboard?date_d=…`.
- **Shipped (per the plan's fallback):** the header button links to the
  docs-verified dashboard view for project `wtq115a7o7`; when a
  `last_clarity_session_id` exists (profile_v2 surfaces the most recent
  one) it is rendered as copyable text for manual recordings filtering, and
  the button tooltip states exactly why no per-session deep link exists.
  The old `…/sessions/<id>` link format (8.g.10) was unverifiable and was
  removed.
- **Deferred (Phase 7 capture-everything):** fix the bridge — capture
  Clarity's user id + session id (e.g. from the `_clck`/`_clsk` cookie
  first segments) so the `/player/<p>/<u>/<s>` deep link becomes
  constructible; profile_v2/sessions_v2 already carry the column.

## 4. What each verifier proves here

1. **Hand SQL (above)** — the new RPCs and the detail page's data path
   compute the same numbers as independent first-principles queries.
2. **Snapshot** — Phase 6 added pages and RPCs but changed **zero** existing
   numbers (51/51 byte-identical vs post-phase5c).
3. **Filter matrix** — the shared predicate the breakdown cards lean on is
   still 36/36 against hand-written WHERE clauses.
4. **Authed smoke** — every admin route renders for a real admin session,
   including the heaviest real-user journey and the new event-detail URLs.
   (`authed-smoke.ts` gained a repeatable `--extra-route=` flag for these.)
5. **Registry guard** — still green with the new gen-emit step; the
   firing-sites JSON is committed and idempotent (no timestamps).

## Notes / intentional choices

- profile_v2 `events_30d` is now-anchored by design (live profile header),
  so it is NOT in the pinned snapshot surface; both new RPCs are point
  lookups by distinct_id.
- Three schema'd events (`recommendation_requested`,
  `password_reset_completed`, `activation_milestone`) have **no detected
  call sites** — they are "fired" only via the loose server-emitter rule.
  The detail page now says this out loud instead of hiding it (candidate
  cleanup for Phase 7).
- `plan_intent_linked_to_user` / `plan_intent_persisted` are PLANNED in the
  registry but have callers detected in `lib/` — the gen.json surfaces
  them; promoting them is a registry follow-up.
- Journey render cap: 200 events initially, `?ecap=` +200 per click,
  RPC-side cap 500 events/session (`events_truncated` flags the cut).
