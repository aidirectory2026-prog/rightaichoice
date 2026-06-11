-- Phase 10.2 / F9 (docs/admin/metric-audit.md) — Knowledge Room aggregates.
--
-- /admin/updates previously fetched raw rows with un-ordered .limit(2000/5000)
-- and grouped client-side. At 14d/30d/90d the tables exceed those caps
-- (search_logs 30d ≈ 5,459; page_views 30d ≈ 3,447; refresh_logs 30d ≈ 6,776),
-- so WHICH rows dropped was arbitrary → top tools, top searches, zero-result
-- badges, and the refresh ok/failed tallies silently undercounted.
--
-- Fix: do the GROUP BY in SQL. Three service-role-only SECURITY DEFINER RPCs,
-- same convention as pipeline_health() (130_pipeline_health.sql).

-- ── Top viewed tools in window ──────────────────────────────────────
-- page_views grouped by tool_id (null tool_id excluded), joined to tools
-- for name + slug. Left join keeps views of since-deleted tools visible
-- (UI renders "unknown tool"), matching the previous client-side behavior.
create or replace function kr_top_tools(p_cutoff timestamptz, p_limit int default 8)
returns table(
  tool_id uuid,
  tool_name text,
  tool_slug text,
  views bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pv.tool_id,
    t.name as tool_name,
    t.slug as tool_slug,
    count(*) as views
  from public.page_views pv
  left join public.tools t on t.id = pv.tool_id
  where pv.created_at >= p_cutoff
    and pv.tool_id is not null
  group by pv.tool_id, t.name, t.slug
  order by count(*) desc, pv.tool_id
  limit p_limit;
$$;

revoke execute on function kr_top_tools(timestamptz, int) from public, anon, authenticated;
grant execute on function kr_top_tools(timestamptz, int) to service_role;

-- ── Top search queries in window ────────────────────────────────────
-- search_logs grouped by lower(trim(query)); empty/null queries excluded.
-- zero_count counts zero-result hits (coalesce(result_count,0) = 0 — the
-- audit found 0 NULL result_count rows all-time, so this equals
-- result_count = 0 today and stays correct if NULLs ever appear).
create or replace function kr_top_searches(p_cutoff timestamptz, p_limit int default 10)
returns table(
  query text,
  total bigint,
  zero_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    lower(trim(sl.query)) as query,
    count(*) as total,
    count(*) filter (where coalesce(sl.result_count, 0) = 0) as zero_count
  from public.search_logs sl
  where sl.created_at >= p_cutoff
    and sl.query is not null
    and trim(sl.query) <> ''
  group by lower(trim(sl.query))
  order by count(*) desc, lower(trim(sl.query))
  limit p_limit;
$$;

revoke execute on function kr_top_searches(timestamptz, int) from public, anon, authenticated;
grant execute on function kr_top_searches(timestamptz, int) to service_role;

-- ── Refresh-log status mix in window ────────────────────────────────
create or replace function kr_refresh_mix(p_cutoff timestamptz)
returns table(
  status text,
  total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select rl.status, count(*) as total
  from public.refresh_logs rl
  where rl.created_at >= p_cutoff
  group by rl.status
  order by count(*) desc;
$$;

revoke execute on function kr_refresh_mix(timestamptz) from public, anon, authenticated;
grant execute on function kr_refresh_mix(timestamptz) to service_role;
