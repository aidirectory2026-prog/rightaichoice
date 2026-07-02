-- 189: I14 geo completeness + I15 browser/os completeness (Phase 14b Wave 6).
--
-- The 2026-07-02 audit found NO invariant asserting a maximum share of
-- events with missing geo, and Wave 2 added browser/os columns whose parse
-- coverage should be watched. Both are trailing-24h, client + human only.
-- Body is the 175 function verbatim + the two new checks (I1..I13 identical).

-- 1) I4 invariant — session-stitched orphan count.
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
  v_schema_pct   numeric;
  v_sess_pct     numeric;
  v_orphan_names bigint;
  v_orphan_list  text;
  v_dup_7d       bigint;
  v_recon_evt    bigint;
  v_recon_dau    bigint;
  v_today_ist    date := (now() at time zone 'Asia/Kolkata')::date;
  v_geo_pct      numeric;
  v_ua_pct       numeric;
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
    'compare_share_clicked','compare_tray_opened','compare_tray_cleared',
    'plan_started','plan_intake_submitted','plan_chip_selected',
    'plan_existing_tool_added','plan_existing_tool_removed','plan_completed',
    'plan_match_tier','plan_perf','plan_results_displayed',
    'plan_results_tool_clicked','plan_cta_impression','plan_cta_clicked',
    'plan_cta_dismissed','plan_signup_modal_shown',
    'plan_signup_modal_oauth_clicked','plan_signup_modal_skipped',
    'plan_signup_modal_completed','plan_intent_persisted','plan_intent_linked_to_user',
    'search_query_submitted','search_result_clicked','search_typing',
    'search_query_typed','plan_goal_typed',
    'filter_applied','filter_cleared','sort_changed','pagination_clicked',
    'category_viewed','collection_viewed',
    'ai_chat_message','ai_chat_response_received','ai_chat_tool_clicked',
    'review_form_opened','review_rating_set','review_text_changed',
    'review_submitted',
    'signup_started','signup_email_entered','signup_method_selected',
    'signup_completed','login_completed',
    'password_reset_requested','password_reset_completed',
    'blog_internal_link_clicked','share_clicked','newsletter_subscribed',
    'rage_click','dead_click','exit_intent','error_encountered','external_link_clicked',
    'form_field_changed','form_submitted','form_validation_failed','form_abandoned',
    'web_vitals',
    'scroll_depth_reached','time_on_page','engaged_time_heartbeat',
    'copy_text_event','paste_text_event',
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

  -- I4 (2026-06-28): session-stitched identity. A visitor who logs in mid-journey
  -- has plan_started under the anon $device id and plan_completed under their
  -- user_id; the per-tab session_id (our own property, survives the Mixpanel
  -- identify swap) stitches them. Only a person with plan_completed but truly no
  -- plan_started ANYWHERE in their stitched identity is an anomaly.
  select count(*) into v_orphan from (
    with sess_user as (
      select (properties->>'session_id') as sid,
             (array_agg(user_id) filter (where user_id is not null))[1] as uid
      from user_events
      where (properties->>'session_id') is not null and user_id is not null
      group by 1
    ),
    plan_ev as (
      select ue.event_name,
             coalesce(ue.user_id::text, su.uid::text, ue.distinct_id) as person
      from user_events ue
      left join sess_user su on su.sid = (ue.properties->>'session_id')
      where ue.event_name in ('plan_started','plan_completed')
    )
    select person from plan_ev where event_name='plan_completed'
    except
    select person from plan_ev where event_name='plan_started'
  ) o;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I4_funnel_monotonicity', case when v_orphan = 0 then 'pass' else 'warn' end, v_orphan, 0,
          'persons (session-stitched identity) with plan_completed but no plan_started');

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

  select count(*) into v_dup_7d from (
    select insert_id from user_events
    where insert_id is not null and created_at >= now() - interval '7 days'
    group by insert_id having count(*) > 1
  ) d;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I12_duplicate_insert_id_7d',
          case when v_dup_7d = 0 then 'pass' else 'fail' end, v_dup_7d, 0,
          'insert_id values shared by >1 user_events row in the last 7d (mirror de-dup regression)');

  select count(*) into v_recon_evt from (
    select coalesce(r.day_ist, w.day_ist) as d
    from (
      select day_ist, sum(events) as events
      from event_rollup_daily
      where day_ist < v_today_ist and day_ist >= v_today_ist - 30
      group by day_ist
    ) r
    full outer join (
      select (date_trunc('day', created_at at time zone 'Asia/Kolkata'))::date as day_ist,
             count(*) as events
      from user_events
      where (created_at at time zone 'Asia/Kolkata') >= (v_today_ist - 30)::timestamp
        and (created_at at time zone 'Asia/Kolkata') <  v_today_ist::timestamp
      group by 1
    ) w on r.day_ist = w.day_ist
    where coalesce(r.events, -1) <> coalesce(w.events, -1)
  ) diff;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I13a_rollup_event_count_recon',
          case when v_recon_evt = 0 then 'pass' else 'fail' end, v_recon_evt, 0,
          'complete IST days (last 30, excl today) where event_rollup_daily total <> raw user_events count (exact match required)');

  select count(*) into v_recon_dau from (
    select 1
    from (
      select day_ist, bot_likely, visitors
      from dau_rollup_daily
      where day_ist < v_today_ist and day_ist >= v_today_ist - 30
    ) r
    full outer join (
      select (date_trunc('day', created_at at time zone 'Asia/Kolkata'))::date as day_ist,
             bot_likely,
             count(distinct distinct_id) as visitors
      from user_events
      where (created_at at time zone 'Asia/Kolkata') >= (v_today_ist - 30)::timestamp
        and (created_at at time zone 'Asia/Kolkata') <  v_today_ist::timestamp
      group by 1, 2
    ) w on r.day_ist = w.day_ist and r.bot_likely = w.bot_likely
    where coalesce(r.visitors, -1) <> coalesce(w.visitors, -1)
  ) diff;
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I13b_rollup_dau_recon',
          case when v_recon_dau = 0 then 'pass' else 'fail' end, v_recon_dau, 0,
          'complete IST days (last 30, excl today) where dau_rollup_daily distinct visitors <> raw count(distinct distinct_id) per bot flag (exact match required)');

  -- I14 (Phase 14b): geo completeness — Vercel geo headers should stamp
  -- country on virtually every client event; a spike means ingest broke.
  select round(100.0 * count(*) filter (where country is null or country = '')
               / nullif(count(*),0), 2)
    into v_geo_pct
  from user_events
  where source_kind = 'client' and not bot_likely and created_at >= now() - interval '24 hours';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I14_geo_completeness',
          case when coalesce(v_geo_pct,0) > 10 then 'fail'
               when coalesce(v_geo_pct,0) > 5 then 'warn'
               else 'pass' end,
          coalesce(v_geo_pct,0), 10,
          'percent of client human events last 24h missing country (warn >5, fail >10)');

  -- I15 (Phase 14b): browser/os parse coverage (lib/ua-parse at ingest).
  select round(100.0 * count(*) filter (where browser is null)
               / nullif(count(*),0), 2)
    into v_ua_pct
  from user_events
  where source_kind = 'client' and not bot_likely and created_at >= now() - interval '24 hours';
  insert into tracking_health(check_key, status, value, threshold, detail)
  values ('I15_browser_completeness',
          case when coalesce(v_ua_pct,0) > 30 then 'fail'
               when coalesce(v_ua_pct,0) > 15 then 'warn'
               else 'pass' end,
          coalesce(v_ua_pct,0), 30,
          'percent of client human events last 24h with unparsed browser (warn >15, fail >30)');
end;
$function$;
