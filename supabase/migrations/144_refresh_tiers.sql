-- Phase 10 S5 — refresh tiering for the real-time data SOP.
--
-- Two tiers: 'daily' (the top-150 — refreshed every day) and 'standard' (the
-- long tail — refreshed within 3 days on a rotation). The top-150 is hybrid:
-- 75 operator-CURATED (curated_top=true, sticky) + 75 DATA-DRIVEN (re-ranked
-- weekly by a blended demand score). Until the operator marks their 75 curated
-- picks, the daily tier is just the 75 data-driven (filled below).

alter table public.tools
  add column if not exists refresh_tier text not null default 'standard'
    check (refresh_tier in ('daily', 'standard'));
alter table public.tools
  add column if not exists curated_top boolean not null default false;

-- Selection index for the tier-aware batch query (always 150 daily + stalest fill).
create index if not exists idx_tools_refresh_tier
  on public.tools (refresh_tier, is_published, last_verified_at);

-- Re-rank: curated picks are always daily; the rest of the daily slots go to the
-- highest blended-demand non-curated tools. Idempotent — safe to run weekly.
create or replace function public.refresh_top_tools()
  returns integer
  language plpgsql
  security definer
  set search_path to 'public'
as $fn$
declare
  v_count int;
begin
  -- Reset non-curated published tools to standard, then promote the winners.
  update public.tools set refresh_tier = 'standard'
    where coalesce(curated_top, false) = false and is_published;
  update public.tools set refresh_tier = 'daily'
    where curated_top = true and is_published;

  with latest_gsc as (
    select distinct on (slug) slug, impressions
    from public.gsc_tool_positions
    order by slug, snapshot_date desc
  ),
  ranked as (
    select t.id,
      coalesce(g.impressions, 0) * 3
      + coalesce(t.view_count, 0) * 1
      + coalesce(t.save_count, 0) * 10
      + coalesce(t.viability_score, 0) * 2 as score
    from public.tools t
    left join latest_gsc g on g.slug = t.slug
    where t.is_published and coalesce(t.curated_top, false) = false
    order by score desc
    limit 75
  )
  update public.tools set refresh_tier = 'daily' where id in (select id from ranked);

  select count(*) into v_count from public.tools where refresh_tier = 'daily' and is_published;
  return v_count;
end;
$fn$;

select public.refresh_top_tools();

-- Weekly re-rank (Mondays 05:00 UTC) — keeps the data-driven 75 current.
do $$
begin
  perform cron.schedule('refresh-top-tools-weekly', '0 5 * * 1', 'select public.refresh_top_tools();');
exception when others then null;
end $$;

-- Rollback:
--   select cron.unschedule('refresh-top-tools-weekly');
--   drop function if exists public.refresh_top_tools();
--   drop index if exists idx_tools_refresh_tier;
--   alter table public.tools drop column if exists curated_top, drop column if exists refresh_tier;
