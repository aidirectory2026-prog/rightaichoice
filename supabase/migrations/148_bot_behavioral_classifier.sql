-- Phase 10.2 (F7c, 2026-06-11) — nightly behavioral bot classifier.
--
-- The UA regex alone had ~30% recall (audit finding F7): datacenter farms ride
-- stock browser UA strings. Behavior gives them away — many events, zero
-- engagement (no dwell, no clicks, no typing, never logged in). This function
-- re-flags such visitors nightly; the one-time historical backfill for the
-- known signatures (stale-Chrome band, dev builds, auth prober, named bots)
-- was executed 2026-06-11 (see docs/admin/metric-audit.md F7 + build log 2.2).
--
-- Guards against false positives:
--   * never touches logged-in visitors (user_id present anywhere in window)
--   * requires >= p_min_events events in the lookback
--   * requires ZERO engagement events of any kind (dwell, outclick intent,
--     typing, plan/sentiment/search/auth interactions)

create or replace function public.classify_bot_behavior(
  p_lookback interval default interval '7 days',
  p_min_events integer default 20
)
returns integer
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_count integer;
begin
  with windowed as (
    select distinct_id,
           count(*) as events,
           count(*) filter (where user_id is not null) as authed,
           count(*) filter (where event_name in (
             'time_on_page', 'tool_visit_clicked', 'search_query_typed',
             'plan_goal_typed', 'plan_started', 'sentiment_scan_started',
             'login_completed', 'signup_completed', 'newsletter_email_typed',
             'review_form_opened', 'compare_tray_opened'
           )) as engagement
    from user_events
    where created_at >= now() - p_lookback
      and bot_likely = false
    group by distinct_id
  ),
  candidates as (
    select distinct_id from windowed
    where events >= p_min_events and authed = 0 and engagement = 0
  )
  update user_events ue
  set bot_likely = true
  from candidates c
  where ue.distinct_id = c.distinct_id
    and ue.bot_likely = false;

  get diagnostics v_count = row_count;

  insert into tracking_health (run_at, check_key, status, value, threshold, detail)
  values (
    now(),
    'F7_behavioral_classifier',
    case when v_count > 500 then 'warn' else 'pass' end,
    v_count,
    500,
    format('rows re-flagged bot by behavioral classifier (lookback %s, min events %s)', p_lookback, p_min_events)
  );

  return v_count;
end;
$$;

revoke all on function public.classify_bot_behavior(interval, integer) from public, anon, authenticated;

-- Nightly at 19:45 UTC (01:15 IST), after the 19:30 invariants run.
-- cron.schedule upserts by job name, so re-applying is safe.
select cron.schedule(
  'bot-behavioral-classifier',
  '45 19 * * *',
  $job$ select public.classify_bot_behavior(); $job$
);
