-- 170_deep_refresh_sla.sql — Phase 12 Bug-2 (2026-06-22)
--
-- WHY: the deep 22-field refresh (`refresh-tool-data-full`) silently stalled for
-- weeks — it timed out before its single end-of-run pipeline_runs insert, so it
-- left NO trace, and NO monitor watched `last_full_refresh_at`. Result: 71% of the
-- catalog's deep fields (incl. structured pricing tiers) froze ~27 days and nobody
-- was alerted. This migration closes that blind spot:
--   1. A `last_full_refresh_at` SLA monitor (the deep equivalent of 145's
--      check_freshness_sla, which only watches the lite `last_verified_at`).
--   2. Adds `refresh-tool-data-full` to the pipeline-heartbeat (now meaningful
--      because backfill-tool-data.ts logs a start row + the sharded job completes).
--
-- Both reuse the existing alert path: a synthetic `failure` row in pipeline_runs
-- that `alert-failed-pipelines` emails (deduped here so it can't spam).

-- ── 1. Deep-refresh SLA: alert when too much of the catalog is deep-stale ──
create or replace function public.check_deep_refresh_sla()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $fn$
declare
  v_published int;
  v_stale int;     -- published tools whose deep fields are >10 days old (or never)
  v_threshold int;
  v_msg text;
begin
  select count(*) into v_published from public.tools where is_published;
  select count(*) into v_stale from public.tools
    where is_published
      and (last_full_refresh_at is null or last_full_refresh_at < now() - interval '10 days');

  -- The heavy lane targets ~7 days; >10 days for more than ~25% of the catalog
  -- (floor 200) means the sharded deep job isn't keeping up / has stalled.
  v_threshold := greatest(200, (v_published * 0.25)::int);

  if v_stale > v_threshold then
    if not exists (
      select 1 from public.pipeline_runs
      where pipeline_key = 'deep-refresh-sla' and started_at > now() - interval '24 hours'
    ) then
      v_msg := 'Deep-refresh SLA breach: ' || v_stale || ' of ' || v_published
               || ' published tool(s) have last_full_refresh_at >10d (threshold ' || v_threshold
               || '). The full-refresh shards may be timing out — check pipeline_runs for refresh-tool-data-full.';
      insert into public.pipeline_runs
        (source, pipeline_key, status, error_class, error_message, started_at, finished_at)
      values ('vercel_cron', 'deep-refresh-sla', 'failure', 'timeout', v_msg, now(), now());
    end if;
  end if;
end;
$fn$;

-- Daily at 12:00 UTC (well after the 06:00 deep-refresh shards finish).
do $$
begin
  perform cron.schedule('deep-refresh-sla-monitor', '0 12 * * *', 'select public.check_deep_refresh_sla();');
exception when others then null;
end $$;

-- ── 2. Extend the pipeline-heartbeat with the deep-refresh key ──
-- cron.schedule upserts by name, so re-declare the full 165 list + the new key.
-- 36h ≈ a missed daily 06:00 deep-refresh + slack (the sharded job logs a start
-- row immediately now, and each shard's success row satisfies the guard).
do $$
begin
  perform cron.schedule('pipeline-heartbeat', '7 * * * *', $cron$
    insert into public.pipeline_runs (source, pipeline_key, status, error_class, error_message, started_at, finished_at)
    select 'vercel_cron', c.key || '-heartbeat', 'failure', 'timeout',
           'No successful "' || c.key || '" run in the last ' || c.max_hours || 'h (heartbeat)', now(), now()
    from (values
      ('cascade-hubs', 3),
      ('onboard-tools', 3),
      ('poll-gh-actions', 2),
      ('cron-pipelines', 6),
      ('freshness-batch', 30),
      ('refresh-tool-data-full', 36),
      ('scrape-sentiment', 28),
      ('calculate-viability', 28),
      ('cleanup-user-events', 28),
      ('refresh-freshness-view', 28),
      ('snapshot-daily-updates', 28),
      ('submit-urls-bing', 28)
    ) as c(key, max_hours)
    where exists (
      select 1 from public.pipeline_runs s where s.pipeline_key = c.key and s.status = 'success'
    )
    and not exists (
      select 1 from public.pipeline_runs r where r.pipeline_key = c.key and r.status = 'success'
        and r.started_at > now() - make_interval(hours => c.max_hours)
    )
    and not exists (
      select 1 from public.pipeline_runs h where h.pipeline_key = c.key || '-heartbeat'
        and h.started_at > now() - make_interval(hours => c.max_hours)
    );
  $cron$);
exception when others then null;
end $$;

-- Rollback:
--   select cron.unschedule('deep-refresh-sla-monitor');
--   drop function if exists public.check_deep_refresh_sla();
--   (and re-run migration 165's pipeline-heartbeat block to drop the deep key)
