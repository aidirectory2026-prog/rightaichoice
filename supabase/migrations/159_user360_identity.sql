-- 159_user360_identity.sql
-- Phase 1 (2026-06-16) — Identity resolution in the admin insights surface.
--
-- Problem: a signed-in user showed a bare "AUTHED" badge with no email/name. The
-- data existed all along in auth.users; the admin RPCs just never joined it, and
-- user_intent_profile.email_domain / signup_at were only populated on the
-- newsletter_subscribed path (so OAuth / email signups never filled them).
--
-- This migration:
--   1. Backfills email_domain + signup_at for every authed intent profile.
--   2. Adds email / full_name / auth_provider to insights_user_profile_v2 and
--      insights_user_directory via a join to auth.users.
--
-- SAFETY: both functions are SECURITY DEFINER and EXECUTE is granted ONLY to
-- service_role / postgres (verified: never anon/authenticated). The admin
-- surface calls them through the service-role admin client, behind the /admin
-- is_admin layout redirect. The raw email is therefore never reachable by a
-- non-admin, and the domain-only PII policy on the Mixpanel path is untouched.
--
-- NOTE: applied to prod directly via MCP (the repo migration history is known to
-- drift from prod — preview branches fail); this file is the record of record.

-- ── 1. Backfill ────────────────────────────────────────────────────
with src as (
  select uip.distinct_id,
         split_part(au.email, '@', 2) as dom,
         au.created_at as signed_up
  from public.user_intent_profile uip
  join auth.users au on au.id = uip.user_id
  where uip.user_id is not null
)
update public.user_intent_profile uip
set email_domain = coalesce(uip.email_domain, src.dom),
    signup_at    = coalesce(uip.signup_at, src.signed_up),
    updated_at   = now()
from src
where uip.distinct_id = src.distinct_id
  and (uip.email_domain is null or uip.signup_at is null);

-- ── 2a. insights_user_profile_v2 — add email/full_name/auth_provider ─
drop function if exists public.insights_user_profile_v2(text);

create function public.insights_user_profile_v2(p_distinct_id text)
 returns table(distinct_id text, user_id uuid, username text, email_domain text,
   email text, full_name text, auth_provider text,
   is_authed boolean, first_seen_at timestamptz, last_seen_at timestamptz,
   lifetime_events bigint, events_30d bigint, bot_events bigint, session_count bigint,
   is_returning boolean, first_touch_referrer text, first_touch_landing text,
   first_touch_utm_source text, first_touch_utm_medium text, first_touch_utm_campaign text,
   top_countries jsonb, top_devices jsonb, last_clarity_session_id text)
 language sql
 security definer
 set search_path to 'public'
as $function$
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
      '[]'::jsonb) as v
    from (select e.country, count(*)::bigint as n from ev e where e.country is not null
          group by 1 order by 2 desc, 1 asc limit 3) t
  ),
  devices as (
    select coalesce(
      jsonb_agg(jsonb_build_object('value', t.device_type, 'events', t.n) order by t.n desc, t.device_type asc),
      '[]'::jsonb) as v
    from (select e.device_type, count(*)::bigint as n from ev e where e.device_type is not null
          group by 1 order by 2 desc, 1 asc limit 3) t
  ),
  clarity as (
    select e.clarity_session_id as v from ev e where e.clarity_session_id is not null
    order by e.created_at desc, e.id desc limit 1
  )
  select
    p_distinct_id as distinct_id,
    u.v as user_id,
    pr.username,
    uip.email_domain,
    au.email,
    coalesce(pr.full_name, au.raw_user_meta_data->>'full_name') as full_name,
    case when au.id is not null then coalesce(au.raw_app_meta_data->>'provider', 'email') else null end as auth_provider,
    (u.v is not null) as is_authed,
    b.first_seen_at, b.last_seen_at, b.lifetime_events, b.events_30d, b.bot_events,
    (ss.c + gs.c) as session_count,
    (ss.c + gs.c) > 1 as is_returning,
    uip.first_touch_referrer, uip.first_touch_landing,
    uip.first_touch_utm_source, uip.first_touch_utm_medium, uip.first_touch_utm_campaign,
    c.v as top_countries, d.v as top_devices,
    (select cl.v from clarity cl) as last_clarity_session_id
  from base b
  cross join sid_sessions ss
  cross join gap_sessions gs
  cross join uid u
  cross join countries c
  cross join devices d
  left join user_intent_profile uip on uip.distinct_id = p_distinct_id
  left join profiles pr on pr.id = u.v
  left join auth.users au on au.id = u.v;
$function$;

grant execute on function public.insights_user_profile_v2(text) to service_role;

-- ── 2b. insights_user_directory — add email/full_name/auth_provider ──
drop function if exists public.insights_user_directory(timestamptz, timestamptz, boolean, jsonb, text, integer, integer);

create function public.insights_user_directory(p_cutoff timestamptz, p_end timestamptz default null::timestamptz, p_include_bots boolean default false, p_filters jsonb default null::jsonb, p_sort text default 'last_seen'::text, p_limit integer default 50, p_offset integer default 0)
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
  using p_cutoff, p_end, p_include_bots, p_filters, p_limit, p_offset;
end;
$function$;

grant execute on function public.insights_user_directory(timestamptz, timestamptz, boolean, jsonb, text, integer, integer) to service_role;
