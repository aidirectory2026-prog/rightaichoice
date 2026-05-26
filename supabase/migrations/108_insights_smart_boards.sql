-- Phase 8.h (2026-05-26) — RPCs powering the smart-boards rebuild of
-- /admin/insights. Five new functions: live_sessions, funnel_steps,
-- tool_heatmap, geo_breakdown, device_breakdown. All SECURITY DEFINER
-- so the admin client can call them; gated at the page layer by the
-- existing is_admin check in app/admin/layout.tsx.

-- ── 1. Live sessions ──────────────────────────────────────────────
-- Active in the last N seconds. One row per distinct_id with their
-- most recent event, current page, country, device, total events in
-- this session window, and the time-since-last-event delta.
create or replace function public.insights_live_sessions(
  p_active_within_sec int default 300,
  p_include_bots boolean default false
)
returns table(
  distinct_id text,
  user_id uuid,
  auth_state text,
  last_event_at timestamptz,
  seconds_since_last int,
  current_page text,
  current_event text,
  events_in_window int,
  pages_in_window int,
  country text,
  city text,
  region text,
  device_type text,
  utm_source text,
  referrer text,
  is_active boolean
)
language sql security definer set search_path = public
as $$
  with cutoff as (
    select now() - make_interval(secs => p_active_within_sec) as t
  ),
  recent as (
    select e.*
    from user_events e, cutoff c
    where e.created_at >= c.t
      and (p_include_bots or e.bot_likely = false)
  ),
  latest as (
    -- Most recent event per distinct_id in the window
    select distinct on (distinct_id)
      distinct_id, user_id, auth_state, created_at as last_event_at,
      page_path as current_page, event_name as current_event,
      country, city, region, device_type, utm_source, referrer
    from recent
    order by distinct_id, created_at desc
  ),
  counts as (
    select distinct_id,
      count(*)::int as events_in_window,
      count(distinct page_path)::int as pages_in_window
    from recent
    group by distinct_id
  )
  select
    l.distinct_id, l.user_id, l.auth_state, l.last_event_at,
    extract(epoch from (now() - l.last_event_at))::int as seconds_since_last,
    l.current_page, l.current_event,
    c.events_in_window, c.pages_in_window,
    l.country, l.city, l.region, l.device_type, l.utm_source, l.referrer,
    (extract(epoch from (now() - l.last_event_at)) < 60) as is_active
  from latest l
  join counts c using (distinct_id)
  order by l.last_event_at desc;
$$;

grant execute on function public.insights_live_sessions to authenticated, service_role;

-- ── 2. Funnel steps ───────────────────────────────────────────────
-- Acquisition → tool view → visit click → signup, all counted as
-- distinct users (not events) so the funnel is meaningful.
create or replace function public.insights_funnel_steps(
  p_days int default 7,
  p_include_bots boolean default false,
  p_country text default null,
  p_device text default null
)
returns table(
  step_index int,
  step_name text,
  step_event text,
  unique_users int,
  total_events int,
  pct_of_step_1 numeric
)
language sql security definer set search_path = public
as $$
  with cutoff as (
    select now() - make_interval(days => p_days) as t
  ),
  base as (
    select e.distinct_id, e.event_name, e.page_path, e.created_at
    from user_events e, cutoff c
    where e.created_at >= c.t
      and (p_include_bots or e.bot_likely = false)
      and (p_country is null or e.country = p_country)
      and (p_device is null or e.device_type = p_device)
  ),
  steps as (
    select 1 as idx, 'Landed on site' as name, 'page_viewed' as ev,
      count(distinct distinct_id) filter (where event_name = 'page_viewed') as uniq,
      count(*) filter (where event_name = 'page_viewed') as total
    from base
    union all
    select 2, 'Viewed a tool page', 'tool_page_viewed',
      count(distinct distinct_id) filter (where event_name = 'tool_page_viewed'),
      count(*) filter (where event_name = 'tool_page_viewed')
    from base
    union all
    select 3, 'Clicked visit button', 'tool_visit_redirected',
      count(distinct distinct_id) filter (where event_name in ('tool_visit_redirected', 'tool_visit_clicked')),
      count(*) filter (where event_name in ('tool_visit_redirected', 'tool_visit_clicked'))
    from base
    union all
    select 4, 'Signed up', 'signup_completed',
      count(distinct distinct_id) filter (where event_name = 'signup_completed'),
      count(*) filter (where event_name = 'signup_completed')
    from base
  ),
  step1 as (select uniq from steps where idx = 1)
  select
    s.idx::int as step_index,
    s.name as step_name,
    s.ev as step_event,
    s.uniq::int as unique_users,
    s.total::int as total_events,
    case when (select uniq from step1) > 0
      then round(100.0 * s.uniq / (select uniq from step1), 1)
      else 0::numeric end as pct_of_step_1
  from steps s
  order by s.idx;
$$;

grant execute on function public.insights_funnel_steps to authenticated, service_role;

-- ── 3. Tool heatmap ───────────────────────────────────────────────
-- Per-tool stats: views, unique visitors, visit clicks, click-through
-- rate, last visit. Sorted by views descending. The tools table has
-- ~1,700 rows but only ones touched in the window are returned.
create or replace function public.insights_tool_heatmap(
  p_days int default 7,
  p_include_bots boolean default false,
  p_limit int default 500
)
returns table(
  tool_slug text,
  tool_name text,
  views int,
  unique_visitors int,
  visit_clicks int,
  ctr_pct numeric,
  last_visit_at timestamptz
)
language sql security definer set search_path = public
as $$
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
$$;

grant execute on function public.insights_tool_heatmap to authenticated, service_role;

-- ── 4. Geo breakdown ──────────────────────────────────────────────
-- Country-level visitor counts plus city detail for the top 5 countries.
-- Used by Acquisition Map.
create or replace function public.insights_geo_breakdown(
  p_days int default 7,
  p_include_bots boolean default false
)
returns table(
  country text,
  visitors int,
  events int,
  top_city text,
  top_city_visitors int
)
language sql security definer set search_path = public
as $$
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
$$;

grant execute on function public.insights_geo_breakdown to authenticated, service_role;

-- ── 5. Device breakdown ───────────────────────────────────────────
-- Device type + browser-family heuristic from user_agent. Also returns
-- an ad-block-rate estimate: ratio of server-only events to total
-- events per device class (server fires even when client is blocked).
create or replace function public.insights_device_breakdown(
  p_days int default 7,
  p_include_bots boolean default false
)
returns table(
  device_type text,
  visitors int,
  events int,
  client_events int,
  server_events int,
  pct_of_total numeric
)
language sql security definer set search_path = public
as $$
  with cutoff as (
    select now() - make_interval(days => p_days) as t
  ),
  base as (
    select e.distinct_id, e.device_type, e.source_kind
    from user_events e, cutoff c
    where e.created_at >= c.t
      and (p_include_bots or e.bot_likely = false)
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
  order by events desc;
$$;

grant execute on function public.insights_device_breakdown to authenticated, service_role;

-- ── 6. Activity feed ──────────────────────────────────────────────
-- Most recent N events across all users, for the right-rail activity
-- feed on the new shell. Limited to interesting event types.
create or replace function public.insights_activity_feed(
  p_limit int default 30,
  p_include_bots boolean default false
)
returns table(
  id uuid,
  created_at timestamptz,
  distinct_id text,
  event_name text,
  page_path text,
  country text,
  city text,
  device_type text,
  tool_slug text,
  source_kind text
)
language sql security definer set search_path = public
as $$
  select e.id, e.created_at, e.distinct_id, e.event_name, e.page_path,
    e.country, e.city, e.device_type,
    coalesce(e.properties->>'tool_slug',
             nullif(split_part(e.page_path, '/', 3), '')
               filter (where e.page_path like '/tools/%')) as tool_slug,
    e.source_kind
  from user_events e
  where (p_include_bots or e.bot_likely = false)
    and e.event_name in (
      'page_viewed','tool_page_viewed','tool_visit_redirected','tool_visit_clicked',
      'signup_completed','login_completed','newsletter_subscribed',
      'plan_completed','recommendation_requested','tool_saved','review_submitted',
      'compare_share_clicked','search_submitted'
    )
  order by e.created_at desc
  limit p_limit;
$$;

grant execute on function public.insights_activity_feed to authenticated, service_role;
