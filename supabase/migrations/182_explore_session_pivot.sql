-- Phase 14 Wave 3 (P2.3 + P2.4) — the Explore surface.
--
-- Two read-only, service-role RPCs that both honour the shared filter predicate
-- insights_apply_filters (mig 154/181), so range + bots + every dimension filter
-- + a pinned cohort all apply automatically:
--
--   P2.3 insights_session_breakdown — reconstructs SESSIONS across ALL users
--        (30-min idle gap per distinct_id, like insights_user_sessions_v2 but
--        aggregate) and groups them by a dimension → "geo of a session",
--        "sessions by device". A session's dimension = its first event's value.
--
--   P2.4 insights_breakdown_matrix — a 2-dimension cross-tab (country × device,
--        event × device, …) for a pivot grid.

-- ── P2.3 — sessions grouped by a dimension ──────────────────────────────────
create or replace function public.insights_session_breakdown(
  p_cutoff timestamptz,
  p_end timestamptz,
  p_include_bots boolean default false,
  p_filters jsonb default null,
  p_dimension text default 'country',
  p_gap_min int default 30,
  p_limit int default 100
)
returns table(key text, sessions bigint, visitors bigint, events bigint)
language sql
stable
as $$
  with base as (
    select
      ue.distinct_id,
      ue.created_at,
      case p_dimension
        when 'device' then coalesce(ue.device_type, 'unknown')
        when 'auth'   then case when ue.user_id is not null then 'known' else 'anon' end
        else coalesce(nullif(ue.country, ''), '—')
      end as dim
    from public.user_events ue
    where ue.created_at >= p_cutoff and ue.created_at < p_end
      and (p_include_bots or not ue.bot_likely)
      and public.insights_apply_filters(ue, p_filters)
  ),
  marked as (
    select *,
      case
        when lag(created_at) over (partition by distinct_id order by created_at) is null
          or extract(epoch from (created_at - lag(created_at) over (partition by distinct_id order by created_at))) > p_gap_min * 60
        then 1 else 0
      end as is_new
    from base
  ),
  sessioned as (
    select *,
      sum(is_new) over (partition by distinct_id order by created_at rows between unbounded preceding and current row) as session_num
    from marked
  ),
  per_session as (
    select distinct_id, session_num,
      (array_agg(dim order by created_at))[1] as dim,
      count(*) as ev
    from sessioned
    group by distinct_id, session_num
  )
  select dim as key,
         count(*)::bigint as sessions,
         count(distinct distinct_id)::bigint as visitors,
         sum(ev)::bigint as events
  from per_session
  group by dim
  order by sessions desc, key asc
  limit p_limit
$$;

revoke all on function public.insights_session_breakdown(timestamptz, timestamptz, boolean, jsonb, text, int, int) from public, anon, authenticated;
grant execute on function public.insights_session_breakdown(timestamptz, timestamptz, boolean, jsonb, text, int, int) to service_role;

-- ── P2.4 — 2-dimension cross-tab (pivot) ────────────────────────────────────
create or replace function public.insights_breakdown_matrix(
  p_cutoff timestamptz,
  p_end timestamptz,
  p_include_bots boolean default false,
  p_filters jsonb default null,
  p_dim1 text default 'country',
  p_dim2 text default 'device',
  p_limit int default 400
)
returns table(d1 text, d2 text, events bigint, visitors bigint)
language sql
stable
as $$
  with base as (
    select
      ue.distinct_id,
      case p_dim1
        when 'device' then coalesce(ue.device_type, 'unknown')
        when 'event'  then ue.event_name
        when 'auth'   then case when ue.user_id is not null then 'known' else 'anon' end
        else coalesce(nullif(ue.country, ''), '—')
      end as d1,
      case p_dim2
        when 'device' then coalesce(ue.device_type, 'unknown')
        when 'event'  then ue.event_name
        when 'auth'   then case when ue.user_id is not null then 'known' else 'anon' end
        else coalesce(nullif(ue.country, ''), '—')
      end as d2
    from public.user_events ue
    where ue.created_at >= p_cutoff and ue.created_at < p_end
      and (p_include_bots or not ue.bot_likely)
      and public.insights_apply_filters(ue, p_filters)
  )
  select d1, d2, count(*)::bigint as events, count(distinct distinct_id)::bigint as visitors
  from base
  group by d1, d2
  order by events desc
  limit p_limit
$$;

revoke all on function public.insights_breakdown_matrix(timestamptz, timestamptz, boolean, jsonb, text, text, int) from public, anon, authenticated;
grant execute on function public.insights_breakdown_matrix(timestamptz, timestamptz, boolean, jsonb, text, text, int) to service_role;
