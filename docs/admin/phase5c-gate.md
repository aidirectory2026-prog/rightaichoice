# Phase 5c gate — SEO / Content / Pipelines re-skinned, merges executed, zero numeric drift

**Date:** 2026-06-12 (IST) · **Branch:** `phase10-admin` · **Baseline:** `post-phase5b.json` vs `post-phase5c.json` (pinned window 2026-06-01 → 2026-06-07 IST, end-exclusive)

Covers 10.5c.1–10.5c.4: SEO & Growth re-skins (seo-pulse, seo-impact,
niche-tracker, ai-citations, authority, tier1-review), Content Ops re-skins
(updates/Knowledge Room, tools, freshness, daily, activity), the Pipeline
Health re-skin (F12 monitors + missing-pipelines rows kept), and the page
merges (journey → user-360 "Journey" tab; insights/health → /admin/health).
This is the final Phase-5 sub-PR — every admin page is now on the shared
shell/kit presentation.

## Result

| Check | Result |
| --- | --- |
| Pinned keys compared (shared) | 51 / 51 |
| Keys byte-identical | **51 — zero numeric drift from any re-skin/merge** |
| New keys / removed keys | 0 / 0 |
| Snapshot errors / nondeterministic | 0 / 0 |
| Filter-matrix verifier | 15 combos × 2 + 6 extended checks = **36 / 36 GREEN** |
| Authed smoke (dev server :3003, real admin session) | **37 / 37** — 33 nav+extra routes `200`, Journey tab `200`, all 3 redirect stubs `307` (none bounced to /login), 0 × 5xx |
| `npx tsc --noEmit` (per unit) | clean after every unit commit |
| `npm run build` | exit 0, compiled successfully; all re-skinned/merged routes in the manifest |

No query module was touched in 5c (re-skin = presentation only), so the
snapshot identity is expected — and now proven rather than assumed.

## What "re-skin" meant here (per page)

Recipe: `PageHeader` breadcrumb header (right slot carries the page's
controls) + kit `MetricCard`s where values are plain numbers + kit-styled
cards (identical classes, string-capable) where tiles carry strings/tones +
`MetricInfo` ⓘ provenance popovers on every headline number + an on-page
note wherever the global filter bar deliberately does not apply.

**22 new `lib/admin/metric-docs.ts` entries**, each citing a real Phase-1
audit verdict or finding: seo_pulse_wow, seo_pulse_queue, seo_impact_summary,
niche_tracker_summary, ai_citations_kpis, authority_summary, tier1_queue,
kr_catalog_state, kr_user_activity, kr_activity_feed, kr_pipeline_results,
kr_pipeline_cost (F8), kr_health_score, tools_catalog_freshness,
freshness_field_map, daily_checklist, pipeline_health_kpis, pipeline_sla
(F12), pipeline_monitors (F12), catalog_freshness_sla, event_capture_health,
mixpanel_volume_budget.

## Pages intentionally left on custom controls (and why)

| Page | Custom control kept | Why |
| --- | --- | --- |
| seo-pulse | GSC snapshot pairing (latest two weekly snapshots per scope) | WoW deltas are defined by snapshot succession, not an arbitrary range |
| seo-impact | Fixed +28d measurement window | The measurement protocol is pinned by design |
| niche-tracker | Latest weekly snapshot view | niche_page_latest is snapshot-anchored |
| ai-citations | Fixed rolling 30d KPI SQL window | The doc-11 KPI target is defined as 30d |
| tier1-review | Bucket/constraint filter links over a generated JSON file | The queue is a build artifact, not a windowed metric |
| tools | stale/aging/draft tabs | Catalog management states, not time windows |
| daily | Pinned to today (IST midnight) | A checklist for another date makes no sense |
| activity | Its own rolling today=24h/7d/30d + `?from` window | It inherits the Knowledge Room "view all" link's window; swapping to the calendar picker would change row sets |
| health (+ ported event panels) | Now-anchored windows (last run, 24h/7d, F12 cadence SLAs, 24h/7d/30d fire counts) | Health is about NOW |
| updates (Knowledge Room) | Keeps its proven RangePicker (now declared as the `range` capability in nav.ts); health-score + $5/day red-flag sections stay now-anchored | F9/F8 audited semantics preserved verbatim |

Date-ranged capabilities declared in nav.ts: `updates` and `authority` →
`['range']` (their RangePicker pages). Everything else in these sections is
`[]` with the reason stated on-page.

## activity ↔ daily merge decision: KEEP BOTH

Evaluated merging /admin/activity into /admin/daily — **kept separate**.
Despite the similar names they share **zero data sources**:

- **activity** = pipeline activity drill-down over `refresh_logs` + `tools`
  (tools refreshed / newly added / "Latest from" rebuilt) — the Knowledge
  Room "view all →" target, full lists capped at 500.
- **daily** = the human growth-loop checklist over `referring_domains` +
  `outreach_log` (RDs logged, outreach sent, HARO replies), pinned to today.

Merging would bolt a 500-row pipeline feed onto a 5-item human checklist —
different tables, different windows, different jobs. Rationale recorded in
both page headers and here. (activity gained a type-switcher in the re-skin;
same three queries.)

## Merges executed (10.5c.4)

- **`/admin/insights/user/[distinct_id]`** now has **Profile / Journey
  tabs** (`?tab=journey`): Journey = sessions timeline (30-min idle rule,
  Clarity replay links) + flat event log; Profile = identity, computed
  traits, per-user live stream. Same three queries as before — the page was
  split into tabs, nothing removed.
- **`/admin/insights/journey/[distinct_id]`** → `redirect()` to the Journey
  tab (it already aliased the user page; now it lands on the right tab).
- **`/admin/insights/journey`** (index) → `redirect()` to
  `/admin/insights/users` — the Phase-5a Users directory (paginated,
  sortable, filter-bar-aware) strictly supersedes the old 5,000-row
  scan-and-group journeys list.
- **`/admin/insights/health`** → `redirect()` to `/admin/health`, with ALL
  its panels ported as the **"Event capture health"** section: Mixpanel
  free-tier volume budget (getVolumeProjection), per-event freshness +
  super-property completeness table (getEventHealth), dead-events list.
  Same audited (volatile-section) queries. While porting, the event links'
  stale `?event_name=…&days=7` param was fixed to the explorer's real
  `?event=` param.
- **Old-href sweep:** insights inner-tab "Journeys" → "Users"; live-feed
  journey links → `user/[id]?tab=journey`; insights "Health" chip →
  `/admin/health`; check-orphans console message updated. Grep confirms no
  remaining live links to the old routes (only comments + the smoke's
  intentional redirect probes).

## Authed smoke (REQUIRED gate) — detail

`npx next dev -p 3003` + `scripts/audit/authed-smoke.ts --base-url=http://localhost:3003`
with a disposable magic-link admin session: every nav route from
`lib/admin/nav.ts` + extras `200`; new probes added for this gate —
`/admin/insights/user/<unknown-id>?tab=journey` `200` (empty-state, no 5xx),
`/admin/insights/journey/<id>` `307`, `/admin/insights/journey` `307`,
`/admin/insights/health` `307`. Disposable user cleaned up.

## Deferred

- F8 cost instrumentation (populate ctx.recordTokens/recordApifyUsd in
  pipeline handlers) — the honest "Not instrumented" states on updates +
  health flip to real numbers automatically once it lands.
- Kit `SectionHeading` has no icon/info slots, so the Knowledge Room keeps a
  page-local Section header (same look) — consider extending the kit when a
  third page needs iconed sections.
- /admin/tracking-health gets its full rebuild in Phase 9 (per plan); the
  ported event-capture section on /admin/health is its interim home for
  per-event trust.
