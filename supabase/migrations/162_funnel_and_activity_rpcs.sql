-- 162_funnel_and_activity_rpcs.sql
-- Phase 10 (Admin Panel — Traffic Analysis Upgrade), 2026-06-17.
-- Three admin-only (service_role) RPCs that make the funnels readable and let
-- the owner study per-user activity. Applied to prod via MCP; this file is the
-- record (repo migration history drifts from prod).
--
--   1. insights_funnel_users   — unique-VISITOR sequential funnel (this section)
--   2. insights_plan_dropoff   — per-user "started the plan, dropped where" (below)
--   3. insights_search_log     — per-user "who searched what" (below)

-- ── 1. Unique-visitor sequential funnel ─────────────────────────────
-- The old funnels counted raw EVENTS per step, so steps didn't shrink (a modal
-- could be "shown" more than a CTA was "clicked") — unreadable. This counts the
-- distinct PEOPLE who completed the longest contiguous prefix up to each step,
-- so counts are monotonic. p_steps is the ordered event sequence.
create or replace function public.insights_funnel_users(p_steps text[], p_cutoff timestamptz, p_end timestamptz default null::timestamptz, p_include_bots boolean default false, p_filters jsonb default null::jsonb)
 returns table(step_index int, event_name text, users bigint)
 language sql security definer set search_path to 'public'
as $function$
  with per_user as (
    select ue.distinct_id, array_agg(distinct ue.event_name) as evs
    from user_events ue
    where ue.created_at >= p_cutoff
      and (p_end is null or ue.created_at < p_end)
      and (p_include_bots or not ue.bot_likely)
      and ue.event_name = any(p_steps)
      and insights_apply_filters(ue, p_filters)
    group by ue.distinct_id
  ),
  reached as (
    select pu.distinct_id,
      coalesce((
        select max(i) from generate_subscripts(p_steps, 1) i
        where (select bool_and(p_steps[j] = any(pu.evs))
               from generate_subscripts(p_steps, 1) j where j <= i)
      ), 0) as furthest
    from per_user pu
  )
  select i as step_index, p_steps[i] as event_name,
    (select count(*) from reached r where r.furthest >= i)::bigint as users
  from generate_subscripts(p_steps, 1) i
  order by i;
$function$;

grant execute on function public.insights_funnel_users(text[], timestamptz, timestamptz, boolean, jsonb) to service_role;

-- ── 2. insights_plan_dropoff — per-user "started the plan, dropped where" ──
create or replace function public.insights_plan_dropoff(p_cutoff timestamptz, p_end timestamptz default null::timestamptz, p_include_bots boolean default false)
 returns table(distinct_id text, user_id uuid, email text, full_name text,
   furthest_step int, furthest_label text, completed boolean, goal_text text,
   events_in_journey bigint, last_activity timestamptz)
 language sql security definer set search_path to 'public'
as $function$
  with steps as (
    select * from (values (1,'plan_started'),(2,'plan_intake_submitted'),(3,'plan_completed'),(4,'plan_results_tool_clicked')) s(idx, ev)
  ),
  journey as (
    select ue.distinct_id, ue.event_name, ue.created_at, ue.properties, ue.user_id
    from user_events ue
    where ue.created_at >= p_cutoff and (p_end is null or ue.created_at < p_end)
      and (p_include_bots or not ue.bot_likely)
      and ue.event_name in ('plan_started','plan_intake_submitted','plan_completed','plan_results_tool_clicked','plan_goal_typed')
  ),
  entered as (select distinct j.distinct_id from journey j where j.event_name = 'plan_started'),
  agg as (
    select j.distinct_id,
      max((select s.idx from steps s where s.ev = j.event_name)) as furthest_step,
      bool_or(j.event_name = 'plan_completed') as completed,
      count(*) filter (where j.event_name <> 'plan_goal_typed')::bigint as events_in_journey,
      max(j.created_at) as last_activity,
      (max(j.user_id::text))::uuid as uid,
      (array_agg(
         coalesce(nullif(j.properties->>'current_text',''), nullif(j.properties->>'goal_text',''), nullif(j.properties->>'use_case',''))
         order by j.created_at desc
       ) filter (where coalesce(j.properties->>'current_text', j.properties->>'goal_text', j.properties->>'use_case') is not null))[1] as goal_text
    from journey j
    where j.distinct_id in (select distinct_id from entered)
    group by j.distinct_id
  )
  select a.distinct_id, a.uid, au.email::text,
    coalesce(pr.full_name, au.raw_user_meta_data->>'full_name')::text,
    a.furthest_step,
    case a.furthest_step when 1 then 'Started' when 2 then 'Submitted intake' when 3 then 'Plan generated' when 4 then 'Clicked a result' end,
    a.completed, left(a.goal_text, 200), a.events_in_journey, a.last_activity
  from agg a
  left join auth.users au on au.id = a.uid
  left join profiles pr on pr.id = a.uid
  order by a.completed asc, a.furthest_step desc, a.last_activity desc;
$function$;

grant execute on function public.insights_plan_dropoff(timestamptz, timestamptz, boolean) to service_role;

-- ── 3. insights_search_log — per-user "who searched what" ───────────
create or replace function public.insights_search_log(p_cutoff timestamptz, p_end timestamptz default null::timestamptz, p_include_bots boolean default false, p_limit int default 200)
 returns table(distinct_id text, user_id uuid, email text, query text, event_kind text,
   result_count int, zero_result boolean, clicked boolean, created_at timestamptz)
 language sql security definer set search_path to 'public'
as $function$
  with searches as (
    select ue.distinct_id, ue.user_id, ue.created_at,
      case ue.event_name when 'search_query_submitted' then 'submitted'
        when 'search_query_typed' then 'typed' when 'empty_search' then 'empty' end as event_kind,
      coalesce(nullif(ue.properties->>'query',''), nullif(ue.properties->>'current_text','')) as q,
      nullif(ue.properties->>'result_count','')::int as result_count
    from user_events ue
    where ue.created_at >= p_cutoff and (p_end is null or ue.created_at < p_end)
      and (p_include_bots or not ue.bot_likely)
      and (ue.event_name in ('search_query_submitted','empty_search')
           or (ue.event_name = 'search_query_typed' and ue.properties->>'final_blur' = 'true'))
  )
  select s.distinct_id, s.user_id, au.email::text, left(s.q, 200) as query, s.event_kind,
    s.result_count, (s.result_count = 0) as zero_result,
    exists(
      select 1 from user_events c
      where c.distinct_id = s.distinct_id and c.event_name = 'search_result_clicked'
        and c.properties->>'query' = s.q
        and c.created_at >= s.created_at and c.created_at <= s.created_at + interval '10 minutes'
    ) as clicked,
    s.created_at
  from searches s
  left join auth.users au on au.id = s.user_id
  where s.q is not null
  order by s.created_at desc
  limit p_limit;
$function$;

grant execute on function public.insights_search_log(timestamptz, timestamptz, boolean, int) to service_role;
