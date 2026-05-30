-- Phase 9 Smart SEO (2026-05-30): /seo-impact lift measurement.
--
-- Closes the loop: when we change a page (Tier-1 title override, or a
-- weekly_loop_actions item), we freeze the page's GSC metrics as a baseline,
-- and 4 weeks later the seo-impact cron fills the outcome from a fresh
-- snapshot. Lift = outcome - baseline, measured at a comparable window.
--
-- title_overrides gets baseline/outcome columns (weekly_loop_actions already
-- has them from mig 093). gsc_page_metrics() is the shared extractor.

-- Per-page metrics from a specific 28d snapshot (impression-weighted position).
-- Always returns exactly one row (zeros when the page had no rows that week).
create or replace function gsc_page_metrics(p_path text, p_snapshot_date date)
returns table(wpos numeric, impressions integer, clicks integer, ctr numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with r as (
    select
      (e->>'impressions')::numeric as imp,
      (e->>'clicks')::numeric      as clk,
      (e->>'position')::numeric    as pos
    from public.gsc_snapshots, jsonb_array_elements(rows) e
    where snapshot_date = p_snapshot_date
      and scope = '28d'
      and regexp_replace((e->>'page'), '^https?://[^/]+', '') = p_path
  )
  select
    round(sum(pos * imp) / nullif(sum(imp), 0), 2)            as wpos,
    coalesce(sum(imp), 0)::int                                as impressions,
    coalesce(sum(clk), 0)::int                                as clicks,
    case when sum(imp) > 0 then round(sum(clk) / sum(imp), 4) else 0 end as ctr
  from r;
$$;

revoke execute on function gsc_page_metrics(text, date) from public, anon, authenticated;
grant execute on function gsc_page_metrics(text, date) to service_role;

-- title_overrides baseline (frozen at approval) + outcome (filled at +4wk).
alter table public.title_overrides
  add column if not exists baseline_captured_at timestamptz,
  add column if not exists baseline_snapshot_date date,
  add column if not exists baseline_position numeric,
  add column if not exists baseline_impressions integer,
  add column if not exists baseline_clicks integer,
  add column if not exists baseline_ctr numeric,
  add column if not exists outcome_snapshot_date date,
  add column if not exists outcome_position numeric,
  add column if not exists outcome_impressions integer,
  add column if not exists outcome_clicks integer,
  add column if not exists outcome_ctr numeric,
  add column if not exists measured_at timestamptz;

comment on column public.title_overrides.baseline_ctr is
  'GSC CTR at approval (pre-recrawl). Lift vs outcome_ctr is computed by the seo-impact cron after 28d.';
