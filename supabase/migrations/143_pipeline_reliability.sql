-- Phase 10 #12/#36 + cleanup — pipeline reliability via DB-native pg_cron.
--
-- Root cause of the 195 stuck 'running' rows: a process hard-killed between the
-- 'running' insert and the finishing update leaves the row forever, and the
-- alerter only watches failure/timeout. Doing the sweep in pg_cron (no HTTP
-- layer that can itself be killed) fixes it at the source.

-- ── (1) One-time cleanup of existing stuck rows ──────────────────────────────
-- Source-aware: Vercel crons cap at ~5 min, but GH Actions batch jobs can run up
-- to 180 min — so only GH rows older than 210 min are truly dead.
update public.pipeline_runs
  set status = 'timeout', error_class = 'timeout',
      error_message = coalesce(error_message, 'stale running (auto-swept)'),
      finished_at = now()
where status = 'running'
  and (
    (source = 'vercel_cron' and started_at < now() - interval '15 minutes')
    or (source = 'gh_actions' and started_at < now() - interval '210 minutes')
    or (source not in ('vercel_cron','gh_actions') and started_at < now() - interval '210 minutes')
  );

-- ── (2) Recurring stuck-row sweeper (every 15 min) ───────────────────────────
do $$
begin
  perform cron.schedule('pipeline-stuck-sweep', '*/15 * * * *', $cron$
    update public.pipeline_runs
      set status = 'timeout', error_class = 'timeout',
          error_message = coalesce(error_message, 'stale running (auto-swept)'),
          finished_at = now()
    where status = 'running'
      and (
        (source = 'vercel_cron' and started_at < now() - interval '15 minutes')
        or (source = 'gh_actions' and started_at < now() - interval '210 minutes')
        or (source not in ('vercel_cron','gh_actions') and started_at < now() - interval '210 minutes')
      );
  $cron$);
exception when others then null;
end $$;

-- ── (3) Heartbeat: detect a previously-working pipeline going silent (#36) ────
-- For each critical pipeline that HAS succeeded before but has no success within
-- its window, insert ONE synthetic failure row (deduped per window). The existing
-- alerter then emails it through the normal path (real row id → dedup works).
do $$
begin
  perform cron.schedule('pipeline-heartbeat', '7 * * * *', $cron$
    insert into public.pipeline_runs (source, pipeline_key, status, error_class, error_message, started_at, finished_at)
    select 'vercel_cron', c.key || '-heartbeat', 'failure', 'timeout',
           'No successful "' || c.key || '" run in the last ' || c.max_hours || 'h (heartbeat)', now(), now()
    from (values
      ('cascade-hubs', 3),
      ('freshness-batch', 30),
      ('poll-gh-actions', 2),
      ('onboard-tools', 3)
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
--   select cron.unschedule('pipeline-stuck-sweep');
--   select cron.unschedule('pipeline-heartbeat');
