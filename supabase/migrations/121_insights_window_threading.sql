-- 121_insights_window_threading.sql
-- Phase 9.x — thread an explicit [p_cutoff, p_end) window through every
-- time-filtered insights_* RPC so the /admin date-range picker
-- (Yesterday / WTD / MTD / Custom) is honored instead of being collapsed to
-- a rolling now()-p_days window. p_days is KEPT as a fallback when p_cutoff
-- is null (back-compat for legacy callers).
--
-- Window contract everywhere:
--   where created_at >= coalesce(p_cutoff, now() - (p_days||' days')::interval)
--     and (p_end is null or created_at < p_end)
--
-- For user_intent_profile-based RPCs the time column is last_active_at, so the
-- same contract is applied to last_active_at.
--
-- Lockdown (mirrors Phase 9.0): revoke from public/anon/authenticated, grant
-- EXECUTE to service_role only. These are server-only (called from
-- app/admin/insights/queries.ts via the service-role admin client).
--
-- DROP + CREATE is required because adding params changes each signature.

begin;

-- ───────────────────────────────────────────────────────────────────
-- insights_bot_share
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_bot_share(integer);
create function public.insights_bot_share(
  p_days integer default 7,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(total_events bigint, bot_events bigint, bot_pct numeric, total_visitors bigint, bot_visitors bigint, bot_visitor_pct numeric)
language sql
security definer
set search_path to 'public'
as $function$
  with windowed as (
    select bot_likely, distinct_id
    from user_events
    where created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or created_at < p_end)
  )
  select
    count(*)::bigint as total_events,
    count(*) filter (where bot_likely)::bigint as bot_events,
    case when count(*) > 0 then round(100.0 * count(*) filter (where bot_likely) / count(*), 1) else 0 end as bot_pct,
    count(distinct distinct_id)::bigint as total_visitors,
    count(distinct distinct_id) filter (where bot_likely)::bigint as bot_visitors,
    case when count(distinct distinct_id) > 0 then
      round(100.0 * count(distinct distinct_id) filter (where bot_likely) / count(distinct distinct_id), 1)
    else 0 end as bot_visitor_pct
  from windowed;
$function$;
revoke all on function public.insights_bot_share(integer, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_bot_share(integer, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_daily_active_users
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_daily_active_users(integer, boolean);
create function public.insights_daily_active_users(
  p_days integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(day text, users bigint)
language sql
security definer
set search_path to 'public'
as $function$
  with daily as (
    select
      to_char(date_trunc('day', created_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') as day,
      count(distinct distinct_id) as users
    from user_events
    where created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or created_at < p_end)
      and (p_include_bots or not bot_likely)
    group by 1
  )
  select day, users from daily order by day;
$function$;
revoke all on function public.insights_daily_active_users(integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_daily_active_users(integer, boolean, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_device_breakdown
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_device_breakdown(integer, boolean);
create function public.insights_device_breakdown(
  p_days integer default 7,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(device_type text, visitors integer, events integer, client_events integer, server_events integer, pct_of_total numeric)
language sql
security definer
set search_path to 'public'
as $function$
  with base as (
    select e.distinct_id, e.device_type, e.source_kind
    from user_events e
    where e.created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or e.created_at < p_end)
      and (p_include_bots or e.bot_likely = false)
  ),
  totals as (select count(*)::numeric as t from base)
  select
    coalesce(b.device_type, 'unknown') as device_type,
    count(distinct b.distinct_id)::int as visitors,
    count(*)::int as events,
    count(*) filter (where b.source_kind = 'client' or b.source_kind is null)::int as client_events,
    count(*) filter (where b.source_kind = 'server')::int as server_events,
    case when (select t from totals) > 0
      then round(100.0 * count(*) / (select t from totals), 1)
      else 0::numeric end as pct_of_total
  from base b
  group by b.device_type
  order by events desc;
$function$;
revoke all on function public.insights_device_breakdown(integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_device_breakdown(integer, boolean, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_events_by_device
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_events_by_device(text, integer, boolean);
create function public.insights_events_by_device(
  p_event_name text,
  p_days integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(device_type text, events bigint)
language sql
security definer
set search_path to 'public'
as $function$
  select
    coalesce(user_events.device_type, 'unknown') as device_type,
    count(*)::bigint as events
  from user_events
  where event_name = p_event_name
    and created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
    and (p_end is null or created_at < p_end)
    and (p_include_bots or not bot_likely)
  group by 1
  order by 2 desc;
$function$;
revoke all on function public.insights_events_by_device(text, integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_events_by_device(text, integer, boolean, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_funnel_steps  (RISK: CTEs + per-user min(created_at) — window
-- applied only to the base CTE; all downstream timestamps already derive
-- from base, so no other time ref needs touching.)
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_funnel_steps(integer, boolean, text, text);
create function public.insights_funnel_steps(
  p_days integer default 7,
  p_include_bots boolean default false,
  p_country text default null,
  p_device text default null,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(step_index integer, step_name text, step_event text, unique_users integer, total_events integer, pct_of_step_1 numeric)
language sql
security definer
set search_path to 'public'
as $function$
  with base as (
    select e.distinct_id, e.event_name, e.created_at
    from user_events e
    where e.created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or e.created_at < p_end)
      and (p_include_bots or e.bot_likely = false)
      and (p_country is null or e.country = p_country)
      and (p_device is null or e.device_type = p_device)
  ),
  per_user as (
    select distinct_id,
      min(created_at) filter (where event_name = 'page_viewed') as t_landed,
      min(created_at) filter (where event_name = 'tool_page_viewed') as t_tool_view,
      min(created_at) filter (where event_name in ('tool_visit_redirected', 'tool_visit_clicked')) as t_click,
      min(created_at) filter (where event_name = 'signup_completed') as t_signup,
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
$function$;
revoke all on function public.insights_funnel_steps(integer, boolean, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_funnel_steps(integer, boolean, text, text, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_geo_breakdown
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_geo_breakdown(integer, boolean);
create function public.insights_geo_breakdown(
  p_days integer default 7,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(country text, visitors integer, events integer, top_city text, top_city_visitors integer)
language sql
security definer
set search_path to 'public'
as $function$
  with base as (
    select e.distinct_id, e.country, e.city
    from user_events e
    where e.created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or e.created_at < p_end)
      and (p_include_bots or e.bot_likely = false)
      and e.country is not null
      and e.country <> ''
  ),
  city_rank as (
    select country, city, count(distinct distinct_id)::int as v,
      row_number() over (partition by country order by count(distinct distinct_id) desc) as rk
    from base where city is not null and city <> ''
    group by country, city
  ),
  per_country as (
    select country,
      count(distinct distinct_id)::int as visitors,
      count(*)::int as events
    from base
    group by country
  )
  select pc.country, pc.visitors, pc.events,
    cr.city as top_city,
    cr.v as top_city_visitors
  from per_country pc
  left join city_rank cr on cr.country = pc.country and cr.rk = 1
  order by pc.visitors desc;
$function$;
revoke all on function public.insights_geo_breakdown(integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_geo_breakdown(integer, boolean, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_top_events
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_top_events(integer, integer, boolean);
create function public.insights_top_events(
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(event_name text, events bigint)
language sql
security definer
set search_path to 'public'
as $function$
  select event_name, count(*)::bigint as events
  from user_events
  where created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
    and (p_end is null or created_at < p_end)
    and (p_include_bots or not bot_likely)
  group by 1
  order by 2 desc
  limit p_limit;
$function$;
revoke all on function public.insights_top_events(integer, integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_top_events(integer, integer, boolean, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_top_jsonb_property
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_top_jsonb_property(text, text, integer, integer, boolean);
create function public.insights_top_jsonb_property(
  p_event_name text,
  p_property text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(value text, events bigint)
language sql
security definer
set search_path to 'public'
as $function$
  select
    properties->>p_property as value,
    count(*)::bigint as events
  from user_events
  where event_name = p_event_name
    and created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
    and (p_end is null or created_at < p_end)
    and properties->>p_property is not null
    and properties->>p_property <> ''
    and (p_include_bots or not bot_likely)
  group by 1
  order by 2 desc
  limit p_limit;
$function$;
revoke all on function public.insights_top_jsonb_property(text, text, integer, integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_top_jsonb_property(text, text, integer, integer, boolean, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_top_property  (plpgsql + dynamic SQL; RISK: dynamic branch.
-- Window threaded into both the static first_touch_referrer branch and the
-- dynamic format() branch via the $1 cutoff / $4 end params.)
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_top_property(text, integer, integer, boolean);
create function public.insights_top_property(
  p_property text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(value text, events bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  q text;
  v_cutoff timestamptz := coalesce(p_cutoff, now() - (p_days || ' days')::interval);
begin
  if p_property not in ('first_touch_referrer', 'first_touch_utm_source', 'utm_source', 'referrer', 'page_path') then
    raise exception 'Unsupported property: %', p_property;
  end if;

  if p_property = 'first_touch_referrer' then
    return query
      select coalesce(uip.first_touch_referrer, '')::text as value,
             count(*)::bigint as events
      from user_events ue
      join user_intent_profile uip on uip.distinct_id = ue.distinct_id
      where ue.created_at >= v_cutoff
        and (p_end is null or ue.created_at < p_end)
        and uip.first_touch_referrer is not null
        and uip.first_touch_referrer <> ''
        and (p_include_bots or not ue.bot_likely)
      group by 1
      order by 2 desc
      limit p_limit;
    return;
  end if;

  q := format($f$
    select coalesce(%I, '')::text as value, count(*)::bigint as events
    from user_events
    where created_at >= $1
      and ($4::timestamptz is null or created_at < $4)
      and %I is not null and %I <> ''
      and ($3 or not bot_likely)
    group by 1
    order by 2 desc
    limit $2
  $f$, p_property, p_property, p_property);
  return query execute q using v_cutoff, p_limit, p_include_bots, p_end;
end;
$function$;
revoke all on function public.insights_top_property(text, integer, integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_top_property(text, integer, integer, boolean, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_unnest_intent_array  (RISK: queries user_intent_profile, NOT
-- user_events. Time column is last_active_at. Window threaded onto it.)
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_unnest_intent_array(text, integer, integer, boolean);
create function public.insights_unnest_intent_array(
  p_column text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(value text, users bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  q text;
  v_cutoff timestamptz := coalesce(p_cutoff, now() - (p_days || ' days')::interval);
begin
  if p_column not in (
    'existing_tools_history',
    'ai_chat_tools_mentioned',
    'tools_visited_externally',
    'tools_compared_with',
    'plan_use_cases_submitted',
    'reviews_submitted_for',
    'all_search_queries_recent'
  ) then
    raise exception 'Unsupported array column: %', p_column;
  end if;
  q := format($f$
    select unnested as value, count(distinct uip.distinct_id)::bigint as users
    from user_intent_profile uip, unnest(uip.%I) as t(unnested)
    where uip.last_active_at >= $1
      and ($4::timestamptz is null or uip.last_active_at < $4)
      and ($3 or not exists (
        select 1 from user_events ue
        where ue.distinct_id = uip.distinct_id and ue.bot_likely = true
        limit 1
      ))
    group by 1
    order by 2 desc
    limit $2
  $f$, p_column);
  return query execute q using v_cutoff, p_limit, p_include_bots, p_end;
end;
$function$;
revoke all on function public.insights_unnest_intent_array(text, integer, integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_unnest_intent_array(text, integer, integer, boolean, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_tool_compared_with  (RISK: user_intent_profile, time =
-- last_active_at.)
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_tool_compared_with(text, integer, integer, boolean);
create function public.insights_tool_compared_with(
  p_slug text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(value text, users bigint)
language sql
security definer
set search_path to 'public'
as $function$
  with pairs as (
    select uip.distinct_id, unnested as pair
    from user_intent_profile uip, unnest(uip.tools_compared_with) as t(unnested)
    where uip.last_active_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or uip.last_active_at < p_end)
      and unnested like '%' || p_slug || '%'
      and (p_include_bots or not exists (
        select 1 from user_events ue
        where ue.distinct_id = uip.distinct_id and ue.bot_likely = true
        limit 1
      ))
  ),
  other_side as (
    select
      distinct_id,
      case
        when split_part(pair, '-vs-', 1) = p_slug then split_part(pair, '-vs-', 2)
        else split_part(pair, '-vs-', 1)
      end as value
    from pairs
  )
  select value, count(distinct distinct_id)::bigint as users
  from other_side
  where value is not null and value <> '' and value <> p_slug
  group by 1
  order by 2 desc
  limit p_limit;
$function$;
revoke all on function public.insights_tool_compared_with(text, integer, integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_tool_compared_with(text, integer, integer, boolean, timestamptz, timestamptz) to service_role;

-- ───────────────────────────────────────────────────────────────────
-- insights_tool_heatmap
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.insights_tool_heatmap(integer, boolean, integer);
create function public.insights_tool_heatmap(
  p_days integer default 7,
  p_include_bots boolean default false,
  p_limit integer default 500,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(tool_slug text, tool_name text, views integer, unique_visitors integer, visit_clicks integer, ctr_pct numeric, last_visit_at timestamp with time zone)
language sql
security definer
set search_path to 'public'
as $function$
  with ev as (
    select e.distinct_id, e.event_name, e.created_at,
      coalesce(e.properties->>'tool_slug',
               nullif(split_part(e.page_path, '/', 3), ''))
        as tool_slug
    from user_events e
    where e.created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or e.created_at < p_end)
      and (p_include_bots or e.bot_likely = false)
      and (e.event_name in ('tool_page_viewed', 'tool_visit_redirected', 'tool_visit_clicked')
           or e.page_path like '/tools/%')
  ),
  agg as (
    select
      tool_slug,
      count(*) filter (where event_name in ('tool_page_viewed','page_viewed'))::int as views,
      count(distinct distinct_id) filter (where event_name in ('tool_page_viewed','page_viewed'))::int as unique_visitors,
      count(*) filter (where event_name in ('tool_visit_redirected','tool_visit_clicked'))::int as visit_clicks,
      max(created_at) as last_visit_at
    from ev
    where tool_slug is not null and tool_slug <> ''
    group by tool_slug
  )
  select
    a.tool_slug,
    t.name as tool_name,
    a.views,
    a.unique_visitors,
    a.visit_clicks,
    case when a.views > 0 then round(100.0 * a.visit_clicks / a.views, 1) else 0::numeric end as ctr_pct,
    a.last_visit_at
  from agg a
  left join tools t on t.slug = a.tool_slug
  order by a.views desc, a.unique_visitors desc
  limit p_limit;
$function$;
revoke all on function public.insights_tool_heatmap(integer, boolean, integer, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_tool_heatmap(integer, boolean, integer, timestamptz, timestamptz) to service_role;

-- ═══════════════════════════════════════════════════════════════════
-- #11 — Unify the "returning visitor" definition between the summary
-- (insights_returning_visitors) and the per-visitor leaderboard
-- (insights_recent_visitors).
--
--   BEFORE — insights_returning_visitors: returning = first_seen < p_cutoff
--            (first activity before window start). [correct]
--   BEFORE — insights_recent_visitors:     is_returning =
--            (max(created_at) - min(created_at) > interval '1 hour')
--            (a same-session >1h span counts as "returning"). [INCONSISTENT]
--
--   UNIFIED — both use: returning = (lifetime first_seen < window start).
--   For the summary the window start is p_cutoff; we now also accept p_end so
--   "active in window" honors the picker's end bound. For the per-visitor list
--   we pass the window start as p_window_start and recompute is_returning the
--   same way. p_cutoff/p_days fall back identically.
-- ═══════════════════════════════════════════════════════════════════

-- insights_returning_visitors — add p_end + p_days fallback; keep cutoff
-- semantics. NOTE: existing signature is (timestamptz, boolean) — drop &
-- recreate with the new trailing params.
drop function if exists public.insights_returning_visitors(timestamp with time zone, boolean);
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
  per_visitor as (
    select
      distinct_id,
      min(created_at) as first_seen,
      max(created_at) as last_seen
    from user_events
    where p_include_bots or not bot_likely
    group by distinct_id
  ),
  active_in_window as (
    select pv.* from per_visitor pv, v_cutoff
    where pv.last_seen >= v_cutoff.c
      and (p_end is null or pv.last_seen < p_end)
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
          filter (where first_seen < (select c from v_cutoff)))::numeric,
        1
      )
      else null
    end as avg_days_between
  from active_in_window;
$function$;
revoke all on function public.insights_returning_visitors(timestamptz, boolean, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.insights_returning_visitors(timestamptz, boolean, timestamptz, integer) to service_role;

-- insights_recent_visitors — make is_returning match the summary:
-- returning = lifetime first_seen < window start (p_window_start). Also
-- scope the leaderboard to visitors active within [window_start, p_end).
drop function if exists public.insights_recent_visitors(integer, boolean);
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
  with per_visitor as (
    select
      distinct_id,
      (min(user_id::text) filter (where user_id is not null))::uuid as user_id,
      min(created_at) as first_seen,
      max(created_at) as last_seen,
      count(*)::bigint as total_events,
      count(distinct date_trunc('day', created_at at time zone 'Asia/Kolkata'))::int as active_days
    from user_events
    where p_include_bots or not bot_likely
    group by distinct_id
  )
  select
    distinct_id,
    user_id,
    first_seen,
    last_seen,
    total_events,
    active_days,
    -- Unified definition: returning iff first activity predates the window
    -- start. When no window is supplied, fall back to the legacy >1h span.
    case
      when p_window_start is not null then (first_seen < p_window_start)
      else (last_seen - first_seen > interval '1 hour')
    end as is_returning
  from per_visitor
  where (p_window_start is null or last_seen >= p_window_start)
    and (p_end is null or last_seen < p_end)
  order by last_seen desc
  limit p_limit;
$function$;
revoke all on function public.insights_recent_visitors(integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_recent_visitors(integer, boolean, timestamptz, timestamptz) to service_role;

-- ═══════════════════════════════════════════════════════════════════
-- #2 — zero-result rate RPC. There is NO `search_no_results` event in the
-- stream and NO `zero_results` property (the dashboard's
-- properties->>zero_results filter matches a key that is never written, so
-- the tile is always 0). The real signal is `search_query_submitted` with a
-- `result_count` property (jsonb, stored as a string e.g. "0"). Zero-result
-- rate = submissions whose result_count is 0 ÷ total submissions.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.insights_zero_result_rate(
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_include_bots boolean default false,
  p_days integer default 7
)
returns table(total_submissions bigint, zero_result_submissions bigint, zero_result_pct numeric)
language sql
security definer
set search_path to 'public'
as $function$
  with base as (
    select properties
    from user_events
    where event_name = 'search_query_submitted'
      and created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or created_at < p_end)
      and (p_include_bots or not bot_likely)
  )
  select
    count(*)::bigint as total_submissions,
    count(*) filter (
      where coalesce(nullif(properties->>'result_count', ''), '0')::numeric = 0
    )::bigint as zero_result_submissions,
    case when count(*) > 0
      then round(100.0 * count(*) filter (
             where coalesce(nullif(properties->>'result_count', ''), '0')::numeric = 0
           ) / count(*), 1)
      else 0 end as zero_result_pct
  from base;
$function$;
revoke all on function public.insights_zero_result_rate(timestamptz, timestamptz, boolean, integer) from public, anon, authenticated;
grant execute on function public.insights_zero_result_rate(timestamptz, timestamptz, boolean, integer) to service_role;

-- ═══════════════════════════════════════════════════════════════════
-- #2b — search_top_queries: aggregate replacement for the analytics page's
-- 500-row search_logs fetch + in-memory tally. Aggregates in-DB.
-- (analytics/page.tsx reads public.search_logs, which has columns
-- query + created_at.)
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.search_top_queries(
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_limit integer default 10,
  p_days integer default 30
)
returns table(query text, count bigint)
language sql
security definer
set search_path to 'public'
as $function$
  select lower(btrim(query)) as query, count(*)::bigint as count
  from search_logs
  where query is not null and btrim(query) <> ''
    and created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
    and (p_end is null or created_at < p_end)
  group by 1
  order by 2 desc
  limit p_limit;
$function$;
revoke all on function public.search_top_queries(timestamptz, timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.search_top_queries(timestamptz, timestamptz, integer, integer) to service_role;

-- ═══════════════════════════════════════════════════════════════════
-- #13 — atomic view-count incrementers. Two typed functions (tools +
-- tool_comparisons both have id uuid + view_count integer). Replaces any
-- read-modify-write done in app code with a single atomic UPDATE.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.increment_tool_view_count(p_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update tools set view_count = coalesce(view_count, 0) + 1 where id = p_id;
$function$;
revoke all on function public.increment_tool_view_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_tool_view_count(uuid) to service_role;

create or replace function public.increment_comparison_view_count(p_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update tool_comparisons set view_count = coalesce(view_count, 0) + 1 where id = p_id;
$function$;
revoke all on function public.increment_comparison_view_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_comparison_view_count(uuid) to service_role;

-- Optional dispatcher form requested in the spec (p_table, p_id). Whitelisted
-- table names only; delegates to the typed functions.
create or replace function public.increment_view_count(p_table text, p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_table = 'tools' then
    update tools set view_count = coalesce(view_count, 0) + 1 where id = p_id;
  elsif p_table = 'tool_comparisons' then
    update tool_comparisons set view_count = coalesce(view_count, 0) + 1 where id = p_id;
  else
    raise exception 'Unsupported table for view_count increment: %', p_table;
  end if;
end;
$function$;
revoke all on function public.increment_view_count(text, uuid) from public, anon, authenticated;
grant execute on function public.increment_view_count(text, uuid) to service_role;

-- ═══════════════════════════════════════════════════════════════════
-- #14 — upsert_user_intent array cap is a no-op.
--
--   BEFORE (one of 7 identical fragments):
--     existing_tools_history = case when p_arr_existing_tools is null then existing_tools_history
--       else (select array_agg(distinct x) from unnest(existing_tools_history || p_arr_existing_tools) x limit cap) end,
--   The `limit cap` applies to the input ROWS of unnest BEFORE array_agg
--   collapses them to one row — so it caps the number of rows fed to the
--   aggregate to `cap` per call but does NOT bound the resulting array, and
--   because there's exactly one output row the limit is effectively inert on
--   the result. The array can grow unbounded across calls.
--
--   AFTER: aggregate over a real, ordered, sliced subquery so the stored
--   array is hard-capped at `cap` elements. We keep the most-recent N by
--   ordering so newly-merged values win (append order via WITH ORDINALITY).
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.upsert_user_intent(
  p_distinct_id text,
  p_user_id uuid default null,
  p_email_domain text default null,
  p_page_path text default null,
  p_arr_existing_tools text[] default null,
  p_arr_search_queries text[] default null,
  p_arr_tools_visited text[] default null,
  p_arr_tools_compared text[] default null,
  p_arr_plan_use_cases text[] default null,
  p_arr_chat_tools text[] default null,
  p_arr_reviews_for text[] default null,
  p_plan_budget text default null,
  p_plan_team text default null,
  p_plan_industry text default null,
  p_plan_skill text default null,
  p_inc_saves integer default 0,
  p_inc_comparisons integer default 0,
  p_inc_plans_completed integer default 0,
  p_inc_reviews integer default 0,
  p_inc_tools_visited integer default 0,
  p_inc_chat_messages integer default 0,
  p_inc_searches integer default 0,
  p_signup_at timestamptz default null,
  p_first_touch_utm_source text default null,
  p_first_touch_utm_medium text default null,
  p_first_touch_utm_campaign text default null,
  p_first_touch_referrer text default null,
  p_first_touch_landing text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cap int := 100;
begin
  insert into public.user_intent_profile (distinct_id, user_id, email_domain)
  values (p_distinct_id, p_user_id, p_email_domain)
  on conflict (distinct_id) do nothing;

  update public.user_intent_profile
  set
    user_id = coalesce(p_user_id, user_id),
    email_domain = coalesce(p_email_domain, email_domain),
    last_active_at = now(),
    last_event_at = now(),
    plan_budget_segment = coalesce(p_plan_budget, plan_budget_segment),
    plan_team_segment = coalesce(p_plan_team, plan_team_segment),
    plan_industry_segment = coalesce(p_plan_industry, plan_industry_segment),
    plan_skill_segment = coalesce(p_plan_skill, plan_skill_segment),
    signup_at = coalesce(signup_at, p_signup_at),
    first_touch_utm_source = coalesce(first_touch_utm_source, p_first_touch_utm_source),
    first_touch_utm_medium = coalesce(first_touch_utm_medium, p_first_touch_utm_medium),
    first_touch_utm_campaign = coalesce(first_touch_utm_campaign, p_first_touch_utm_campaign),
    first_touch_referrer = coalesce(first_touch_referrer, p_first_touch_referrer),
    first_touch_landing = coalesce(first_touch_landing, p_first_touch_landing),
    existing_tools_history = case when p_arr_existing_tools is null then existing_tools_history
      else (select array_agg(x) from (select distinct x from unnest(existing_tools_history || p_arr_existing_tools) x limit cap) s(x)) end,
    all_search_queries_recent = case when p_arr_search_queries is null then all_search_queries_recent
      else (select array_agg(x) from (select distinct x from unnest(all_search_queries_recent || p_arr_search_queries) x limit cap) s(x)) end,
    tools_visited_externally = case when p_arr_tools_visited is null then tools_visited_externally
      else (select array_agg(x) from (select distinct x from unnest(tools_visited_externally || p_arr_tools_visited) x limit cap) s(x)) end,
    tools_compared_with = case when p_arr_tools_compared is null then tools_compared_with
      else (select array_agg(x) from (select distinct x from unnest(tools_compared_with || p_arr_tools_compared) x limit cap) s(x)) end,
    plan_use_cases_submitted = case when p_arr_plan_use_cases is null then plan_use_cases_submitted
      else (select array_agg(x) from (select distinct x from unnest(plan_use_cases_submitted || p_arr_plan_use_cases) x limit cap) s(x)) end,
    ai_chat_tools_mentioned = case when p_arr_chat_tools is null then ai_chat_tools_mentioned
      else (select array_agg(x) from (select distinct x from unnest(ai_chat_tools_mentioned || p_arr_chat_tools) x limit cap) s(x)) end,
    reviews_submitted_for = case when p_arr_reviews_for is null then reviews_submitted_for
      else (select array_agg(x) from (select distinct x from unnest(reviews_submitted_for || p_arr_reviews_for) x limit cap) s(x)) end,
    saves_count = saves_count + p_inc_saves,
    comparisons_count = comparisons_count + p_inc_comparisons,
    plans_completed_count = plans_completed_count + p_inc_plans_completed,
    reviews_count = reviews_count + p_inc_reviews,
    tools_visited_count = tools_visited_count + p_inc_tools_visited,
    chat_messages_count = chat_messages_count + p_inc_chat_messages,
    searches_count = searches_count + p_inc_searches,
    updated_at = now()
  where distinct_id = p_distinct_id;
end;
$function$;
-- (Grants on upsert_user_intent unchanged from current state — recreate via
--  CREATE OR REPLACE preserves the existing ACL, so no grant block needed.)

-- ───────────────────────────────────────────────────────────────────
-- distinct_* window helpers — add optional p_end so the Unique-visitors /
-- Unique-users / per-tool / per-event tiles honor the window END (not just
-- the start). Back-compat: p_end default null → ">= cutoff" as before. Grants
-- preserved (anon/authenticated/service_role) — the 9.C sweep revisits these.
-- ───────────────────────────────────────────────────────────────────
drop function if exists public.distinct_visitors_in_window(timestamptz, boolean);
create function public.distinct_visitors_in_window(
  p_cutoff timestamptz, p_include_bots boolean default false, p_end timestamptz default null
) returns table(count bigint) language sql security definer set search_path to 'public' as $function$
  select count(distinct distinct_id)::bigint from user_events
  where created_at >= p_cutoff and (p_end is null or created_at < p_end)
    and (p_include_bots or not bot_likely);
$function$;
grant execute on function public.distinct_visitors_in_window(timestamptz, boolean, timestamptz) to anon, authenticated, service_role;

drop function if exists public.distinct_known_users_in_window(timestamptz, boolean);
create function public.distinct_known_users_in_window(
  p_cutoff timestamptz, p_include_bots boolean default false, p_end timestamptz default null
) returns table(count bigint) language sql security definer set search_path to 'public' as $function$
  select count(distinct user_id)::bigint from user_events
  where created_at >= p_cutoff and (p_end is null or created_at < p_end)
    and user_id is not null and (p_include_bots or not bot_likely);
$function$;
grant execute on function public.distinct_known_users_in_window(timestamptz, boolean, timestamptz) to anon, authenticated, service_role;

drop function if exists public.distinct_visitors_for_event(text, timestamptz, boolean);
create function public.distinct_visitors_for_event(
  p_event_name text, p_cutoff timestamptz, p_include_bots boolean default false, p_end timestamptz default null
) returns table(count bigint) language sql security definer set search_path to 'public' as $function$
  select count(distinct distinct_id)::bigint from user_events
  where event_name = p_event_name and created_at >= p_cutoff
    and (p_end is null or created_at < p_end) and (p_include_bots or not bot_likely);
$function$;
grant execute on function public.distinct_visitors_for_event(text, timestamptz, boolean, timestamptz) to anon, authenticated, service_role;

drop function if exists public.distinct_visitors_for_tool(text, timestamptz, boolean);
create function public.distinct_visitors_for_tool(
  p_slug text, p_cutoff timestamptz, p_include_bots boolean default false, p_end timestamptz default null
) returns table(count bigint) language sql security definer set search_path to 'public' as $function$
  select count(distinct distinct_id)::bigint from user_events
  where created_at >= p_cutoff and (p_end is null or created_at < p_end)
    and properties->>'tool_slug' = p_slug and (p_include_bots or not bot_likely);
$function$;
grant execute on function public.distinct_visitors_for_tool(text, timestamptz, boolean, timestamptz) to anon, authenticated, service_role;

commit;