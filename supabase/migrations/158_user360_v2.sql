-- 158_user360_v2.sql
-- Phase 10.6.1 (2026-06-12) — Mixpanel-grade User 360 RPCs.
--
-- Two NEW functions for the upgraded /admin/insights/user/[distinct_id]:
--
--   1. insights_user_profile_v2 — one identity row per visitor: linked
--      user_id (user_intent_profile first, latest user_events.user_id as
--      fallback) + username (profiles join) + email_domain, lifetime
--      first/last seen, lifetime + 30d + bot event counts, the HYBRID
--      session count (see below), is_returning, first-touch
--      referrer/landing/utm (user_intent_profile), top-3 countries and
--      devices with counts, and the clarity_session_id of the most recent
--      event that carries one (column is currently all-NULL in prod — the
--      clarity('get','session') bridge never returned; kept so the page
--      lights up the moment the bridge is fixed).
--
--   2. insights_user_sessions_v2 — sessions with their full event payload.
--      HYBRID grouping (envelope epoch 2026-06-10): events whose
--      properties->>'session_id' is present group BY that id
--      (method='session_id'); events without one (pre-epoch rows + all
--      server-emitted rows) fall back to 30-minute-gap sessions computed
--      over the no-session_id subset only (method='gap'). Every session row
--      is labeled with the method that built it. Per session: start/end/
--      duration, event count, ordered page flow (consecutive-dedup'd),
--      key-action counts (tool_visit_*/plan_*/sentiment_*/etc. as jsonb),
--      entry/exit path, device, geo, referrer/utm, clarity id, and the
--      events themselves as a jsonb array (ascending, capped at
--      p_events_cap per session with events_truncated flagging the cut).
--
-- Both are point lookups by distinct_id (the insights_recent_events_for_
-- distinct_id access path) — no window params, not part of the pinned
-- snapshot surface.
--
-- ACLs: execute revoked from public/anon/authenticated, granted to
-- service_role only (the live ACL on every insights RPC).
-- Deterministic ordering everywhere ((created_at, id) ties, named sorts).

-- ────────────────────────────────────────────────────────────────────────
-- 1. insights_user_profile_v2 (NEW)
-- ────────────────────────────────────────────────────────────────────────

create function public.insights_user_profile_v2(p_distinct_id text)
returns table(
  distinct_id text,
  user_id uuid,
  username text,
  email_domain text,
  is_authed boolean,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  lifetime_events bigint,
  events_30d bigint,
  bot_events bigint,
  session_count bigint,
  is_returning boolean,
  first_touch_referrer text,
  first_touch_landing text,
  first_touch_utm_source text,
  first_touch_utm_medium text,
  first_touch_utm_campaign text,
  top_countries jsonb,
  top_devices jsonb,
  last_clarity_session_id text
)
language sql
security definer
set search_path to 'public'
as $$
  with ev as (
    select ue.id, ue.created_at, ue.user_id, ue.bot_likely, ue.country,
           ue.device_type, ue.clarity_session_id,
           nullif(ue.properties->>'session_id', '') as sid
    from user_events ue
    where ue.distinct_id = p_distinct_id
  ),
  base as (
    select
      min(e.created_at) as first_seen_at,
      max(e.created_at) as last_seen_at,
      count(*)::bigint as lifetime_events,
      count(*) filter (where e.created_at >= now() - interval '30 days')::bigint as events_30d,
      count(*) filter (where e.bot_likely)::bigint as bot_events
    from ev e
  ),
  -- hybrid session count: distinct session_id values + 30-min-gap sessions
  -- over the rows that have no session_id (same split sessions_v2 uses).
  sid_sessions as (
    select count(distinct e.sid)::bigint as c from ev e where e.sid is not null
  ),
  gap_sessions as (
    select count(*)::bigint as c
    from (
      select x.created_at,
             lag(x.created_at) over (order by x.created_at, x.id) as prev_at
      from ev x
      where x.sid is null
    ) g
    where g.prev_at is null or g.created_at - g.prev_at > interval '30 minutes'
  ),
  uid as (
    select coalesce(
      (select uip.user_id from user_intent_profile uip where uip.distinct_id = p_distinct_id),
      (select e.user_id from ev e where e.user_id is not null order by e.created_at desc, e.id desc limit 1)
    ) as v
  ),
  countries as (
    select coalesce(
      jsonb_agg(jsonb_build_object('value', t.country, 'events', t.n) order by t.n desc, t.country asc),
      '[]'::jsonb
    ) as v
    from (
      select e.country, count(*)::bigint as n
      from ev e where e.country is not null
      group by 1 order by 2 desc, 1 asc limit 3
    ) t
  ),
  devices as (
    select coalesce(
      jsonb_agg(jsonb_build_object('value', t.device_type, 'events', t.n) order by t.n desc, t.device_type asc),
      '[]'::jsonb
    ) as v
    from (
      select e.device_type, count(*)::bigint as n
      from ev e where e.device_type is not null
      group by 1 order by 2 desc, 1 asc limit 3
    ) t
  ),
  clarity as (
    select e.clarity_session_id as v
    from ev e
    where e.clarity_session_id is not null
    order by e.created_at desc, e.id desc
    limit 1
  )
  select
    p_distinct_id as distinct_id,
    u.v as user_id,
    pr.username,
    uip.email_domain,
    (u.v is not null) as is_authed,
    b.first_seen_at,
    b.last_seen_at,
    b.lifetime_events,
    b.events_30d,
    b.bot_events,
    (ss.c + gs.c) as session_count,
    (ss.c + gs.c) > 1 as is_returning,
    uip.first_touch_referrer,
    uip.first_touch_landing,
    uip.first_touch_utm_source,
    uip.first_touch_utm_medium,
    uip.first_touch_utm_campaign,
    c.v as top_countries,
    d.v as top_devices,
    (select cl.v from clarity cl) as last_clarity_session_id
  from base b
  cross join sid_sessions ss
  cross join gap_sessions gs
  cross join uid u
  cross join countries c
  cross join devices d
  left join user_intent_profile uip on uip.distinct_id = p_distinct_id
  left join profiles pr on pr.id = u.v;
$$;

revoke all on function public.insights_user_profile_v2(text) from public, anon, authenticated;
grant execute on function public.insights_user_profile_v2(text) to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 2. insights_user_sessions_v2 (NEW)
-- ────────────────────────────────────────────────────────────────────────

create function public.insights_user_sessions_v2(
  p_distinct_id text,
  p_limit integer default 50,
  p_events_cap integer default 500
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
  order by s.started_at desc, s.skey asc
  limit p_limit;
$$;

revoke all on function public.insights_user_sessions_v2(text, integer, integer) from public, anon, authenticated;
grant execute on function public.insights_user_sessions_v2(text, integer, integer) to service_role;
