-- Phase 8.g.7 (2026-05-20) — SECURITY DEFINER RPCs powering /admin/insights.
--
-- Why DEFINER: these are aggregate-only reads that scan user_events +
-- user_intent_profile. They never return per-user PII (only counts and
-- top-N labels). Admin-route auth is enforced in the layout; the RPCs
-- themselves are open to authenticated callers to keep the read path
-- simple.
--
-- All functions take a date cutoff or window-days param. None mutate.

-- ── 1. distinct_visitors_in_window(p_cutoff) → bigint
-- Unique distinct_ids in user_events since cutoff.
create or replace function public.distinct_visitors_in_window(p_cutoff timestamptz)
returns table(count bigint)
language sql security definer set search_path = public
as $$
  select count(distinct distinct_id)::bigint
  from user_events
  where created_at >= p_cutoff;
$$;

-- ── 2. distinct_visitors_for_event(p_event_name, p_cutoff) → bigint
create or replace function public.distinct_visitors_for_event(p_event_name text, p_cutoff timestamptz)
returns table(count bigint)
language sql security definer set search_path = public
as $$
  select count(distinct distinct_id)::bigint
  from user_events
  where event_name = p_event_name
    and created_at >= p_cutoff;
$$;

-- ── 3. distinct_visitors_for_tool(p_slug, p_cutoff) → bigint
create or replace function public.distinct_visitors_for_tool(p_slug text, p_cutoff timestamptz)
returns table(count bigint)
language sql security definer set search_path = public
as $$
  select count(distinct distinct_id)::bigint
  from user_events
  where created_at >= p_cutoff
    and properties->>'tool_slug' = p_slug;
$$;

-- ── 4. insights_daily_active_users(p_days) → (day, users)[]
create or replace function public.insights_daily_active_users(p_days int)
returns table(day text, users bigint)
language sql security definer set search_path = public
as $$
  select
    to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
    count(distinct distinct_id)::bigint as users
  from user_events
  where created_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 1;
$$;

-- ── 5. insights_events_by_device(p_event_name, p_days) → (device_type, events)[]
create or replace function public.insights_events_by_device(p_event_name text, p_days int)
returns table(device_type text, events bigint)
language sql security definer set search_path = public
as $$
  select
    coalesce(user_events.device_type, 'unknown') as device_type,
    count(*)::bigint as events
  from user_events
  where event_name = p_event_name
    and created_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 2 desc;
$$;

-- ── 6. insights_top_property(p_property, p_days, p_limit) → (value, events)[]
-- For top-level user_events columns (not jsonb). Used for first_touch_referrer.
create or replace function public.insights_top_property(p_property text, p_days int, p_limit int)
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
    group by 1
    order by 2 desc
    limit $2
  $f$, p_property, p_property, p_property);
  return query execute q using p_days, p_limit;
end;
$$;

-- ── 7. insights_top_events(p_days, p_limit) → (event_name, events)[]
create or replace function public.insights_top_events(p_days int, p_limit int)
returns table(event_name text, events bigint)
language sql security definer set search_path = public
as $$
  select event_name, count(*)::bigint as events
  from user_events
  where created_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 2 desc
  limit p_limit;
$$;

-- ── 8. insights_top_jsonb_property(p_event_name, p_property, p_days, p_limit)
-- Returns top values of a STRING jsonb property (e.g. tool_slug, query).
create or replace function public.insights_top_jsonb_property(
  p_event_name text, p_property text, p_days int, p_limit int
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
  group by 1
  order by 2 desc
  limit p_limit;
$$;

-- ── 9. insights_unnest_intent_array(p_column, p_days, p_limit)
-- Unnests a text[] column on user_intent_profile (active in last p_days)
-- and counts unique users per value. Used for tool_compared_with,
-- ai_chat_tools_mentioned, plan_use_cases_submitted, etc.
create or replace function public.insights_unnest_intent_array(
  p_column text, p_days int, p_limit int
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
    select unnested as value, count(distinct distinct_id)::bigint as users
    from user_intent_profile, unnest(%I) as t(unnested)
    where last_active_at >= now() - ($1 || ' days')::interval
    group by 1
    order by 2 desc
    limit $2
  $f$, p_column);
  return query execute q using p_days, p_limit;
end;
$$;

-- ── 10. insights_tool_compared_with(p_slug, p_days, p_limit)
-- For a single tool, returns top OTHER tools it gets compared with.
-- The tools_compared_with array stores pairs as "slugA-vs-slugB".
create or replace function public.insights_tool_compared_with(
  p_slug text, p_days int, p_limit int
)
returns table(value text, users bigint)
language sql security definer set search_path = public
as $$
  with pairs as (
    select distinct_id, unnested as pair
    from user_intent_profile, unnest(tools_compared_with) as t(unnested)
    where last_active_at >= now() - (p_days || ' days')::interval
      and unnested like '%' || p_slug || '%'
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

-- Grant execute to authenticated users (admin gating is in the layout).
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
