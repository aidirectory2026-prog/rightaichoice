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

-- ── 2. insights_plan_dropoff — appended in Step 3 ───────────────────
-- ── 3. insights_search_log   — appended in Step 4 ───────────────────
