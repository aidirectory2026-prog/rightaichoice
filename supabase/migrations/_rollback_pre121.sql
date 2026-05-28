-- _rollback_pre121.sql
-- Pre-migration-121 snapshot of every function touched by
-- 121_insights_window_threading.sql, captured via pg_get_functiondef on
-- prod (project adtznghodbgkvknilfln) immediately before applying 121.
-- To roll back: run this whole file. Note that 121 DROPs old signatures and
-- CREATEs new ones with extra params; restoring these CREATE OR REPLACE
-- definitions re-establishes the original signatures, but you may also need
-- to DROP the new (wider) signatures created by 121 so the old callers
-- resolve correctly. See per-function signatures in 121 for the drops.

CREATE OR REPLACE FUNCTION public.upsert_user_intent(p_distinct_id text, p_user_id uuid DEFAULT NULL::uuid, p_email_domain text DEFAULT NULL::text, p_page_path text DEFAULT NULL::text, p_arr_existing_tools text[] DEFAULT NULL::text[], p_arr_search_queries text[] DEFAULT NULL::text[], p_arr_tools_visited text[] DEFAULT NULL::text[], p_arr_tools_compared text[] DEFAULT NULL::text[], p_arr_plan_use_cases text[] DEFAULT NULL::text[], p_arr_chat_tools text[] DEFAULT NULL::text[], p_arr_reviews_for text[] DEFAULT NULL::text[], p_plan_budget text DEFAULT NULL::text, p_plan_team text DEFAULT NULL::text, p_plan_industry text DEFAULT NULL::text, p_plan_skill text DEFAULT NULL::text, p_inc_saves integer DEFAULT 0, p_inc_comparisons integer DEFAULT 0, p_inc_plans_completed integer DEFAULT 0, p_inc_reviews integer DEFAULT 0, p_inc_tools_visited integer DEFAULT 0, p_inc_chat_messages integer DEFAULT 0, p_inc_searches integer DEFAULT 0, p_signup_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_first_touch_utm_source text DEFAULT NULL::text, p_first_touch_utm_medium text DEFAULT NULL::text, p_first_touch_utm_campaign text DEFAULT NULL::text, p_first_touch_referrer text DEFAULT NULL::text, p_first_touch_landing text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      else (select array_agg(distinct x) from unnest(existing_tools_history || p_arr_existing_tools) x limit cap) end,
    all_search_queries_recent = case when p_arr_search_queries is null then all_search_queries_recent
      else (select array_agg(distinct x) from unnest(all_search_queries_recent || p_arr_search_queries) x limit cap) end,
    tools_visited_externally = case when p_arr_tools_visited is null then tools_visited_externally
      else (select array_agg(distinct x) from unnest(tools_visited_externally || p_arr_tools_visited) x limit cap) end,
    tools_compared_with = case when p_arr_tools_compared is null then tools_compared_with
      else (select array_agg(distinct x) from unnest(tools_compared_with || p_arr_tools_compared) x limit cap) end,
    plan_use_cases_submitted = case when p_arr_plan_use_cases is null then plan_use_cases_submitted
      else (select array_agg(distinct x) from unnest(plan_use_cases_submitted || p_arr_plan_use_cases) x limit cap) end,
    ai_chat_tools_mentioned = case when p_arr_chat_tools is null then ai_chat_tools_mentioned
      else (select array_agg(distinct x) from unnest(ai_chat_tools_mentioned || p_arr_chat_tools) x limit cap) end,
    reviews_submitted_for = case when p_arr_reviews_for is null then reviews_submitted_for
      else (select array_agg(distinct x) from unnest(reviews_submitted_for || p_arr_reviews_for) x limit cap) end,
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


CREATE OR REPLACE FUNCTION public.distinct_visitors_in_window(p_cutoff timestamp with time zone, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(distinct distinct_id)::bigint
  from user_events
  where created_at >= p_cutoff
    and (p_include_bots or not bot_likely);
$function$;


CREATE OR REPLACE FUNCTION public.distinct_visitors_for_event(p_event_name text, p_cutoff timestamp with time zone, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(distinct distinct_id)::bigint
  from user_events
  where event_name = p_event_name
    and created_at >= p_cutoff
    and (p_include_bots or not bot_likely);
$function$;


CREATE OR REPLACE FUNCTION public.distinct_visitors_for_tool(p_slug text, p_cutoff timestamp with time zone, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(distinct distinct_id)::bigint
  from user_events
  where created_at >= p_cutoff
    and properties->>'tool_slug' = p_slug
    and (p_include_bots or not bot_likely);
$function$;


CREATE OR REPLACE FUNCTION public.distinct_known_users_in_window(p_cutoff timestamp with time zone, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(distinct user_id)::bigint
  from user_events
  where created_at >= p_cutoff
    and user_id is not null
    and (p_include_bots or not bot_likely);
$function$;


CREATE OR REPLACE FUNCTION public.insights_daily_active_users(p_days integer, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(day text, users bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.insights_events_by_device(p_event_name text, p_days integer, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(device_type text, events bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    coalesce(user_events.device_type, 'unknown') as device_type,
    count(*)::bigint as events
  from user_events
  where event_name = p_event_name
    and created_at >= now() - (p_days || ' days')::interval
    and (p_include_bots or not bot_likely)
  group by 1
  order by 2 desc;
$function$;


CREATE OR REPLACE FUNCTION public.insights_top_events(p_days integer, p_limit integer, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(event_name text, events bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select event_name, count(*)::bigint as events
  from user_events
  where created_at >= now() - (p_days || ' days')::interval
    and (p_include_bots or not bot_likely)
  group by 1
  order by 2 desc
  limit p_limit;
$function$;


CREATE OR REPLACE FUNCTION public.insights_top_jsonb_property(p_event_name text, p_property text, p_days integer, p_limit integer, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(value text, events bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    properties->>p_property as value,
    count(*)::bigint as events
  from user_events
  where event_name = p_event_name
    and created_at >= now() - (p_days || ' days')::interval
    and properties->>p_property is not null
    and properties->>p_property <> ''
    and (p_include_bots or not bot_likely)
  group by 1
  order by 2 desc
  limit p_limit;
$function$;


CREATE OR REPLACE FUNCTION public.insights_bot_share(p_days integer)
 RETURNS TABLE(total_events bigint, bot_events bigint, bot_pct numeric, total_visitors bigint, bot_visitors bigint, bot_visitor_pct numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with windowed as (
    select bot_likely, distinct_id
    from user_events
    where created_at >= now() - (p_days || ' days')::interval
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


CREATE OR REPLACE FUNCTION public.insights_top_property(p_property text, p_days integer, p_limit integer, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(value text, events bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q text;
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
      where ue.created_at >= now() - (p_days || ' days')::interval
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
    where created_at >= now() - ($1 || ' days')::interval
      and %I is not null and %I <> ''
      and ($3 or not bot_likely)
    group by 1
    order by 2 desc
    limit $2
  $f$, p_property, p_property, p_property);
  return query execute q using p_days, p_limit, p_include_bots;
end;
$function$;


CREATE OR REPLACE FUNCTION public.insights_funnel_steps(p_days integer DEFAULT 7, p_include_bots boolean DEFAULT false, p_country text DEFAULT NULL::text, p_device text DEFAULT NULL::text)
 RETURNS TABLE(step_index integer, step_name text, step_event text, unique_users integer, total_events integer, pct_of_step_1 numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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


CREATE OR REPLACE FUNCTION public.insights_recent_visitors(p_limit integer DEFAULT 50, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(distinct_id text, user_id uuid, first_seen timestamp with time zone, last_seen timestamp with time zone, total_events bigint, active_days integer, is_returning boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.insights_tool_heatmap(p_days integer DEFAULT 7, p_include_bots boolean DEFAULT false, p_limit integer DEFAULT 500)
 RETURNS TABLE(tool_slug text, tool_name text, views integer, unique_visitors integer, visit_clicks integer, ctr_pct numeric, last_visit_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with cutoff as (
    select now() - make_interval(days => p_days) as t
  ),
  ev as (
    select e.distinct_id, e.event_name, e.created_at,
      coalesce(e.properties->>'tool_slug',
               nullif(split_part(e.page_path, '/', 3), ''))
        as tool_slug
    from user_events e, cutoff c
    where e.created_at >= c.t
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


CREATE OR REPLACE FUNCTION public.insights_geo_breakdown(p_days integer DEFAULT 7, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(country text, visitors integer, events integer, top_city text, top_city_visitors integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with cutoff as (
    select now() - make_interval(days => p_days) as t
  ),
  base as (
    select e.distinct_id, e.country, e.city
    from user_events e, cutoff c
    where e.created_at >= c.t
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


CREATE OR REPLACE FUNCTION public.insights_returning_visitors(p_cutoff timestamp with time zone, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(total_visitors bigint, new_visitors bigint, returning_visitors bigint, returning_pct numeric, avg_days_between numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.insights_unnest_intent_array(p_column text, p_days integer, p_limit integer, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(value text, users bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q text;
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
    where uip.last_active_at >= now() - ($1 || ' days')::interval
      and ($3 or not exists (
        select 1 from user_events ue
        where ue.distinct_id = uip.distinct_id and ue.bot_likely = true
        limit 1
      ))
    group by 1
    order by 2 desc
    limit $2
  $f$, p_column);
  return query execute q using p_days, p_limit, p_include_bots;
end;
$function$;


CREATE OR REPLACE FUNCTION public.insights_tool_compared_with(p_slug text, p_days integer, p_limit integer, p_include_bots boolean DEFAULT false)
 RETURNS TABLE(value text, users bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with pairs as (
    select uip.distinct_id, unnested as pair
    from user_intent_profile uip, unnest(uip.tools_compared_with) as t(unnested)
    where uip.last_active_at >= now() - (p_days || ' days')::interval
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

-- NOTE: insights_zero_result_rate, search_top_queries,
-- increment_tool_view_count, increment_comparison_view_count, and
-- increment_view_count did NOT exist in prod before migration 121 (no prior
-- definitions were returned by pg_get_functiondef). To roll those back, DROP
-- them:
--   drop function if exists public.insights_zero_result_rate(timestamptz, timestamptz, boolean, integer);
--   drop function if exists public.search_top_queries(timestamptz, timestamptz, integer, integer);
--   drop function if exists public.increment_tool_view_count(uuid);
--   drop function if exists public.increment_comparison_view_count(uuid);
--   drop function if exists public.increment_view_count(text, uuid);
