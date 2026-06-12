-- 160 (Phase 10.7a.3, 2026-06-12) — insights_top_property gains 'channel'.
--
-- New allowed p_property 'channel': visitors (count distinct distinct_id)
-- grouped by the per-event channel classification properties->>'channel'
-- (stamped client-side since the 10.7a deploy — lib/analytics/channels.ts).
-- Epoch-aware: rows captured before the deploy carry no channel key and
-- bucket as '(unknown — pre-channel epoch)' (TRACKING_EPOCHS.channel in
-- lib/admin/constants.ts = 2026-06-12). Same window/bot/filter semantics as
-- the existing first_touch_referrer branch.
--
-- Rebuilt FROM THE LIVE DEFINITION (pulled 2026-06-12); the only changes are
-- the allowed-property list and the new 'channel' branch.

create or replace function public.insights_top_property(
  p_property text,
  p_days integer,
  p_limit integer,
  p_include_bots boolean default false,
  p_cutoff timestamp with time zone default null::timestamp with time zone,
  p_end timestamp with time zone default null::timestamp with time zone,
  p_filters jsonb default null::jsonb
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
  if p_property not in ('first_touch_referrer', 'first_touch_utm_source', 'utm_source', 'referrer', 'page_path', 'channel') then
    raise exception 'Unsupported property: %', p_property;
  end if;

  if p_property = 'first_touch_referrer' then
    return query
      select coalesce(nullif(uip.first_touch_referrer, ''), '(unknown)')::text as value,
             count(distinct ue.distinct_id)::bigint as events
      from user_events ue
      left join user_intent_profile uip on uip.distinct_id = ue.distinct_id
      where ue.created_at >= v_cutoff
        and (p_end is null or ue.created_at < p_end)
        and (p_include_bots or not ue.bot_likely)
        and insights_apply_filters(ue, p_filters)
      group by 1
      order by 2 desc, 1 asc
      limit p_limit;
    return;
  end if;

  -- 10.7a — visitors by channel (properties->>'channel', stamped at capture
  -- time since the channel epoch; earlier rows → explicit epoch bucket).
  if p_property = 'channel' then
    return query
      select coalesce(nullif(ue.properties ->> 'channel', ''), '(unknown — pre-channel epoch)')::text as value,
             count(distinct ue.distinct_id)::bigint as events
      from user_events ue
      where ue.created_at >= v_cutoff
        and (p_end is null or ue.created_at < p_end)
        and (p_include_bots or not ue.bot_likely)
        and insights_apply_filters(ue, p_filters)
      group by 1
      order by 2 desc, 1 asc
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
      and insights_apply_filters(user_events, $5::jsonb)
    group by 1
    order by 2 desc, 1 asc
    limit $2
  $f$, p_property, p_property, p_property);
  return query execute q using v_cutoff, p_limit, p_include_bots, p_end, p_filters;
end;
$function$;
