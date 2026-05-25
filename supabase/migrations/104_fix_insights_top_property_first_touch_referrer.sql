-- 104 — Fix insights_top_property for first_touch_referrer
--
-- Bug: migrations 096/098 defined insights_top_property to query
--   user_events.first_touch_referrer
-- but that column actually lives on user_intent_profile. Calling the RPC with
-- p_property='first_touch_referrer' crashed every /admin/insights load with
-- ERROR: column "first_touch_referrer" does not exist.
--
-- Fix: special-case 'first_touch_referrer' to join user_events → user_intent_profile
-- on distinct_id. The other supported properties (first_touch_utm_source,
-- utm_source, referrer, page_path) keep the original dynamic-SQL path against
-- user_events directly.
--
-- This was applied to production via Supabase MCP on 2026-05-25 to unbreak the
-- admin panel; saving it here so local migration history matches prod.

drop function if exists public.insights_top_property(text, int, int, boolean);
drop function if exists public.insights_top_property(text, int, int);

create or replace function public.insights_top_property(
  p_property text, p_days int, p_limit int, p_include_bots boolean default false
)
returns table(value text, events bigint)
language plpgsql security definer set search_path = public
as $$
declare
  q text;
begin
  if p_property not in ('first_touch_referrer', 'first_touch_utm_source', 'utm_source', 'referrer', 'page_path') then
    raise exception 'Unsupported property: %', p_property;
  end if;

  -- first_touch_referrer lives on user_intent_profile, not user_events.
  if p_property = 'first_touch_referrer' then
    return query
      select coalesce(uip.first_touch_referrer, '')::text as value,
             count(*)::bigint as events
      from user_events ue
      join user_intent_profile uip on uip.distinct_id = ue.distinct_id
      where ue.created_at >= now() - (p_days || ' days')::interval
        and uip.first_touch_referrer is not null
        and uip.first_touch_referrer <> ''
        and (p_include_bots or not ue.bot_likely)
      group by 1
      order by 2 desc
      limit p_limit;
    return;
  end if;

  -- All other supported properties live on user_events; keep dynamic SQL.
  q := format($f$
    select coalesce(%I, '')::text as value, count(*)::bigint as events
    from user_events
    where created_at >= now() - ($1 || ' days')::interval
      and %I is not null and %I <> ''
      and ($3 or not bot_likely)
    group by 1
    order by 2 desc
    limit $2
  $f$, p_property, p_property, p_property);
  return query execute q using p_days, p_limit, p_include_bots;
end;
$$;

grant execute on function public.insights_top_property to authenticated, service_role;
