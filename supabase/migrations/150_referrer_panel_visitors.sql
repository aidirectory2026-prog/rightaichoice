-- Phase 10.2 (F4, 2026-06-11) — "Top referrers" honesty fix.
--
-- The first_touch_referrer branch of insights_top_property counted EVENTS
-- (one heavy visitor inflated their source) via an INNER join to
-- user_intent_profile — silently excluding ~50% of traffic whose visitor has
-- no profile/first-touch (audit week: 2,557 events shown vs 2,585 hidden).
--
-- Fix: count DISTINCT VISITORS, LEFT JOIN so untracked visitors appear as an
-- explicit '(unknown)' bucket. The `events` output column now carries a
-- VISITOR count for this branch (column name kept for caller compatibility;
-- the dashboard label changes in Phase 5a). Attribution epoch: first-touch
-- capture began 2026-06-10 (PR #12) — windows before that are mostly unknown.

drop function if exists public.insights_top_property(text, integer, integer, boolean, timestamptz, timestamptz);
create function public.insights_top_property(
  p_property text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamptz default null,
  p_end timestamptz default null
)
returns table(value text, events bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  q text;
  v_cutoff timestamptz := coalesce(p_cutoff, now() - (p_days || ' days')::interval);
begin
  if p_property not in ('first_touch_referrer', 'first_touch_utm_source', 'utm_source', 'referrer', 'page_path') then
    raise exception 'Unsupported property: %', p_property;
  end if;

  if p_property = 'first_touch_referrer' then
    return query
      select coalesce(nullif(uip.first_touch_referrer, ''), '(unknown)')::text as value,
             count(distinct ue.distinct_id)::bigint as events  -- visitors, not events (F4)
      from user_events ue
      left join user_intent_profile uip on uip.distinct_id = ue.distinct_id
      where ue.created_at >= v_cutoff
        and (p_end is null or ue.created_at < p_end)
        and (p_include_bots or not ue.bot_likely)
      group by 1
      order by 2 desc
      limit p_limit;
    return;
  end if;

  q := format($f$
    select coalesce(%I, '')::text as value, count(*)::bigint as events
    from user_events
    where created_at >= $1
      and ($4::timestamptz is null or created_at < $4)
      and %I is not null and %I <> ''
      and ($3 or not bot_likely)
    group by 1
    order by 2 desc
    limit $2
  $f$, p_property, p_property, p_property);
  return query execute q using v_cutoff, p_limit, p_include_bots, p_end;
end;
$function$;
revoke all on function public.insights_top_property(text, integer, integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.insights_top_property(text, integer, integer, boolean, timestamptz, timestamptz) to service_role;
