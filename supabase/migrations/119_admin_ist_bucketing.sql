-- Phase 9 follow-up (2026-05-28) — IST-aligned date bucketing for admin.
--
-- The founder runs admin from IST. UTC-truncated days mean "DAU today"
-- silently misses every event between IST midnight and IST 05:30 (the
-- UTC-day boundary), and the DAU chart's "today" column is always behind
-- by 5.5 hours.
--
-- Two RPCs needed updating:
--   • insights_daily_active_users — chart of daily uniques. Now buckets
--     by IST calendar day instead of UTC.
--   • insights_recent_visitors    — per-visitor table's `active_days`
--     count. Counts distinct IST calendar days instead of UTC.

create or replace function public.insights_daily_active_users(
  p_days int, p_include_bots boolean default false
)
returns table(day text, users bigint)
language sql security definer set search_path = public
as $$
  with daily as (
    select
      to_char(date_trunc('day', created_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') as day,
      count(distinct distinct_id) as users
    from user_events
    where created_at >= now() - (p_days || ' days')::interval
      and (p_include_bots or not bot_likely)
    group by 1
  )
  select day, users from daily order by day;
$$;

create or replace function public.insights_recent_visitors(
  p_limit int default 50, p_include_bots boolean default false
)
returns table(
  distinct_id text,
  user_id uuid,
  first_seen timestamptz,
  last_seen timestamptz,
  total_events bigint,
  active_days int,
  is_returning boolean
)
language sql security definer set search_path = public
as $$
  select
    distinct_id,
    (min(user_id::text) filter (where user_id is not null))::uuid as user_id,
    min(created_at) as first_seen,
    max(created_at) as last_seen,
    count(*)::bigint as total_events,
    count(distinct date_trunc('day', created_at at time zone 'Asia/Kolkata'))::int as active_days,
    (max(created_at) - min(created_at) > interval '1 hour') as is_returning
  from user_events
  where p_include_bots or not bot_likely
  group by distinct_id
  order by max(created_at) desc
  limit p_limit;
$$;
