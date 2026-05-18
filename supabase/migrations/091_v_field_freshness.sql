-- Phase 8.d.8 (2026-05-18) — freshness materialized view.
--
-- One row per (field × pricing_type) with age statistics across the
-- published catalog. Backs /admin/freshness heatmap; refreshed nightly
-- by /api/cron/refresh-freshness-view at 23:45 UTC (10 min before
-- snapshot-daily-updates).

create materialized view if not exists public.v_field_freshness as
with fields as (
  select 'last_verified_at'      as field, last_verified_at      as ts, pricing_type, slug from public.tools where is_published = true
  union all
  select 'last_full_refresh_at'  as field, last_full_refresh_at  as ts, pricing_type, slug from public.tools where is_published = true
  union all
  select 'latest_updates_at'     as field, latest_updates_at     as ts, pricing_type, slug from public.tools where is_published = true
  union all
  select 'viability_updated_at'  as field, viability_updated_at  as ts, pricing_type, slug from public.tools where is_published = true
  union all
  select 'our_views_generated_at' as field, our_views_generated_at as ts, pricing_type, slug from public.tools where is_published = true
)
select
  field,
  pricing_type,
  count(*)                                                                   as total_tools,
  count(*) filter (where ts is null)                                         as count_never_filled,
  count(*) filter (where ts is not null and now() - ts > interval '30 days') as count_stale_30d,
  count(*) filter (where ts is not null and now() - ts > interval '7 days')  as count_stale_7d,
  percentile_cont(0.50) within group (order by extract(epoch from now() - ts)) filter (where ts is not null) as p50_age_sec,
  percentile_cont(0.95) within group (order by extract(epoch from now() - ts)) filter (where ts is not null) as p95_age_sec,
  (select slug from fields f2 where f2.field = fields.field and f2.pricing_type = fields.pricing_type and f2.ts is not null order by f2.ts asc limit 1) as oldest_slug,
  (select ts   from fields f2 where f2.field = fields.field and f2.pricing_type = fields.pricing_type and f2.ts is not null order by f2.ts asc limit 1) as oldest_ts
from fields
group by field, pricing_type;

create unique index if not exists v_field_freshness_pk
  on public.v_field_freshness (field, pricing_type);

-- Initial populate.
refresh materialized view public.v_field_freshness;

comment on materialized view public.v_field_freshness is
  'Phase 8.d.8 — age distribution per refresh-able field × pricing_type. Refreshed nightly by /api/cron/refresh-freshness-view.';
