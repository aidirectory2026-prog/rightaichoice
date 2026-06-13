-- 163 (Phase 10.7e.1, 2026-06-13) — hourly pre-aggregated trend rollups.
--
-- WHY: /admin/insights recomputes per-IST-day trend aggregates from raw
-- public.user_events on EVERY dashboard load (insights_daily_active_users,
-- insights_top_events, insights_events_by_device, insights_top_property for
-- traffic_channel). At 22k rows that is cheap; at millions it is a full
-- window scan + group-by per tile per page view. This migration pre-computes
-- those aggregates into rollup tables, refreshed hourly by pg_cron.
--
-- HARD GATE — SOURCE OF TRUTH STAYS RAW: dashboards are NOT rewired to read
-- these tables in 7e (that would move the pinned snapshot numbers). The
-- rollups are (a) an accelerant the dashboards can adopt later, and (b) the
-- reconciliation target for verification-mean #5 (migration 164). They must
-- stay byte-identical to the raw aggregation they mirror.
--
-- GRAINS (two, because distinct-counts cannot be summed across dimensions):
--   event_rollup_daily  — additive counts; PK (day_ist, event_name, bot_likely)
--                         + optional device_type / traffic_channel / country
--                         dimensions. Sums freely across any dimension.
--   dau_rollup_daily    — distinct visitors (distinct_id) per IST day, its own
--                         grain PK (day_ist, bot_likely). Mirrors the DAU RPC.
--
-- IST DAY: day_ist = date_trunc('day', created_at at time zone 'Asia/Kolkata')
-- cast to date — the SAME boundary insights_daily_active_users uses, so the
-- reconciliation is exact.
--
-- IDEMPOTENCY: compute_event_rollups(p_days) recomputes the trailing p_days
-- IST days from raw and UPSERTs (ON CONFLICT DO UPDATE). Safe to re-run any
-- number of times; late-arriving rows self-heal on the next hourly pass. The
-- hourly job recomputes the last 3 IST days (cheap, covers clock skew + the
-- IST/UTC 5.5h straddle); the migration backfills ALL history once.

-- ── Rollup tables ──────────────────────────────────────────────────────

create table if not exists public.event_rollup_daily (
  day_ist         date    not null,
  event_name      text    not null,
  bot_likely      boolean not null,
  device_type     text    not null default '',  -- '' = unknown/null bucket
  traffic_channel text    not null default '',
  country         text    not null default '',
  events          bigint  not null,
  updated_at      timestamptz not null default now(),
  primary key (day_ist, event_name, bot_likely, device_type, traffic_channel, country)
);
comment on table public.event_rollup_daily is
  'Phase 10.7e — hourly pre-aggregated per-IST-day event counts (accelerant + reconciliation target). Source of truth stays raw user_events.';

create index if not exists event_rollup_daily_day_idx
  on public.event_rollup_daily (day_ist);
create index if not exists event_rollup_daily_event_idx
  on public.event_rollup_daily (event_name, day_ist);

create table if not exists public.dau_rollup_daily (
  day_ist     date    not null,
  bot_likely  boolean not null,
  visitors    bigint  not null,  -- count(distinct distinct_id) on that IST day
  updated_at  timestamptz not null default now(),
  primary key (day_ist, bot_likely)
);
comment on table public.dau_rollup_daily is
  'Phase 10.7e — hourly pre-aggregated distinct visitors per IST day (own grain; distinct-counts are non-additive). Mirrors insights_daily_active_users.';

-- ── Recompute function (idempotent upsert) ──────────────────────────────
-- Recomputes the trailing p_days IST days from raw and upserts both rollups.
-- Deletes-then-reinserts the touched day partitions for event_rollup_daily so
-- dimension tuples that vanished (e.g. a country no longer present after a
-- correction) don't linger; dau uses straight upsert (fixed 2-row grain/day).

create or replace function public.compute_event_rollups(p_days integer default 3)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_from_day date := (date_trunc('day', now() at time zone 'Asia/Kolkata') )::date - (greatest(p_days,1) - 1);
begin
  -- event_rollup_daily — clear the recomputed window, then reinsert.
  delete from public.event_rollup_daily where day_ist >= v_from_day;
  insert into public.event_rollup_daily
    (day_ist, event_name, bot_likely, device_type, traffic_channel, country, events, updated_at)
  select
    (date_trunc('day', created_at at time zone 'Asia/Kolkata'))::date as day_ist,
    event_name,
    bot_likely,
    coalesce(device_type, '')                       as device_type,
    coalesce(properties->>'traffic_channel', '')    as traffic_channel,
    coalesce(country, '')                           as country,
    count(*)                                        as events,
    now()
  from public.user_events
  where (created_at at time zone 'Asia/Kolkata') >= (v_from_day::timestamp)
  group by 1,2,3,4,5,6;

  -- dau_rollup_daily — distinct visitors per IST day per bot flag.
  insert into public.dau_rollup_daily (day_ist, bot_likely, visitors, updated_at)
  select
    (date_trunc('day', created_at at time zone 'Asia/Kolkata'))::date as day_ist,
    bot_likely,
    count(distinct distinct_id) as visitors,
    now()
  from public.user_events
  where (created_at at time zone 'Asia/Kolkata') >= (v_from_day::timestamp)
  group by 1,2
  on conflict (day_ist, bot_likely) do update
    set visitors = excluded.visitors, updated_at = excluded.updated_at;
end;
$function$;

comment on function public.compute_event_rollups(integer) is
  'Phase 10.7e — recompute trailing p_days IST days of both rollup tables from raw user_events (idempotent). Hourly cron passes 3; backfill passes the full history span.';

-- ── One-time full backfill from existing raw history ────────────────────
-- 9999 days = "everything" (earliest event is 2026-05-20). Runs at migrate
-- time so the reconciliation invariant (164) is green immediately on history.
select public.compute_event_rollups(9999);

-- ── Hourly pg_cron job ──────────────────────────────────────────────────
-- Recompute the last 3 IST days every hour at :10 (offset from the :00
-- prune/heartbeat jobs to spread load). Idempotent, so a missed/overlapping
-- run is harmless.
select cron.schedule(
  'event-rollups-hourly',
  '10 * * * *',
  $cron$ select public.compute_event_rollups(3); $cron$
);
