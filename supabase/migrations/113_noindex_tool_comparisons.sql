-- Phase 9 noindex sweep: keep low-quality / off-domain comparison URLs live
-- but exclude them from sitemap and emit <meta robots="noindex,follow">.
--
-- Reason: ~12 compares rank pos 51+ with negligible impressions; clearing
-- crawl budget so Google indexes the editorial compares that matter
-- (May 2026 audit sample shows compares only 34% indexed vs 93% for tools).

alter table tool_comparisons
  add column if not exists noindex boolean not null default false;

comment on column tool_comparisons.noindex is
  'Phase 9 noindex sweep — when true, page emits robots: noindex,follow and is excluded from sitemap. URL still resolves.';

create index if not exists idx_tool_comparisons_noindex
  on tool_comparisons (noindex) where noindex = false;
