-- Phase 9 Smart SEO (2026-05-29): per-tool weighted GSC position.
--
-- Distilled from the latest gsc_snapshots row (28d) so the data layer can
-- cheaply bias internal-link rails (alternatives / top-in-category) toward
-- tools that are indexed but BURIED (pos ~21-50) — passing them internal
-- PageRank + relevance, the legitimate lever to lift rankings (vs. faking
-- sitemap freshness on pages that didn't change).
--
-- Refreshed weekly off the snapshot (see refresh_gsc_tool_positions()).
-- Reads are public (data layer uses the anon-safe server client); writes
-- are service-role only.

create table if not exists gsc_tool_positions (
  slug text primary key,
  weighted_position numeric not null,
  impressions integer not null default 0,
  snapshot_date date not null,
  updated_at timestamptz not null default now()
);

create index if not exists gsc_tool_positions_pos_idx
  on gsc_tool_positions (weighted_position);

alter table gsc_tool_positions enable row level security;

drop policy if exists "gsc_tool_positions read all" on gsc_tool_positions;
create policy "gsc_tool_positions read all"
  on gsc_tool_positions for select using (true);

comment on table gsc_tool_positions is
  'Phase 9: per-tool impression-weighted GSC position from the latest 28d snapshot. Biases internal-link rails toward buried-but-indexed tool pages. Refresh weekly via refresh_gsc_tool_positions().';

-- Rebuild from the most recent 28d snapshot. SECURITY DEFINER so the weekly
-- cron (service-role) can call it; revoked from anon/authenticated.
create or replace function refresh_gsc_tool_positions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot_date date;
  v_count integer;
begin
  select snapshot_date into v_snapshot_date
  from public.gsc_snapshots
  where scope = '28d'
  order by snapshot_date desc
  limit 1;

  if v_snapshot_date is null then
    return 0;
  end if;

  delete from public.gsc_tool_positions;

  insert into public.gsc_tool_positions (slug, weighted_position, impressions, snapshot_date)
  select
    substring(path from '^/tools/([^/?#]+)') as slug,
    round(sum(position * impressions) / nullif(sum(impressions), 0), 2) as weighted_position,
    sum(impressions)::int as impressions,
    v_snapshot_date
  from (
    select
      regexp_replace((e->>'page'), '^https?://[^/]+', '') as path,
      (e->>'impressions')::numeric as impressions,
      (e->>'position')::numeric as position
    from public.gsc_snapshots, jsonb_array_elements(rows) e
    where snapshot_date = v_snapshot_date and scope = '28d'
  ) r
  where path ~ '^/tools/[^/?#]+$'
  group by substring(path from '^/tools/([^/?#]+)')
  having sum(impressions) > 0;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function refresh_gsc_tool_positions() from public, anon, authenticated;
grant execute on function refresh_gsc_tool_positions() to service_role;
