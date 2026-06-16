-- 161_clarity_playback_url.sql
-- 2026-06-16 — Clarity replay deep-link in the admin user-360 page.
--
-- Background: Clarity was CSP-blocked until 2026-06-16 (see next.config.ts), so
-- clarity_session_id was never captured (0 of 27,961 events) and the admin
-- "Clarity" button could only open the project dashboard. The player URL needs
-- BOTH the Clarity user id (_clck cookie) and session id (_clsk cookie); we only
-- ever read the session id.
--
-- ClarityProvider now (a) calls the Identify API with our distinct_id so every
-- recording is filterable by the same id the user-360 page is keyed on, and
-- (b) reconstructs the player URL from the _clck/_clsk cookies and registers it
-- as the clarity_playback_url super-prop → mirrored into user_events.properties.
--
-- This migration surfaces the latest such URL from the admin-only profile RPC so
-- the page can deep-link to the exact replay. (Re-applies migration 159's
-- insights_user_profile_v2 with one extra return column.) Applied via MCP.

drop function if exists public.insights_user_profile_v2(text);

create function public.insights_user_profile_v2(p_distinct_id text)
 returns table(distinct_id text, user_id uuid, username text, email_domain text,
   email text, full_name text, auth_provider text,
   is_authed boolean, first_seen_at timestamptz, last_seen_at timestamptz,
   lifetime_events bigint, events_30d bigint, bot_events bigint, session_count bigint,
   is_returning boolean, first_touch_referrer text, first_touch_landing text,
   first_touch_utm_source text, first_touch_utm_medium text, first_touch_utm_campaign text,
   top_countries jsonb, top_devices jsonb, last_clarity_session_id text,
   last_clarity_playback_url text)
 language sql security definer set search_path to 'public'
as $function$
  with ev as (
    select ue.id, ue.created_at, ue.user_id, ue.bot_likely, ue.country,
           ue.device_type, ue.clarity_session_id,
           nullif(ue.properties->>'session_id', '') as sid
    from user_events ue where ue.distinct_id = p_distinct_id
  ),
  base as (
    select min(e.created_at) as first_seen_at, max(e.created_at) as last_seen_at,
      count(*)::bigint as lifetime_events,
      count(*) filter (where e.created_at >= now() - interval '30 days')::bigint as events_30d,
      count(*) filter (where e.bot_likely)::bigint as bot_events
    from ev e
  ),
  sid_sessions as (select count(distinct e.sid)::bigint as c from ev e where e.sid is not null),
  gap_sessions as (
    select count(*)::bigint as c from (
      select x.created_at, lag(x.created_at) over (order by x.created_at, x.id) as prev_at
      from ev x where x.sid is null
    ) g where g.prev_at is null or g.created_at - g.prev_at > interval '30 minutes'
  ),
  uid as (
    select coalesce(
      (select uip.user_id from user_intent_profile uip where uip.distinct_id = p_distinct_id),
      (select e.user_id from ev e where e.user_id is not null order by e.created_at desc, e.id desc limit 1)
    ) as v
  ),
  countries as (
    select coalesce(jsonb_agg(jsonb_build_object('value', t.country, 'events', t.n) order by t.n desc, t.country asc), '[]'::jsonb) as v
    from (select e.country, count(*)::bigint as n from ev e where e.country is not null group by 1 order by 2 desc, 1 asc limit 3) t
  ),
  devices as (
    select coalesce(jsonb_agg(jsonb_build_object('value', t.device_type, 'events', t.n) order by t.n desc, t.device_type asc), '[]'::jsonb) as v
    from (select e.device_type, count(*)::bigint as n from ev e where e.device_type is not null group by 1 order by 2 desc, 1 asc limit 3) t
  ),
  clarity as (
    select e.clarity_session_id as v from ev e where e.clarity_session_id is not null order by e.created_at desc, e.id desc limit 1
  ),
  clarity_url as (
    select ue.properties->>'clarity_playback_url' as v
    from user_events ue
    where ue.distinct_id = p_distinct_id and ue.properties->>'clarity_playback_url' is not null
    order by ue.created_at desc, ue.id desc limit 1
  )
  select p_distinct_id, u.v, pr.username, uip.email_domain, au.email,
    coalesce(pr.full_name, au.raw_user_meta_data->>'full_name'),
    case when au.id is not null then coalesce(au.raw_app_meta_data->>'provider', 'email') else null end,
    (u.v is not null), b.first_seen_at, b.last_seen_at, b.lifetime_events, b.events_30d, b.bot_events,
    (ss.c + gs.c), (ss.c + gs.c) > 1,
    uip.first_touch_referrer, uip.first_touch_landing,
    uip.first_touch_utm_source, uip.first_touch_utm_medium, uip.first_touch_utm_campaign,
    c.v, d.v, (select cl.v from clarity cl), (select cu.v from clarity_url cu)
  from base b
  cross join sid_sessions ss cross join gap_sessions gs cross join uid u
  cross join countries c cross join devices d
  left join user_intent_profile uip on uip.distinct_id = p_distinct_id
  left join profiles pr on pr.id = u.v
  left join auth.users au on au.id = u.v;
$function$;

grant execute on function public.insights_user_profile_v2(text) to service_role;
