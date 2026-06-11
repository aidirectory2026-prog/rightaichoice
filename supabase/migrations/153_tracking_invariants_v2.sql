-- 153_tracking_invariants_v2.sql
-- Phase 10.3.4 — extend run_tracking_invariants() with the schema-registry
-- era checks. I1–I8 preserved verbatim from the live function body
-- (pg_get_functiondef, 2026-06-11); I9–I12 appended:
--
--   I9  schema-violation rate — % of client events in the last 24h tagged
--       properties->>'schema_valid' = 'false' by /api/track-mirror
--       (lib/analytics-schema.ts drift). warn > 1%, fail > 5%.
--   I10 session coverage — % of client (source_kind='client') events since
--       the 2026-06-10 attribution epoch missing properties->>'session_id'.
--       warn > 20% (old cached bundles without the session patch decay
--       toward 0 over time).
--   I11 orphan event names — distinct event_name values flowing in the last
--       7d that are NOT in the schema registry's known set (the inlined list
--       below is regenerated from EVENT_SCHEMAS in lib/analytics-schema.ts;
--       deprecated names are deliberately excluded so a zombie emitter
--       trips this). fail > 0.
--   I12 duplicate insert_id count over the last 7d (recent-window companion
--       to the all-time I1). fail > 0.
--
-- Signature stays zero-arg: pg_cron job `tracking-invariants-nightly`
-- (jobid 1) calls `select public.run_tracking_invariants()` unchanged.

create or replace function public.run_tracking_invariants()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dup        bigint;
  v_null_id    bigint;
  v_future     bigint;
  v_max_arr    bigint;
  v_orphan     bigint;
  v_bot_pct    numeric;
  v_dau_rpc    bigint;
  v_dau_manual bigint;
  -- 10.3.4 additions
  v_schema_pct   numeric;
  v_sess_pct     numeric;
  v_orphan_names bigint;
  v_orphan_list  text;
  v_dup_7d       bigint;
  -- Known event names = EVENT_SCHEMAS keys (lib/analytics-schema.ts).
  -- Regenerate when the registry changes: Object.keys(EVENT_SCHEMAS).
  v_known_events text[] := array[
    'page_viewed','nav_cta_clicked','hero_cta_clicked','navigation_back',
    'tool_page_viewed','tool_saved','tool_unsaved','tool_visit_clicked',
    'tool_visit_redirected','tool_faq_opened','viability_badge_clicked',
    'viability_page_viewed',
    'sentiment_card_viewed','sentiment_scan_started','sentiment_result_viewed',
    'sentiment_pay_clicked','sentiment_scan_requested','sentiment_scan_completed',
    'sentiment_scan_failed','sentiment_paywall_shown','sentiment_payment_initiated',
    'sentiment_payment_succeeded','sentiment_payment_failed',
    'comparison_viewed','compare_tool_added','compare_tool_removed',
    'compare_share_clicked','compare_tray_opened',
    'plan_started','plan_intake_submitted','plan_chip_selected',
    'plan_existing_tool_added','plan_existing_tool_removed','plan_completed',
    'plan_match_tier','plan_perf','plan_results_displayed',
    'plan_results_tool_clicked','plan_cta_impression','plan_cta_clicked',
    'plan_cta_dismissed','plan_signup_modal_shown',
    'plan_signup_modal_oauth_clicked','plan_signup_modal_skipped',
    'plan_signup_modal_completed','recommendation_requested',
    'search_query_submitted','search_result_clicked','search_typing',
    'search_query_typed','plan_goal_typed',
    'filter_applied','category_viewed','collection_viewed',
    'ai_chat_message','ai_chat_response_received','ai_chat_tool_clicked',
    'review_form_opened','review_rating_set','review_text_changed',
    'review_submitted',
    'signup_started','signup_completed','login_completed',
    'password_reset_completed',
    'blog_internal_link_clicked','share_clicked','newsletter_subscribed',
    'activation_milestone',
    'scroll_depth_reached','time_on_page','copy_text_event','paste_text_event',
    'context_menu_opened','tab_visibility_changed',
    'dashboard_viewed','saved_list_viewed','profile_viewed','stack_saved'
  ];
begin
  delete from tracking_health where run_at < now() - interval '90 days';

  select count(*) into v_dup from (
    select insert_id from user_events where insert_id is not null
    group by insert_id having count(*) > 1
  ) d;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I1_duplicate_insert_id', case when v_dup = 0 then 'pass' else 'fail' end, v_dup, 0,
          'user_events rows sharing an insert_id (mirror de-dup broken)');

  select count(*) into v_null_id from user_events where insert_id is null;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I2_null_insert_id', case when v_null_id = 0 then 'pass' else 'fail' end, v_null_id, 0,
          'user_events rows with null insert_id (cannot de-dup)');

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

  select count(*) into v_orphan from (
    select distinct_id from user_events where event_name='plan_completed'
    except
    select distinct_id from user_events where event_name='plan_started'
  ) o;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I4_funnel_monotonicity', case when v_orphan = 0 then 'pass' else 'warn' end, v_orphan, 0,
          'distinct_ids with plan_completed but no plan_started');

  select round(100.0 * count(*) filter (where bot_likely) / nullif(count(*),0), 1)
    into v_bot_pct
  from user_events
  where event_name='tool_visit_redirected' and created_at >= now() - interval '7 days';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I8_affiliate_bot_share', case when coalesce(v_bot_pct,0) <= 20 then 'pass' else 'warn' end,
          coalesce(v_bot_pct,0), 20, 'bot_likely percent of tool_visit_redirected in last 7d');

  select count(*) into v_future from user_events where created_at > now() + interval '1 day';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I_future_dated', case when v_future = 0 then 'pass' else 'fail' end, v_future, 0,
          'events dated more than 1 day in the future');

  select users into v_dau_rpc from insights_daily_active_users(1, true) order by day desc limit 1;
  select count(distinct distinct_id) into v_dau_manual from user_events
  where created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I7_ist_day_boundary', case when coalesce(v_dau_rpc,0) = coalesce(v_dau_manual,0) then 'pass' else 'fail' end,
          coalesce(v_dau_rpc,0), coalesce(v_dau_manual,0), 'insights DAU-today vs manual IST-bucket distinct count');

  -- ── I9: schema-violation rate (10.3.4) ─────────────────────────────
  -- /api/track-mirror tags rows that fail lib/analytics-schema.ts with
  -- properties->>'schema_valid' = 'false' (rows are never dropped).
  select round(100.0 * count(*) filter (where properties->>'schema_valid' = 'false')
               / nullif(count(*),0), 2)
    into v_schema_pct
  from user_events
  where source_kind = 'client' and created_at >= now() - interval '24 hours';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I9_schema_violation_rate',
          case when coalesce(v_schema_pct,0) > 5 then 'fail'
               when coalesce(v_schema_pct,0) > 1 then 'warn'
               else 'pass' end,
          coalesce(v_schema_pct,0), 5,
          'percent of client events last 24h tagged schema_valid=false by /api/track-mirror (warn >1, fail >5)');

  -- ── I10: session coverage since the attribution epoch (10.3.4) ─────
  select round(100.0 * count(*) filter (where properties->>'session_id' is null)
               / nullif(count(*),0), 2)
    into v_sess_pct
  from user_events
  where source_kind = 'client' and created_at >= timestamptz '2026-06-10 00:00:00+00';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I10_session_coverage',
          case when coalesce(v_sess_pct,0) > 20 then 'warn' else 'pass' end,
          coalesce(v_sess_pct,0), 20,
          'percent of client events since 2026-06-10 epoch missing properties.session_id (old cached bundles decay toward 0)');

  -- ── I11: orphan event names (10.3.4) ───────────────────────────────
  select count(*), string_agg(event_name, ', ' order by event_name)
    into v_orphan_names, v_orphan_list
  from (
    select distinct event_name from user_events
    where created_at >= now() - interval '7 days'
      and event_name <> all(v_known_events)
  ) u;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I11_orphan_event_names',
          case when coalesce(v_orphan_names,0) = 0 then 'pass' else 'fail' end,
          coalesce(v_orphan_names,0), 0,
          'distinct event_name last 7d not in the schema registry known set'
          || coalesce(': ' || left(v_orphan_list, 400), ''));

  -- ── I12: duplicate insert_id, recent window (10.3.4) ───────────────
  select count(*) into v_dup_7d from (
    select insert_id from user_events
    where insert_id is not null and created_at >= now() - interval '7 days'
    group by insert_id having count(*) > 1
  ) d;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I12_duplicate_insert_id_7d',
          case when v_dup_7d = 0 then 'pass' else 'fail' end, v_dup_7d, 0,
          'insert_id values shared by >1 user_events row in the last 7d (mirror de-dup regression)');
end;
$function$;
