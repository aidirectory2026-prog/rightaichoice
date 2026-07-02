-- 187: Retention + Paths (Phase 14b Wave 4).
--
-- The last two big Mixpanel screens:
--
--   insights_retention — classic cohort grid. Cohort = a visitor's FIRST
--   qualifying event inside the window (IST day/week bucket); retained =
--   any (or a specific) qualifying event in bucket N. v1 keys on distinct_id
--   (no cross-device stitch — same convention as insights_session_breakdown;
--   a visitor whose true first visit predates the window shows as new here).
--
--   insights_event_paths — session-scoped event→event transitions (30-min
--   idle gap per distinct_id, same reconstruction as mig 182), optionally
--   rooted at an anchor event, walking after/before it up to p_depth steps.
--   Feeds the clickable "what do people do after X?" tree.
--
-- Both honour the shared predicate → range/bots/every dimension/cohort/person
-- pins apply automatically.

-- ── 1. Retention grid ────────────────────────────────────────────────────
create or replace function public.insights_retention(
  p_cutoff timestamptz,
  p_end timestamptz,
  p_include_bots boolean default false,
  p_filters jsonb default null,
  p_first_event text default null,
  p_return_event text default null,
  p_period text default 'week'
)
returns table(cohort_start date, cohort_size bigint, period_index integer, retained bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_period not in ('day', 'week') then
    raise exception 'Unsupported period: %', p_period;
  end if;
  return query
  with ev as (
    select ue.distinct_id, ue.created_at, ue.event_name
    from user_events ue
    where ue.created_at >= p_cutoff and ue.created_at < p_end
      and (p_include_bots or not ue.bot_likely)
      and insights_apply_filters(ue, p_filters)
  ),
  firsts as (
    select e.distinct_id, min(e.created_at) as first_at
    from ev e
    where p_first_event is null or e.event_name = p_first_event
    group by 1
  ),
  cohorts as (
    select f.distinct_id,
           (date_trunc(p_period, f.first_at at time zone 'Asia/Kolkata'))::date as cstart
    from firsts f
  ),
  rets as (
    select distinct e.distinct_id,
           (date_trunc(p_period, e.created_at at time zone 'Asia/Kolkata'))::date as rbucket
    from ev e
    where p_return_event is null or e.event_name = p_return_event
  ),
  grid as (
    select c.cstart,
           case when p_period = 'week' then ((r.rbucket - c.cstart) / 7)::int
                else (r.rbucket - c.cstart)::int end as pidx,
           count(distinct c.distinct_id) as retained
    from cohorts c
    join rets r on r.distinct_id = c.distinct_id and r.rbucket >= c.cstart
    group by 1, 2
  ),
  sizes as (
    select c.cstart, count(*) as csize from cohorts c group by 1
  )
  select s.cstart as cohort_start, s.csize::bigint as cohort_size,
         g.pidx as period_index, g.retained::bigint as retained
  from sizes s
  join grid g on g.cstart = s.cstart
  order by s.cstart, g.pidx;
end;
$function$;

revoke all on function public.insights_retention(timestamptz, timestamptz, boolean, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.insights_retention(timestamptz, timestamptz, boolean, jsonb, text, text, text) to service_role;

-- ── 2. Event paths (session-scoped transitions) ─────────────────────────
create or replace function public.insights_event_paths(
  p_cutoff timestamptz,
  p_end timestamptz,
  p_include_bots boolean default false,
  p_filters jsonb default null,
  p_anchor text default null,
  p_direction text default 'after',
  p_depth integer default 4,
  p_limit integer default 50
)
returns table(depth integer, from_event text, to_event text, transitions bigint, visitors bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_direction not in ('after', 'before') then
    raise exception 'Unsupported direction: %', p_direction;
  end if;
  return query
  with base as (
    select ue.distinct_id, ue.created_at, ue.event_name
    from user_events ue
    where ue.created_at >= p_cutoff and ue.created_at < p_end
      and (p_include_bots or not ue.bot_likely)
      and insights_apply_filters(ue, p_filters)
  ),
  marked as (
    select *,
      case
        when lag(created_at) over (partition by distinct_id order by created_at) is null
          or extract(epoch from (created_at - lag(created_at) over (partition by distinct_id order by created_at))) > 30 * 60
        then 1 else 0
      end as is_new
    from base
  ),
  sessioned as (
    select *,
      sum(is_new) over (partition by distinct_id order by created_at rows between unbounded preceding and current row) as session_num
    from marked
  ),
  ordered as (
    select distinct_id, session_num, event_name, created_at,
      row_number() over (partition by distinct_id, session_num order by created_at) as rn
    from sessioned
  ),
  -- position of the FIRST anchor occurrence in each session (null anchor →
  -- the session's first event is the anchor, so depth 1 = first transition).
  anchors as (
    select distinct_id, session_num,
           case when p_anchor is null then 1
                else min(rn) filter (where event_name = p_anchor) end as anchor_rn
    from ordered
    group by 1, 2
  ),
  pairs as (
    select o.distinct_id,
      case when p_direction = 'after' then (o.rn - a.anchor_rn)
           else (a.anchor_rn - o.rn) end as d,
      case when p_direction = 'after'
           then lag(o.event_name) over (partition by o.distinct_id, o.session_num order by o.rn)
           else lead(o.event_name) over (partition by o.distinct_id, o.session_num order by o.rn) end as from_ev,
      o.event_name as to_ev
    from ordered o
    join anchors a on a.distinct_id = o.distinct_id and a.session_num = o.session_num
    where a.anchor_rn is not null
  )
  select p.d::int as depth, p.from_ev as from_event, p.to_ev as to_event,
         count(*)::bigint as transitions,
         count(distinct p.distinct_id)::bigint as visitors
  from pairs p
  where p.d between 1 and p_depth and p.from_ev is not null
  group by p.d, p.from_ev, p.to_ev
  order by p.d, transitions desc, to_event
  limit p_limit * p_depth;
end;
$function$;

revoke all on function public.insights_event_paths(timestamptz, timestamptz, boolean, jsonb, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.insights_event_paths(timestamptz, timestamptz, boolean, jsonb, text, text, integer, integer) to service_role;
