-- Phase 10 #19 — shared, serverless-correct rate limiter backed by Postgres.
--
-- The in-memory limiter reset on every cold start and wasn't shared across
-- Vercel instances, so the real limit was far higher than configured and the
-- expensive AI/payment endpoints were effectively unprotected. This gives a
-- single shared counter via one atomic upsert (fixed-window).

create table if not exists public.rate_limit_counters (
  key         text primary key,
  count       integer not null default 0,
  reset_at    timestamptz not null,
  updated_at  timestamptz not null default now()
);

-- Atomic check-and-increment. Returns {ok, count, limit, reset_at}.
create or replace function public.rate_limit_check(p_key text, p_limit integer, p_window_ms bigint)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_now   timestamptz := now();
  v_count integer;
  v_reset timestamptz;
begin
  insert into public.rate_limit_counters (key, count, reset_at, updated_at)
    values (p_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0), v_now)
  on conflict (key) do update set
    count = case when public.rate_limit_counters.reset_at < v_now then 1
                 else public.rate_limit_counters.count + 1 end,
    reset_at = case when public.rate_limit_counters.reset_at < v_now
                    then v_now + make_interval(secs => p_window_ms / 1000.0)
                    else public.rate_limit_counters.reset_at end,
    updated_at = v_now
  returning count, reset_at into v_count, v_reset;

  return jsonb_build_object(
    'ok', v_count <= p_limit,
    'count', v_count,
    'limit', p_limit,
    'reset_at', v_reset
  );
end;
$function$;

-- Hourly prune of expired counters (pg_cron is already installed). Keeps the
-- table tiny without an app-side job.
do $$
begin
  perform cron.schedule(
    'rate-limit-prune',
    '0 * * * *',
    $cron$delete from public.rate_limit_counters where reset_at < now() - interval '1 hour'$cron$
  );
exception when others then
  -- ignore if the job already exists or cron is unavailable in this env
  null;
end $$;

alter table public.rate_limit_counters enable row level security;
-- No anon/authenticated policies: only the service role (which bypasses RLS) touches this.

-- Rollback:
--   select cron.unschedule('rate-limit-prune');
--   drop function if exists public.rate_limit_check(text,integer,bigint);
--   drop table if exists public.rate_limit_counters;
