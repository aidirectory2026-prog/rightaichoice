-- 157_event_explorer_breakdown.sql
-- Phase 10.5b.1 (2026-06-12) — Events-explorer RPCs + p_filters on the
-- remaining tool-engagement RPCs.
--
-- Two NEW functions for the rebuilt /admin/insights/events explorer:
--   1. insights_event_property_breakdown — top values of one JSONB property
--      for one event (the TS layer allowlists p_prop against the event's
--      EVENT_SCHEMAS entry before calling; SQL parameterizes properties->>
--      so no identifier interpolation happens either way).
--   2. insights_event_volume_list — one row per event_name in the window:
--      toggle-scoped event count, the always-visible bot split, distinct
--      visitors, last fire, and a per-IST-day spark series.
--
-- Three EXTENDED functions (each from its LIVE definition fetched via
-- pg_get_functiondef on 2026-06-12, NOT reconstructed from old migration
-- files): distinct_visitors_for_tool, insights_tool_compared_with and
-- insights_tool_heatmap gain `p_filters jsonb default null` appended LAST,
-- with `p_filters is null` short-circuiting (inside insights_apply_filters)
-- to the exact pre-157 behavior — the snapshot-oracle null fast-path the
-- Phase 5b gate diffs against. Old signatures are DROPPED first to avoid
-- ambiguous overloads (the 154/156 discipline).
--
-- insights_tool_compared_with aggregates user_intent_profile, so its
-- p_filters follows the migration-154 §11 precedent (insights_unnest_
-- intent_array): restrict to visitors with at least one user_events row
-- matching the filter predicate.
--
-- ACLs: execute revoked from public/anon/authenticated, granted to
-- service_role only (the live ACL on every insights RPC).
-- Deterministic ORDER BY everywhere (count desc, label asc).

-- ────────────────────────────────────────────────────────────────────────
-- 1. insights_event_property_breakdown (NEW)
-- ────────────────────────────────────────────────────────────────────────

create function public.insights_event_property_breakdown(
  p_event text,
  p_prop text,
  p_filters jsonb default null,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_limit integer default 12,
  p_include_bots boolean default false
)
returns table(value text, events bigint, visitors bigint)
language sql
security definer
set search_path to 'public'
as $$
  select
    coalesce(nullif(properties->>p_prop, ''), '(missing)') as value,
    count(*)::bigint as events,
    count(distinct distinct_id)::bigint as visitors
  from user_events
  where event_name = p_event
    and (p_cutoff is null or created_at >= p_cutoff)
    and (p_end is null or created_at < p_end)
    and (p_include_bots or not bot_likely)
    and insights_apply_filters(user_events, p_filters)
  group by 1
  order by 2 desc, 1 asc
  limit p_limit;
$$;

revoke all on function public.insights_event_property_breakdown(text, text, jsonb, timestamptz, timestamptz, integer, boolean) from public, anon, authenticated;
grant execute on function public.insights_event_property_breakdown(text, text, jsonb, timestamptz, timestamptz, integer, boolean) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 2. insights_event_volume_list (NEW)
-- ────────────────────────────────────────────────────────────────────────
-- `events`/`visitors`/`last_fired`/`spark` respect the bots toggle;
-- `bot_events` is ALWAYS the bot-row count in the window (the split stays
-- visible either way). Events with only bot rows still appear (events=0)
-- when bots are excluded, so the explorer never hides bot-only noise.

create function public.insights_event_volume_list(
  p_cutoff timestamptz,
  p_end timestamptz default null,
  p_include_bots boolean default false,
  p_filters jsonb default null
)
returns table(event_name text, events bigint, bot_events bigint, visitors bigint, last_fired timestamptz, spark jsonb)
language sql
security definer
set search_path to 'public'
as $$
  with base as (
    select ue.event_name, ue.distinct_id, ue.created_at, ue.bot_likely,
           (ue.created_at at time zone 'Asia/Kolkata')::date as ist_day
    from user_events ue
    where ue.created_at >= p_cutoff
      and (p_end is null or ue.created_at < p_end)
      and insights_apply_filters(ue, p_filters)
  ),
  flt as (
    select * from base where p_include_bots or not bot_likely
  ),
  agg_all as (
    select base.event_name,
           count(*) filter (where base.bot_likely)::bigint as bot_events
    from base group by 1
  ),
  agg_flt as (
    select flt.event_name,
           count(*)::bigint as events,
           count(distinct flt.distinct_id)::bigint as visitors,
           max(flt.created_at) as last_fired
    from flt group by 1
  ),
  sparks as (
    select d.event_name,
           jsonb_agg(jsonb_build_object('date', to_char(d.ist_day, 'YYYY-MM-DD'), 'value', d.n) order by d.ist_day) as spark
    from (
      select flt.event_name, flt.ist_day, count(*)::bigint as n
      from flt group by 1, 2
    ) d
    group by 1
  )
  select
    al.event_name,
    coalesce(af.events, 0)::bigint as events,
    al.bot_events,
    coalesce(af.visitors, 0)::bigint as visitors,
    af.last_fired,
    coalesce(s.spark, '[]'::jsonb) as spark
  from agg_all al
  left join agg_flt af on af.event_name = al.event_name
  left join sparks s on s.event_name = al.event_name
  order by coalesce(af.events, 0) desc, al.bot_events desc, al.event_name asc;
$$;

revoke all on function public.insights_event_volume_list(timestamptz, timestamptz, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.insights_event_volume_list(timestamptz, timestamptz, boolean, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 3. distinct_visitors_for_tool (+ p_filters; from live def 2026-06-12)
-- ────────────────────────────────────────────────────────────────────────

drop function if exists public.distinct_visitors_for_tool(text, timestamptz, boolean, timestamptz);

create function public.distinct_visitors_for_tool(
  p_slug text,
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
    and properties->>'tool_slug' = p_slug and (p_include_bots or not bot_likely)
    and insights_apply_filters(user_events, p_filters);
$$;

revoke all on function public.distinct_visitors_for_tool(text, timestamptz, boolean, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.distinct_visitors_for_tool(text, timestamptz, boolean, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 4. insights_tool_compared_with (+ p_filters; from live def 2026-06-12)
-- ────────────────────────────────────────────────────────────────────────
-- Profile aggregate → p_filters restricts to visitors with ≥1 matching
-- user_events row (the migration-154 §11 precedent). Also adds the
-- deterministic tie-breaker (2 desc, 1 asc) the 156 sweep gave the other
-- top-N RPCs.

drop function if exists public.insights_tool_compared_with(text, integer, integer, boolean, timestamptz, timestamptz);

create function public.insights_tool_compared_with(
  p_slug text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(value text, users bigint)
language sql
security definer
set search_path to 'public'
as $$
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
      and (p_filters is null or exists (
        select 1 from user_events ue2
        where ue2.distinct_id = uip.distinct_id
          and insights_apply_filters(ue2, p_filters)
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
  order by 2 desc, 1 asc
  limit p_limit;
$$;

revoke all on function public.insights_tool_compared_with(text, integer, integer, boolean, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_tool_compared_with(text, integer, integer, boolean, timestamptz, timestamptz, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 5. insights_tool_heatmap (+ p_filters; from live def 2026-06-12)
-- ────────────────────────────────────────────────────────────────────────
-- Already window-pure (p_cutoff/p_end since 149); gains the shared optional
-- filter predicate so the rebuilt /admin/insights/tools honors the full
-- filter bar. Deterministic tie-breaker extended with tool_slug asc.

drop function if exists public.insights_tool_heatmap(integer, boolean, integer, timestamptz, timestamptz);

create function public.insights_tool_heatmap(
  p_days integer default 7,
  p_include_bots boolean default false,
  p_limit integer default 500,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_filters jsonb default null
)
returns table(tool_slug text, tool_name text, views integer, unique_visitors integer, visit_clicks integer, ctr_pct numeric, last_visit_at timestamptz)
language sql
security definer
set search_path to 'public'
as $$
  with ev as (
    select e.distinct_id, e.event_name, e.created_at,
      coalesce(e.properties->>'tool_slug',
               nullif(split_part(e.page_path, '/', 3), ''))
        as tool_slug
    from user_events e
    where e.created_at >= coalesce(p_cutoff, now() - (p_days || ' days')::interval)
      and (p_end is null or e.created_at < p_end)
      and (p_include_bots or e.bot_likely = false)
      and insights_apply_filters(e, p_filters)
      and (e.event_name in ('tool_page_viewed', 'tool_visit_redirected', 'tool_visit_clicked')
           or e.page_path like '/tools/%')
  ),
  agg as (
    select
      ev.tool_slug,
      count(*) filter (where ev.event_name in ('tool_page_viewed','page_viewed'))::int as views,
      count(distinct ev.distinct_id) filter (where ev.event_name in ('tool_page_viewed','page_viewed'))::int as unique_visitors,
      count(*) filter (where ev.event_name in ('tool_visit_redirected','tool_visit_clicked'))::int as visit_clicks,
      max(ev.created_at) as last_visit_at
    from ev
    where ev.tool_slug is not null and ev.tool_slug <> ''
    group by ev.tool_slug
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
  order by a.views desc, a.unique_visitors desc, a.tool_slug asc
  limit p_limit;
$$;

revoke all on function public.insights_tool_heatmap(integer, boolean, integer, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.insights_tool_heatmap(integer, boolean, integer, timestamptz, timestamptz, jsonb) to service_role;
