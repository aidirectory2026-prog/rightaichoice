-- 186: Ad-hoc funnel drill-down (Phase 14b Wave 3).
--
-- insights_funnel_users (162→175) already computes an arbitrary-steps funnel
-- with session-stitched identity. Two companions so the funnel page can (a)
-- break every step down by a dimension and (b) list the actual people who
-- converted or dropped at any step — both reusing the SAME stitch CTE and the
-- shared predicate, so their numbers reconcile with the funnel strip exactly.

-- ── 1. Per-step breakdown by dimension ──────────────────────────────────
-- Dimension value = the person's FIRST step-1 event's value (same "attribute
-- the journey to its entry" convention as insights_session_breakdown, mig 182).
create or replace function public.insights_funnel_breakdown(
  p_steps text[],
  p_cutoff timestamptz,
  p_end timestamptz default null,
  p_include_bots boolean default false,
  p_filters jsonb default null,
  p_dimension text default 'country',
  p_limit integer default 12
)
returns table(step_index integer, key text, users bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_dimension not in ('country','device','browser','os','city','utm_source','auth','source_kind') then
    raise exception 'Unsupported dimension: %', p_dimension;
  end if;
  return query
  with sess_user as (
    select (properties->>'session_id') as sid,
           (array_agg(user_id) filter (where user_id is not null))[1] as uid
    from user_events
    where (properties->>'session_id') is not null and user_id is not null
    group by 1
  ),
  ev as (
    select ue.event_name, ue.created_at,
           coalesce(ue.user_id::text, su.uid::text, ue.distinct_id) as person,
           case p_dimension
             when 'country'     then coalesce(ue.country, '(unknown)')
             when 'device'      then coalesce(ue.device_type, 'unknown')
             when 'browser'     then coalesce(ue.browser, '(unknown)')
             when 'os'          then coalesce(ue.os, '(unknown)')
             when 'city'        then coalesce(ue.city, '(unknown)')
             when 'utm_source'  then coalesce(ue.utm_source, '(none)')
             when 'auth'        then ue.auth_state
             when 'source_kind' then ue.source_kind
           end as dim_val
    from user_events ue
    left join sess_user su on su.sid = (ue.properties->>'session_id')
    where ue.created_at >= p_cutoff
      and (p_end is null or ue.created_at < p_end)
      and (p_include_bots or not ue.bot_likely)
      and ue.event_name = any(p_steps)
      and insights_apply_filters(ue, p_filters)
  ),
  dim as (
    select e.person,
           (array_agg(e.dim_val order by e.created_at)
              filter (where e.event_name = p_steps[1]))[1] as key
    from ev e
    group by e.person
  ),
  per_user as (
    select e.person, array_agg(distinct e.event_name) as evs
    from ev e group by 1
  ),
  reached as (
    select pu.person,
      coalesce((
        select max(i) from generate_subscripts(p_steps, 1) i
        where (select bool_and(p_steps[j] = any(pu.evs))
               from generate_subscripts(p_steps, 1) j where j <= i)
      ), 0) as furthest
    from per_user pu
  ),
  top_keys as (
    select d.key from reached r
    join dim d on d.person = r.person
    where r.furthest >= 1 and d.key is not null
    group by d.key
    order by count(*) desc, d.key asc
    limit p_limit
  )
  select i as step_index, d.key,
         count(*) filter (where r.furthest >= i)::bigint as users
  from generate_subscripts(p_steps, 1) i
  cross join reached r
  join dim d on d.person = r.person
  join top_keys tk on tk.key = d.key
  group by i, d.key
  order by i, users desc, d.key;
end;
$function$;

revoke all on function public.insights_funnel_breakdown(text[], timestamptz, timestamptz, boolean, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.insights_funnel_breakdown(text[], timestamptz, timestamptz, boolean, jsonb, text, integer) to service_role;

-- ── 2. The actual people behind any step ────────────────────────────────
-- p_converted=true → reached step p_step (furthest >= p_step);
-- p_converted=false → dropped exactly there (furthest = p_step - 1).
create or replace function public.insights_funnel_people(
  p_steps text[],
  p_step integer,
  p_converted boolean,
  p_cutoff timestamptz,
  p_end timestamptz default null,
  p_include_bots boolean default false,
  p_filters jsonb default null,
  p_limit integer default 200
)
returns table(person text, email text, is_user boolean, furthest integer, last_seen timestamptz)
language sql
security definer
set search_path to 'public'
as $function$
  with sess_user as (
    select (properties->>'session_id') as sid,
           (array_agg(user_id) filter (where user_id is not null))[1] as uid
    from user_events
    where (properties->>'session_id') is not null and user_id is not null
    group by 1
  ),
  ev as (
    select ue.event_name, ue.created_at,
           coalesce(ue.user_id::text, su.uid::text, ue.distinct_id) as person
    from user_events ue
    left join sess_user su on su.sid = (ue.properties->>'session_id')
    where ue.created_at >= p_cutoff
      and (p_end is null or ue.created_at < p_end)
      and (p_include_bots or not ue.bot_likely)
      and ue.event_name = any(p_steps)
      and insights_apply_filters(ue, p_filters)
  ),
  per_user as (
    select e.person, array_agg(distinct e.event_name) as evs, max(e.created_at) as last_seen
    from ev e group by 1
  ),
  reached as (
    select pu.person, pu.last_seen,
      coalesce((
        select max(i) from generate_subscripts(p_steps, 1) i
        where (select bool_and(p_steps[j] = any(pu.evs))
               from generate_subscripts(p_steps, 1) j where j <= i)
      ), 0) as furthest
    from per_user pu
  )
  select r.person,
         au.email::text,
         (au.id is not null) as is_user,
         r.furthest,
         r.last_seen
  from reached r
  -- text-side comparison: person may be an anon distinct_id, and the planner
  -- may evaluate a ::uuid cast before any regex guard — never cast person.
  left join auth.users au on au.id::text = r.person
  where case when p_converted then r.furthest >= p_step
             else r.furthest = p_step - 1 end
  order by r.last_seen desc
  limit p_limit;
$function$;

revoke all on function public.insights_funnel_people(text[], integer, boolean, timestamptz, timestamptz, boolean, jsonb, integer) from public, anon, authenticated;
grant execute on function public.insights_funnel_people(text[], integer, boolean, timestamptz, timestamptz, boolean, jsonb, integer) to service_role;
