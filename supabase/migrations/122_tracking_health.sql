-- 122_tracking_health.sql
-- Phase 9.A.4 — in-DB tracking invariant suite. Runs nightly via pg_cron,
-- writes pass/warn/fail rows to public.tracking_health, surfaced at
-- /admin/tracking-health and alerted out-of-band by tracking-watchdog.yml
-- (which reads this table). This is the "verified in the database itself"
-- leg of the 1000%-sure verification strategy — independent of any external
-- cron or app code.

create extension if not exists pg_cron;

create table if not exists public.tracking_health (
  id         bigserial primary key,
  run_at     timestamptz not null default now(),
  check_key  text not null,
  status     text not null check (status in ('pass','warn','fail')),
  value      numeric,
  threshold  numeric,
  detail     text
);
create index if not exists idx_tracking_health_run on public.tracking_health(run_at desc);
alter table public.tracking_health enable row level security; -- service-role only (bypasses RLS); no anon/auth policy

-- ── The invariant runner ──────────────────────────────────────────────────
create or replace function public.run_tracking_invariants()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_dup        bigint;
  v_null_id    bigint;
  v_future     bigint;
  v_max_arr    bigint;
  v_orphan     bigint;
  v_bot_pct    numeric;
  v_dau_rpc    bigint;
  v_dau_manual bigint;
begin
  -- housekeeping: keep 90 days
  delete from tracking_health where run_at < now() - interval '90 days';

  -- I1 — no duplicate insert_id (dedup integrity). FAIL if any.
  select count(*) into v_dup from (
    select insert_id from user_events where insert_id is not null
    group by insert_id having count(*) > 1
  ) d;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I1_duplicate_insert_id', case when v_dup = 0 then 'pass' else 'fail' end, v_dup, 0,
          'user_events rows sharing an insert_id (mirror de-dup broken)');

  -- I2 — insert_id never null. FAIL if any.
  select count(*) into v_null_id from user_events where insert_id is null;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I2_null_insert_id', case when v_null_id = 0 then 'pass' else 'fail' end, v_null_id, 0,
          'user_events rows with null insert_id (cannot de-dup)');

  -- I3 — per-user arrays capped at 100 (the upsert_user_intent slice fix). WARN if exceeded.
  select greatest(
    coalesce(max(array_length(existing_tools_history,1)),0),
    coalesce(max(array_length(all_search_queries_recent,1)),0),
    coalesce(max(array_length(tools_visited_externally,1)),0),
    coalesce(max(array_length(tools_compared_with,1)),0),
    coalesce(max(array_length(plan_use_cases_submitted,1)),0),
    coalesce(max(array_length(ai_chat_tools_mentioned,1)),0),
    coalesce(max(array_length(reviews_submitted_for,1)),0),
    coalesce(max(array_length(favorite_categories,1)),0)
  ) into v_max_arr from user_intent_profile;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I3_intent_array_cap', case when v_max_arr <= 100 then 'pass' else 'warn' end, v_max_arr, 100,
          'largest user_intent_profile array length (cap=100; unbounded growth bug)');

  -- I4 — funnel monotonicity: plan_completed distinct_ids that never started.
  -- WARN (not fail): server-side plan_completed can outrun an ad-blocked client plan_started.
  select count(*) into v_orphan from (
    select distinct_id from user_events where event_name='plan_completed'
    except
    select distinct_id from user_events where event_name='plan_started'
  ) o;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I4_funnel_monotonicity', case when v_orphan = 0 then 'pass' else 'warn' end, v_orphan, 0,
          'distinct_ids with plan_completed but no plan_started');

  -- I8 — affiliate-click bot share (last 7d). WARN if >20% (prefetch/bot filter leaking).
  select round(100.0 * count(*) filter (where bot_likely) / nullif(count(*),0), 1)
    into v_bot_pct
  from user_events
  where event_name='tool_visit_redirected' and created_at >= now() - interval '7 days';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I8_affiliate_bot_share', case when coalesce(v_bot_pct,0) <= 20 then 'pass' else 'warn' end,
          coalesce(v_bot_pct,0), 20, 'bot_likely percent of tool_visit_redirected in last 7d');

  -- future-dated events (clamp on client_time_ms). FAIL if any.
  select count(*) into v_future from user_events where created_at > now() + interval '1 day';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I_future_dated', case when v_future = 0 then 'pass' else 'fail' end, v_future, 0,
          'events dated more than 1 day in the future');

  -- I7 — IST day-boundary parity: insights DAU "today" must equal a manual
  -- IST-bucketed distinct count. FAIL on mismatch.
  select users into v_dau_rpc from insights_daily_active_users(1, true) order by day desc limit 1;
  select count(distinct distinct_id) into v_dau_manual from user_events
  where created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata')
        at time zone 'Asia/Kolkata';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I7_ist_day_boundary', case when coalesce(v_dau_rpc,0) = coalesce(v_dau_manual,0) then 'pass' else 'fail' end,
          coalesce(v_dau_rpc,0), coalesce(v_dau_manual,0), 'insights DAU-today vs manual IST-bucket distinct count');
end;
$$;

revoke all on function public.run_tracking_invariants() from public, anon, authenticated;
grant execute on function public.run_tracking_invariants() to service_role;

-- Nightly at 19:30 UTC (01:00 IST). cron.schedule upserts by job name.
select cron.schedule('tracking-invariants-nightly', '30 19 * * *', $cron$select public.run_tracking_invariants()$cron$);

-- Seed one run immediately so the dashboard isn't empty.
select public.run_tracking_invariants();
