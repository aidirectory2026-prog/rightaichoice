# Phase 10.7b/7c Gate — Device envelope, web vitals & behavior depth

Date: 2026-06-13 · Branch: `phase10-admin` · Spec: Phase 10 plan §7b + §7c (+ 7d iron rule)

## What shipped

| Unit | Commit | Contents |
| --- | --- | --- |
| 10.7b.1 | `043541a` | Device/environment envelope on every event: locale, timezone, viewport, screen+DPR, connection type/downlink/rtt, device memory, CPU cores, touch, cookies, DNT, ad-blocker signal, dark/light pref (BASE_CONTEXT keys, compute-once) |
| 10.7b.2 | `d6fac14` | `web_vitals` — one beacon per hard page load (`useReportWebVitals` accumulator, LCP/INP/CLS/TTFB/FCP + `slow_page` per web.dev poor bands), flushed on first hide/pagehide/soft-nav |
| 10.7c.1 | `e4aa117` | Finer scroll marks (10/25/50/75/90/100), `time_on_page.max_scroll_pct` (optional — bot classifier untouched), `engaged_time_heartbeat` (1s attention ticks, 30s flush, 40 beats/page cap) |
| 10.7c.2 | `4267a01` | Frustration signals via GlobalInteractionTracker: `rage_click` (3+ clicks <1s/30px, 1/10s, 10/page), `dead_click` (cursor:pointer + no interactive ancestor + no DOM mutation/navigation in 600ms MutationObserver probe, 1/5s, 10/page), `exit_intent` (desktop mouse-out through viewport top, once/page, 5s suppress), `error_encountered` PROMOTED (window error capture-phase js/resource split + unhandledrejection + react_boundary sites in `app/error.tsx` & `SectionErrorBoundary`; per-message dedupe, 5/page), `external_link_clicked` PROMOTED (foreign-host anchors, 1/1s) |
| 10.7c.3 | `411b9e6` | Form analytics on EVERY `<form>` — new `FormAnalyticsTracker` (document focusin/focusout/submit/invalid): `form_field_changed` PROMOTED (+focus_order/+corrections; value LENGTH only; password/hidden skipped; 30/form cap), `form_submitted` PROMOTED (filled vs skipped names, time-from-first-focus), `form_validation_failed` PROMOTED (ValidityState flag, 1/2s), `form_abandoned` NEW (abandon point + focus order, flushed once on route change/pagehide). 13 real forms get stable `data-form-id` |
| 10.7c.4 | `0f228f4` | Per-session rollups → `user_intent_profile.session_history` (migration **162**): {ts_start, ts_end, duration_seconds, landing, exit, pages, engaged_seconds, channel}, 30-min-gap merge/append, cap 30; track-mirror computes one fragment per distinct_id per batch |
| 10.7c.5 | `bdee9c3` | Phase-6 registry leads: scanner now walks `lib/` + `actions/` and the "server emitters always fire" rule is TIGHTENED to require real callers. `plan_intent_persisted` + `plan_intent_linked_to_user` PROMOTED (real callers in `lib/cta/persist-intent.ts`), `password_reset_requested` PROMOTED (wired to forgot-password success), `password_reset_completed` now FIRED via its real site (`actions/auth.ts`); `activation_milestone` + `recommendation_requested` DEMOTED to PLANNED (zero call sites anywhere — schemas + recipes removed, emitters kept) |
| 10.7c.6 | `f194841` | PLANNED events with real UI promoted: `pagination_clicked` NEW (ToolPagination links), `sort_changed` NEW (carries previous order; legacy `filter_applied('sort')` kept for continuity), `filter_cleared` NEW (pill ✕ / select reset / clear-all — clears were silent before), `compare_tray_cleared` NEW (abandoned compare intent), `signup_method_selected` + `signup_email_entered` PROMOTED (signup-page Google button / email submit / email blur — domain only) |

Migration applied to live (MCP `apply_migration`, rebuilt from the live
definition, old signature dropped first): **162**.

## Iron rule (7d) compliance

Every new event in this phase followed schema-first order: EVENT_SCHEMAS
entry (technical + plain-English) → emitter → DOM/route wiring → synthetic
payload recipe → only then FIRED. New envelope properties (7b.1) went into
`BASE_CONTEXT_SCHEMA`/`BASE_CONTEXT_PROP_KEYS` first. Tag-don't-drop
verified again by the negative test (below). No PII expansion: form values
are never captured (lengths only), signup email is domain-only, password and
hidden fields are skipped entirely, plan-intent `user_id` stays empty
client-side.

Registry truth across the phase: 81 → **97 fired = 97 schema'd**
(16 net: 15 promotions/new + 3 inherited 7b/7c.1 − 2 demotions).

## Verification results (all green)

1. **`npm run tracking:schema`** — green: 147 defined, **97 fired = 97
   schema'd**, 50 planned, 23 admin-consumed, 10 admin property reads
   checked, 0 warnings.
2. **`npm run tracking:synthetic` (full)** — **97/97 events verified**
   (22 browser / 75 payload), runtime 125.4s. Recipes for every event of
   this phase present and green (7b.2 `web_vitals`, 7c.1
   `engaged_time_heartbeat` inherited recipes verified in the run; 7c.2–7c.6
   recipes added in their units). Dedup probe **3/3** (deterministic
   insert_ids → 1 row each). Negative test (page_viewed with numeric path)
   PASS: row landed with `schema_valid=false` + issues — tag-don't-drop.
   Channel probes (browser paid + payload ai) PASS. Envelope assertions
   (session_id + 7b.1 string/number/boolean keys) enforced per event by the
   suite's mirror-row checker. Cleanup: suite reported 0 rows; independently
   SQL-verified `0` user_events + `0` user_intent_profile rows LIKE
   `e2e-%`, and `0` `mig162-%` probe rows.
3. **Snapshot oracle** vs `docs/admin/baselines/post-phase7a.json`
   (pinned week 2026-06-01→07): **53/53 pinned keys byte-identical — 0
   changed, 0 added, 0 removed**, 0 errors, 0 nondeterministic
   (`scripts/audit/diff-baselines.ts`, new helper committed with this gate;
   the only raw-file diffs are in the explicitly `volatile` now-relative
   section). Snapshot stored as `baselines/post-phase7bc.json`.
4. **`npm run tracking:filters`** — 15 combos × 2 assertions + 6 extended
   checks = **36/36 ALL GREEN**.
5. **Authed smoke** (`scripts/audit/authed-smoke.ts` against the local
   **production build**): **37/37** — 34 × 200 on every nav/admin route +
   param'd variants, 3 expected 307 legacy redirects, zero 5xx.
6. **`npm run build`** — exit 0 (Next compile + page optimization clean).
   Bundle: `.next/static` = **2,900 KB** on this branch. An isolated main
   build for a byte-exact delta was not performable in this sandbox
   (worktree/archive creation denied); client-affecting source delta vs
   main tip `621a919` is ~1,376 insertions across the three trackers +
   emitters/schemas (lazy-loaded analytics paths, no new dependencies), so
   the first-load JS impact is bounded by ~4 KB minified of tracker code
   mounted from the root layout.
7. **Hygiene** — synthetic suite stopped the dev server it started
   (verified in its log); the prod server used for the smoke was stopped and
   `:3000` re-probed dead; no stray test users; probe/e2e rows verified 0 by
   SQL (point 2).

## Migration 162 live probes (SELECT-verified before commit)

- Fresh fragment → new session entry ✓
- Fragment starting 10 min after `ts_end` → MERGE: pages 2+3=5, engaged
  45+30=75, landing `/` kept, exit `/compare` updated, duration 900s ✓
- Fragment >30 min later → new entry appended ✓
- Legacy call shape without `p_session` (deployed prod code) ✓
- Exactly **1** function overload (PostgREST ambiguity impossible) ✓
- Probe row deleted, 0 remaining ✓

## Semantics notes (owner-facing)

- `session_history` epoch begins at this deploy; sessions before it simply
  don't exist in the array (no fake backfill).
- A session = activity gaps under 30 minutes (same rule as `touch_history`).
  `landing`/`channel` keep the session's FIRST value, `exit` is the latest
  page, `pages` counts `page_viewed`, `engaged_seconds` sums heartbeat
  deltas (clamped 60s/beat server-side).
- `dead_click` can never fire on real controls (interactive-ancestor check)
  — it specifically finds things *styled* clickable that do nothing.
- `error_encountered` rows now carry `error_type`
  (js_error / unhandled_rejection / resource_error / react_boundary); the
  legacy 2-arg boundary shape still validates.
- Sort changes intentionally double-emit (`sort_changed` +
  `filter_applied('sort')`) so existing filter dashboards keep continuity;
  documented in both schemas.

## Deferred (explicitly)

1. **Review load-more instrumentation** — no such UI exists in
   `components/reviews/` (verified); nothing to wire.
2. **Element-dwell / perf_mark / remaining PLANNED backlog** — no real UI or
   no clear value yet; stays PLANNED.
3. **Admin surface for session_history / form analytics / frustration
   signals** — capture-side only in this phase; charts land with the
   Phase 7 follow-ups (events explorer already shows every new event via
   the schema registry + callsites map).
4. **7e scale prep** (hourly rollups, reconciliation invariant, index
   explain-analyze) — separate sub-phase per plan.
