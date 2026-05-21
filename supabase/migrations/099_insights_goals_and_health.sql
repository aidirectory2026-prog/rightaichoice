-- Phase 8.g.9 (2026-05-21) — insights_goals table + event-health RPC.
--
-- Two unrelated things bundled:
--
-- 1. insights_goals — KPI targets editable from /admin/insights/goals.
--    Each KPI has a key (stable identifier) + numeric goal + unit. The
--    page reads current values via the existing insights RPCs and
--    compares to goal_value. Seed defaults are sensible baselines for a
--    tech-tool directory at ~150 DAU; user edits as the site grows.
--
-- 2. insights_event_health — per-event-name stats (last fire, 24h/7d/30d
--    counts, % rows with super-props attached). Powers /admin/insights/health
--    where user can see at a glance which events fire / are dead / have
--    data-quality problems.

-- ── KPI goals table ───────────────────────────────────────────────
create table if not exists public.insights_goals (
  kpi_key text primary key,
  display_name text not null,
  category text not null,
  goal_value numeric not null,
  unit text not null,              -- 'count' | 'percent' | 'users' | 'tools'
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.insights_goals enable row level security;

create policy "service_role_full_access"
  on public.insights_goals for all to service_role using (true) with check (true);

create policy "authenticated_read"
  on public.insights_goals for select to authenticated using (true);

-- Admin-only write via service-role in the API layer (no direct client writes).

comment on table public.insights_goals is
  'Phase 8.g.9 — per-KPI goal targets. Each row has a stable kpi_key referenced by /admin/insights/goals + the queries that compute current values.';

-- ── Seed default goals (vendor-pitch focused per user direction) ──
insert into public.insights_goals (kpi_key, display_name, category, goal_value, unit, description) values
  -- Vendor-pitch readiness (top priority per user)
  ('vendor_salable_tools_30d',     'Tools with ≥50 unique high-intent users in 30d', 'vendor', 10,  'tools',   'Per tool, count unique distinct_ids that viewed/saved/click-out. Tools above 50 are vendor-pitchable.'),
  ('vendor_active_tools_7d',       'Tools with any vendor signal in 7d',              'vendor', 30,  'tools',   'Tools that appear in any of: top viewed / top saved / top clicked-out in last 7d.'),
  ('vendor_click_outs_7d',         'Total affiliate click-outs in 7d',                'vendor', 500, 'count',   'Sum of tool_visit_redirected events in last 7d. Direct revenue proxy.'),
  ('vendor_affiliate_ctr_pct',     'Affiliate CTR (click-outs / page-views)',         'vendor', 8,   'percent', 'Per-tool ratio of tool_visit_redirected to tool_page_viewed. Industry baseline 5-10%.'),
  ('vendor_save_rate_tools',       'Tools with save rate >5% in 30d',                 'vendor', 10,  'tools',   'Per tool, count of (tool_saved / tool_page_viewed) >5%. High save rate = vendor pitch leverage.'),
  ('vendor_compared_pairs_3plus',  'Compared pairs with ≥3 occurrences',              'vendor', 20,  'count',   'Distinct slug-vs-slug pairs in tools_compared_with that appear in ≥3 user profiles.'),

  -- Acquisition + conversion (secondary)
  ('acq_dau',                      'Daily active users',                              'acq', 200, 'users', 'Unique distinct_ids with any event today.'),
  ('acq_signup_rate_pct',          'Signup conversion (signups / unique visitors)',   'acq', 3,   'percent', 'Industry baseline 2-5% for tool directories.'),
  ('acq_plan_completion_pct',      'Plan completion rate (completed / started)',      'acq', 30,  'percent', 'plan_completed / plan_started over 7d.'),
  ('acq_plan_to_visit_pct',        'Plan → tool visit (clicked / completed)',         'acq', 60,  'percent', 'plan_results_tool_clicked / plan_completed. High intent users follow through.'),

  -- Engagement
  ('eng_wau',                      'Weekly active users',                             'eng', 700, 'users', 'Unique distinct_ids with any event in last 7d.'),
  ('eng_mau',                      'Monthly active users',                            'eng', 2000, 'users', 'Unique distinct_ids with any event in last 30d.'),
  ('eng_sessions_per_user_7d',     'Avg sessions per user (7d)',                      'eng', 2.5, 'count', 'Total events / unique users / 7. Higher = stickier.'),

  -- Data quality / trust
  ('data_event_freshness_pct',     'Catalog events fired in last 7d',                 'data', 70, 'percent', '% of 73 catalog events with ≥1 fire in last 7d. Lower = dead instrumentation.'),
  ('data_super_prop_coverage_pct', 'Rows with all super-props attached',              'data', 95, 'percent', '% of rows with device_type+page_path+auth_state non-NULL.')
on conflict (kpi_key) do nothing;

-- ── insights_event_health(p_days) ─────────────────────────────────
-- Per event_name aggregate: last fire, recent counts, super-prop quality.
-- Includes bots in the count by default — health check is about whether
-- the wiring works, not about user counts.
create or replace function public.insights_event_health(p_days int default 30)
returns table(
  event_name text,
  last_fire timestamptz,
  fires_24h bigint,
  fires_7d bigint,
  fires_30d bigint,
  total_in_window bigint,
  pct_device_type numeric,
  pct_page_path numeric,
  pct_auth_state numeric
)
language sql security definer set search_path = public
as $$
  select
    event_name,
    max(created_at) as last_fire,
    count(*) filter (where created_at > now() - interval '24 hours')::bigint as fires_24h,
    count(*) filter (where created_at > now() - interval '7 days')::bigint as fires_7d,
    count(*) filter (where created_at > now() - interval '30 days')::bigint as fires_30d,
    count(*)::bigint as total_in_window,
    case when count(*) > 0 then round(100.0 * count(*) filter (where device_type is not null) / count(*), 1) else 0 end as pct_device_type,
    case when count(*) > 0 then round(100.0 * count(*) filter (where page_path is not null) / count(*), 1) else 0 end as pct_page_path,
    case when count(*) > 0 then round(100.0 * count(*) filter (where auth_state is not null) / count(*), 1) else 0 end as pct_auth_state
  from user_events
  where created_at > now() - (p_days || ' days')::interval
  group by event_name
  order by max(created_at) desc;
$$;

-- ── insights_kpi_values(p_days) ───────────────────────────────────
-- Computes current values for every KPI in insights_goals. Returns one
-- row per kpi_key with the current numeric value. Page joins this with
-- insights_goals to compute % of goal.
create or replace function public.insights_kpi_values(p_days int default 7)
returns table(kpi_key text, current_value numeric)
language plpgsql security definer set search_path = public
as $$
declare
  v_today_start timestamptz := date_trunc('day', now());
  v_cutoff_7d timestamptz := now() - interval '7 days';
  v_cutoff_30d timestamptz := now() - interval '30 days';
begin
  void(p_days); -- reserved for future window-aware KPIs
  return query
    -- Vendor: salable tools (≥50 unique users in 30d)
    select 'vendor_salable_tools_30d'::text, count(*)::numeric
    from (
      select properties->>'tool_slug' as slug
      from user_events
      where event_name in ('tool_page_viewed','tool_saved','tool_visit_redirected')
        and created_at >= v_cutoff_30d
        and not bot_likely
        and properties->>'tool_slug' is not null
      group by 1
      having count(distinct distinct_id) >= 50
    ) t

    union all
    -- Vendor: any signal in 7d
    select 'vendor_active_tools_7d', count(distinct properties->>'tool_slug')::numeric
    from user_events
    where event_name in ('tool_page_viewed','tool_saved','tool_visit_redirected')
      and created_at >= v_cutoff_7d
      and not bot_likely
      and properties->>'tool_slug' is not null

    union all
    -- Vendor: click-outs in 7d
    select 'vendor_click_outs_7d', count(*)::numeric
    from user_events
    where event_name = 'tool_visit_redirected'
      and created_at >= v_cutoff_7d
      and not bot_likely

    union all
    -- Vendor: affiliate CTR (click-outs / page-views, last 7d)
    select 'vendor_affiliate_ctr_pct',
      case when count(*) filter (where event_name = 'tool_page_viewed') > 0
        then round(100.0 * count(*) filter (where event_name = 'tool_visit_redirected')
                       / count(*) filter (where event_name = 'tool_page_viewed'), 1)
        else 0 end
    from user_events
    where event_name in ('tool_page_viewed','tool_visit_redirected')
      and created_at >= v_cutoff_7d
      and not bot_likely

    union all
    -- Vendor: tools with save rate >5% in 30d
    select 'vendor_save_rate_tools', count(*)::numeric
    from (
      select properties->>'tool_slug' as slug,
        count(*) filter (where event_name = 'tool_page_viewed') as views,
        count(*) filter (where event_name = 'tool_saved') as saves
      from user_events
      where event_name in ('tool_page_viewed','tool_saved')
        and created_at >= v_cutoff_30d
        and not bot_likely
        and properties->>'tool_slug' is not null
      group by 1
      having count(*) filter (where event_name = 'tool_page_viewed') > 0
        and round(100.0 * count(*) filter (where event_name = 'tool_saved')
                       / count(*) filter (where event_name = 'tool_page_viewed'), 1) > 5
    ) t

    union all
    -- Vendor: compared pairs with ≥3 occurrences
    select 'vendor_compared_pairs_3plus', count(*)::numeric
    from (
      select unnested as pair
      from user_intent_profile, unnest(tools_compared_with) as t(unnested)
      group by 1
      having count(*) >= 3
    ) p

    union all
    -- Acq: DAU
    select 'acq_dau', count(distinct distinct_id)::numeric
    from user_events
    where created_at >= v_today_start and not bot_likely

    union all
    -- Acq: signup rate (signups / unique visitors, last 7d)
    select 'acq_signup_rate_pct',
      case when count(distinct distinct_id) > 0
        then round(100.0 * count(*) filter (where event_name = 'signup_completed')
                       / count(distinct distinct_id), 1)
        else 0 end
    from user_events
    where created_at >= v_cutoff_7d and not bot_likely

    union all
    -- Acq: plan completion rate (last 7d)
    select 'acq_plan_completion_pct',
      case when count(*) filter (where event_name = 'plan_started') > 0
        then round(100.0 * count(*) filter (where event_name = 'plan_completed')
                       / count(*) filter (where event_name = 'plan_started'), 1)
        else 0 end
    from user_events
    where event_name in ('plan_started','plan_completed')
      and created_at >= v_cutoff_7d
      and not bot_likely

    union all
    -- Acq: plan → click-through rate
    select 'acq_plan_to_visit_pct',
      case when count(*) filter (where event_name = 'plan_completed') > 0
        then round(100.0 * count(*) filter (where event_name = 'plan_results_tool_clicked')
                       / count(*) filter (where event_name = 'plan_completed'), 1)
        else 0 end
    from user_events
    where event_name in ('plan_completed','plan_results_tool_clicked')
      and created_at >= v_cutoff_7d
      and not bot_likely

    union all
    -- Eng: WAU
    select 'eng_wau', count(distinct distinct_id)::numeric
    from user_events
    where created_at >= v_cutoff_7d and not bot_likely

    union all
    -- Eng: MAU
    select 'eng_mau', count(distinct distinct_id)::numeric
    from user_events
    where created_at >= v_cutoff_30d and not bot_likely

    union all
    -- Eng: sessions per user (events / users / 7, last 7d — sessions proxy)
    select 'eng_sessions_per_user_7d',
      case when count(distinct distinct_id) > 0
        then round((count(*)::numeric / count(distinct distinct_id)) / 7.0, 2)
        else 0 end
    from user_events
    where created_at >= v_cutoff_7d
      and event_name = 'page_viewed'
      and not bot_likely

    union all
    -- Data: super-prop coverage (% of rows with device_type+page_path+auth_state)
    select 'data_super_prop_coverage_pct',
      case when count(*) > 0
        then round(100.0 * count(*) filter (where device_type is not null
                                              and page_path is not null
                                              and auth_state is not null) / count(*), 1)
        else 0 end
    from user_events
    where created_at >= v_cutoff_7d
      and source_kind = 'client'
      and not bot_likely
  ;

  -- data_event_freshness_pct is computed in the page layer (needs the
  -- catalog list from events.ts which lives in TS, not SQL).
end;
$$;

grant execute on function public.insights_event_health to authenticated, service_role;
grant execute on function public.insights_kpi_values to authenticated, service_role;
