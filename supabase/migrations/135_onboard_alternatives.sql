-- 135_onboard_alternatives.sql
-- Phase 9 (Automations & Catalog) D2 fix — resolve a tool's alternatives DB-side.
-- The onboard SOP's resolveAlternatives() fetched all sibling tool_ids then did
-- `.in('id', [hundreds of uuids])`, which builds an over-long PostgREST URL that
-- fails silently → 0 alternatives → the ≥3 alternatives + ≥2 compares HARD gates
-- failed for every tool (even ones with 800+ siblings). This RPC does the
-- category-sibling rank in one query (published only, by view_count), so the SOP
-- gets honest alternatives + concrete tools to build editorial compares against.
create or replace function public.onboard_alternatives(p_tool_id uuid, p_limit int default 6)
returns table(id uuid, slug text, name text, view_count int)
language sql
stable
security definer
set search_path to 'public'
as $$
  select id, slug, name, view_count from (
    select distinct t.id, t.slug, t.name, t.view_count
    from tool_categories tc
    join tool_categories sib on sib.category_id = tc.category_id and sib.tool_id <> p_tool_id
    join tools t on t.id = sib.tool_id and t.is_published = true
    where tc.tool_id = p_tool_id
  ) x
  order by view_count desc nulls last
  limit p_limit;
$$;
revoke all on function public.onboard_alternatives(uuid, int) from public, anon, authenticated;
grant execute on function public.onboard_alternatives(uuid, int) to service_role;
