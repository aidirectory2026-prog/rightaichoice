-- 166_insights_live_sessions_admin_guard.sql — Phase 10 (Cowork QA) H8
-- The admin "live sessions" panel polls insights_live_sessions from the browser
-- (client components live-feed.tsx + live-ticker-badge.tsx via the authenticated
-- key), but EXECUTE was granted to service_role only → "permission denied for
-- function insights_live_sessions" in the logs and the live feed never updates.
--
-- Fix securely (do NOT just grant to authenticated — that would expose live
-- visitor sessions to ANY logged-in user). Add an admin guard inside the
-- SECURITY DEFINER function: service_role (the SSR admin client) bypasses; a
-- browser caller must be profiles.is_admin, otherwise the function returns no
-- rows. Then grant EXECUTE to authenticated so admins can call it from the panel.
-- Kept LANGUAGE sql; the guard is a CTE cross-joined into the final select.

create or replace function public.insights_live_sessions(p_active_within_sec integer default 300, p_include_bots boolean default false)
returns table(distinct_id text, user_id uuid, auth_state text, last_event_at timestamp with time zone, seconds_since_last integer, current_page text, current_event text, events_in_window integer, pages_in_window integer, country text, city text, region text, device_type text, utm_source text, referrer text, is_active boolean)
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

grant execute on function public.insights_live_sessions(integer, boolean) to authenticated;
