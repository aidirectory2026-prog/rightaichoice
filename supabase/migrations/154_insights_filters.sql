-- 154_insights_filters.sql
-- Phase 10.4.6 (2026-06-12) — global smart-filter SQL predicate + p_filters
-- on the core insights RPCs.
--
-- ONE shared predicate (insights_apply_filters) implements every optional
-- admin filter for all queries — one place to verify, no per-page drift.
-- Its TS mirror is applyFilters() in lib/admin/filters.ts; the filter-matrix
-- verifier (scripts/audit/verify-filters.ts, `npm run tracking:filters`)
-- proves both sides return identical numbers for a matrix of filter combos.
--
-- Every RPC below was extended from its LIVE definition (fetched via
-- pg_get_functiondef on 2026-06-12), NOT reconstructed from old migration
-- files. `p_filters jsonb default null` is appended LAST so every existing
-- call site stays valid, and `p_filters is null` short-circuits to the exact
-- pre-154 behavior (the Phase 2 baseline + post-phase4a snapshot depend on
-- this; verified by diffing post-phase4b against post-phase4a).
--
-- NOTE: adding a defaulted parameter changes the function signature, so each
-- old signature is DROPPED first (otherwise we'd create an ambiguous
-- overload). ACLs are re-applied after each create (live ACL: execute
-- revoked from public/anon/authenticated, granted to service_role only).
--
-- Filter semantics (single source of truth — lib/admin/filters.ts header
-- documents the same table):
--   device        'desktop'|'mobile'|'tablet' → device_type = value
--                 'unknown'                   → device_type IS NULL
--   country       country = value (ISO alpha-2 as stored)
--   source        referrer ILIKE '%'||value||'%' (value pre-sanitized to
--                 [a-z0-9.-] by the TS layer; PostgREST can't extract a URL
--                 host, so both sides use contains-on-referrer semantics)
--   utm_source    utm_source   = value  ← TOP-LEVEL columns, deliberately:
--   utm_medium    utm_medium   = value    properties->>'utm_*' has zero rows
--   utm_campaign  utm_campaign = value    in the live DB (checked 2026-06-12)
--   auth          'known' → user_id IS NOT NULL; 'anon' → user_id IS NULL
--   event         event_name = value
--
-- Range + bots stay in the existing p_cutoff/p_end/p_include_bots params.

-- ────────────────────────────────────────────────────────────────────────
-- 1. The shared predicate
-- ────────────────────────────────────────────────────────────────────────

create or replace function public.insights_apply_filters(ue public.user_events, f jsonb)
returns boolean
language sql
immutable
as $$
  select f is null or (
        (f->>'device' is null or
          case when f->>'device' = 'unknown' then ue.device_type is null
               else ue.device_type = f->>'device' end)
    and (f->>'country' is null or ue.country = f->>'country')
    and (f->>'source' is null or ue.referrer ilike '%' || (f->>'source') || '%')
    and (f->>'utm_source' is null or ue.utm_source = f->>'utm_source')
    and (f->>'utm_medium' is null or ue.utm_medium = f->>'utm_medium')
    and (f->>'utm_campaign' is null or ue.utm_campaign = f->>'utm_campaign')
    and (f->>'auth' is null or
          case f->>'auth' when 'known' then ue.user_id is not null
                          when 'anon'  then ue.user_id is null
                          else true end)
    and (f->>'event' is null or ue.event_name = f->>'event')
  )
$$;

revoke all on function public.insights_apply_filters(public.user_events, jsonb) from public, anon, authenticated;
grant execute on function public.insights_apply_filters(public.user_events, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 2. distinct_visitors_in_window
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.distinct_visitors_in_window(timestamptz, boolean, timestamptz);

create function public.distinct_visitors_in_window(
  p_cutoff timestamptz,
  p_include_bots boolean default false,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(count bigint)
language sql
security definer
set search_path to 'public'
as $$
  select count(distinct distinct_id)::bigint from user_events
  where created_at >= p_cutoff and (p_end is null or created_at < p_end)
    and (p_include_bots or not bot_likely)
    and insights_apply_filters(user_events, p_filters);
$$;

revoke all on function public.distinct_visitors_in_window(timestamptz, boolean, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.distinct_visitors_in_window(timestamptz, boolean, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 3. distinct_known_users_in_window
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.distinct_known_users_in_window(timestamptz, boolean, timestamptz);

create function public.distinct_known_users_in_window(
  p_cutoff timestamptz,
  p_include_bots boolean default false,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(count bigint)
language sql
security definer
set search_path to 'public'
as $$
  select count(distinct user_id)::bigint from user_events
  where created_at >= p_cutoff and (p_end is null or created_at < p_end)
    and user_id is not null and (p_include_bots or not bot_likely)
    and insights_apply_filters(user_events, p_filters);
$$;

revoke all on function public.distinct_known_users_in_window(timestamptz, boolean, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.distinct_known_users_in_window(timestamptz, boolean, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 4. distinct_visitors_for_event
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.distinct_visitors_for_event(text, timestamptz, boolean, timestamptz);

create function public.distinct_visitors_for_event(
  p_event_name text,
  p_cutoff timestamptz,
  p_include_bots boolean default false,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(count bigint)
language sql
security definer
set search_path to 'public'
as $$
  select count(distinct distinct_id)::bigint from user_events
  where event_name = p_event_name and created_at >= p_cutoff
    and (p_end is null or created_at < p_end) and (p_include_bots or not bot_likely)
    and insights_apply_filters(user_events, p_filters);
$$;

revoke all on function public.distinct_visitors_for_event(text, timestamptz, boolean, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.distinct_visitors_for_event(text, timestamptz, boolean, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 5. insights_daily_active_users
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_daily_active_users(integer, boolean, timestamptz, timestamptz);

create function public.insights_daily_active_users(
  p_days integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(day text, users bigint)
language sql
security definer
set search_path to 'public'
as $$
  with daily as (
    select
      to_char(date_trunc('day', created_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') as day,
      count(distinct distinct_id) as users
    from user_events
    where created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or created_at < p_end)
      and (p_include_bots or not bot_likely)
      and insights_apply_filters(user_events, p_filters)
    group by 1
  )
  select day, users from daily order by day;
$$;

revoke all on function public.insights_daily_active_users(integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_daily_active_users(integer, boolean, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 6. insights_bot_share
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_bot_share(integer, timestamptz, timestamptz);

create function public.insights_bot_share(
  p_days integer default 7,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(
  total_events bigint, bot_events bigint, bot_pct numeric,
  total_visitors bigint, bot_visitors bigint, bot_visitor_pct numeric
)
language sql
security definer
set search_path to 'public'
as $$
  with windowed as (
    select bot_likely, distinct_id
    from user_events
    where created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or created_at < p_end)
      and insights_apply_filters(user_events, p_filters)
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

revoke all on function public.insights_bot_share(integer, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_bot_share(integer, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 7. insights_events_by_device
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_events_by_device(text, integer, boolean, timestamptz, timestamptz);

create function public.insights_events_by_device(
  p_event_name text,
  p_days integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(device_type text, events bigint)
language sql
security definer
set search_path to 'public'
as $$
  select
    coalesce(user_events.device_type, 'unknown') as device_type,
    count(*)::bigint as events
  from user_events
  where event_name = p_event_name
    and created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
    and (p_end is null or created_at < p_end)
    and (p_include_bots or not bot_likely)
    and insights_apply_filters(user_events, p_filters)
  group by 1
  order by 2 desc;
$$;

revoke all on function public.insights_events_by_device(text, integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_events_by_device(text, integer, boolean, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 8. insights_top_events
--    (Not in the original Phase-4 RPC list, but getTopEvents() on the main
--    insights page calls it — without p_filters the "Top events" chart
--    would silently ignore the global filter bar.)
--    ALSO adds a stable tie-breaker (event_name asc): the live def ordered
--    by count only, so equal-count rows at the limit-20 tail came back in
--    plan-dependent order — recreating the function flipped tie order in
--    the post-phase4b snapshot diff. Counts are unchanged; the explicit
--    tie-breaker makes the regression oracle stable forever. (Other
--    limit+order RPCs share this latent hazard; they didn't flap in this
--    diff, so they keep their live ordering until their Phase 5 rebuild.)
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_top_events(integer, integer, boolean, timestamptz, timestamptz);

create function public.insights_top_events(
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(event_name text, events bigint)
language sql
security definer
set search_path to 'public'
as $$
  select event_name, count(*)::bigint as events
  from user_events
  where created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
    and (p_end is null or created_at < p_end)
    and (p_include_bots or not bot_likely)
    and insights_apply_filters(user_events, p_filters)
  group by 1
  order by 2 desc, 1 asc
  limit p_limit;
$$;

revoke all on function public.insights_top_events(integer, integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_top_events(integer, integer, boolean, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 9. insights_top_jsonb_property
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_top_jsonb_property(text, text, integer, integer, boolean, timestamptz, timestamptz);

create function public.insights_top_jsonb_property(
  p_event_name text,
  p_property text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(value text, events bigint)
language sql
security definer
set search_path to 'public'
as $$
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
    and insights_apply_filters(user_events, p_filters)
  group by 1
  order by 2 desc
  limit p_limit;
$$;

revoke all on function public.insights_top_jsonb_property(text, text, integer, integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_top_jsonb_property(text, text, integer, integer, boolean, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 10. insights_top_property (both branches)
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_top_property(text, integer, integer, boolean, timestamptz, timestamptz);

create function public.insights_top_property(
  p_property text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
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
      select coalesce(nullif(uip.first_touch_referrer, ''), '(unknown)')::text as value,
             count(distinct ue.distinct_id)::bigint as events
      from user_events ue
      left join user_intent_profile uip on uip.distinct_id = ue.distinct_id
      where ue.created_at >= v_cutoff
        and (p_end is null or ue.created_at < p_end)
        and (p_include_bots or not ue.bot_likely)
        and insights_apply_filters(ue, p_filters)
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
      and insights_apply_filters(user_events, $5::jsonb)
    group by 1
    order by 2 desc
    limit $2
  $f$, p_property, p_property, p_property);
  return query execute q using v_cutoff, p_limit, p_include_bots, p_end, p_filters;
end;
$function$;

revoke all on function public.insights_top_property(text, integer, integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_top_property(text, integer, integer, boolean, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 11. insights_unnest_intent_array
--     Reads user_intent_profile (per-visitor aggregates), NOT user_events,
--     so the row predicate can't apply directly. Sensible mapping: when
--     p_filters is set, keep only profiles whose distinct_id has at least
--     one user_events row matching the filters (same unbounded-lifetime
--     shape as the existing bot-exclusion EXISTS in this function).
--     p_filters = null → byte-identical to the pre-154 query.
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_unnest_intent_array(text, integer, integer, boolean, timestamptz, timestamptz);

create function public.insights_unnest_intent_array(
  p_column text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
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
      and ($5::jsonb is null or exists (
        select 1 from user_events ue2
        where ue2.distinct_id = uip.distinct_id
          and insights_apply_filters(ue2, $5::jsonb)
        limit 1
      ))
    group by 1
    order by 2 desc
    limit $2
  $f$, p_column);
  return query execute q using v_cutoff, p_limit, p_include_bots, p_end, p_filters;
end;
$function$;

revoke all on function public.insights_unnest_intent_array(text, integer, integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_unnest_intent_array(text, integer, integer, boolean, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 12. insights_returning_visitors
--     p_filters defines WINDOW MEMBERSHIP (which visitors count as active
--     in the window). The lifetime CTE (first/last seen) intentionally
--     stays entity-unfiltered — "returning" means "first seen anywhere
--     before the window", matching how the bot flag already works here.
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_returning_visitors(timestamptz, boolean, timestamptz, integer);

create function public.insights_returning_visitors(
  p_cutoff timestamptz,
  p_include_bots boolean default false,
  p_end timestamptz default null,
  p_days integer default 7,
  p_filters jsonb default null
)
returns table(
  total_visitors bigint, new_visitors bigint, returning_visitors bigint,
  returning_pct numeric, avg_days_between numeric
)
language sql
security definer
set search_path to 'public'
as $$
  with v_cutoff as (
    select coalesce(p_cutoff, now() - (p_days || ' days')::interval) as c
  ),
  in_window as (
    select ue.distinct_id
    from user_events ue, v_cutoff v
    where ue.created_at >= v.c
      and (p_end is null or ue.created_at < p_end)
      and (p_include_bots or not ue.bot_likely)
      and insights_apply_filters(ue, p_filters)
    group by ue.distinct_id
  ),
  lifetime as (
    select ue.distinct_id,
           min(ue.created_at) as first_seen,
           max(ue.created_at) as last_seen
    from user_events ue
    join in_window iw on iw.distinct_id = ue.distinct_id
    where (p_include_bots or not ue.bot_likely)
    group by ue.distinct_id
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
          filter (where first_seen < (select c from v_cutoff)))::numeric, 1)
      else 0
    end as avg_days_between
  from lifetime;
$$;

revoke all on function public.insights_returning_visitors(timestamptz, boolean, timestamptz, integer, jsonb) from public, anon, authenticated;
grant execute on function public.insights_returning_visitors(timestamptz, boolean, timestamptz, integer, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 13. insights_recent_visitors
--     Same membership rule as insights_returning_visitors: p_filters
--     applies to the in_window CTE; the lifetime first-seen lookup stays
--     entity-unfiltered.
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_recent_visitors(integer, boolean, timestamptz, timestamptz);

create function public.insights_recent_visitors(
  p_limit integer default 50,
  p_include_bots boolean default false,
  p_window_start timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(
  distinct_id text, user_id uuid, first_seen timestamptz, last_seen timestamptz,
  total_events bigint, active_days integer, is_returning boolean
)
language sql
security definer
set search_path to 'public'
as $$
  with in_window as (
    select ue.distinct_id,
           (min(ue.user_id::text) filter (where ue.user_id is not null))::uuid as w_user_id,
           min(ue.created_at) as w_first,
           max(ue.created_at) as w_last,
           count(*)::bigint as w_events,
           count(distinct date_trunc('day', ue.created_at at time zone 'Asia/Kolkata'))::int as w_days
    from user_events ue
    where (p_include_bots or not ue.bot_likely)
      and (p_window_start is null or ue.created_at >= p_window_start)
      and (p_end is null or ue.created_at < p_end)
      and insights_apply_filters(ue, p_filters)
    group by ue.distinct_id
  ),
  lifetime as (
    select ue.distinct_id, min(ue.created_at) as lt_first
    from user_events ue
    join in_window iw on iw.distinct_id = ue.distinct_id
    where (p_include_bots or not ue.bot_likely)
    group by ue.distinct_id
  )
  select
    iw.distinct_id,
    iw.w_user_id as user_id,
    lt.lt_first as first_seen,
    iw.w_last as last_seen,
    iw.w_events as total_events,
    iw.w_days as active_days,
    case
      when p_window_start is not null then (lt.lt_first < p_window_start)
      else (iw.w_last - lt.lt_first > interval '1 hour')
    end as is_returning
  from in_window iw
  join lifetime lt on lt.distinct_id = iw.distinct_id
  order by iw.w_last desc
  limit p_limit;
$$;

revoke all on function public.insights_recent_visitors(integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_recent_visitors(integer, boolean, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 14. insights_zero_result_rate
--     Reads user_events (search_query_submitted rows), NOT search_logs —
--     so the shared predicate applies directly.
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_zero_result_rate(timestamptz, timestamptz, boolean, integer);

create function public.insights_zero_result_rate(
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_include_bots boolean default false,
  p_days integer default 7,
  p_filters jsonb default null
)
returns table(total_submissions bigint, zero_result_submissions bigint, zero_result_pct numeric)
language sql
security definer
set search_path to 'public'
as $$
  with base as (
    select properties
    from user_events
    where event_name = 'search_query_submitted'
      and created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or created_at < p_end)
      and (p_include_bots or not bot_likely)
      and insights_apply_filters(user_events, p_filters)
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
$$;

revoke all on function public.insights_zero_result_rate(timestamptz, timestamptz, boolean, integer, jsonb) from public, anon, authenticated;
grant execute on function public.insights_zero_result_rate(timestamptz, timestamptz, boolean, integer, jsonb) to service_role;
