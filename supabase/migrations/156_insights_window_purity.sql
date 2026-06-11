-- 156_insights_window_purity.sql
-- Phase 10.5a.4 (2026-06-12) — window-purity + determinism fixes on the
-- Audience RPCs, plus p_filters on the geo/device breakdowns.
--
-- Every function below was extended from its LIVE definition (fetched via
-- pg_get_functiondef on 2026-06-12), NOT reconstructed from old migration
-- files.
--
-- (1) p_end cap on lifetime aggregation — insights_returning_visitors +
--     insights_recent_visitors. The Phase 4A gate (docs/admin/phase4a-gate.md)
--     caught insights_returning_visitors.avg_days_between creeping +0.1d per
--     ~9.5h of wall-clock: the lifetime CTE computed max(created_at) with no
--     p_end cap, so a returning visitor still active TODAY kept extending
--     last_seen inside a pinned historical window. Capping the lifetime scan
--     at p_end makes the metric window-pure (immutable for pinned windows).
--     The same cap is applied to insights_recent_visitors' lifetime CTE for
--     contract consistency (its lifetime aggregate is min(created_at), which
--     events after p_end can never lower — a window member always has an
--     event before p_end — so this is a numeric no-op there, and the cap
--     cannot change is_returning for the same reason). Migration 155's
--     insights_user_directory shipped with this cap from day one.
--
-- (2) Deterministic secondary ordering (value asc) — insights_top_property,
--     insights_top_jsonb_property, insights_unnest_intent_array, and the
--     geo/device breakdowns. Same fix migration 154 applied to
--     insights_top_events (`order by 2 desc, 1 asc`): without a tie-breaker,
--     equal-count rows come back in arbitrary heap order and the baseline
--     snapshot oracle flags spurious tie-order swaps.
--
-- (3) p_filters jsonb on insights_geo_breakdown + insights_device_breakdown
--     so /admin/insights/geo + /admin/insights/devices can honor the global
--     smart filter bar via the ONE shared predicate (insights_apply_filters,
--     migration 154). Appended LAST with default null → every existing call
--     site stays valid and `p_filters is null` short-circuits to the exact
--     pre-156 behavior. Signature changes, so the old signatures are DROPPED
--     first (no ambiguous overloads) and the live ACL is re-applied
--     (execute: service_role only).
--
-- Expected snapshot effects (documented for the post-phase5a gate diff):
--   * insights.getReturningSummary.{humans,withBots}: avg_days_between
--     changes ONCE to its window-pure value and then stays frozen for the
--     pinned week (pre-156 live values: 12.4 humans / 9.4 bots, still
--     drifting). All counts (total/new/returning/returning_pct) IDENTICAL.
--   * top_property / top_jsonb_property / unnest_intent_array consumers
--     (top referrers / pages / searches / viewed / clicked / saved tools /
--     use cases / chat tools / compared tools): possible one-off tie-order
--     swaps among equal-count rows; every (value, count) pair IDENTICAL.
--   * geo/device breakdowns: p_filters null → counts byte-identical;
--     ordering gains the same tie-breakers.

-- ────────────────────────────────────────────────────────────────────────
-- 1. insights_returning_visitors — cap lifetime at p_end (signature
--    unchanged → create or replace keeps the existing ACL)
-- ────────────────────────────────────────────────────────────────────────

create or replace function public.insights_returning_visitors(
  p_cutoff timestamptz,
  p_include_bots boolean default false,
  p_end timestamptz default null,
  p_days integer default 7,
  p_filters jsonb default null
)
returns table(
  total_visitors bigint,
  new_visitors bigint,
  returning_visitors bigint,
  returning_pct numeric,
  avg_days_between numeric
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
      -- 156: cap the lifetime scan at p_end so last_seen (and therefore
      -- avg_days_between) is window-pure — pinned windows stay immutable.
      and (p_end is null or ue.created_at < p_end)
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

-- ────────────────────────────────────────────────────────────────────────
-- 2. insights_recent_visitors — same p_end cap on the lifetime CTE
--    (numeric no-op for min(); contract consistency with 155/156)
-- ────────────────────────────────────────────────────────────────────────

create or replace function public.insights_recent_visitors(
  p_limit integer default 50,
  p_include_bots boolean default false,
  p_window_start timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(
  distinct_id text,
  user_id uuid,
  first_seen timestamptz,
  last_seen timestamptz,
  total_events bigint,
  active_days integer,
  is_returning boolean
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
      -- 156: cap the lifetime scan at p_end (window purity; no-op for min()
      -- since a window member always has >=1 event before p_end).
      and (p_end is null or ue.created_at < p_end)
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

-- ────────────────────────────────────────────────────────────────────────
-- 3. insights_top_jsonb_property — deterministic tie-break (value asc)
-- ────────────────────────────────────────────────────────────────────────

create or replace function public.insights_top_jsonb_property(
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
  order by 2 desc, 1 asc
  limit p_limit;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- 4. insights_top_property — deterministic tie-break on both branches
-- ────────────────────────────────────────────────────────────────────────

create or replace function public.insights_top_property(
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
      order by 2 desc, 1 asc
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
    order by 2 desc, 1 asc
    limit $2
  $f$, p_property, p_property, p_property);
  return query execute q using v_cutoff, p_limit, p_include_bots, p_end, p_filters;
end;
$function$;

-- ────────────────────────────────────────────────────────────────────────
-- 5. insights_unnest_intent_array — deterministic tie-break (value asc)
-- ────────────────────────────────────────────────────────────────────────

create or replace function public.insights_unnest_intent_array(
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
    order by 2 desc, 1 asc
    limit $2
  $f$, p_column);
  return query execute q using v_cutoff, p_limit, p_include_bots, p_end, p_filters;
end;
$function$;

-- ────────────────────────────────────────────────────────────────────────
-- 6. insights_geo_breakdown — + p_filters (shared predicate) + tie-breaks.
--    Signature changes → drop the old one first, re-apply the live ACL.
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_geo_breakdown(integer, boolean, timestamptz, timestamptz);

create function public.insights_geo_breakdown(
  p_days integer default 7,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(country text, visitors integer, events integer, top_city text, top_city_visitors integer)
language sql
security definer
set search_path to 'public'
as $$
  with base as (
    select e.distinct_id, e.country, e.city
    from user_events e
    where e.created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or e.created_at < p_end)
      and (p_include_bots or e.bot_likely = false)
      and insights_apply_filters(e, p_filters)
      and e.country is not null
      and e.country <> ''
  ),
  city_rank as (
    select country, city, count(distinct distinct_id)::int as v,
      row_number() over (partition by country order by count(distinct distinct_id) desc, city asc) as rk
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
  order by pc.visitors desc, pc.country asc;
$$;

revoke all on function public.insights_geo_breakdown(integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_geo_breakdown(integer, boolean, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 7. insights_device_breakdown — + p_filters + tie-break.
--    Signature changes → drop + recreate + re-apply the live ACL.
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.insights_device_breakdown(integer, boolean, timestamptz, timestamptz);

create function public.insights_device_breakdown(
  p_days integer default 7,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(device_type text, visitors integer, events integer, client_events integer, server_events integer, pct_of_total numeric)
language sql
security definer
set search_path to 'public'
as $$
  with base as (
    select e.distinct_id, e.device_type, e.source_kind
    from user_events e
    where e.created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or e.created_at < p_end)
      and (p_include_bots or e.bot_likely = false)
      and insights_apply_filters(e, p_filters)
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
  order by 3 desc, 1 asc;
$$;

revoke all on function public.insights_device_breakdown(integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_device_breakdown(integer, boolean, timestamptz, timestamptz, jsonb) to service_role;
