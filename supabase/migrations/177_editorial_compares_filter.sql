-- Phase 12 (2026-06-28) — category + sort filter for the /compare hub.
--
-- The compare hub had no on-page filter (its "Browse by category" only linked
-- out to /tools). tool_comparisons references tools via the tool_ids uuid[]
-- ARRAY (not a junction), so PostgREST can't embed-join tools→categories.
-- This RPC does the join + pagination + total count in one call: a compare
-- matches a category if ANY of its tools belong to that category. Sort:
-- 'recent' (published_at desc, the hub default) or 'popular' (view_count desc).

create or replace function public.editorial_compares_filtered(
  p_category text default null,
  p_sort text default 'recent',
  p_limit int default 24,
  p_offset int default 0
)
returns table(slug text, verdict text, tool_ids uuid[], view_count int, total bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  with base as (
    select tc.slug, tc.verdict, tc.tool_ids, tc.view_count, tc.published_at
    from tool_comparisons tc
    where tc.is_editorial = true
      and coalesce(tc.noindex, false) = false
      and (
        p_category is null
        or exists (
          select 1
          from unnest(tc.tool_ids) as tid
          join tool_categories tcj on tcj.tool_id = tid
          join categories c on c.id = tcj.category_id
          where c.slug = p_category
        )
      )
  ),
  cnt as (select count(*) as total from base)
  select b.slug, b.verdict, b.tool_ids, b.view_count, cnt.total
  from base b cross join cnt
  order by
    case when p_sort = 'popular' then b.view_count end desc nulls last,
    b.published_at desc nulls last
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;
