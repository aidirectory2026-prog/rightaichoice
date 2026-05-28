-- Phase 9 (2026-05-28) — returning-visitor analytics.
--
-- Two RPCs powering a new "Returning users" admin panel:
--
-- 1) insights_returning_visitors(p_cutoff, p_include_bots)
--      Summary: total active visitors in window, of which N are new
--      (first_seen inside window) and N are returning (first_seen BEFORE
--      window). Plus a returning-rate % and the average days-between
--      first-and-last seen for the returning cohort.
--
-- 2) insights_recent_visitors(p_limit, p_include_bots)
--      Per-visitor table — distinct_id, optional user_id, first_seen,
--      last_seen, total_events, active_days, is_returning. Ordered by
--      most-recently-active.
--
-- Why user_events (not user_intent_profile): the profile table only has
-- a row when an engagement event fires (search, plan, save) so it
-- under-counts the ~95% of visitors who only view pages. Computing
-- min/max(created_at) per distinct_id over user_events gives the true
-- recency for every visitor.

create or replace function public.insights_returning_visitors(
  p_cutoff timestamptz, p_include_bots boolean default false
)
returns table(
  total_visitors bigint,
  new_visitors bigint,
  returning_visitors bigint,
  returning_pct numeric(5, 1),
  avg_days_between numeric(10, 1)
)
language sql security definer set search_path = public
as $$
  with per_visitor as (
    select
      distinct_id,
      min(created_at) as first_seen,
      max(created_at) as last_seen
    from user_events
    where p_include_bots or not bot_likely
    group by distinct_id
  ),
  active_in_window as (
    select * from per_visitor where last_seen >= p_cutoff
  )
  select
    count(*)::bigint as total_visitors,
    count(*) filter (where first_seen >= p_cutoff)::bigint as new_visitors,
    count(*) filter (where first_seen < p_cutoff)::bigint as returning_visitors,
    case when count(*) > 0
      then round(100.0 * count(*) filter (where first_seen < p_cutoff) / count(*)::numeric, 1)
      else 0
    end as returning_pct,
    case when count(*) filter (where first_seen < p_cutoff) > 0
      then round(
        (avg(extract(epoch from (last_seen - first_seen)) / 86400)
          filter (where first_seen < p_cutoff))::numeric,
        1
      )
      else null
    end as avg_days_between
  from active_in_window;
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
    -- Pick any non-null user_id seen for this browser (usually one).
    max(user_id) filter (where user_id is not null) as user_id,
    min(created_at) as first_seen,
    max(created_at) as last_seen,
    count(*)::bigint as total_events,
    count(distinct date_trunc('day', created_at))::int as active_days,
    (max(created_at) - min(created_at) > interval '1 hour') as is_returning
  from user_events
  where p_include_bots or not bot_likely
  group by distinct_id
  order by max(created_at) desc
  limit p_limit;
$$;

revoke all on function public.insights_returning_visitors(timestamptz, boolean) from public;
revoke all on function public.insights_recent_visitors(int, boolean) from public;
grant execute on function public.insights_returning_visitors(timestamptz, boolean) to anon, authenticated, service_role;
grant execute on function public.insights_recent_visitors(int, boolean) to anon, authenticated, service_role;
