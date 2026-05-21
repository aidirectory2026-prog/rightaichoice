-- Phase 8.g.10 (2026-05-22) — geo + clarity_session_id + session-boundary RPC.
--
-- Adds 4 columns to user_events for richer per-user-journey detail:
--   country / city / region   — populated from Vercel's x-vercel-ip-*
--                                request headers in /api/track-mirror
--   clarity_session_id        — Microsoft Clarity's session ID, captured
--                                via clarity('get', 'session', cb) in the
--                                browser and sent with every Mixpanel event
--
-- Plus a SECURITY DEFINER RPC that groups one user's events into sessions
-- (30-min idle gap = new session) with entry/exit page, event count, and
-- event-type summary.

alter table public.user_events
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists clarity_session_id text;

-- Indexes only on the searchable ones — geo is read per-user, not aggregated.
create index if not exists user_events_clarity_session_idx
  on public.user_events (clarity_session_id)
  where clarity_session_id is not null;

comment on column public.user_events.country is 'Vercel x-vercel-ip-country header at insert time. Two-letter ISO code.';
comment on column public.user_events.city is 'Vercel x-vercel-ip-city header at insert time.';
comment on column public.user_events.region is 'Vercel x-vercel-ip-country-region header at insert time.';
comment on column public.user_events.clarity_session_id is 'Microsoft Clarity session ID. Used to deep-link from /admin/insights/user/[did] to the Clarity replay.';

-- ── Session-boundary RPC ──────────────────────────────────────────
-- One row per session for the given distinct_id. Session = consecutive
-- events where the gap to the previous event is <30 min. Returns the
-- session window, page chain, and unique event-type list.
create or replace function public.insights_user_sessions(
  p_distinct_id text, p_limit int default 50
)
returns table(
  session_num int,
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec int,
  event_count int,
  entry_page text,
  exit_page text,
  pages_visited int,
  event_types text[],
  country text,
  city text,
  region text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  clarity_session_id text
)
language sql security definer set search_path = public
as $$
  with events_ordered as (
    select
      created_at,
      event_name,
      page_path,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      device_type,
      country,
      city,
      region,
      clarity_session_id,
      lag(created_at) over (order by created_at) as prev_at
    from user_events
    where distinct_id = p_distinct_id
    order by created_at
  ),
  with_session_marks as (
    select *,
      case
        when prev_at is null or created_at - prev_at > interval '30 minutes' then 1
        else 0
      end as is_new_session
    from events_ordered
  ),
  with_session_num as (
    select *, sum(is_new_session) over (order by created_at)::int as session_num
    from with_session_marks
  )
  select
    session_num,
    min(created_at) as started_at,
    max(created_at) as ended_at,
    extract(epoch from (max(created_at) - min(created_at)))::int as duration_sec,
    count(*)::int as event_count,
    (array_agg(page_path order by created_at) filter (where page_path is not null))[1] as entry_page,
    (array_agg(page_path order by created_at desc) filter (where page_path is not null))[1] as exit_page,
    count(distinct page_path)::int as pages_visited,
    (array_agg(distinct event_name))::text[] as event_types,
    (array_agg(country) filter (where country is not null))[1] as country,
    (array_agg(city) filter (where city is not null))[1] as city,
    (array_agg(region) filter (where region is not null))[1] as region,
    (array_agg(referrer) filter (where referrer is not null and referrer <> ''))[1] as referrer,
    (array_agg(utm_source) filter (where utm_source is not null))[1] as utm_source,
    (array_agg(utm_medium) filter (where utm_medium is not null))[1] as utm_medium,
    (array_agg(utm_campaign) filter (where utm_campaign is not null))[1] as utm_campaign,
    (array_agg(device_type) filter (where device_type is not null))[1] as device_type,
    (array_agg(clarity_session_id) filter (where clarity_session_id is not null))[1] as clarity_session_id
  from with_session_num
  group by session_num
  order by session_num desc
  limit p_limit;
$$;

grant execute on function public.insights_user_sessions to authenticated, service_role;
