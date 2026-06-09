-- Phase 10 S5.5 — strict freshness-SLA monitor (DB-native via pg_cron).
--
-- Enforces the SOP: every published tool refreshed within 3 days, and every
-- daily-tier (top-150) tool within 24h. On breach it inserts a synthetic failure
-- row that the existing alerter emails (deduped to once per 12h). A small
-- tolerance on the standard tier (>25 tools) avoids flapping at the normal
-- rotation boundary while still catching a real SLA failure.
--
-- NOTE: until the new 2×/day throughput catches the catalog up (≈3 days after
-- this deploys), the standard-tier breach may fire — that is correct (the SOP is
-- genuinely not yet met). It self-clears once the cycle is under 3 days.

create or replace function public.check_freshness_sla()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $fn$
declare
  v_daily_stale int;
  v_std_stale int;
  v_msg text;
begin
  select count(*) into v_daily_stale from public.tools
    where is_published and refresh_tier = 'daily'
      and (last_verified_at is null or last_verified_at < now() - interval '24 hours');
  select count(*) into v_std_stale from public.tools
    where is_published
      and (last_verified_at is null or last_verified_at < now() - interval '3 days');

  if v_daily_stale > 0 or v_std_stale > 25 then
    -- dedup: at most one SLA alert per 12h
    if not exists (
      select 1 from public.pipeline_runs
      where pipeline_key = 'freshness-sla' and started_at > now() - interval '12 hours'
    ) then
      v_msg := 'Freshness SLA breach: ' || v_daily_stale || ' daily-tier tool(s) >24h, '
               || v_std_stale || ' published tool(s) >3d';
      insert into public.pipeline_runs
        (source, pipeline_key, status, error_class, error_message, started_at, finished_at)
      values ('vercel_cron', 'freshness-sla', 'failure', 'timeout', v_msg, now(), now());
    end if;
  end if;
end;
$fn$;

-- Run every 2 hours.
do $$
begin
  perform cron.schedule('freshness-sla-monitor', '0 */2 * * *', 'select public.check_freshness_sla();');
exception when others then null;
end $$;

-- Rollback:
--   select cron.unschedule('freshness-sla-monitor');
--   drop function if exists public.check_freshness_sla();
