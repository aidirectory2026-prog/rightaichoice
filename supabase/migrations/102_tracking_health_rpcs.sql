-- Phase 8.g.11.f (2026-05-23) — RPCs powering the tracking-health view
-- on /admin/insights/health.
--
-- insights_event_volume_projection — current month-to-date events +
-- 30-day rolling daily avg + projected month-end total. Powers the
-- "volume budget" tile (compared to Mixpanel free 20M/mo cap).

create or replace function public.insights_event_volume_projection()
returns table(
  today_events bigint,
  mtd_events bigint,
  rolling_30d_avg numeric,
  days_in_month int,
  day_of_month int,
  projected_month_end bigint,
  free_tier_cap bigint,
  pct_of_cap numeric
)
language sql security definer set search_path = public
as $$
  with today_count as (
    select count(*)::bigint as n
    from user_events
    where created_at >= date_trunc('day', now())
  ),
  mtd_count as (
    select count(*)::bigint as n
    from user_events
    where created_at >= date_trunc('month', now())
  ),
  rolling_avg as (
    select (count(*)::numeric / 30.0) as avg_daily
    from user_events
    where created_at >= now() - interval '30 days'
  ),
  calendar as (
    select
      extract(day from (date_trunc('month', now()) + interval '1 month' - interval '1 day'))::int as days_in_month,
      extract(day from now())::int as day_of_month
  )
  select
    (select n from today_count) as today_events,
    (select n from mtd_count) as mtd_events,
    round((select avg_daily from rolling_avg), 1) as rolling_30d_avg,
    c.days_in_month,
    c.day_of_month,
    -- Project: mtd + (rolling_avg × remaining days)
    ((select n from mtd_count) + round((select avg_daily from rolling_avg) * greatest(c.days_in_month - c.day_of_month, 0)))::bigint as projected_month_end,
    20000000::bigint as free_tier_cap,
    round(
      100.0 *
        ((select n from mtd_count) + (select avg_daily from rolling_avg) * greatest(c.days_in_month - c.day_of_month, 0))
        / 20000000.0,
      4
    ) as pct_of_cap
  from calendar c;
$$;

grant execute on function public.insights_event_volume_projection to authenticated, service_role;
