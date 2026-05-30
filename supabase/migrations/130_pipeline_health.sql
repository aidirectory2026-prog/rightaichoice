-- Phase 9 Smart SEO / doc 15 (2026-05-30): pipeline health rollup.
--
-- Powers /admin/health — the single pane of glass for the 40+ unattended
-- cron jobs (the weekly SEO loop especially). One row per pipeline_key:
-- latest run + last success + recent failure counts + cost, so a silent
-- failure or a stalled job is visible at a glance.

create or replace function pipeline_health()
returns table(
  pipeline_key text,
  last_status text,
  last_started_at timestamptz,
  last_success_at timestamptz,
  runs_7d integer,
  failures_24h integer,
  failures_7d integer,
  avg_duration_ms numeric,
  last_error text,
  cost_7d numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select distinct on (pipeline_key)
      pipeline_key, status, started_at, error_message
    from public.pipeline_runs
    order by pipeline_key, started_at desc
  ),
  succ as (
    select distinct on (pipeline_key)
      pipeline_key, started_at as last_success_at
    from public.pipeline_runs
    where status = 'success'
    order by pipeline_key, started_at desc
  ),
  agg as (
    select pipeline_key,
      count(*) filter (where started_at > now() - interval '7 days') as runs_7d,
      count(*) filter (where status in ('failure','timeout') and started_at > now() - interval '24 hours') as failures_24h,
      count(*) filter (where status in ('failure','timeout') and started_at > now() - interval '7 days') as failures_7d,
      round(avg(duration_ms) filter (where started_at > now() - interval '7 days')) as avg_duration_ms,
      round(sum(estimated_cost_usd) filter (where started_at > now() - interval '7 days'), 2) as cost_7d
    from public.pipeline_runs
    group by pipeline_key
  )
  select
    l.pipeline_key, l.status, l.started_at, s.last_success_at,
    coalesce(a.runs_7d, 0)::int, coalesce(a.failures_24h, 0)::int, coalesce(a.failures_7d, 0)::int,
    a.avg_duration_ms, l.error_message, a.cost_7d
  from latest l
  left join succ s using (pipeline_key)
  left join agg a using (pipeline_key)
  order by
    case l.status when 'failure' then 0 when 'timeout' then 1 when 'partial' then 2 when 'running' then 3 else 4 end,
    s.last_success_at asc nulls first;
$$;

revoke execute on function pipeline_health() from public, anon, authenticated;
grant execute on function pipeline_health() to service_role;
