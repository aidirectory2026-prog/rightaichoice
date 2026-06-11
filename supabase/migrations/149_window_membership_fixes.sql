-- Phase 10.2 (F2 + F10, 2026-06-11) — window-membership fixes.
--
-- Both insights_returning_visitors and insights_recent_visitors decided
-- "active in window" by the visitor's LIFETIME last event falling inside the
-- window — silently dropping anyone who was active in the window and came
-- back after it (audit: 637 truly active vs 633 reported for the June 1-7
-- week; the 4 dropped were exactly the most-engaged returners).
--
-- Fix: membership = has at least one event inside [start, end). Lifetime
-- first_seen is kept ONLY for the is_returning determination. For the
-- recent-visitors list, total_events/active_days are now WINDOW-scoped
-- (they were lifetime values labeled as window activity — F10).

-- ── insights_returning_visitors ─────────────────────────────────────────────
drop function if exists public.insights_returning_visitors(timestamp with time zone, boolean, timestamp with time zone, integer);
create function public.insights_returning_visitors(
  p_cutoff timestamptz,
  p_include_bots boolean default false,
  p_end timestamptz default null,
  p_days integer default 7
)
returns table(total_visitors bigint, new_visitors bigint, returning_visitors bigint, returning_pct numeric, avg_days_between numeric)
language sql
security definer
set search_path to 'public'
as $function$
  with v_cutoff as (
    select coalesce(p_cutoff, now() - (p_days || ' days')::interval) as c
  ),
  in_window as (
    select ue.distinct_id
    from user_events ue, v_cutoff v
    where ue.created_at >= v.c
      and (p_end is null or ue.created_at < p_end)
      and (p_include_bots or not ue.bot_likely)
    group by ue.distinct_id
  ),
  lifetime as (
    select ue.distinct_id,
           min(ue.created_at) as first_seen,
           max(ue.created_at) as last_seen
    from user_events ue
    join in_window iw on iw.distinct_id = ue.distinct_id
    where (p_include_bots or not ue.bot_likely)
    group by ue.distinct_id
  )
  select
    count(*)::bigint as total_visitors,
    count(*) filter (where first_seen >= (select c from v_cutoff))::bigint as new_visitors,
    count(*) filter (where first_seen < (select c from v_cutoff))::bigint as returning_visitors,
    case when count(*) > 0
      then round(100.0 * count(*) filter (where first_seen < (select c from v_cutoff)) / count(*)::numeric, 1)
      else 0
    end as returning_pct,
    case when count(*) filter (where first_seen < (select c from v_cutoff)) > 0
      then round(
        (avg(extract(epoch from (last_seen - first_seen)) / 86400)
          filter (where first_seen < (select c from v_cutoff)))::numeric, 1)
      else 0
    end as avg_days_between
  from lifetime;
$function$;
revoke all on function public.insights_returning_visitors(timestamptz, boolean, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.insights_returning_visitors(timestamptz, boolean, timestamptz, integer) to service_role;

-- ── insights_recent_visitors ────────────────────────────────────────────────
drop function if exists public.insights_recent_visitors(integer, boolean, timestamp with time zone, timestamp with time zone);
create function public.insights_recent_visitors(
  p_limit integer default 50,
  p_include_bots boolean default false,
  p_window_start timestamptz default null,
  p_end timestamptz default null
)
returns table(distinct_id text, user_id uuid, first_seen timestamp with time zone, last_seen timestamp with time zone, total_events bigint, active_days integer, is_returning boolean)
language sql
security definer
set search_path to 'public'
as $function$
  with in_window as (
    select ue.distinct_id,
           (min(ue.user_id::text) filter (where ue.user_id is not null))::uuid as w_user_id,
           min(ue.created_at) as w_first,
           max(ue.created_at) as w_last,
           count(*)::bigint as w_events,
           count(distinct date_trunc('day', ue.created_at at time zone 'Asia/Kolkata'))::int as w_days
    from user_events ue
    where (p_include_bots or not ue.bot_likely)
      and (p_window_start is null or ue.created_at >= p_window_start)
      and (p_end is null or ue.created_at < p_end)
    group by ue.distinct_id
  ),
  lifetime as (
    select ue.distinct_id, min(ue.created_at) as lt_first
    from user_events ue
    join in_window iw on iw.distinct_id = ue.distinct_id
    where (p_include_bots or not ue.bot_likely)
    group by ue.distinct_id
  )
  select
    iw.distinct_id,
    iw.w_user_id as user_id,
    lt.lt_first as first_seen,
    iw.w_last as last_seen,
    iw.w_events as total_events,   -- window-scoped (was lifetime — F10)
    iw.w_days as active_days,      -- window-scoped (was lifetime — F10)
    case
      when p_window_start is not null then (lt.lt_first < p_window_start)
      else (iw.w_last - lt.lt_first > interval '1 hour')
    end as is_returning
  from in_window iw
  join lifetime lt on lt.distinct_id = iw.distinct_id
  order by iw.w_last desc
  limit p_limit;
$function$;
revoke all on function public.insights_recent_visitors(integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_recent_visitors(integer, boolean, timestamptz, timestamptz) to service_role;
