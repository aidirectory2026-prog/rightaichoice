-- 165_heartbeat_coverage.sql — Phase 10 (Cowork QA) H7
-- The migration-143 pipeline-heartbeat covered only 4 pipelines, so a daily cron
-- that silently STOPS firing (Vercel cron drift / 405) produced no row and no
-- alert. Re-schedule the same 'pipeline-heartbeat' job (cron.schedule upserts by
-- name) with every daily-or-more-frequent pipeline, keyed by the EXACT
-- pipeline_key each cron logs (verified against live pipeline_runs).
--
-- Safe by construction: a key only alerts once it has a `success` history
-- (the `where exists (... status='success')` guard), so newly-listed keys can't
-- false-alarm before they've ever run. max_hours ≈ 2× the cadence + slack.

do $$
begin
  perform cron.schedule('pipeline-heartbeat', '7 * * * *', $cron$
    insert into public.pipeline_runs (source, pipeline_key, status, error_class, error_message, started_at, finished_at)
    select 'vercel_cron', c.key || '-heartbeat', 'failure', 'timeout',
           'No successful "' || c.key || '" run in the last ' || c.max_hours || 'h (heartbeat)', now(), now()
    from (values
      -- hourly / more frequent
      ('cascade-hubs', 3),
      ('onboard-tools', 3),
      ('poll-gh-actions', 2),
      ('cron-pipelines', 6),
      -- GH Actions batch
      ('freshness-batch', 30),
      -- daily Vercel crons
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

-- Rollback: re-run migration 143's pipeline-heartbeat block (4-key list).
