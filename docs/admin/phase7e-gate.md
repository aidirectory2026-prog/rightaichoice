# Phase 10.7e Gate — Scale prep (rollups · reconciliation invariant · indexes)

Date: 2026-06-13 · Branch: `phase10-admin` · Spec: Phase 10 plan §7e + §5 (verification-mean #5)

## What shipped

| Unit | Migration | Contents |
| --- | --- | --- |
| 10.7e.1 | **163** | Hourly pg_cron trend rollups: `event_rollup_daily` (additive per-IST-day event counts; dims event_name/bot_likely/device_type/traffic_channel/country) + `dau_rollup_daily` (distinct visitors per IST day, own grain). `compute_event_rollups(p_days)` idempotently recomputes the trailing window and UPSERTs. Hourly cron `event-rollups-hourly` (`10 * * * *`) passes 3 days. Full history backfilled once at migrate time. |
| 10.7e.2 | **164** | Rollup-vs-raw reconciliation invariant (verification-mean #5): added `I13a` (daily event-count) + `I13b` (daily DAU) to `run_tracking_invariants()`. Also refreshed the stale `I11` `v_known_events` array to the live 101-name registry (it predated the 7b/7c merge and was false-failing on `error_encountered`+`web_vitals`). |
| 10.7e.3 | **165** | Partial composite index `user_events_human_event_created_idx` on `(event_name, created_at DESC) WHERE bot_likely = false` — serves the dominant human-only-by-event count pattern. Applied CONCURRENTLY (no write lock on the hot ingest table). |

Migrations applied to live PROD via MCP `apply_migration` (project `adtznghodbgkvknilfln`).

## Design — source of truth stays RAW (hard gate)

The dashboards are **NOT** rewired to read the rollups in 7e. That would move
the pinned snapshot numbers and break the byte-identical gate. The rollups are
(a) an accelerant the dashboard queries can adopt in a later phase, and (b) the
reconciliation target for I13. They must stay exactly equal to the raw
aggregation they mirror — which I13a/I13b assert nightly.

Two grains because distinct-counts are not additive across dimensions:
`event_rollup_daily` sums freely over any dimension; `dau_rollup_daily` is its
own `(day_ist, bot_likely)` grain mirroring `insights_daily_active_users`
(same IST `date_trunc` boundary, same bot filter → exact reconciliation).

Idempotency: `compute_event_rollups(p_days)` deletes+reinserts the trailing
`event_rollup_daily` window (so vanished dimension tuples don't linger) and
UPSERTs `dau_rollup_daily`. Safe to re-run; late-arriving rows self-heal on the
next hourly pass. Hourly cron recomputes the last **3** IST days (cheap; covers
clock skew + the IST/UTC 5.5h day straddle); backfill ran the full span once.

## pg_cron job registered

| jobid | jobname | schedule | command |
| --- | --- | --- | --- |
| 9 | `event-rollups-hourly` | `10 * * * *` (hourly at :10, offset from the :00 prune/heartbeat jobs) | `select public.compute_event_rollups(3);` |

## Verification results (all 8 gates green)

1. **`npm run tracking:schema`** — green: 147 defined, **97 fired = 97
   schema'd**, 50 planned, 23 admin-consumed, 0 warnings. Callsites gen file
   regenerated identically (no drift).
2. **`npm run tracking:synthetic` (full)** — **97/97 events verified** (22
   browser / 75 payload), runtime 120.9s. Dedup probe **3/3** (deterministic
   insert_ids → 1 row each). Negative test (page_viewed numeric path) PASS:
   row landed `schema_valid=false` + issues (tag-don't-drop). Channel probes
   (browser paid + payload ai) PASS. Cleanup: suite deleted its `e2e-…` rows
   and **verified 0 remain**; dev server it started was stopped.
3. **Snapshot oracle** vs `docs/admin/baselines/post-phase7bc.json` (pinned
   week 2026-06-01→07): re-ran `snapshot-admin-metrics.ts --label=verify-7e`
   then `diff-baselines.ts` → **0 changed, 0 added, 0 removed** (53/53 pinned
   byte-identical). Rollups + index are additive; dashboards unchanged. Temp
   `verify-7e.json` deleted; proper `baselines/post-phase7e.json` committed.
4. **`npm run tracking:filters`** — 15 combos × 2 assertions + 6 extended
   checks = **36/36 ALL GREEN**.
5. **Authed smoke** (`scripts/audit/authed-smoke.ts` vs local prod server,
   `npm run build` + `npm run start` on :3000) — **all 36 routes 200/307**;
   server stopped after.
6. **`npm run build`** — exit 0, full route table rendered, no errors.
7. **Reconciliation invariant** — ran `run_tracking_invariants()` on
   backfilled history: **I13a `pass` (0)**, **I13b `pass` (0)** (and I11 now
   `pass`). See below.
8. **No stray processes / rows** — no `next dev`/`next start`/headless
   Chromium left; no test users/rows (e2e cleanup verified 0; rollup backfill
   uses no probe rows).

## Reconciliation result (verification-mean #5)

`run_tracking_invariants()` latest run (2026-06-13), the two new checks:

| check_key | status | value | meaning |
| --- | --- | --- | --- |
| `I13a_rollup_event_count_recon` | **pass** | 0 | complete IST days (last 30, excl today) where `event_rollup_daily` total ≠ raw `user_events` count |
| `I13b_rollup_dau_recon` | **pass** | 0 | complete IST days where `dau_rollup_daily` distinct visitors ≠ raw `count(distinct distinct_id)` per bot flag |

Tolerance / current-hour handling: I13 compares ONLY **complete IST days
strictly before today** (`day_ist < today_ist`). Those days are immutable and
the hourly job has converged on them, so the ≤1h cron lag and the still-
accumulating current day never false-alarm. Within that window the match is
**exact** (tolerance = 0 diverging days); any divergence → `status='fail'`.

Independent spot-check (DAU rollup vs `insights_daily_active_users(60,false)`
joined per IST day, excl today): **24/24 days matching, 0 mismatched**.

**3-day streak — deferred forward (cannot complete in one session).** The plan
gate's "rollup invariant green 3 consecutive days" is inherently multi-day. It
is now wired into the nightly `tracking-invariants-nightly` cron (jobid 1,
`30 19 * * *`) and proven green ONCE here on backfilled history. The 3
consecutive nightly observations accrue forward; the watchdog
(`scripts/audit/tracking-watchdog.ts` check E) already surfaces any
`tracking_health` fail out-of-band.

## Index evidence — EXPLAIN ANALYZE before / after

Representative heavy query (dominant tile pattern: human-only count of one
event over a 30-day window):

```sql
select count(*) from user_events
where event_name = 'page_viewed'
  and created_at >= now() - interval '30 days' and created_at < now()
  and bot_likely = false;
```

**BEFORE** (existing `user_events_bot_likely_created_idx` = `(bot_likely, created_at)`):

```
Aggregate (actual time=5.045..5.046)  Buffers: shared hit=2205
  -> Index Scan using user_events_bot_likely_created_idx (rows=1380)
       Index Cond: (bot_likely=false AND created_at>=… AND created_at<…)
       Filter: (event_name = 'page_viewed')
       Rows Removed by Filter: 7702        ← 9082 scanned to return 1380
Execution Time: 5.142 ms
```

**AFTER** (new partial `user_events_human_event_created_idx` = `(event_name, created_at DESC) WHERE bot_likely=false`):

```
Aggregate (actual time=1.835..1.836)  Buffers: shared hit=682
  -> Index Only Scan using user_events_human_event_created_idx (rows=1380)
       Index Cond: (event_name='page_viewed' AND created_at>=… AND created_at<…)
       Heap Fetches: 966
Execution Time: 1.917 ms
```

Result: **Index Only Scan, 0 rows removed by filter** (was 7702), buffers
**2205 → 682 (-69%)**, exec **5.14 → 1.92 ms (-63%)**. The win compounds with
scale — the old plan's filter-removal cost grows linearly with total human
traffic; the new plan seeks straight to the event's window rows. The partial
`WHERE bot_likely=false` keeps the index small (excludes ~85% bot tool-visit
traffic) and write-amplification low (event_name/created_at are set at insert,
no later UPDATE churn).

The planner picks the right index per query shape (verified):
- event-pinned human counts → **this** index (also rides the per-tool slug
  query: `tool_page_viewed` + window via Bitmap Index Scan, ~306 heap rows
  rechecked, 1.1 ms);
- all-events human grouping (top-events, no event pin) → still
  `user_events_bot_likely_created_idx` (event_name can't lead → correct);
- include-bots single event → `user_events_event_name_created_at_idx`.

**Considered + rejected:** an expression index on `(properties->>'tool_slug')`.
The per-tool query already rides the new index for the event+window seek,
leaving only ~306 heap rows to recheck — not worth a new index's write cost on
the hot ingest table at current/near-term scale.

## Iron rule (7d) compliance

No event/property work in 7e — registry stays **97 fired = 97 schema'd**
(verified gate 1). The only registry-adjacent change is refreshing the
`I11` invariant's hardcoded known-event array to match the live registry
(read from `lib/analytics-schema.ts` `SCHEMA_EVENT_NAMES`), which fixed a
pre-existing false-fail introduced by the 7b/7c merge.

## Deferred (explicitly)

1. **Rollup invariant 3-day streak** — multi-day by nature; wired into the
   nightly cron and proven green once on history. Streak accrues forward.
2. **Rewiring dashboards onto the rollups** — out of scope for 7e (would move
   the snapshot). Rollups are accelerant + reconciliation target only; a later
   phase can swap the trend queries to read them once the snapshot oracle is
   re-pinned.
3. **Privacy/retention note (IP + UA)** — documented in Resources (Phase 8)
   per plan §7e, not here.
