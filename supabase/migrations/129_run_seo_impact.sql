-- Phase 9 Smart SEO (2026-05-30): seo-impact measurement function.
--
-- Called weekly by /api/cron/seo-impact. Fills outcome_* for any change that's
-- now >= 28 days old and not yet measured, from the latest 28d GSC snapshot:
--   - title_overrides (Tier-1 title rewrites), keyed off baseline_captured_at
--   - weekly_loop_actions (triage items), keyed off executed_at; flips to 'measured'
-- Lift = outcome - baseline, computed at read time in /admin/seo-impact.

create or replace function run_seo_impact()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sd date;
  v_titles int := 0;
  v_actions int := 0;
begin
  select snapshot_date into v_sd
  from public.gsc_snapshots where scope = '28d'
  order by snapshot_date desc limit 1;

  if v_sd is null then
    return jsonb_build_object('error', 'no 28d snapshot');
  end if;

  -- Title overrides aged >= 28d since baseline capture.
  with src as (
    select t.id, m.wpos, m.impressions, m.clicks, m.ctr
    from public.title_overrides t
    cross join lateral public.gsc_page_metrics(t.page_path, v_sd) m
    where t.reverted_at is null
      and t.measured_at is null
      and t.baseline_captured_at is not null
      and t.baseline_captured_at <= now() - interval '28 days'
  )
  update public.title_overrides t
  set outcome_snapshot_date = v_sd,
      outcome_position    = src.wpos,
      outcome_impressions = src.impressions,
      outcome_clicks      = src.clicks,
      outcome_ctr         = src.ctr,
      measured_at         = now()
  from src where src.id = t.id;
  get diagnostics v_titles = row_count;

  -- Executed weekly-loop actions aged >= 28d.
  with src as (
    select a.id, m.wpos, m.impressions, m.clicks, m.ctr
    from public.weekly_loop_actions a
    cross join lateral public.gsc_page_metrics(a.page, v_sd) m
    where a.status = 'executed'
      and a.measured_at is null
      and a.executed_at is not null
      and a.executed_at <= now() - interval '28 days'
  )
  update public.weekly_loop_actions a
  set outcome_position    = src.wpos,
      outcome_impressions = src.impressions,
      outcome_clicks      = src.clicks,
      outcome_ctr         = src.ctr,
      measured_at         = now(),
      status              = 'measured'
  from src where src.id = a.id;
  get diagnostics v_actions = row_count;

  return jsonb_build_object(
    'snapshot_date', v_sd,
    'titles_measured', v_titles,
    'actions_measured', v_actions
  );
end;
$$;

revoke execute on function run_seo_impact() from public, anon, authenticated;
grant execute on function run_seo_impact() to service_role;
