-- 183: Filter honesty — every page that renders the FilterBar now honors it.
--
-- Phase 14b Wave 1. Three pages (searches, plan-dropoff, errors) rendered the
-- global FilterBar but their RPCs had no p_filters parameter, so dimension
-- chips silently did nothing. Live and the activity feed had no filters at all.
-- This migration threads the ONE shared predicate insights_apply_filters()
-- (migration 181) through all of them, adds a time window + event constraint
-- to the User-360 session timeline, and email/ID search to the user directory.
--
-- Postgres footgun: adding a parameter creates an OVERLOAD, not a replacement,
-- and PostgREST rpc() then fails as ambiguous — so each old signature is
-- dropped first. Rollback file restores the previous definitions verbatim.

-- ── 1. insights_search_log — + p_filters ────────────────────────────────
drop function if exists public.insights_search_log(timestamptz, timestamptz, boolean, integer);

create function public.insights_search_log(
  p_cutoff timestamptz,
  p_end timestamptz default null,
  p_include_bots boolean default false,
  p_limit integer default 200,
  p_filters jsonb default null
)
returns table(distinct_id text, user_id uuid, email text, query text, event_kind text, result_count integer, zero_result boolean, clicked boolean, created_at timestamptz)
language sql
security definer
set search_path to 'public'
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
      and insights_apply_filters(ue, p_filters)
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

revoke all on function public.insights_search_log(timestamptz, timestamptz, boolean, integer, jsonb) from public, anon, authenticated;
grant execute on function public.insights_search_log(timestamptz, timestamptz, boolean, integer, jsonb) to service_role;

-- ── 2. insights_plan_dropoff — + p_filters ──────────────────────────────
-- The predicate constrains which plan-journey events count (e.g. country=IN
-- shows only journeys whose events came from India). Callers pass
-- dropEvent:true — an event pin must not hollow out the fixed journey set.
drop function if exists public.insights_plan_dropoff(timestamptz, timestamptz, boolean);

create function public.insights_plan_dropoff(
  p_cutoff timestamptz,
  p_end timestamptz default null,
  p_include_bots boolean default false,
  p_filters jsonb default null
)
returns table(distinct_id text, user_id uuid, email text, full_name text, furthest_step integer, furthest_label text, completed boolean, goal_text text, events_in_journey bigint, last_activity timestamptz)
language sql
security definer
set search_path to 'public'
as $function$
  with steps as (
    select * from (values (1,'plan_started'),(2,'plan_intake_submitted'),(3,'plan_completed'),(4,'plan_results_tool_clicked')) s(idx, ev)
  ),
  journey as (
    select ue.distinct_id, ue.event_name, ue.created_at, ue.properties, ue.user_id
    from user_events ue
    where ue.created_at >= p_cutoff and (p_end is null or ue.created_at < p_end)
      and (p_include_bots or not ue.bot_likely)
      and insights_apply_filters(ue, p_filters)
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

revoke all on function public.insights_plan_dropoff(timestamptz, timestamptz, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.insights_plan_dropoff(timestamptz, timestamptz, boolean, jsonb) to service_role;

-- ── 3. insights_error_overview — + p_filters ────────────────────────────
drop function if exists public.insights_error_overview(timestamptz, timestamptz, boolean);

create function public.insights_error_overview(
  p_cutoff timestamptz,
  p_end timestamptz default null,
  p_include_bots boolean default false,
  p_filters jsonb default null
)
returns table(category text, message text, error_type text, occurrences bigint, page_count bigint, sample_page text, first_seen timestamptz, last_seen timestamptz)
language sql
security definer
set search_path to 'public'
as $function$
  with e as (
    select
      left(coalesce(nullif(ue.properties->>'message',''), '(no message)'), 300) as message,
      ue.properties->>'error_type' as etype,
      coalesce(ue.properties->>'source_url','') as src,
      coalesce(ue.page_path, ue.properties->>'page_path') as page,
      ue.created_at
    from user_events ue
    where ue.event_name = 'error_encountered'
      and ue.created_at >= p_cutoff
      and (p_end is null or ue.created_at < p_end)
      and (p_include_bots or not ue.bot_likely)
      and insights_apply_filters(ue, p_filters)
  ),
  classified as (
    select e.*,
      case
        when etype = 'resource_error' then 'resource'
        when etype = 'react_boundary' then 'app'
        when etype in ('js_error','unhandled_rejection') and (src ~ '/_next/static/' or src = '') then 'app'
        when src ~ '^(chrome-extension|moz-extension|safari-web-extension)' then 'extension'
        when etype = 'js_error' then 'extension'
        else 'app'
      end as category
    from e
  )
  select
    category,
    message,
    (array_agg(etype order by created_at desc))[1] as error_type,
    count(*)::bigint as occurrences,
    count(distinct page)::bigint as page_count,
    (array_agg(page order by created_at desc))[1] as sample_page,
    min(created_at) as first_seen,
    max(created_at) as last_seen
  from classified
  group by category, message
  order by occurrences desc;
$function$;

revoke all on function public.insights_error_overview(timestamptz, timestamptz, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.insights_error_overview(timestamptz, timestamptz, boolean, jsonb) to service_role;

-- ── 4. insights_live_sessions — + p_filters ─────────────────────────────
drop function if exists public.insights_live_sessions(integer, boolean);

create function public.insights_live_sessions(
  p_active_within_sec integer default 300,
  p_include_bots boolean default false,
  p_filters jsonb default null
)
returns table(distinct_id text, user_id uuid, auth_state text, last_event_at timestamptz, seconds_since_last integer, current_page text, current_event text, events_in_window integer, pages_in_window integer, country text, city text, region text, device_type text, utm_source text, referrer text, is_active boolean)
language sql
security definer
set search_path to 'public'
as $function$
  with guard as (
    select (
      coalesce(auth.role(), '') = 'service_role'
      or coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false)
    ) as ok
  ),
  cutoff as (
    select now() - make_interval(secs => p_active_within_sec) as t
  ),
  recent as (
    select e.*
    from user_events e, cutoff c
    where e.created_at >= c.t
      and (p_include_bots or e.bot_likely = false)
      and insights_apply_filters(e, p_filters)
  ),
  latest as (
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
  cross join guard g
  where g.ok
  order by l.last_event_at desc;
$function$;

-- authenticated keeps EXECUTE (browser polls this from /admin/insights/live);
-- the in-SQL guard above restricts real access to admins/service_role.
revoke all on function public.insights_live_sessions(integer, boolean, jsonb) from public, anon;
grant execute on function public.insights_live_sessions(integer, boolean, jsonb) to service_role, authenticated;

-- ── 5. insights_activity_feed — + p_filters + admin guard + authenticated ─
-- The Live page polls this from the browser (authenticated admin), but the
-- function only granted service_role — the client poll failed silently and
-- the feed froze at its server-rendered state. Fix: same in-SQL admin guard
-- as insights_live_sessions, then grant authenticated like it.
drop function if exists public.insights_activity_feed(integer, boolean);

create function public.insights_activity_feed(
  p_limit integer default 30,
  p_include_bots boolean default false,
  p_filters jsonb default null
)
returns table(id uuid, created_at timestamptz, distinct_id text, event_name text, page_path text, country text, city text, device_type text, tool_slug text, source_kind text)
language sql
security definer
set search_path to 'public'
as $function$
  with guard as (
    select (
      coalesce(auth.role(), '') = 'service_role'
      or coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false)
    ) as ok
  )
  select e.id, e.created_at, e.distinct_id, e.event_name, e.page_path,
    e.country, e.city, e.device_type,
    case
      when e.properties->>'tool_slug' is not null then e.properties->>'tool_slug'
      when e.page_path like '/tools/%' then nullif(split_part(e.page_path, '/', 3), '')
      else null
    end as tool_slug,
    e.source_kind
  from user_events e
  cross join guard g
  where g.ok
    and (p_include_bots or e.bot_likely = false)
    and insights_apply_filters(e, p_filters)
    and e.event_name in (
      'page_viewed','tool_page_viewed','tool_visit_redirected','tool_visit_clicked',
      'signup_completed','login_completed','newsletter_subscribed',
      'plan_completed','recommendation_requested','tool_saved','review_submitted',
      'compare_share_clicked','search_submitted'
    )
  order by e.created_at desc
  limit p_limit;
$function$;

revoke all on function public.insights_activity_feed(integer, boolean, jsonb) from public, anon;
grant execute on function public.insights_activity_feed(integer, boolean, jsonb) to service_role, authenticated;

-- ── 6. insights_user_sessions_v2 — + time window + event constraint ─────
-- p_cutoff/p_end narrow which events the timeline is built from; p_events
-- keeps only sessions containing at least one of the named events (the whole
-- session stays visible — you filter WHICH sessions, not which rows inside).
drop function if exists public.insights_user_sessions_v2(text, integer, integer);

create function public.insights_user_sessions_v2(
  p_distinct_id text,
  p_limit integer default 50,
  p_events_cap integer default 500,
  p_cutoff timestamptz default null,
  p_end timestamptz default null,
  p_events text[] default null
)
returns table(
  session_key text,
  method text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec integer,
  event_count integer,
  pages text[],
  key_actions jsonb,
  entry_page text,
  exit_page text,
  device_type text,
  country text,
  city text,
  region text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  clarity_session_id text,
  events jsonb,
  events_truncated boolean
)
language sql
security definer
set search_path to 'public'
as $$
  with ev as (
    select ue.id, ue.created_at, ue.event_name, ue.page_path, ue.referrer,
           ue.utm_source, ue.utm_medium, ue.utm_campaign, ue.device_type,
           ue.country, ue.city, ue.region, ue.clarity_session_id,
           ue.auth_state, ue.source_kind, ue.bot_likely, ue.properties,
           nullif(ue.properties->>'session_id', '') as sid
    from user_events ue
    where ue.distinct_id = p_distinct_id
      and (p_cutoff is null or ue.created_at >= p_cutoff)
      and (p_end is null or ue.created_at < p_end)
  ),
  -- 30-min-gap numbering computed ONLY over the rows without a session_id
  nosid as (
    select y.id, sum(y.is_new) over (order by y.created_at, y.id) as gap_num
    from (
      select x.id, x.created_at,
             case
               when x.prev_at is null or x.created_at - x.prev_at > interval '30 minutes' then 1
               else 0
             end as is_new
      from (
        select e.id, e.created_at,
               lag(e.created_at) over (order by e.created_at, e.id) as prev_at
        from ev e
        where e.sid is null
      ) x
    ) y
  ),
  keyed as (
    select e.*,
           coalesce(e.sid, 'gap:' || n.gap_num::text) as skey,
           case when e.sid is null then 'gap' else 'session_id' end as skey_method,
           row_number() over (
             partition by coalesce(e.sid, 'gap:' || n.gap_num::text)
             order by e.created_at, e.id
           ) as rn,
           lag(e.page_path) over (
             partition by coalesce(e.sid, 'gap:' || n.gap_num::text)
             order by e.created_at, e.id
           ) as prev_page
    from ev e
    left join nosid n on n.id = e.id
  ),
  key_counts as (
    select c.skey, jsonb_object_agg(c.event_name, c.n) as key_actions
    from (
      select k.skey, k.event_name, count(*)::bigint as n
      from keyed k
      where k.event_name in (
              'tool_visit_clicked', 'tool_visit_redirected', 'tool_saved',
              'tool_page_viewed', 'search_query_submitted', 'comparison_viewed',
              'review_submitted', 'signup_completed', 'login_completed',
              'newsletter_subscribed', 'ai_chat_message'
            )
         or k.event_name like 'plan\_%'
         or k.event_name like 'sentiment\_%'
      group by 1, 2
    ) c
    group by c.skey
  ),
  ev_json as (
    select k.skey,
           jsonb_agg(
             jsonb_build_object(
               'id', k.id,
               'created_at', k.created_at,
               'event_name', k.event_name,
               'page_path', k.page_path,
               'device_type', k.device_type,
               'auth_state', k.auth_state,
               'source_kind', k.source_kind,
               'bot_likely', k.bot_likely,
               'properties', k.properties
             ) order by k.created_at, k.id
           ) filter (where k.rn <= p_events_cap) as events,
           bool_or(k.rn > p_events_cap) as truncated
    from keyed k
    group by k.skey
  ),
  sess as (
    select
      k.skey,
      min(k.skey_method) as method, -- constant per group by construction
      min(k.created_at) as started_at,
      max(k.created_at) as ended_at,
      extract(epoch from (max(k.created_at) - min(k.created_at)))::int as duration_sec,
      count(*)::int as event_count,
      array_remove(
        array_agg(
          case when k.page_path is not null and k.prev_page is distinct from k.page_path
               then k.page_path end
          order by k.created_at, k.id
        ),
        null
      ) as pages,
      (array_agg(k.page_path order by k.created_at, k.id)
         filter (where k.page_path is not null))[1] as entry_page,
      (array_agg(k.page_path order by k.created_at desc, k.id desc)
         filter (where k.page_path is not null))[1] as exit_page,
      (array_agg(k.device_type order by k.created_at, k.id)
         filter (where k.device_type is not null))[1] as device_type,
      (array_agg(k.country order by k.created_at, k.id)
         filter (where k.country is not null))[1] as country,
      (array_agg(k.city order by k.created_at, k.id)
         filter (where k.city is not null))[1] as city,
      (array_agg(k.region order by k.created_at, k.id)
         filter (where k.region is not null))[1] as region,
      (array_agg(k.referrer order by k.created_at, k.id)
         filter (where k.referrer is not null and k.referrer <> ''))[1] as referrer,
      (array_agg(k.utm_source order by k.created_at, k.id)
         filter (where k.utm_source is not null))[1] as utm_source,
      (array_agg(k.utm_medium order by k.created_at, k.id)
         filter (where k.utm_medium is not null))[1] as utm_medium,
      (array_agg(k.utm_campaign order by k.created_at, k.id)
         filter (where k.utm_campaign is not null))[1] as utm_campaign,
      (array_agg(k.clarity_session_id order by k.created_at, k.id)
         filter (where k.clarity_session_id is not null))[1] as clarity_session_id
    from keyed k
    group by k.skey
  )
  select
    s.skey as session_key,
    s.method,
    s.started_at,
    s.ended_at,
    s.duration_sec,
    s.event_count,
    coalesce(s.pages, '{}'::text[]) as pages,
    coalesce(kc.key_actions, '{}'::jsonb) as key_actions,
    s.entry_page,
    s.exit_page,
    s.device_type,
    s.country,
    s.city,
    s.region,
    s.referrer,
    s.utm_source,
    s.utm_medium,
    s.utm_campaign,
    s.clarity_session_id,
    coalesce(ej.events, '[]'::jsonb) as events,
    coalesce(ej.truncated, false) as events_truncated
  from sess s
  left join key_counts kc on kc.skey = s.skey
  left join ev_json ej on ej.skey = s.skey
  where (p_events is null
         or exists (select 1 from keyed k2 where k2.skey = s.skey and k2.event_name = any(p_events)))
  order by s.started_at desc, s.skey asc
  limit p_limit;
$$;

revoke all on function public.insights_user_sessions_v2(text, integer, integer, timestamptz, timestamptz, text[]) from public, anon, authenticated;
grant execute on function public.insights_user_sessions_v2(text, integer, integer, timestamptz, timestamptz, text[]) to service_role;

-- ── 7. insights_user_directory — + p_search (email or distinct_id) ──────
drop function if exists public.insights_user_directory(timestamptz, timestamptz, boolean, jsonb, text, integer, integer);

create function public.insights_user_directory(
  p_cutoff timestamptz,
  p_end timestamptz default null::timestamptz,
  p_include_bots boolean default false,
  p_filters jsonb default null::jsonb,
  p_sort text default 'last_seen'::text,
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null
)
 returns table(distinct_id text, user_id uuid, first_seen timestamptz, last_seen timestamptz, events_in_window bigint, active_days integer, top_country text, top_device text, is_returning boolean, email text, full_name text, auth_provider text, total_rows bigint)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_order text;
begin
  v_order := case p_sort
    when 'last_seen'  then 'iw.w_last desc, iw.distinct_id asc'
    when 'events'     then 'iw.w_events desc, iw.w_last desc, iw.distinct_id asc'
    when 'first_seen' then 'lt.lt_first desc, iw.distinct_id asc'
    else null
  end;
  if v_order is null then
    raise exception 'Unsupported sort: %', p_sort;
  end if;
  return query execute format($f$
    with in_window as (
      select ue.distinct_id,
             (min(ue.user_id::text) filter (where ue.user_id is not null))::uuid as w_user_id,
             max(ue.created_at) as w_last,
             count(*)::bigint as w_events,
             count(distinct date_trunc('day', ue.created_at at time zone 'Asia/Kolkata'))::int as w_days,
             mode() within group (order by ue.country)
               filter (where ue.country is not null and ue.country <> '') as w_country,
             mode() within group (order by ue.device_type)
               filter (where ue.device_type is not null) as w_device
      from user_events ue
      where ue.created_at >= $1
        and ($2::timestamptz is null or ue.created_at < $2)
        and ($3 or not ue.bot_likely)
        and insights_apply_filters(ue, $4::jsonb)
        and ($7::text is null
             or ue.distinct_id ilike '%%' || $7 || '%%'
             or ue.user_id in (select au2.id from auth.users au2 where au2.email ilike '%%' || $7 || '%%'))
      group by ue.distinct_id
    ),
    lifetime as (
      select ue.distinct_id, min(ue.created_at) as lt_first
      from user_events ue
      join in_window iw on iw.distinct_id = ue.distinct_id
      where ($3 or not ue.bot_likely)
        and ($2::timestamptz is null or ue.created_at < $2)
      group by ue.distinct_id
    )
    select iw.distinct_id, iw.w_user_id, lt.lt_first, iw.w_last, iw.w_events, iw.w_days,
           iw.w_country, iw.w_device, (lt.lt_first < $1) as is_returning,
           au.email::text,
           coalesce(pr.full_name, au.raw_user_meta_data->>'full_name')::text as full_name,
           case when au.id is not null then coalesce(au.raw_app_meta_data->>'provider', 'email') else null end::text as auth_provider,
           count(*) over ()::bigint as total_rows
    from in_window iw
    join lifetime lt on lt.distinct_id = iw.distinct_id
    left join auth.users au on au.id = iw.w_user_id
    left join profiles pr on pr.id = iw.w_user_id
    order by %s
    limit $5 offset $6
  $f$, v_order)
  using p_cutoff, p_end, p_include_bots, p_filters, p_limit, p_offset, p_search;
end;
$function$;

revoke all on function public.insights_user_directory(timestamptz, timestamptz, boolean, jsonb, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.insights_user_directory(timestamptz, timestamptz, boolean, jsonb, text, integer, integer, text) to service_role;
