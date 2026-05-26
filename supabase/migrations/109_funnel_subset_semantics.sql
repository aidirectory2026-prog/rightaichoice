-- Phase 8.h fix — funnel steps must be a strict subset of the prior step,
-- not independent event counts. Otherwise step N can exceed step N-1 when
-- a user clicks visit-button on a tool page where tool_page_viewed was
-- blocked by an ad-blocker, or before the tracking fix shipped, etc.
--
-- Replaces the version from 108_insights_smart_boards.sql with a "reached
-- this step or further" semantic that guarantees monotonic decrease.
create or replace function public.insights_funnel_steps(
  p_days int default 7,
  p_include_bots boolean default false,
  p_country text default null,
  p_device text default null
)
returns table(
  step_index int,
  step_name text,
  step_event text,
  unique_users int,
  total_events int,
  pct_of_step_1 numeric
)
language sql security definer set search_path = public
as $$
  with cutoff as (
    select now() - make_interval(days => p_days) as t
  ),
  base as (
    select e.distinct_id, e.event_name, e.created_at
    from user_events e, cutoff c
    where e.created_at >= c.t
      and (p_include_bots or e.bot_likely = false)
      and (p_country is null or e.country = p_country)
      and (p_device is null or e.device_type = p_device)
  ),
  per_user as (
    select distinct_id,
      count(*) filter (where event_name = 'page_viewed')::int as n_landed,
      count(*) filter (where event_name = 'tool_page_viewed')::int as n_tool_view,
      count(*) filter (where event_name in ('tool_visit_redirected', 'tool_visit_clicked'))::int as n_click,
      count(*) filter (where event_name = 'signup_completed')::int as n_signup
    from base
    group by distinct_id
  ),
  steps_subset as (
    select 1 as idx, 'Landed on site' as name, 'page_viewed' as ev,
      count(*) filter (where n_landed > 0 or n_tool_view > 0 or n_click > 0 or n_signup > 0)::int as uniq,
      sum(n_landed)::int as total
    from per_user
    union all
    select 2, 'Viewed a tool page', 'tool_page_viewed',
      count(*) filter (where n_tool_view > 0 or n_click > 0 or n_signup > 0)::int,
      sum(n_tool_view)::int
    from per_user
    union all
    select 3, 'Clicked visit button', 'tool_visit_redirected',
      count(*) filter (where n_click > 0 or n_signup > 0)::int,
      sum(n_click)::int
    from per_user
    union all
    select 4, 'Signed up', 'signup_completed',
      count(*) filter (where n_signup > 0)::int,
      sum(n_signup)::int
    from per_user
  ),
  step1 as (select uniq from steps_subset where idx = 1)
  select
    s.idx::int, s.name, s.ev,
    coalesce(s.uniq, 0)::int as unique_users,
    coalesce(s.total, 0)::int as total_events,
    case when coalesce((select uniq from step1), 0) > 0
      then round(100.0 * coalesce(s.uniq, 0) / (select uniq from step1), 1)
      else 0::numeric end as pct_of_step_1
  from steps_subset s
  order by s.idx;
$$;
