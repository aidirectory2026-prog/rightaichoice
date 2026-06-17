-- 163_explore_rpcs.sql
-- Phase 11 (Admin Panel — Mixpanel Upgrade), 2026-06-18.
-- Admin-only (service_role) RPCs for the Mixpanel-grade rebuild. Applied to prod
-- via MCP; this file is the record (repo migration history drifts from prod).
--
--   A2. insights_user_painpoints — per-user "where did they struggle"
--   A4. insights_plan_dropoff   — now reads the REAL typed goal
--   (Phase B adds insights_search_everything + insights_cohort here later.)

-- ── A2. Per-user pain points ────────────────────────────────────────
-- Real errors (vs extension/cross-origin/resource noise, via the migration-160
-- classification), frustration signals, zero-result searches, plan/signup state.
create or replace function public.insights_user_painpoints(p_distinct_id text)
 returns table(real_errors bigint, noise_errors bigint, rage_clicks bigint, dead_clicks bigint,
   exit_intents bigint, forms_abandoned bigint, zero_result_searches bigint,
   started_plan boolean, completed_plan boolean, hit_signup_gate boolean, signed_up boolean)
 language sql security definer set search_path to 'public'
as $function$
  with ev as (
    select event_name, properties from user_events where distinct_id = p_distinct_id
  ),
  errs as (
    select case
      when properties->>'error_type' = 'resource_error' then 'noise'
      when properties->>'error_type' = 'react_boundary' then 'real'
      when properties->>'error_type' in ('js_error','unhandled_rejection')
        and (coalesce(properties->>'source_url','') ~ '/_next/static/' or coalesce(properties->>'source_url','') = '') then 'real'
      else 'noise'
    end as ecls
    from ev where event_name = 'error_encountered'
  )
  select
    (select count(*) from errs where ecls = 'real')::bigint,
    (select count(*) from errs where ecls = 'noise')::bigint,
    count(*) filter (where event_name = 'rage_click')::bigint,
    count(*) filter (where event_name = 'dead_click')::bigint,
    count(*) filter (where event_name = 'exit_intent')::bigint,
    count(*) filter (where event_name = 'form_abandoned')::bigint,
    count(*) filter (where event_name = 'search_query_submitted' and properties->>'result_count' = '0')::bigint,
    bool_or(event_name = 'plan_started'),
    bool_or(event_name = 'plan_completed'),
    bool_or(event_name = 'plan_signup_modal_shown'),
    bool_or(event_name = 'signup_completed')
  from ev;
$function$;

grant execute on function public.insights_user_painpoints(text) to service_role;

-- ── A4. insights_plan_dropoff — read the real typed goal ────────────
-- Was reading plan_started/intake (which carry no text). Now coalesces the goal
-- from plan_goal_typed.current_text and the durable plan_intents.typed_goal.
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
       ) filter (where coalesce(j.properties->>'current_text', j.properties->>'goal_text', j.properties->>'use_case') is not null))[1] as goal_from_events
    from journey j
    where j.distinct_id in (select distinct_id from entered)
    group by j.distinct_id
  )
  select a.distinct_id, a.uid, au.email::text,
    coalesce(pr.full_name, au.raw_user_meta_data->>'full_name')::text,
    a.furthest_step,
    case a.furthest_step when 1 then 'Started' when 2 then 'Submitted intake' when 3 then 'Plan generated' when 4 then 'Clicked a result' end,
    a.completed,
    left(coalesce(a.goal_from_events, pi.typed_goal), 200),
    a.events_in_journey, a.last_activity
  from agg a
  left join auth.users au on au.id = a.uid
  left join profiles pr on pr.id = a.uid
  left join lateral (
    select typed_goal from plan_intents p where p.distinct_id = a.distinct_id and typed_goal is not null
    order by created_at desc limit 1
  ) pi on true
  order by a.completed asc, a.furthest_step desc, a.last_activity desc;
$function$;

grant execute on function public.insights_plan_dropoff(timestamptz, timestamptz, boolean) to service_role;
