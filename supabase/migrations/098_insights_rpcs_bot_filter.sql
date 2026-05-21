-- Phase 8.g.8 (2026-05-21) — extend insights RPCs to filter bot traffic.
--
-- Migration 097 added user_events.bot_likely. This migration replaces the
-- 10 insights RPCs from 096 with versions that accept an `p_include_bots`
-- bool (default false → exclude bots). All charts in /admin/insights now
-- default to human-only counts.
--
-- Also adds 2 new RPCs:
--   insights_bot_share — % of events flagged as bot (for the "bot traffic"
--                        metric tile on the dashboard)
--   insights_recent_events_for_distinct_id — chronological event log for
--                        one distinct_id (powers /admin/insights/user/[id])

-- ── Replace 10 existing RPCs with bot-aware versions ─────────────

drop function if exists public.distinct_visitors_in_window(timestamptz);
create or replace function public.distinct_visitors_in_window(
  p_cutoff timestamptz, p_include_bots boolean default false
)
returns table(count bigint)
language sql security definer set search_path = public
as $$
  select count(distinct distinct_id)::bigint
  from user_events
  where created_at >= p_cutoff
    and (p_include_bots or not bot_likely);
$$;

drop function if exists public.distinct_visitors_for_event(text, timestamptz);
create or replace function public.distinct_visitors_for_event(
  p_event_name text, p_cutoff timestamptz, p_include_bots boolean default false
)
returns table(count bigint)
language sql security definer set search_path = public
as $$
  select count(distinct distinct_id)::bigint
  from user_events
  where event_name = p_event_name
    and created_at >= p_cutoff
    and (p_include_bots or not bot_likely);
$$;

drop function if exists public.distinct_visitors_for_tool(text, timestamptz);
create or replace function public.distinct_visitors_for_tool(
  p_slug text, p_cutoff timestamptz, p_include_bots boolean default false
)
returns table(count bigint)
language sql security definer set search_path = public
as $$
  select count(distinct distinct_id)::bigint
  from user_events
  where created_at >= p_cutoff
    and properties->>'tool_slug' = p_slug
    and (p_include_bots or not bot_likely);
$$;

drop function if exists public.insights_daily_active_users(int);
create or replace function public.insights_daily_active_users(
  p_days int, p_include_bots boolean default false
)
returns table(day text, users bigint)
language sql security definer set search_path = public
as $$
  select
    to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
    count(distinct distinct_id)::bigint as users
  from user_events
  where created_at >= now() - (p_days || ' days')::interval
    and (p_include_bots or not bot_likely)
  group by 1
  order by 1;
$$;

drop function if exists public.insights_events_by_device(text, int);
create or replace function public.insights_events_by_device(
  p_event_name text, p_days int, p_include_bots boolean default false
)
returns table(device_type text, events bigint)
language sql security definer set search_path = public
as $$
  select
    coalesce(user_events.device_type, 'unknown') as device_type,
    count(*)::bigint as events
  from user_events
  where event_name = p_event_name
    and created_at >= now() - (p_days || ' days')::interval
    and (p_include_bots or not bot_likely)
  group by 1
  order by 2 desc;
$$;

drop function if exists public.insights_top_property(text, int, int);
create or replace function public.insights_top_property(
  p_property text, p_days int, p_limit int, p_include_bots boolean default false
)
returns table(value text, events bigint)
language plpgsql security definer set search_path = public
as $$
declare
  q text;
begin
  if p_property not in ('first_touch_referrer', 'first_touch_utm_source', 'utm_source', 'referrer', 'page_path') then
    raise exception 'Unsupported property: %', p_property;
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
$$;

drop function if exists public.insights_top_events(int, int);
create or replace function public.insights_top_events(
  p_days int, p_limit int, p_include_bots boolean default false
)
returns table(event_name text, events bigint)
language sql security definer set search_path = public
as $$
  select event_name, count(*)::bigint as events
  from user_events
  where created_at >= now() - (p_days || ' days')::interval
    and (p_include_bots or not bot_likely)
  group by 1
  order by 2 desc
  limit p_limit;
$$;

drop function if exists public.insights_top_jsonb_property(text, text, int, int);
create or replace function public.insights_top_jsonb_property(
  p_event_name text, p_property text, p_days int, p_limit int, p_include_bots boolean default false
)
returns table(value text, events bigint)
language sql security definer set search_path = public
as $$
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
$$;

-- insights_unnest_intent_array reads user_intent_profile, which is the
-- per-distinct-id roll-up. Bots have profiles too. Add bot filter via a
-- join back to user_events bot_likely (most-recent event's flag).
drop function if exists public.insights_unnest_intent_array(text, int, int);
create or replace function public.insights_unnest_intent_array(
  p_column text, p_days int, p_limit int, p_include_bots boolean default false
)
returns table(value text, users bigint)
language plpgsql security definer set search_path = public
as $$
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
$$;

drop function if exists public.insights_tool_compared_with(text, int, int);
create or replace function public.insights_tool_compared_with(
  p_slug text, p_days int, p_limit int, p_include_bots boolean default false
)
returns table(value text, users bigint)
language sql security definer set search_path = public
as $$
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
$$;

-- ── New RPC: bot share (for the "bot traffic %" metric tile) ──────
create or replace function public.insights_bot_share(p_days int)
returns table(
  total_events bigint,
  bot_events bigint,
  bot_pct numeric,
  total_visitors bigint,
  bot_visitors bigint,
  bot_visitor_pct numeric
)
language sql security definer set search_path = public
as $$
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
$$;

-- ── New RPC: per-user event timeline ──────────────────────────────
-- Returns most-recent N events for a distinct_id. Used by the
-- /admin/insights/user/[distinct_id] timeline view.
create or replace function public.insights_recent_events_for_distinct_id(
  p_distinct_id text, p_limit int default 200
)
returns table(
  id uuid,
  created_at timestamptz,
  event_name text,
  page_path text,
  device_type text,
  auth_state text,
  source_kind text,
  user_id uuid,
  properties jsonb,
  user_agent text,
  ip text,
  bot_likely boolean
)
language sql security definer set search_path = public
as $$
  select id, created_at, event_name, page_path, device_type, auth_state, source_kind, user_id, properties, user_agent, ip, bot_likely
  from user_events
  where distinct_id = p_distinct_id
  order by created_at desc
  limit p_limit;
$$;

-- Grants
grant execute on function public.distinct_visitors_in_window to authenticated, service_role;
grant execute on function public.distinct_visitors_for_event to authenticated, service_role;
grant execute on function public.distinct_visitors_for_tool to authenticated, service_role;
grant execute on function public.insights_daily_active_users to authenticated, service_role;
grant execute on function public.insights_events_by_device to authenticated, service_role;
grant execute on function public.insights_top_property to authenticated, service_role;
grant execute on function public.insights_top_events to authenticated, service_role;
grant execute on function public.insights_top_jsonb_property to authenticated, service_role;
grant execute on function public.insights_unnest_intent_array to authenticated, service_role;
grant execute on function public.insights_tool_compared_with to authenticated, service_role;
grant execute on function public.insights_bot_share to authenticated, service_role;
grant execute on function public.insights_recent_events_for_distinct_id to authenticated, service_role;
