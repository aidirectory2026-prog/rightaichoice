-- Admin tracking I13a fix (2026-06-28) — rollup recompute window.
--
-- I13a_rollup_event_count_recon failed on 8 days (2026-06-13..06-20): the
-- event_rollup_daily total didn't equal raw user_events for those days (raw was
-- LOWER — early-era dedup/corrections shrank raw after the rollup froze). Root
-- cause: the hourly job recomputed only the trailing 3 IST days, but the recon
-- compares the last 30 days, so any in-window raw change older than 3 days left
-- the frozen rollup stale forever. (cleanup-user-events only deletes at 90 days,
-- outside the recon window, so it's not the cause.)
--
-- Fix:
--  1) compute_event_rollups now DELETE+INSERTs the dau_rollup_daily window too
--     (it previously only upserted, so a (day,bot) combo that vanished from raw
--     would leave a stale rollup row — a latent I13b drift).
--  2) Widen the hourly recompute to 33 days so the rollup tracks raw across the
--     entire 30-day recon window within an hour (cheap — it's a GROUP BY).
--  3) One-time full rebuild so the 8 stale days reconcile immediately.

create or replace function public.compute_event_rollups(p_days integer default 3)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_from_day date := (date_trunc('day', now() at time zone 'Asia/Kolkata'))::date - (greatest(p_days,1) - 1);
begin
  delete from public.event_rollup_daily where day_ist >= v_from_day;
  insert into public.event_rollup_daily
    (day_ist, event_name, bot_likely, device_type, traffic_channel, country, events, updated_at)
  select
    (date_trunc('day', created_at at time zone 'Asia/Kolkata'))::date as day_ist,
    event_name, bot_likely,
    coalesce(device_type, ''),
    coalesce(properties->>'traffic_channel', ''),
    coalesce(country, ''),
    count(*), now()
  from public.user_events
  where (created_at at time zone 'Asia/Kolkata') >= (v_from_day::timestamp)
  group by 1,2,3,4,5,6;

  -- Idempotent for the DAU rollup too: delete the window first so a (day,bot)
  -- combo that no longer exists in raw doesn't linger as a stale rollup row.
  delete from public.dau_rollup_daily where day_ist >= v_from_day;
  insert into public.dau_rollup_daily (day_ist, bot_likely, visitors, updated_at)
  select
    (date_trunc('day', created_at at time zone 'Asia/Kolkata'))::date as day_ist,
    bot_likely, count(distinct distinct_id), now()
  from public.user_events
  where (created_at at time zone 'Asia/Kolkata') >= (v_from_day::timestamp)
  group by 1,2;
end;
$function$;

-- Widen the hourly recompute window 3 -> 33 days (covers the 30-day recon window
-- + margin). cron.schedule upserts by jobname.
select cron.schedule('event-rollups-hourly', '10 * * * *', $$ select public.compute_event_rollups(33); $$);

-- One-time rebuild so the currently-divergent days reconcile now.
select public.compute_event_rollups(33);
