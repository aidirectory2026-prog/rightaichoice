-- 123_category_counts_and_indexes.sql
-- Phase 9.B — data quality.
--
-- (1) Category-count truncation (P0). /categories read the tool_categories
--     junction with an un-paginated select, which PostgREST caps at 1000 rows.
--     With 3,542 published junction rows, every category count was silently
--     undercounted. Replace with a grouped-count RPC that returns ~one row per
--     category (well under the cap).
-- (2) Junction secondary-column indexes — the hottest read path (category and
--     tag scoped queries, alternatives) had no index leading with category_id /
--     tag_id / alternative_id, forcing full scans on every category & tool page.

create or replace function public.category_published_counts()
returns table(category_id uuid, n bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select tc.category_id, count(*)::bigint as n
  from tool_categories tc
  join tools t on t.id = tc.tool_id
  where t.is_published
  group by tc.category_id;
$$;
-- Public page (/categories) calls this via the anon SSR client, so anon needs EXECUTE.
grant execute on function public.category_published_counts() to anon, authenticated, service_role;

create index if not exists idx_tool_categories_category on public.tool_categories(category_id);
create index if not exists idx_tool_tags_tag on public.tool_tags(tag_id);
create index if not exists idx_tool_alternatives_alt on public.tool_alternatives(alternative_id);
